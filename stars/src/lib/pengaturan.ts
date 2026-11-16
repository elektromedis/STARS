import { prisma } from "@/lib/prisma";

/** Kunci pengaturan yang dikenal. */
export const KUNCI = { waAdminLapor: "wa_admin_lapor" } as const;

export async function bacaPengaturan(kunci: string): Promise<string | null> {
  try { return (await prisma.pengaturan.findUnique({ where: { kunci } }))?.nilai ?? null; } catch { return null; }
}

export async function simpanPengaturan(kunci: string, nilai: string | null, oleh: string | null) {
  if (!nilai) { await prisma.pengaturan.deleteMany({ where: { kunci } }); return; }
  await prisma.pengaturan.upsert({ where: { kunci }, update: { nilai, diubahOleh: oleh }, create: { kunci, nilai, diubahOleh: oleh } });
}
