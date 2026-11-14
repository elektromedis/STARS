import { prisma } from "./prisma";

/**
 * Waktu data STARS terakhir berubah = yang paling baru dari: paket RKPBU/RKBU, inventaris alat, kalibrasi,
 * laporan kerusakan, perintah kerja, produk HTA, bacaan sensor monitoring, dan impor/sinkron Excel.
 * Dipakai lencana "Data Tersinkron" di header. Hanya mengembalikan cap waktu (tanpa isi data).
 */
export async function waktuSinkron(): Promise<Date | null> {
  const [paket, alat, kal, wr, wo, hta, pantau, impor] = await Promise.all([
    prisma.paket.aggregate({ _max: { updatedAt: true } }),
    prisma.alat.aggregate({ _max: { updatedAt: true } }),
    prisma.kalibrasi.aggregate({ _max: { createdAt: true } }),
    prisma.permintaanKerja.aggregate({ _max: { updatedAt: true } }),
    prisma.perintahKerja.aggregate({ _max: { updatedAt: true } }),
    prisma.produkHta.aggregate({ _max: { updatedAt: true } }),
    prisma.lokasiPantau.aggregate({ _max: { terakhirWaktu: true } }),
    prisma.logImpor.aggregate({ _max: { waktu: true }, where: { status: "Berhasil" } }),
  ]);
  const semua = [
    paket._max.updatedAt, alat._max.updatedAt, kal._max.createdAt, wr._max.updatedAt, wo._max.updatedAt,
    hta._max.updatedAt, pantau._max.terakhirWaktu, impor._max.waktu,
  ].filter((d): d is Date => d instanceof Date && d.getTime() <= Date.now() + 5 * 60_000);
  return semua.length ? new Date(Math.max(...semua.map((d) => d.getTime()))) : null;
}
