/** Fase D — metrik kinerja pemeliharaan (waktu tanggap, kinerja teknisi, kepatuhan preventif). Server saja. */
import { prisma } from "./prisma";

const JAM = 3_600_000;
export const fmtJam = (j: number | null) => (j == null ? "—" : j < 1 ? `${Math.round(j * 60)} mnt` : j < 48 ? `${j.toFixed(1)} jam` : `${(j / 24).toFixed(1)} hari`);

export async function ambilKinerja(dari: Date, sampai: Date) {
  const wo = await prisma.perintahKerja.findMany({
    where: { createdAt: { gte: dari, lte: sampai } },
    select: { id: true, jenis: true, status: true, createdAt: true, tanggapanPada: true, tanggalSelesai: true, rating: true, biaya: true, jadwal: { select: { tugas: { select: { skp: { select: { poin: true } } } } } }, teknisi: { select: { id: true, nama: true } }, permintaan: { select: { createdAt: true } } },
  });
  const korektif = wo.filter((w) => w.jenis === "Korektif");
  // Waktu tanggap = laporan (WR) → pertama ditangani; bila tak ada WR, dihitung dari pembuatan WO.
  const tanggap = korektif.map((w) => w.tanggapanPada ? (w.tanggapanPada.getTime() - (w.permintaan?.createdAt ?? w.createdAt).getTime()) / JAM : null).filter((x): x is number => x != null && x >= 0);
  const selesai = korektif.map((w) => w.tanggalSelesai ? (w.tanggalSelesai.getTime() - (w.permintaan?.createdAt ?? w.createdAt).getTime()) / JAM : null).filter((x): x is number => x != null && x >= 0);
  const rata = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
  const median = (a: number[]) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

  const per = new Map<number | string, { nama: string; total: number; selesai: number; jam: number[]; rating: number[]; biaya: number; poin: number }>();
  for (const w of wo) {
    const k = w.teknisi?.id ?? "—";
    const e = per.get(k) ?? { nama: w.teknisi?.nama ?? "(belum ditugaskan)", total: 0, selesai: 0, jam: [], rating: [], biaya: 0, poin: 0 };
    e.total++; e.biaya += w.biaya ?? 0;
    if (w.status === "Selesai") { e.selesai++; e.poin += w.jadwal?.tugas?.skp?.poin ?? 0; if (w.tanggalSelesai) e.jam.push((w.tanggalSelesai.getTime() - w.createdAt.getTime()) / JAM); }
    if (w.rating) e.rating.push(w.rating);
    per.set(k, e);
  }
  const teknisi = [...per.values()].map((e) => ({ nama: e.nama, total: e.total, selesai: e.selesai, persenSelesai: e.total ? (e.selesai / e.total) * 100 : 0, rataJam: rata(e.jam), rataRating: rata(e.rating), biaya: e.biaya, poin: e.poin })).sort((a, b) => b.selesai - a.selesai);

  // Kepatuhan preventif: jadwal yang jatuh tempo pada rentang ⇒ sudah ada WO preventif selesai setelah jatuh tempo? Pendekatan sederhana:
  const jadwal = await prisma.jadwalPreventif.findMany({ where: { aktif: true }, select: { id: true, berikutnya: true, terakhir: true, intervalHari: true } });
  const kini = new Date();
  const jatuhTempo = jadwal.filter((j) => j.berikutnya && j.berikutnya <= kini);
  const terlambat = jatuhTempo; // jadwal aktif yang tanggal berikutnya sudah lewat dan belum dikerjakan
  const preventifSelesai = wo.filter((w) => w.jenis === "Preventif" && w.status === "Selesai").length;
  const preventifTotal = wo.filter((w) => w.jenis === "Preventif").length;
  const peringkat = wo.filter((w) => w.rating).map((w) => w.rating!);

  return {
    totalWo: wo.length, korektif: korektif.length,
    tanggapRata: rata(tanggap), tanggapMedian: median(tanggap), selesaiRata: rata(selesai), selesaiMedian: median(selesai),
    preventifSelesai, preventifTotal, kepatuhanPreventif: preventifTotal ? (preventifSelesai / preventifTotal) * 100 : null,
    jadwalAktif: jadwal.length, jadwalTerlambat: terlambat.length,
    ratingRata: rata(peringkat), jumlahRating: peringkat.length, teknisi,
  };
}
