/**
 * Karyawan AI otomatis: tiap karyawan ALLIES bekerja terjadwal (jam kerja WIB, hari kerja/setiap hari).
 * Karyawan hanya MEMBACA data dan menulis laporan kerja + notifikasi; tidak pernah mengubah data alat.
 * Pengaturan & catatan kerja disimpan di tabel Pengaturan (kunci karyawan_ai, karyawan_ai_log).
 */
import { prisma } from "./prisma";
import { KARYAWAN, type IdKaryawan } from "./allies-karyawan";
import { getRingkasanPemeliharaan } from "./pemeliharaan-ringkasan";
import { ringkasanAllies } from "./allies";

export type JadwalKaryawan = { aktif: boolean; jam: string; hari: "kerja" | "setiap" };
export type CatatanKerja = { id: string; karyawan: IdKaryawan; waktu: string; judul: string; isi: string[]; tingkat: "info" | "peringatan" | "bahaya"; href: string; ai?: boolean; manual?: boolean };

const K_ATUR = "karyawan_ai", K_LOG = "karyawan_ai_log", MAKS_LOG = 300, HARI = 86_400_000;

export const TUGAS: Record<IdKaryawan, string[]> = {
  umum: ["Menyusun ringkasan harian semua bidang untuk kepala instalasi (pakai AI bila kunci API tersedia)"],
  inventaris: ["Memeriksa nomor seri ganda", "Menghitung alat tanpa kategori inventaris, tahun, atau harga", "Mengingatkan Sparepart/BHP-BMHP di bawah stok minimum atau kedaluwarsa ≤ 30 hari"],
  pemeliharaan: ["Mengingatkan perintah kerja macet > 3 hari", "Mengingatkan laporan kerusakan baru yang belum ditanggapi", "Mengingatkan preventif jatuh tempo"],
  kalibrasi: ["Mendaftar alat kalibrasi kedaluwarsa / tidak laik", "Mendaftar kalibrasi yang habis ≤ 30 hari"],
  perencanaan: ["Mendaftar kandidat penggantian/penghapusan alat untuk bahan RKBU"],
};

const bawaan = (): Record<IdKaryawan, JadwalKaryawan> => Object.fromEntries(KARYAWAN.map((k) => [k.id, { aktif: false, jam: k.id === "umum" ? "07:30" : "07:00", hari: "kerja" }])) as Record<IdKaryawan, JadwalKaryawan>;

export async function bacaJadwal(): Promise<Record<IdKaryawan, JadwalKaryawan>> {
  const r = await prisma.pengaturan.findUnique({ where: { kunci: K_ATUR } });
  try { return { ...bawaan(), ...(r ? JSON.parse(r.nilai) : {}) }; } catch { return bawaan(); }
}
export async function simpanJadwal(j: Record<IdKaryawan, JadwalKaryawan>, oleh: string) {
  await prisma.pengaturan.upsert({ where: { kunci: K_ATUR }, create: { kunci: K_ATUR, nilai: JSON.stringify(j), diubahOleh: oleh }, update: { nilai: JSON.stringify(j), diubahOleh: oleh } });
}
export async function bacaLog(): Promise<CatatanKerja[]> {
  const r = await prisma.pengaturan.findUnique({ where: { kunci: K_LOG } });
  try { return r ? JSON.parse(r.nilai) : []; } catch { return []; }
}
async function tulisLog(c: CatatanKerja) {
  const log = [c, ...(await bacaLog())].slice(0, MAKS_LOG);
  await prisma.pengaturan.upsert({ where: { kunci: K_LOG }, create: { kunci: K_LOG, nilai: JSON.stringify(log), diubahOleh: "karyawan-ai" }, update: { nilai: JSON.stringify(log), diubahOleh: "karyawan-ai" } });
}

const n = (x: number) => x.toLocaleString("id-ID");

