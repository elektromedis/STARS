/**
 * Impor inventaris alat dari Excel — menerima langsung hasil ekspor Trilux CAMS
 * ("Invetaris : ..." judul di baris 1, header di baris 3) maupun template STARS.
 * Satu impor sekaligus: Alat (upsert per kode), Ruangan (dibuat bila belum ada),
 * dan riwayat Kalibrasi (dari kolom Tanggal Kalibrasi / Expired).
 */
import * as XLSX from "xlsx";
import { prisma } from "./prisma";

export const KOLOM_ALAT = [
  "kode_inventaris", "kode_aspak", "nama", "no_seri", "no_urut_aset", "merek", "model", "keterangan", "instalasi", "pelayanan", "ruangan",
  "unit_kerja", "jenis", "tahun_pembelian", "tahun_pembukuan", "tahun_perolehan", "harga", "pendanaan", "teknologi", "kelas_risiko",
  "tanggal_uji_fungsi", "tanggal_kalibrasi", "tanggal_expired_kalibrasi", "akl", "produsen", "umur_pemakaian", "distributor", "status",
] as const;
export type KolomAlat = (typeof KOLOM_ALAT)[number];

/** Header Trilux / variasi lain → kolom STARS. Kunci sudah dinormalkan (huruf kecil, non-alfanumerik → spasi). */
const ALIAS: Record<string, KolomAlat> = {
  "no inventaris": "kode_inventaris", "kode inventaris": "kode_inventaris", "kode": "kode_inventaris", "nomor inventaris": "kode_inventaris",
  "trilux": "kode_aspak", "kode aspak": "kode_aspak", "kode alat": "kode_aspak", "aspak": "kode_aspak",
  "alat kesehatan": "nama", "nama alat": "nama", "nama": "nama", "nama barang": "nama",
  "no seri": "no_seri", "nomor seri": "no_seri", "serial": "no_seri", "sn": "no_seri",
  "no urut asset": "no_urut_aset", "no urut aset": "no_urut_aset",
  "merk": "merek", "merek": "merek", "brand": "merek",
  "tipe": "model", "type": "model", "model": "model",
  "keterangan": "keterangan", "catatan": "keterangan",
  "instalasi": "instalasi", "pelayanan": "pelayanan", "ruangan": "ruangan", "ruang": "ruangan", "lokasi": "ruangan",
  "unit kerja": "unit_kerja", "unit": "unit_kerja",
  "jenis": "jenis", "jenis alat": "jenis",
  "tahun pembelian": "tahun_pembelian", "tahun pembukuan": "tahun_pembukuan", "tahun perolehan": "tahun_perolehan", "tahun": "tahun_perolehan",
  "harga": "harga", "harga perolehan": "harga", "nilai": "harga",
  "pendanaan": "pendanaan", "sumber dana": "pendanaan",
  "teknologi": "teknologi",
  "kelas resiko": "kelas_risiko", "kelas risiko": "kelas_risiko", "resiko": "kelas_risiko", "risiko": "kelas_risiko",
  "tanggal uji fungsi": "tanggal_uji_fungsi", "tgl uji fungsi": "tanggal_uji_fungsi",
  "tanggal kalibrasi": "tanggal_kalibrasi", "tgl kalibrasi": "tanggal_kalibrasi",
  "tanggal expired kalibrasi": "tanggal_expired_kalibrasi", "expired kalibrasi": "tanggal_expired_kalibrasi", "tanggal expire kalibrasi": "tanggal_expired_kalibrasi", "berlaku sampai": "tanggal_expired_kalibrasi",
  "akl": "akl", "no akl": "akl", "nomor akl": "akl",
  "produsen": "produsen", "pabrikan": "produsen",
  "umur pemakaian": "umur_pemakaian", "usia pemakaian": "umur_pemakaian",
  "distributor": "distributor", "suplier": "distributor", "supplier": "distributor",
  "status": "status", "kondisi": "status",
};

