import { prisma } from "./prisma";

export const STATUS_MUTASI = ["Diajukan", "Disetujui", "Ditolak", "Selesai", "Dibatalkan"] as const;
export const STATUS_TERBUKA = ["Diajukan", "Disetujui"];

export async function nomorMutasiBaru() {
  const th = new Date().getFullYear();
  const akhir = await prisma.mutasiAlat.findFirst({ where: { nomor: { startsWith: `MUT-${th}-` } }, orderBy: { nomor: "desc" }, select: { nomor: true } });
  return `MUT-${th}-${String((Number(akhir?.nomor.slice(9)) || 0) + 1).padStart(4, "0")}`;
}
