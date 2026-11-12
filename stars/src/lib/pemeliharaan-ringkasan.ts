/** Angka agregat modul pemeliharaan untuk dashboard publik (tanpa data pribadi/pelapor). */
import { prisma } from "./prisma";

const HARI = 86_400_000;

export async function getRingkasanPemeliharaan() {
  const kini = new Date();
  const [alatMedik, alatNon, laporanBaru, laporanProses, woAktif, preventifTempo, preventif30, kalibrasi] = await Promise.all([
    prisma.alat.count({ where: { aktif: true, jenis: "Medik" } }),
    prisma.alat.count({ where: { aktif: true, jenis: "Non Medik" } }),
    prisma.permintaanKerja.count({ where: { status: "Baru" } }),
    prisma.permintaanKerja.count({ where: { status: { in: ["Ditinjau", "Diproses"] } } }),
    prisma.perintahKerja.count({ where: { status: { in: ["Terbuka", "Dikerjakan"] } } }),
    prisma.jadwalPreventif.count({ where: { aktif: true, berikutnya: { lte: kini } } }),
    prisma.jadwalPreventif.count({ where: { aktif: true, berikutnya: { gt: kini, lte: new Date(kini.getTime() + 30 * HARI) } } }),
    prisma.kalibrasi.findMany({ orderBy: { tanggal: "desc" }, select: { alatId: true, laik: true, berlakuSampai: true } }),
  ]);
  // Status kalibrasi alat = catatan terbarunya.
  const terkini = new Map<number, { laik: boolean; berlakuSampai: Date | null }>();
  for (const k of kalibrasi) if (!terkini.has(k.alatId)) terkini.set(k.alatId, k);
  let kalKedaluwarsa = 0, kalSegera = 0, kalLaik = 0;
  for (const k of terkini.values()) {
    if (!k.laik) { kalKedaluwarsa++; continue; }
    const sisa = k.berlakuSampai ? (k.berlakuSampai.getTime() - kini.getTime()) / HARI : Infinity;
    if (sisa < 0) kalKedaluwarsa++; else if (sisa <= 30) kalSegera++; else kalLaik++;
  }
  return { alatMedik, alatNon, laporanBaru, laporanTerbuka: laporanBaru + laporanProses, woAktif, preventifTempo, preventif30, kalKedaluwarsa, kalSegera, kalLaik };
}