/** Lokasi Trilux (ruangan/pelayanan/instalasi) → nama unit kerja STARS. Diperiksa berurutan, cocok bila teks mengandung kata kunci. */
const ALIAS_UNIT: [string, string][] = [
  ["perina", "PERINA"], ["nicu", "PERINA"], ["hcu", "HCU-ICU"], ["icu", "HCU-ICU"], ["igd", "IGD"], ["gawat darurat", "IGD"],
  ["obgyn", "POLI OBGYN"], ["kandungan", "POLI OBGYN"], ["gigi", "POLI GIGI"], ["bersalin", "KEBIDANAN"], ["kebidanan", "KEBIDANAN"], ["vk", "KEBIDANAN"], ["ponek", "KEBIDANAN"],
  ["isolasi", "RANAP ISO"], ["rawat inap", "RANAP"], ["ranap", "RANAP"], ["rawat jalan", "RAJAL"], ["rajal", "RAJAL"], ["poli", "RAJAL"],
  ["radiologi", "RADIOLOGI"], ["rontgen", "RADIOLOGI"], ["laborat", "LAB"], ["lab", "LAB"], ["farmasi", "FARMASI"], ["apotek", "FARMASI"],
  ["gizi", "GIZI"], ["dapur", "GIZI"], ["cssd", "CSSD"], ["sterilisasi", "CSSD"], ["kamar operasi", "OK"], ["bedah", "OK"], ["ok", "OK"],
  ["fisioterapi", "FISIOTERAPI"], ["rehab", "FISIOTERAPI"], ["ambulan", "AMBULANS"], ["bengkel", "ELEKTROMEDIK"], ["workshop", "ELEKTROMEDIK"],
  ["elektromedik", "ELEKTROMEDIK"], ["ipsrs", "ELEKTROMEDIK"], ["gudang farmasi", "GUDANG FARMASI"], ["gudang logistik", "GUDANG LOGISTIK"], ["gudang", "GUDANG ALAT KESEHATAN"],
  ["rekam medis", "RM"], ["kesling", "KESLING"], ["sanitasi", "KESLING"], ["kmj", "KMJ"], ["it", "IT"], ["recall", "RECALL"],
];

export const norm = (s: unknown) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function keAngka(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v).replace(/rp/i, "").replace(/\s/g, "");
  const n = Number(s.includes(",") && !s.includes(".") ? s.replace(",", ".") : s.replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function keTanggal(v: unknown): Date | null {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === "number") { const p = XLSX.SSF.parse_date_code(v); return p ? new Date(Date.UTC(p.y, p.m - 1, p.d)) : null; }
  const s = String(v).trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  m = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/.exec(s);
  if (m) return new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
  const d = new Date(s); return isNaN(d.getTime()) ? null : d;
}

export function petakanKondisi(v: unknown): { kondisi: "Baik" | "Rusak Ringan" | "Rusak Berat" | "Afkir"; dikenal: boolean } {
  const s = norm(v);
  if (!s) return { kondisi: "Baik", dikenal: true };
  if (/afkir|hapus|dekomisi|musnah/.test(s)) return { kondisi: "Afkir", dikenal: true };
  if (/tidak berfungsi|rusak berat|mati total/.test(s)) return { kondisi: "Rusak Berat", dikenal: true };
  if (/tidak beroperasi|rusak ringan|rusak|standby/.test(s)) return { kondisi: "Rusak Ringan", dikenal: true };
  if (/baik|normal|berfungsi|aktif/.test(s)) return { kondisi: "Baik", dikenal: true };
  return { kondisi: "Baik", dikenal: false };
}

export function petakanRisiko(v: unknown): "Tinggi" | "Sedang" | "Rendah" | null {
  const s = norm(v);
  if (!s) return null;
  if (/high|tinggi/.test(s)) return "Tinggi";
  if (/medium|sedang/.test(s)) return "Sedang";
  if (/low|rendah/.test(s)) return "Rendah";
  return null;
}

export function petakanUnit(teks: (unknown)[], daftarUnit: readonly string[]): string | null {
  for (const t of teks) {
    const s = norm(t);
    if (!s) continue;
    const persis = daftarUnit.find((u) => norm(u) === s);
    if (persis) return persis;
    for (const [kunci, unit] of ALIAS_UNIT) {
      if (new RegExp(`(^|\\s)${kunci}(\\s|$)`).test(s) || (kunci.length > 3 && s.includes(kunci))) {
        if (daftarUnit.includes(unit)) return unit;
      }
    }
  }
  return null;
}