/** Kerjakan tugas satu karyawan, simpan catatan kerjanya, kembalikan catatan itu. */
export async function kerjakan(id: IdKaryawan, manual = false): Promise<CatatanKerja> {
  const kini = new Date();
  const k = KARYAWAN.find((x) => x.id === id)!;
  let isi: string[] = [], tingkat: CatatanKerja["tingkat"] = "info", href = "/admin", ai = false;
  if (id === "inventaris") {
    const [ganda, tanpaKat, tanpaTahun, tanpaHarga, stok] = await Promise.all([
      prisma.alat.groupBy({ by: ["nomorSeri"], where: { nomorSeri: { not: null, notIn: ["", "-", "0", "N/A", "n/a", "NA", "Tidak ada", "tidak ada"] } }, _count: { _all: true }, having: { nomorSeri: { _count: { gt: 1 } } }, orderBy: { nomorSeri: "asc" }, take: 200 }),
      prisma.alat.count({ where: { aktif: true, kategoriInventaris: null } }),
      prisma.alat.count({ where: { aktif: true, tahunPerolehan: null } }),
      prisma.alat.count({ where: { aktif: true, hargaPerolehan: null } }),
      prisma.barangStok.findMany({ where: { aktif: true }, select: { nama: true, stok: true, stokMinimum: true, kedaluwarsa: true } }),
    ]);
    const kurang = stok.filter((b) => b.stok <= b.stokMinimum && b.stokMinimum > 0);
    const exp = stok.filter((b) => b.kedaluwarsa && b.kedaluwarsa.getTime() - kini.getTime() <= 30 * HARI);
    isi = [
      ganda.length ? `${n(ganda.length)} nomor seri ganda (mis. ${ganda.slice(0, 3).map((g) => g.nomorSeri).join(", ")})` : "Tidak ada nomor seri ganda",
      `${n(tanpaKat)} alat belum berkategori inventaris · ${n(tanpaTahun)} tanpa tahun · ${n(tanpaHarga)} tanpa harga`,
      kurang.length ? `${n(kurang.length)} Sparepart/BHP di bawah stok minimum: ${kurang.slice(0, 4).map((b) => b.nama).join(", ")}` : "Semua stok di atas minimum",
      ...(exp.length ? [`${n(exp.length)} barang kedaluwarsa/≤ 30 hari: ${exp.slice(0, 4).map((b) => b.nama).join(", ")}`] : []),
    ];
    tingkat = ganda.length || kurang.length || exp.length ? "peringatan" : "info"; href = ganda.length ? "/admin/alat#seri-ganda" : "/admin/stok";
  } else if (id === "pemeliharaan") {
    const [macet, wrBaru, r] = await Promise.all([
      prisma.perintahKerja.findMany({ where: { status: { in: ["Terbuka", "Dikerjakan"] }, updatedAt: { lt: new Date(kini.getTime() - 3 * HARI) } }, select: { nomor: true }, take: 50 }),
      prisma.permintaanKerja.count({ where: { status: "Baru", createdAt: { lt: new Date(kini.getTime() - HARI) } } }),
      getRingkasanPemeliharaan(null),
    ]);
    isi = [
      macet.length ? `${n(macet.length)} perintah kerja macet > 3 hari: ${macet.slice(0, 5).map((m) => m.nomor).join(", ")}` : "Tidak ada perintah kerja macet",
      wrBaru ? `${n(wrBaru)} laporan kerusakan belum ditanggapi > 1 hari` : "Semua laporan kerusakan sudah ditanggapi",
      `${n(r.preventifTempo)} preventif jatuh tempo, ${n(r.preventif30)} lagi dalam 30 hari`,
    ];
    tingkat = macet.length || wrBaru ? "bahaya" : r.preventifTempo ? "peringatan" : "info"; href = "/admin/pemeliharaan";
  } else if (id === "kalibrasi") {
    const r = await getRingkasanPemeliharaan(null);
    isi = [`${n(r.kalKedaluwarsa)} alat kalibrasi kedaluwarsa / tidak laik`, `${n(r.kalSegera)} alat habis masa kalibrasi ≤ 30 hari`, `${n(r.kalLaik)} alat laik`];
    tingkat = r.kalKedaluwarsa ? "bahaya" : r.kalSegera ? "peringatan" : "info"; href = "/kalibrasi?status=bermasalah#data-kalibrasi";
  } else if (id === "perencanaan") {
    const r = await ringkasanAllies(null);
    isi = [`${n(r.kandidat.length)} kandidat penggantian/penghapusan`, ...r.kandidat.slice(0, 5).map((a) => `${a.kode} · ${a.nama} · ${a.unit} · skor ${a.skor}`)];
    tingkat = r.kandidat.length ? "peringatan" : "info"; href = "/allies";
  } else {
    const log = (await bacaLog()).filter((c) => c.karyawan !== "umum" && kini.getTime() - new Date(c.waktu).getTime() < HARI);
    isi = log.length ? log.map((c) => `${KARYAWAN.find((x) => x.id === c.karyawan)?.nama}: ${c.isi[0]}`) : ["Belum ada laporan karyawan lain dalam 24 jam terakhir"];
    const { aiAktif, jawabAI } = await import("./allies-ai");
    if (aiAktif()) {
      try {
        const j = await jawabAI(`Susun ringkasan harian pengelolaan alat kesehatan (maks. 6 poin singkat, prioritas tertinggi dulu) dari laporan berikut:\n${isi.join("\n")}`, [], "umum", null);
        const teks = j.blok.flatMap((b) => ("isi" in b && typeof b.isi === "string" ? [b.isi] : [])).join("\n").trim();
        if (teks) { isi = teks.split("\n").map((x) => x.replace(/^[-*•\d.\s]+/, "").trim()).filter(Boolean).slice(0, 8); ai = true; }
      } catch (e) { isi.push(`(AI tidak tersedia: ${(e as Error).message})`); }
    }
    tingkat = log.some((c) => c.tingkat === "bahaya") ? "bahaya" : log.some((c) => c.tingkat === "peringatan") ? "peringatan" : "info"; href = "/admin/karyawan-ai";
  }
  const c: CatatanKerja = { id: `${id}-${kini.getTime()}`, karyawan: id, waktu: kini.toISOString(), judul: `${k.nama} · ${k.bidang}`, isi, tingkat, href, ai, manual };
  await tulisLog(c);
  return c;
}

const wib = (d: Date) => new Date(d.getTime() + 7 * 3600_000);
/** Dipanggil tiap menit oleh penjadwal: jalankan karyawan yang aktif dan sudah tiba jam kerjanya (sekali sehari). */
export async function putaranJadwal(kini = new Date()) {
  const w = wib(kini), jamKini = w.toISOString().slice(11, 16), tgl = w.toISOString().slice(0, 10), hari = w.getUTCDay();
  const [jadwal, log] = await Promise.all([bacaJadwal(), bacaLog()]);
  const urut = [...KARYAWAN].sort((a, b) => (a.id === "umum" ? 1 : 0) - (b.id === "umum" ? 1 : 0));
  for (const k of urut) {
    const j = jadwal[k.id];
    if (!j?.aktif || jamKini < j.jam || (j.hari === "kerja" && (hari === 0 || hari === 6))) continue;
    if (log.some((c) => c.karyawan === k.id && !c.manual && wib(new Date(c.waktu)).toISOString().slice(0, 10) === tgl)) continue;
    await kerjakan(k.id).catch((e) => console.error(`[karyawan-ai] ${k.id} gagal:`, (e as Error).message));
  }
}
