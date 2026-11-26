/**
 * Hapus laporan kerusakan (WR) dan perintah kerja (WO) yang salah input / tidak jadi.
 * Pengaman: WO berstatus "Selesai" adalah riwayat perbaikan resmi (bisa sudah ber-TTE) — tidak boleh dihapus.
 * Bila WO yang dihapus membuat alat berstatus "Dalam perbaikan", status alat dikembalikan ke "Beroperasi".
 */
import { prisma } from "./prisma";

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

async function pulihkanAlat(tx: Tx, alatId: number | null) {
  if (!alatId) return;
  const masih = await tx.perintahKerja.count({ where: { alatId, status: { in: ["Terbuka", "Dikerjakan"] } } });
  if (!masih) await tx.alat.updateMany({ where: { id: alatId, alasanTidakOperasi: "Dalam perbaikan" }, data: { statusOperasi: "Beroperasi", alasanTidakOperasi: null } });
}

/** Hapus satu laporan kerusakan beserta WO-nya (bila WO belum selesai). */
export async function hapusPermintaan(id: number): Promise<{ ok: string } | { error: string }> {
  const wr = await prisma.permintaanKerja.findUnique({ where: { id }, include: { perintah: true } });
  if (!wr) return { error: "Laporan tidak ditemukan." };
  if (wr.perintah?.status === "Selesai") return { error: `Laporan ${wr.nomor} sudah diselesaikan lewat ${wr.perintah.nomor} — riwayat perbaikan selesai tidak dapat dihapus.` };
  await prisma.$transaction(async (tx) => {
    if (wr.perintah) {
      await tx.perintahKerja.delete({ where: { id: wr.perintah.id } });
      await tx.tandaTangan.deleteMany({ where: { nomor: { in: [wr.perintah.nomor, wr.nomor] } } });
      await pulihkanAlat(tx, wr.perintah.alatId);
    } else await tx.tandaTangan.deleteMany({ where: { nomor: wr.nomor } });
    await tx.permintaanKerja.delete({ where: { id } });
  });
  return { ok: `Laporan ${wr.nomor}${wr.perintah ? ` dan perintah kerja ${wr.perintah.nomor}` : ""} dihapus.` };
}

/** Hapus satu WO yang belum selesai. Laporan asalnya (bila ada) tetap ada dan kembali berstatus "Baru". */
export async function hapusPerintah(id: number): Promise<{ ok: string; nomor: string } | { error: string }> {
  const wo = await prisma.perintahKerja.findUnique({ where: { id }, include: { permintaan: true } });
  if (!wo) return { error: "Perintah kerja tidak ditemukan." };
  if (wo.status === "Selesai") return { error: `${wo.nomor} sudah selesai — riwayat perbaikan selesai tidak dapat dihapus.` };
  await prisma.$transaction(async (tx) => {
    await tx.perintahKerja.delete({ where: { id } });
    await tx.tandaTangan.deleteMany({ where: { nomor: wo.nomor } });
    if (wo.permintaanId) await tx.permintaanKerja.update({ where: { id: wo.permintaanId }, data: { status: "Baru" } });
    await pulihkanAlat(tx, wo.alatId);
  });
  return { ok: `Perintah kerja ${wo.nomor} dihapus${wo.permintaan ? `; laporan ${wo.permintaan.nomor} kembali berstatus Baru` : ""}.`, nomor: wo.nomor };
}
