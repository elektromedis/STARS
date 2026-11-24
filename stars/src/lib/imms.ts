/**
 * STARS IMMS — logika inti aplikasi Inventaris & Pemeliharaan (domain terpisah).
 *  • Alur kerja: Permenkes 65/2016 Standar Pelayanan Elektromedik (pemeliharaan terencana, inspeksi, perbaikan).
 *  • Kerangka data & indikator: WHO Inventory and Maintenance Management Information System (IMMIS) 2025.
 *  • Nilai EM = F + A + M + H (Fennigkoh & Smith); H dihitung dari perbaikan 30 bulan terakhir.
 * Modul server biasa (bukan "use client").
 */
import { prisma } from "./prisma";
import { AMBANG_EM, faktorRiwayat } from "./risiko-who";

export { AMBANG_EM };

/** Aturan frekuensi dari nilai EM (WHO Medical equipment maintenance programme overview, Lampiran A.1). Dapat disesuaikan unit elektromedis. */
export function intervalDariEm(total: number | null): number | null {
  if (total == null || total < AMBANG_EM) return null;
  if (total >= 19) return 4; // 3× setahun
  if (total >= 15) return 6; // 2× setahun
  return 12; // 1× setahun
}
export const labelInterval = (b: number | null | undefined) => (b == null ? "Tidak dijadwalkan" : b === 12 ? "Setahun sekali" : b === 6 ? "Setahun dua kali" : b === 4 ? "Setahun tiga kali" : `Tiap ${b} bulan`);

export type NilaiEm = { f: number | null; a: number | null; m: number | null; h: number; kerusakan: number; total: number | null; interval: number | null; lengkap: boolean };

export function hitungEm(alat: { emFungsi: number | null; emRisiko: number | null; emPemeliharaan: number | null }, kerusakan30Bulan: number): NilaiEm {
  const h = faktorRiwayat(kerusakan30Bulan).nilai;
  const lengkap = alat.emFungsi != null && alat.emRisiko != null && alat.emPemeliharaan != null;
  const total = lengkap ? alat.emFungsi! + alat.emRisiko! + alat.emPemeliharaan! + h : null;
  return { f: alat.emFungsi, a: alat.emRisiko, m: alat.emPemeliharaan, h, kerusakan: kerusakan30Bulan, total, interval: intervalDariEm(total), lengkap };
}

const BULAN30 = 30 * 30.44 * 86_400_000;

/** Jumlah perbaikan (WO korektif selain Batal) per alat dalam 30 bulan terakhir. */
export async function kerusakanPerAlat(alatIds?: number[]) {
  const rows = await prisma.perintahKerja.groupBy({
    by: ["alatId"],
    where: { jenis: "Korektif", status: { not: "Batal" }, createdAt: { gte: new Date(Date.now() - BULAN30) }, ...(alatIds ? { alatId: { in: alatIds } } : { alatId: { not: null } }) },
    _count: { _all: true },
  });
  return new Map(rows.map((r) => [r.alatId as number, r._count._all]));
}

/**
 * Hitung ulang EM satu alat, simpan riwayatnya bila berubah, lalu sesuaikan jadwal terencana otomatis
 * ("IMMS: Pemeliharaan terencana & inspeksi"). Alat EM < 12 → jadwal otomatis dinonaktifkan.
 */
export async function perbaruiEm(alatId: number, sebab: string, oleh?: string | null) {
  const alat = await prisma.alat.findUnique({ where: { id: alatId }, select: { id: true, emFungsi: true, emRisiko: true, emPemeliharaan: true } });
  if (!alat) return null;
  const n = hitungEm(alat, (await kerusakanPerAlat([alatId])).get(alatId) ?? 0);
  if (!n.lengkap) return n;
  const akhir = await prisma.riwayatEm.findFirst({ where: { alatId }, orderBy: { waktu: "desc" } });
  if (!akhir || akhir.total !== n.total || akhir.fungsi !== n.f || akhir.aplikasi !== n.a || akhir.pemeliharaan !== n.m || sebab === "Penilaian") {
    await prisma.riwayatEm.create({ data: { alatId, fungsi: n.f!, aplikasi: n.a!, pemeliharaan: n.m!, riwayat: n.h, total: n.total!, kerusakan: n.kerusakan, intervalBulan: n.interval, sebab, oleh: oleh ?? null } });
  }
  await prisma.alat.update({ where: { id: alatId }, data: { emDinilaiPada: new Date() } });
  await sinkronJadwal(alatId, n.interval);
  return n;
}

export const NAMA_JADWAL = "IMMS: Pemeliharaan terencana & inspeksi";
export const CEKLIS_TERENCANA = [
  "Persiapan: bahan habis pakai, prosedur pemeliharaan, aksesoris",
  "Pembersihan",
  "Pelumasan (bila ada bagian bergerak)",
  "Penggantian aksesoris yang mencapai batas usia pakai",
  "Uji fungsi setelah pemeliharaan",
].join("\n");

