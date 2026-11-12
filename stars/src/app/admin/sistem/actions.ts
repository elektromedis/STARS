"use server";

import { mkdir } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { sesiApi } from "@/lib/sesi";
import { audit, ipDari } from "@/lib/audit";

export type StatusAksi = { ok?: string; error?: string } | undefined;

/** Folder cadangan otomatis, di samping berkas basis data (di Docker: volume /app/data/cadangan). */
function folderCadangan() {
  const file = (process.env.DATABASE_URL ?? "").replace(/^file:/, "");
  // Prisma membaca path SQLite relatif terhadap folder prisma/.
  const db = isAbsolute(file) ? file : join(process.cwd(), "prisma", file);
  return join(dirname(db), "cadangan");
}

/**
 * Hapus semua paket pada kelompok (tahun, tahap) terpilih — Admin+, wajib ketik "HAPUS".
 * Sebelum menghapus, salinan konsisten basis data dibuat (VACUUM INTO); bila gagal, penghapusan dibatalkan.
 */
export async function hapusDataPaket(_prev: StatusAksi, fd: FormData): Promise<StatusAksi> {
  const { sesi, tolak } = await sesiApi("Admin");
  if (tolak) return { error: "Memerlukan peran Admin." };
  if (process.env.STARS_MODE === "internet") return { error: "Server mode internet bersifat baca saja." };
  if (String(fd.get("konfirmasi") ?? "").trim() !== "HAPUS") return { error: 'Ketik HAPUS (huruf besar) untuk konfirmasi.' };

  const grup = fd.getAll("grup").map(String).map((g) => {
    const [t, ...th] = g.split("|");
    return { tahun: Number(t), tahap: th.join("|") };
  }).filter((g) => Number.isInteger(g.tahun) && g.tahap);
  if (grup.length === 0) return { error: "Pilih minimal satu tahun/tahap." };
  if (!(process.env.DATABASE_URL ?? "").startsWith("file:")) return { error: "Hapus dengan cadangan otomatis hanya untuk SQLite." };

  const jumlah = await prisma.paket.count({ where: { OR: grup } });
  if (jumlah === 0) return { error: "Tidak ada paket pada pilihan itu." };

  const stempel = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = folderCadangan();
  const berkas = resolve(join(dir, `stars-sebelum-hapus-${stempel}.db`));
  try {
    await mkdir(dir, { recursive: true });
    await prisma.$executeRawUnsafe(`VACUUM INTO '${berkas.replace(/\\/g, "/").replace(/'/g, "''")}'`);
  } catch (err) {
    return { error: `Cadangan otomatis gagal dibuat, penghapusan dibatalkan: ${err instanceof Error ? err.message : String(err)}` };
  }

  const hasil = await prisma.paket.deleteMany({ where: { OR: grup } });
  const ringkas = grup.map((g) => `${g.tahap} ${g.tahun}`).join(", ");
  await audit("paket.hapus", { email: sesi.user.email, ip: ipDari(await headers()), objek: ringkas, detail: `${hasil.count} paket dihapus; cadangan ${berkas}` });
  revalidatePath("/", "layout");
  return { ok: `${hasil.count} paket dihapus (${ringkas}). Cadangan sebelum hapus: ${berkas}` };
}
