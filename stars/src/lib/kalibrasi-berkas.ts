/** Penyimpanan berkas sertifikat kalibrasi di UPLOAD_DIR/kalibrasi (server saja). */
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { prisma } from "./prisma";
import { MAKS_DOKUMEN } from "./dokumen";
import { tipeSertifikat } from "./kalibrasi";

export const folderKalibrasi = () => join(process.env.UPLOAD_DIR || join(process.cwd(), "uploads"), "kalibrasi");
export const POLA_BERKAS = /^[0-9a-f-]{36}\.[a-z]+$/i;

export type BerkasValid = { buf: Buffer; ext: string; mime: string; nama: string; ukuran: number };

/** Periksa berkas unggahan (ukuran, ekstensi, magic bytes). Kembalikan pesan galat bila tidak lolos. */
export async function periksaSertifikat(file: File): Promise<BerkasValid | { error: string; status: number }> {
  if (file.size === 0) return { error: "Berkas kosong.", status: 400 };
  if (file.size > MAKS_DOKUMEN) return { error: `${file.name}: ukuran melebihi 15 MB.`, status: 413 };
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  const tipe = tipeSertifikat(ext);
  if (!tipe) return { error: `${file.name}: format harus PDF, JPG, atau PNG.`, status: 400 };
  const buf = Buffer.from(await file.arrayBuffer());
  if (!tipe.tanda.some((t) => t.every((b, i) => buf[i] === b))) return { error: `${file.name}: isi berkas tidak cocok dengan format .${ext}.`, status: 400 };
  return { buf, ext, mime: tipe.mime, nama: file.name.slice(0, 200), ukuran: file.size };
}

export async function simpanSertifikat(b: BerkasValid): Promise<string> {
  const nama = `${randomUUID()}.${b.ext}`;
  await mkdir(folderKalibrasi(), { recursive: true });
  await writeFile(join(folderKalibrasi(), nama), b.buf);
  return nama;
}

/** Hapus berkas bila tidak ada lagi catatan kalibrasi yang merujuknya (sertifikat kolektif dipakai bersama). */
export async function hapusJikaYatim(berkas: string | null | undefined) {
  if (!berkas || !POLA_BERKAS.test(berkas)) return;
  const masih = await prisma.kalibrasi.count({ where: { berkas } });
  if (masih > 0) return;
  await unlink(join(folderKalibrasi(), berkas)).catch(() => {});
}