export type BarisAlat = {
  baris: number; kode: string; status: "baru" | "diperbarui";
  nama: string; kodeAspak: string | null; nomorSeri: string | null; noUrutAset: string | null; merek: string | null; model: string | null; catatan: string | null;
  instalasi: string | null; pelayanan: string | null; ruangan: string | null; unitKerja: string; jenis: "Medik" | "Non Medik";
  tahunPembelian: number | null; tahunPembukuan: number | null; tahunPerolehan: number | null; hargaPerolehan: number | null; pendanaan: string | null;
  teknologi: string | null; kelasRisiko: string | null; risiko: "Tinggi" | "Sedang" | "Rendah" | null; tanggalUjiFungsi: Date | null;
  tanggalKalibrasi: Date | null; tanggalExpKalibrasi: Date | null; akl: string | null; produsen: string | null; umurPemakaian: string | null; distributor: string | null;
  kondisi: "Baik" | "Rusak Ringan" | "Rusak Berat" | "Afkir";
};
export type Masalah = { baris: number; kolom: string; pesan: string };

/** Baca sheet pertama; cari baris header (mengandung "alat kesehatan"/"nama alat"/"no seri") di 15 baris pertama. */
export function bacaExcelAlat(buffer: Buffer) {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const namaSheet = wb.SheetNames.find((n) => /alat|inventaris|worksheet/i.test(n)) ?? wb.SheetNames[0];
  if (!namaSheet) throw new Error("Berkas tidak memiliki sheet.");
  const ws = wb.Sheets[namaSheet];
  const grid = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null, raw: true });
  const idxHeader = grid.findIndex((r, i) => i < 15 && Array.isArray(r) && r.some((c) => ["alat kesehatan", "nama alat", "no seri", "no inventaris"].includes(norm(c))));
  if (idxHeader < 0) throw new Error("Baris header tidak ditemukan (dicari kolom 'Alat Kesehatan' / 'Nama Alat' / 'No Seri').");
  const header = (grid[idxHeader] as unknown[]).map((h) => norm(h));
  const peta = new Map<number, KolomAlat>();
  const tidakDikenali: string[] = [];
  header.forEach((h, i) => {
    if (!h || h === "no") return;
    const k = (KOLOM_ALAT as readonly string[]).includes(h.replace(/ /g, "_")) ? (h.replace(/ /g, "_") as KolomAlat) : ALIAS[h];
    if (k && ![...peta.values()].includes(k)) peta.set(i, k); else if (!k) tidakDikenali.push(String((grid[idxHeader] as unknown[])[i]));
  });
  const baris = grid.slice(idxHeader + 1).map((r, i) => {
    const o: Partial<Record<KolomAlat, unknown>> & { __baris: number } = { __baris: idxHeader + 2 + i };
    for (const [idx, k] of peta) o[k] = (r as unknown[])[idx];
    return o;
  }).filter((o) => KOLOM_ALAT.some((k) => o[k] !== null && o[k] !== undefined && String(o[k]).trim() !== ""));
  return { sheet: namaSheet, barisHeader: idxHeader + 1, baris, kolomDikenali: [...new Set(peta.values())], kolomTidakDikenali: tidakDikenali };
}

const teks = (v: unknown, maks = 200) => { const s = String(v ?? "").trim(); return s ? s.slice(0, maks) : null; };
const tahun = (v: unknown) => { const n = keAngka(v); return n && n >= 1950 && n <= 2100 ? Math.round(n) : null; };

