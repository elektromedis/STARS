/**
 * Angka ringkasan untuk halaman publik /perjalanan ("Perjalanan Alat Kesehatan").
 * Hanya agregat (jumlah/persentase) — tanpa nama pelapor, kontak, atau data per orang.
 */
import { prisma } from "./prisma";

export type AngkaPerjalanan = {
  alat: number; ruangan: number; unit: number;
  penerimaan: number; penerimaanTahunIni: number;
  berAspak: number; berKategori: number;
  jadwal: number; jadwalTepat: number; jadwalLewat: number;
  kalibrasiLaik: number; kalibrasiTotal: number; kalibrasiSegera: number;
  laporanBulanIni: number; woTerbuka: number; woSelesai: number;
  usulan: number; usulanSetuju: number; penghapusan: number; tua: number;
};

export async function angkaPerjalanan(now = new Date()): Promise<AngkaPerjalanan> {
  const awalTahun = new Date(now.getFullYear(), 0, 1), awalBulan = new Date(now.getFullYear(), now.getMonth(), 1);
  const segera = new Date(now.getTime() + 30 * 86400000);
  const [alat, ruangan, unit, penerimaan, penerimaanTahunIni, berAspak, berKategori, jadwal, jadwalLewat, kal, laporanBulanIni, woTerbuka, woSelesai, usulan, usulanSetuju, penghapusan, umur] = await Promise.all([
    prisma.alat.count({ where: { aktif: true } }),
    prisma.ruangan.count({ where: { aktif: true } }),
    prisma.unitKerja.count({ where: { NOT: { nama: "TIDAK ADA" } } }),
    prisma.penerimaanAlat.count(),
    prisma.penerimaanAlat.count({ where: { tanggal: { gte: awalTahun } } }),
    prisma.alat.count({ where: { aktif: true, kodeAspak: { not: null } } }),
    prisma.alat.count({ where: { aktif: true, kategoriInventaris: { not: null } } }),
    prisma.jadwalPreventif.count({ where: { aktif: true } }),
    prisma.jadwalPreventif.count({ where: { aktif: true, berikutnya: { lt: now } } }),
    // kalibrasi terakhir per alat aktif
    prisma.kalibrasi.findMany({ where: { alat: { aktif: true } }, orderBy: { tanggal: "desc" }, distinct: ["alatId"], select: { laik: true, berlakuSampai: true } }),
    prisma.permintaanKerja.count({ where: { createdAt: { gte: awalBulan } } }),
    prisma.perintahKerja.count({ where: { status: { in: ["Terbuka", "Dikerjakan"] } } }),
    prisma.perintahKerja.count({ where: { status: "Selesai" } }),
    prisma.usulanPengadaan.count({ where: { tahun: { gte: now.getFullYear() } } }),
    prisma.usulanPengadaan.count({ where: { tahun: { gte: now.getFullYear() }, status: "Disetujui" } }),
    prisma.penghapusan.count(),
    prisma.alat.findMany({ where: { aktif: true, tahunPerolehan: { not: null }, usiaTeknis: { gt: 0 } }, select: { tahunPerolehan: true, usiaTeknis: true } }),
  ]);
  const berlaku = kal.filter((k) => k.laik && (!k.berlakuSampai || k.berlakuSampai >= now));
  return {
    alat, ruangan, unit, penerimaan, penerimaanTahunIni, berAspak, berKategori,
    jadwal, jadwalTepat: jadwal - jadwalLewat, jadwalLewat,
    kalibrasiLaik: berlaku.length, kalibrasiTotal: kal.length,
    kalibrasiSegera: berlaku.filter((k) => k.berlakuSampai && k.berlakuSampai <= segera).length,
    laporanBulanIni, woTerbuka, woSelesai, usulan, usulanSetuju, penghapusan,
    tua: umur.filter((a) => now.getFullYear() - (a.tahunPerolehan ?? 0) >= (a.usiaTeknis ?? Infinity)).length,
  };
}