async function sinkronJadwal(alatId: number, intervalBulan: number | null) {
  const ada = await prisma.jadwalPreventif.findFirst({ where: { alatId, nama: NAMA_JADWAL } });
  if (intervalBulan == null) {
    if (ada?.aktif) await prisma.jadwalPreventif.update({ where: { id: ada.id }, data: { aktif: false } });
    return;
  }
  const intervalHari = Math.round(intervalBulan * 30.44);
  if (!ada) {
    await prisma.jadwalPreventif.create({ data: { alatId, nama: NAMA_JADWAL, intervalHari, checklist: CEKLIS_TERENCANA, berikutnya: new Date(Date.now() + 7 * 86_400_000) } });
  } else if (ada.intervalHari !== intervalHari || !ada.aktif) {
    const dasar = ada.terakhir ?? new Date();
    await prisma.jadwalPreventif.update({ where: { id: ada.id }, data: { intervalHari, aktif: true, berikutnya: ada.terakhir ? new Date(dasar.getTime() + intervalHari * 86_400_000) : ada.berikutnya ?? new Date() } });
  }
}

/** Prioritas & batas penyelesaian pemeliharaan korektif (WHO IMMIS 2025, contoh tabel prioritas). */
export const PRIORITAS_WHO: Record<string, { label: string; hari: number; ket: string }> = {
  Darurat: { label: "Darurat (emergent)", hari: 2, ket: "Kegagalan dapat menyebabkan kekurangan serius pelayanan pasien, atau alat kritis" },
  Tinggi: { label: "Mendesak (urgent)", hari: 7, ket: "Kegagalan dapat menyebabkan kekurangan serius pelayanan pasien" },
  Normal: { label: "Rutin (routine)", hari: 30, ket: "Tidak bekerja semestinya, tidak berpengaruh pada pelayanan pasien" },
  Rendah: { label: "Jangka panjang", hari: 90, ket: "Ditunda atas permintaan pengguna atau butuh waktu lama" },
};
export const batasSelesai = (dibuat: Date, prioritas: string) => new Date(dibuat.getTime() + (PRIORITAS_WHO[prioritas]?.hari ?? 30) * 86_400_000);

/** Tahap alur perbaikan (Permenkes 65/2016, diagram alur perbaikan) dari isian perintah kerja. */
export const TAHAP_PERBAIKAN = ["Laporan keluhan", "Analisis kerusakan", "Usulan & persetujuan", "Pelaksanaan perbaikan", "Uji fungsi", "Selesai"] as const;
export function tahapPerbaikan(w: { status: string; analisis: string | null; usulanStatus: string | null; ujiFungsi: string | null; tanggalMulai: Date | null }) {
  if (w.status === "Selesai") return 5;
  if (w.ujiFungsi) return 4;
  if (w.tanggalMulai || w.usulanStatus === "Disetujui") return 3;
  if (w.usulanStatus) return 2;
  if (w.analisis) return 1;
  return 0;
}

const jam = (ms: number) => Math.round((ms / 3_600_000) * 10) / 10;

/** Indikator kinerja utama (WHO IMMIS 2025): MTTR, waktu tanggap, downtime, kepatuhan PM, MTBF. */
export async function indikator(dari: Date, sampai: Date) {
  const wo = await prisma.perintahKerja.findMany({
    where: { createdAt: { gte: dari, lt: sampai }, status: { not: "Batal" } },
    select: { jenis: true, status: true, createdAt: true, tanggapanPada: true, tanggalMulai: true, tanggalSelesai: true, prioritas: true, alatId: true, biaya: true },
  });
  const kor = wo.filter((w) => w.jenis === "Korektif");
  const selesai = kor.filter((w) => w.tanggalSelesai);
  const mttr = selesai.length ? jam(selesai.reduce((s, w) => s + (w.tanggalSelesai!.getTime() - (w.tanggalMulai ?? w.createdAt).getTime()), 0) / selesai.length) : null;
  const ditanggap = kor.filter((w) => w.tanggapanPada ?? w.tanggalMulai);
  const tanggap = ditanggap.length ? jam(ditanggap.reduce((s, w) => s + ((w.tanggapanPada ?? w.tanggalMulai)!.getTime() - w.createdAt.getTime()), 0) / ditanggap.length) : null;
  const downtime = jam(kor.reduce((s, w) => s + ((w.tanggalSelesai ?? (sampai < new Date() ? sampai : new Date())).getTime() - w.createdAt.getTime()), 0));
  const tepat = selesai.filter((w) => w.tanggalSelesai! <= batasSelesai(w.createdAt, w.prioritas)).length;
  const terencana = wo.filter((w) => w.jenis !== "Korektif");
  const pmSelesai = terencana.filter((w) => w.status === "Selesai").length;
  const alatRusak = new Set(kor.map((w) => w.alatId).filter(Boolean)).size;
  const jamPeriode = jam(sampai.getTime() - dari.getTime());
  const mtbf = kor.length && alatRusak ? Math.round(((jamPeriode * alatRusak) / kor.length) * 10) / 10 : null;
  return {
    korektif: kor.length, korektifSelesai: selesai.length, terencana: terencana.length, terencanaSelesai: pmSelesai,
    kepatuhanPm: terencana.length ? Math.round((pmSelesai / terencana.length) * 100) : null,
    tepatWaktu: selesai.length ? Math.round((tepat / selesai.length) * 100) : null,
    mttr, tanggap, downtime, mtbf, biaya: wo.reduce((s, w) => s + (w.biaya ?? 0), 0),
  };
}

export const fmtTgl = (d: Date | null | undefined) => (d ? new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Jakarta" }).format(d) : "—");
export const fmtRp = (n: number | null | undefined) => (n == null ? "—" : new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n));