export function validasiAlat(baris: ReturnType<typeof bacaExcelAlat>["baris"], daftarUnit: readonly string[]) {
  const errors: Masalah[] = []; const warnings: Masalah[] = []; const valid: BarisAlat[] = [];
  const kodeDipakai = new Map<string, number>();
  for (const r of baris) {
    const no = r.__baris;
    const nama = teks(r.nama);
    if (!nama) { errors.push({ baris: no, kolom: "nama", pesan: "Nama alat kosong" }); continue; }
    let kode = teks(r.kode_inventaris, 60) ?? teks(r.no_urut_aset, 60) ?? teks(r.no_seri, 60);
    if (!kode) { kode = `${teks(r.kode_aspak, 20) ?? "ALAT"}-B${no}`; warnings.push({ baris: no, kolom: "kode", pesan: `Tanpa No Inventaris/No Seri; kode dibuat otomatis ${kode}` }); }
    const n = (kodeDipakai.get(kode) ?? 0) + 1; kodeDipakai.set(kode, n);
    if (n > 1) { const lama = kode; kode = `${kode}-${n}`; warnings.push({ baris: no, kolom: "kode", pesan: `Kode ${lama} ganda di berkas; dipakai ${kode}` }); }
    const unitEksplisit = teks(r.unit_kerja);
    let unitKerja = unitEksplisit ? daftarUnit.find((u) => norm(u) === norm(unitEksplisit)) ?? null : null;
    if (unitEksplisit && !unitKerja) errors.push({ baris: no, kolom: "unit_kerja", pesan: `Unit kerja "${unitEksplisit}" tidak dikenal` });
    if (!unitKerja) unitKerja = petakanUnit([r.ruangan, r.pelayanan, r.instalasi], daftarUnit);
    if (!unitKerja) { unitKerja = "TIDAK ADA"; warnings.push({ baris: no, kolom: "ruangan", pesan: `Lokasi "${[r.ruangan, r.pelayanan, r.instalasi].filter(Boolean).join(" / ") || "-"}" tidak cocok unit mana pun → TIDAK ADA` }); }
    const { kondisi, dikenal } = petakanKondisi(r.status);
    if (!dikenal) warnings.push({ baris: no, kolom: "status", pesan: `Status "${r.status}" tidak dikenal, dianggap Baik` });
    const harga = keAngka(r.harga);
    if (r.harga !== null && r.harga !== undefined && r.harga !== "" && harga === null) warnings.push({ baris: no, kolom: "harga", pesan: `Harga "${r.harga}" bukan angka, dikosongkan` });
    const tglKal = keTanggal(r.tanggal_kalibrasi), tglExp = keTanggal(r.tanggal_expired_kalibrasi);
    if (tglExp && tglKal && tglExp < tglKal) warnings.push({ baris: no, kolom: "tanggal_expired_kalibrasi", pesan: "Expired sebelum tanggal kalibrasi" });
    const jenisTeks = norm(r.jenis);
    valid.push({
      baris: no, kode, status: "baru", nama, kodeAspak: teks(r.kode_aspak, 40), nomorSeri: teks(r.no_seri, 120), noUrutAset: teks(r.no_urut_aset, 60),
      merek: teks(r.merek, 120), model: teks(r.model, 120), catatan: teks(r.keterangan, 1000), instalasi: teks(r.instalasi), pelayanan: teks(r.pelayanan), ruangan: teks(r.ruangan, 120),
      unitKerja, jenis: /non/.test(jenisTeks) ? "Non Medik" : "Medik",
      tahunPembelian: tahun(r.tahun_pembelian), tahunPembukuan: tahun(r.tahun_pembukuan), tahunPerolehan: tahun(r.tahun_perolehan) ?? tahun(r.tahun_pembelian), hargaPerolehan: harga,
      pendanaan: teks(r.pendanaan, 80), teknologi: teks(r.teknologi, 80), kelasRisiko: teks(r.kelas_risiko, 80), risiko: petakanRisiko(r.kelas_risiko), tanggalUjiFungsi: keTanggal(r.tanggal_uji_fungsi),
      tanggalKalibrasi: tglKal, tanggalExpKalibrasi: tglExp, akl: teks(r.akl, 120), produsen: teks(r.produsen, 160), umurPemakaian: teks(r.umur_pemakaian, 80), distributor: teks(r.distributor, 160), kondisi,
    });
  }
  return { valid, errors, warnings };
}

/** Tandai baru/diperbarui berdasarkan kode yang sudah ada di basis data. */
export async function tandaiStatus(valid: BarisAlat[]) {
  const ada = new Set((await prisma.alat.findMany({ where: { kode: { in: valid.map((v) => v.kode) } }, select: { kode: true } })).map((a) => a.kode));
  for (const v of valid) v.status = ada.has(v.kode) ? "diperbarui" : "baru";
  return valid;
}

