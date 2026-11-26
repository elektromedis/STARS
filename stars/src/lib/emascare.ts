/** EMASCARE dari TRILUX — penilaian ruangan, percakapan keluhan, permintaan alat. Modul server biasa. */
import { prisma } from "./prisma";

export const HASIL_RUANGAN = ["Berfungsi", "Belum berfungsi"] as const;
export const STATUS_PERMINTAAN_ALAT = ["Baru", "Pengadaan", "Mutasi", "Relokasi", "Ditolak", "Selesai", "Dibatalkan"] as const;
export const KEPUTUSAN_PERMINTAAN_ALAT = ["Pengadaan", "Mutasi", "Relokasi", "Ditolak"] as const;
export const MAKS_ITEM = 10;

/** Unit yang membatasi pengguna ruangan (Viewer dengan unit kerja); null = tidak dibatasi. */
export const unitBatas = (u: { peran: string; unitKerjaId?: number | null }) => (u.peran === "Viewer" && u.unitKerjaId ? u.unitKerjaId : null);

export async function nomorPermintaanAlat() {
  const th = new Date().getFullYear(), prefix = `PA-${th}-`;
  const akhir = await prisma.permintaanAlat.findFirst({ where: { nomor: { startsWith: prefix } }, orderBy: { nomor: "desc" }, select: { nomor: true } });
  return `${prefix}${String((Number(akhir?.nomor.slice(prefix.length)) || 0) + 1).padStart(4, "0")}`;
}

export const bintang = (n: number | null | undefined) => (n ? "★".repeat(n) + "☆".repeat(5 - n) : "—");
