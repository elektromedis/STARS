/**
 * Impor massal catatan kalibrasi dari Excel/CSV (server saja).
 * Tiap baris: alat (kode / nomor seri / no. aset), tanggal, lembaga, nomor sertifikat, hasil, dst., plus `nama_berkas`
 * — nama berkas sertifikat (PDF/JPG/PNG) yang diunggah bersamaan. Penyimpanan memakai jalur simpan kalibrasi biasa.
 */
import * as XLSX from "xlsx";
import { prisma } from "./prisma";
import { skemaBarisKalibrasi, pesanZod, type BarisKalibrasi } from "./kalibrasi-simpan";

export const KOLOM_IMPOR = [
  ["kode_alat", "Kode alat STARS, nomor seri, atau no. aset (salah satu, wajib)", "ALT-0001"],
  ["jenis", "Kalibrasi atau Pengujian (kosong = Kalibrasi)", "Kalibrasi"],
  ["tanggal", "Tanggal kalibrasi (dd/mm/yyyy atau yyyy-mm-dd, wajib)", "15/10/2026"],
  ["berlaku_sampai", "Masa berlaku (kosong = tanggal + 12 bulan)", "15/10/2027"],
  ["kalibrator", "Lembaga pengkalibrasi (wajib)", "BPFK Jakarta"],
  ["nomor_sertifikat", "Nomor sertifikat", "001/KAL/X/2026"],
  ["hasil", "Laik / Tidak laik (kosong = Laik)", "Laik"],
  ["petugas", "Nama petugas lembaga (opsional)", ""],
  ["metode", "Metode (opsional)", ""],
  ["keterangan", "Catatan (opsional)", ""],
  ["nama_berkas", "Nama file sertifikat persis seperti yang diunggah, mis. 001-KAL.pdf (kosong = tanpa sertifikat). Satu file boleh dipakai beberapa baris.", "001-KAL.pdf"],
] as const;

const ALIAS: Record<string, string> = {
  kode: "kode_alat", "kode alat": "kode_alat", "no seri": "kode_alat", "nomor seri": "kode_alat", "serial number": "kode_alat", alat: "kode_alat",
  "tanggal kalibrasi": "tanggal", tgl: "tanggal", "berlaku": "berlaku_sampai", "berlaku sampai": "berlaku_sampai", "masa berlaku": "berlaku_sampai",
  lembaga: "kalibrator", "nomor sertifikat": "nomor_sertifikat", "no sertifikat": "nomor_sertifikat", laik: "hasil", status: "hasil",
  "nama berkas": "nama_berkas", file: "nama_berkas", "nama file": "nama_berkas", berkas: "nama_berkas", sertifikat: "nama_berkas",
};
const normal = (h: string) => h.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const kunciKolom = (h: string) => { const n = normal(h); const u = n.replace(/ /g, "_"); return KOLOM_IMPOR.some(([k]) => k === u) ? u : ALIAS[n] ?? null; };

function keIso(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) return new Date(Date.UTC(v.getFullYear(), v.getMonth(), v.getDate())).toISOString().slice(0, 10);
  if (typeof v === "number" && v > 20000 && v < 80000) { const d = XLSX.SSF.parse_date_code(v); return d ? `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}` : null; }
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/); if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return s;
}
function keLaik(v: unknown): boolean | null {
  const s = normal(String(v ?? ""));
  if (!s || ["laik", "ya", "y", "true", "1", "lulus", "baik", "pass"].includes(s)) return true;
  if (["tidak laik", "tidak", "t", "false", "0", "gagal", "fail", "tl"].includes(s)) return false;
  return null;
}

export type BarisImpor = {
  baris: number; kodeAlat: string; alat: { id: number; kode: string; nama: string; unit: string } | null;
  data: BarisKalibrasi | null; namaBerkas: string | null; galat: string[];
};