export async function simpanAlat(baris: BarisAlat[], meta: { namaBerkas: string; ukuranByte: number; pengguna?: string | null; berkasTersimpan?: string | null; barisError: number }) {
  const units = new Map((await prisma.unitKerja.findMany()).map((u) => [u.nama, u.id]));
  let ruanganBaru = 0, kalibrasiBaru = 0;
  const totalNilai = baris.reduce((a, b) => a + (b.hargaPerolehan ?? 0), 0);
  try {
    await prisma.$transaction(async (tx) => {
      const cacheRuangan = new Map<string, number>();
      for (const b of baris) {
        const unitKerjaId = units.get(b.unitKerja) ?? units.get("TIDAK ADA");
        if (!unitKerjaId) throw new Error(`Unit kerja ${b.unitKerja} tidak ada di basis data`);
        let ruanganId: number | null = null;
        if (b.ruangan) {
          const kunci = `${unitKerjaId}|${b.ruangan.toLowerCase()}`;
          if (cacheRuangan.has(kunci)) ruanganId = cacheRuangan.get(kunci)!;
          else {
            const r = await tx.ruangan.findFirst({ where: { unitKerjaId, nama: b.ruangan } }) ?? (ruanganBaru++, await tx.ruangan.create({ data: { nama: b.ruangan, unitKerjaId } }));
            ruanganId = r.id; cacheRuangan.set(kunci, r.id);
          }
        }
        const data = {
          nama: b.nama, kodeAspak: b.kodeAspak, nomorSeri: b.nomorSeri, noUrutAset: b.noUrutAset, merek: b.merek, model: b.model, catatan: b.catatan,
          instalasi: b.instalasi, pelayanan: b.pelayanan, unitKerjaId, ruanganId, jenis: b.jenis, tahunPembelian: b.tahunPembelian, tahunPembukuan: b.tahunPembukuan,
          tahunPerolehan: b.tahunPerolehan, hargaPerolehan: b.hargaPerolehan, pendanaan: b.pendanaan, teknologi: b.teknologi, kelasRisiko: b.kelasRisiko, risiko: b.risiko,
          tanggalUjiFungsi: b.tanggalUjiFungsi, akl: b.akl, produsen: b.produsen, umurPemakaian: b.umurPemakaian, distributor: b.distributor, kondisi: b.kondisi,
          aktif: b.kondisi !== "Afkir",
        };
        const alat = await tx.alat.upsert({ where: { kode: b.kode }, update: data, create: { kode: b.kode, ...data } });
        if (b.tanggalKalibrasi) {
          const sudah = await tx.kalibrasi.findFirst({ where: { alatId: alat.id, tanggal: b.tanggalKalibrasi } });
          if (!sudah) { kalibrasiBaru++; await tx.kalibrasi.create({ data: { alatId: alat.id, tanggal: b.tanggalKalibrasi, kalibrator: "(impor Trilux)", laik: true, berlakuSampai: b.tanggalExpKalibrasi, keterangan: "Dicatat dari impor inventaris" } }); }
        }
      }
    }, { timeout: 180_000 });
  } catch (err) {
    await prisma.logImpor.create({ data: { ...meta, totalBaris: baris.length, barisBaru: 0, barisDiperbarui: 0, totalNilai, status: "Gagal", pesan: `Impor inventaris alat: ${err instanceof Error ? err.message : String(err)}` } });
    throw err;
  }
  const barisBaru = baris.filter((b) => b.status === "baru").length;
  const log = await prisma.logImpor.create({ data: { ...meta, totalBaris: baris.length, barisBaru, barisDiperbarui: baris.length - barisBaru, totalNilai, status: "Berhasil", pesan: `Impor inventaris alat: ${ruanganBaru} ruangan baru, ${kalibrasiBaru} catatan kalibrasi` } });
  return { logId: log.id, barisBaru, barisDiperbarui: baris.length - barisBaru, ruanganBaru, kalibrasiBaru, totalNilai };
}
