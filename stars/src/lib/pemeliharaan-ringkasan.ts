/** Angka agregat modul pemeliharaan untuk dashboard publik (tanpa data pribadi/pelapor). */
import { prisma } from "./prisma";

const HARI = 86_400_000;

/** Klausa `where` per model untuk membatasi data pemeliharaan ke satu unit kerja (null = semua unit). */
export function batasUnit(unit: string | null | undefined) {
  const u = unit ? { unitKerja: { nama: unit } } : null;
  return {
    alat: u ?? {},
    permintaan: u ?? {},
    perintah: u ? { OR: [{ alat: u }, { permintaan: u }] } : {},
    viaAlat: u ? { alat: u } : {},
  };
}

export async function getRingkasanPemeliharaan(unit?: string | null) {
  const kini = new Date();
  const b = batasUnit(unit);
  const [alatMedik, alatNon, laporanBaru, laporanProses, woAktif, preventifTempo, preventif30, kalibrasi] = await Promise.all([
    prisma.alat.count({ where: { ...b.alat, aktif: true, jenis: "Medik" } }),
    prisma.alat.count({ where: { ...b.alat, aktif: true, jenis: "Non Medik" } }),
    prisma.permintaanKerja.count({ where: { ...b.permintaan, status: "Baru" } }),
    prisma.permintaanKerja.count({ where: { ...b.permintaan, status: { in: ["Ditinjau", "Diproses"] } } }),
    prisma.perintahKerja.count({ where: { ...b.perintah, status: { in: ["Terbuka", "Dikerjakan"] } } }),
    prisma.jadwalPreventif.count({ where: { ...b.viaAlat, aktif: true, berikutnya: { lte: kini } } }),
    prisma.jadwalPreventif.count({ where: { ...b.viaAlat, aktif: true, berikutnya: { gt: kini, lte: new Date(kini.getTime() + 30 * HARI) } } }),
    prisma.kalibrasi.findMany({ where: b.viaAlat, orderBy: { tanggal: "desc" }, select: { alatId: true, laik: true, berlakuSampai: true } }),
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