export async function bacaImporKalibrasi(buf: Buffer, unitId: number | null): Promise<{ baris: BarisImpor[] } | { error: string }> {
  let wb: XLSX.WorkBook;
  try { wb = XLSX.read(buf, { type: "buffer", cellDates: true }); } catch { return { error: "Berkas tidak dapat dibaca. Gunakan .xlsx, .xls, atau .csv." }; }
  const ws = wb.Sheets[wb.SheetNames.find((n) => !/petunjuk/i.test(n)) ?? wb.SheetNames[0]];
  const mentah = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "", raw: true });
  if (mentah.length === 0) return { error: "Tidak ada baris data di lembar pertama." };
  if (mentah.length > 2000) return { error: "Maksimal 2.000 baris per impor." };
  const peta = Object.keys(mentah[0]).map((h) => [h, kunciKolom(h)] as const);
  if (!peta.some(([, k]) => k === "kode_alat") || !peta.some(([, k]) => k === "tanggal")) return { error: "Kolom wajib tidak ditemukan: kode_alat dan tanggal. Unduh templat agar judul kolom sesuai." };

  const rows = mentah.map((r) => { const o: Record<string, unknown> = {}; for (const [h, k] of peta) if (k && (o[k] == null || o[k] === "")) o[k] = r[h]; return o; });
  const kunciAlat = [...new Set(rows.map((r) => String(r.kode_alat ?? "").trim()).filter(Boolean))];
  const alat = await prisma.alat.findMany({
    where: { aktif: true, ...(unitId ? { unitKerjaId: unitId } : {}), OR: [{ kode: { in: kunciAlat } }, { nomorSeri: { in: kunciAlat } }, { noUrutAset: { in: kunciAlat } }] },
    select: { id: true, kode: true, nama: true, nomorSeri: true, noUrutAset: true, unitKerja: { select: { nama: true } } },
  });
  const cari = (k: string) => {
    const kode = alat.find((a) => a.kode === k); if (kode) return [kode];
    const lain = alat.filter((a) => a.nomorSeri === k || a.noUrutAset === k);
    return lain;
  };

  const hasil: BarisImpor[] = rows.map((r, i) => {
    const galat: string[] = [];
    const kodeAlat = String(r.kode_alat ?? "").trim();
    const cocok = kodeAlat ? cari(kodeAlat) : [];
    if (!kodeAlat) galat.push("kode_alat kosong");
    else if (cocok.length === 0) galat.push(`Alat "${kodeAlat}" tidak ditemukan`);
    else if (cocok.length > 1) galat.push(`"${kodeAlat}" cocok dengan ${cocok.length} alat — pakai kode alat STARS`);
    const a = cocok.length === 1 ? cocok[0] : null;
    const laik = keLaik(r.hasil);
    if (laik === null) galat.push(`Hasil "${String(r.hasil)}" tidak dikenali (Laik / Tidak laik)`);
    const jenisTeks = normal(String(r.jenis ?? ""));
    const jenis = !jenisTeks ? "Kalibrasi" : jenisTeks.startsWith("peng") ? "Pengujian" : jenisTeks.startsWith("kal") ? "Kalibrasi" : null;
    if (!jenis) galat.push(`Jenis "${String(r.jenis)}" tidak dikenali`);
    let data: BarisKalibrasi | null = null;
    if (a && laik !== null && jenis) {
      const p = skemaBarisKalibrasi.safeParse({
        alatId: a.id, jenis, tanggal: keIso(r.tanggal) ?? "", berlakuSampai: keIso(r.berlaku_sampai),
        kalibrator: String(r.kalibrator ?? ""), nomorSertifikat: String(r.nomor_sertifikat ?? ""), laik,
        petugas: String(r.petugas ?? ""), metode: String(r.metode ?? ""), keterangan: String(r.keterangan ?? ""),
      });
      if (p.success) data = p.data; else galat.push(pesanZod(p.error));
    }
    const nb = String(r.nama_berkas ?? "").trim().split(/[\\/]/).pop() || null;
    return { baris: i + 2, kodeAlat, alat: a ? { id: a.id, kode: a.kode, nama: a.nama, unit: a.unitKerja.nama } : null, data, namaBerkas: nb, galat };
  });
  // alat + tanggal yang sama dua kali di berkas ini
  const lihat = new Map<string, number>();
  for (const h of hasil) if (h.data) { const k = `${h.data.alatId}|${h.data.tanggal}`; if (lihat.has(k)) h.galat.push(`Duplikat dengan baris ${lihat.get(k)}`); else lihat.set(k, h.baris); }
  for (const h of hasil) if (h.galat.length) h.data = null;
  return { baris: hasil };
}

export function templatImporKalibrasi(): Buffer {
  const wb = XLSX.utils.book_new();
  const data = XLSX.utils.aoa_to_sheet([KOLOM_IMPOR.map(([k]) => k), KOLOM_IMPOR.map(([, , c]) => c)]);
  data["!cols"] = KOLOM_IMPOR.map(([k]) => ({ wch: Math.max(14, k.length + 4) }));
  XLSX.utils.book_append_sheet(wb, data, "Data");
  const petunjuk = XLSX.utils.aoa_to_sheet([
    ["Petunjuk impor sertifikat kalibrasi STARS"], [],
    ["1. Isi lembar Data: satu baris = satu alat. Hapus baris contoh."],
    ["2. Kolom nama_berkas = nama file sertifikat (PDF/JPG/PNG, maks 15 MB). Satu file boleh dipakai beberapa alat (sertifikat kolektif)."],
    ["3. Di ADMIN > Kalibrasi > Impor massal: pilih Excel ini, lalu pilih semua file sertifikat sekaligus."],
    ["4. Periksa pratinjau, lalu Simpan. Catatan alat + tanggal yang sudah ada akan diperbarui."], [],
    ["Kolom", "Keterangan"], ...KOLOM_IMPOR.map(([k, ket]) => [k, ket]),
  ]);
  petunjuk["!cols"] = [{ wch: 20 }, { wch: 110 }];
  XLSX.utils.book_append_sheet(wb, petunjuk, "Petunjuk");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
