import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { prisma } from "./prisma";
import { INFO_BAWAAN, type InfoSitus } from "./situs";

export const folderSitus = () => join(process.env.UPLOAD_DIR || join(process.cwd(), "uploads"), "situs");
export const POLA_GAMBAR_SITUS = /^[0-9a-f-]{36}\.(jpg|png|webp)$/i;

export async function bacaInfoSitus(): Promise<InfoSitus> {
  const r = await prisma.pengaturanSitus.findUnique({ where: { kunci: "info" } }).catch(() => null);
  try { return { ...INFO_BAWAAN, ...(r ? (JSON.parse(r.nilai) as Partial<InfoSitus>) : {}) }; } catch { return INFO_BAWAAN; }
}

export async function pengumumanAktif() {
  const kini = new Date();
  return prisma.pengumuman.findMany({
    where: { aktif: true, OR: [{ mulai: null }, { mulai: { lte: kini } }], AND: [{ OR: [{ selesai: null }, { selesai: { gte: kini } }] }] },
    orderBy: [{ urut: "asc" }, { id: "desc" }], take: 5, select: { id: true, judul: true, gambar: true, tautan: true },
  }).catch(() => []);
}

const TANDA: [string, number[]][] = [["jpg", [0xff, 0xd8, 0xff]], ["png", [0x89, 0x50, 0x4e, 0x47]], ["webp", [0x52, 0x49, 0x46, 0x46]]];
/** Simpan gambar pop-up (maks 3 MB, dikenali dari isi). */
export async function simpanGambarSitus(f: File): Promise<string | { error: string }> {
  if (f.size === 0 || f.size > 3 * 1024 * 1024) return { error: "Gambar wajib, maksimal 3 MB." };
  const buf = Buffer.from(await f.arrayBuffer());
  const ext = TANDA.find(([, t]) => t.every((b, i) => buf[i] === b))?.[0];
  if (!ext) return { error: "Gambar harus JPG, PNG, atau WEBP." };
  await mkdir(folderSitus(), { recursive: true });
  const nama = `${randomUUID()}.${ext}`;
  await writeFile(join(folderSitus(), nama), buf);
  return nama;
}
