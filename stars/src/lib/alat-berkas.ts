/** Penyimpanan foto alat (UPLOAD_DIR/alat) dan dokumen alat (UPLOAD_DIR/dokumen-alat). Server saja. */
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { prisma } from "./prisma";
import { TIPE_DOKUMEN } from "./dokumen";
import { FOTO_ALAT, MAKS_DOKUMEN_ALAT, namaFotoKecil } from "./dokumen-alat";

const dasar = () => process.env.UPLOAD_DIR || join(process.cwd(), "uploads");
export const folderFotoAlat = () => join(dasar(), "alat");
export const folderDokumenAlat = () => join(dasar(), "dokumen-alat");

/** <uuid>.jpg atau <uuid>-kecil.jpg (juga png/webp). */
export const POLA_FOTO_ALAT = /^[0-9a-f-]{36}(-kecil)?\.(jpg|png|webp)$/i;
export const POLA_DOKUMEN_ALAT = /^[0-9a-f-]{36}\.[a-z]+$/i;

const GAMBAR: Record<string, { mime: string; tanda: number[] }> = {
  jpg: { mime: "image/jpeg", tanda: [0xff, 0xd8, 0xff] },
  png: { mime: "image/png", tanda: [0x89, 0x50, 0x4e, 0x47] },
  webp: { mime: "image/webp", tanda: [0x52, 0x49, 0x46, 0x46] },
};
export const mimeFotoAlat = (nama: string) => GAMBAR[(nama.split(".").pop() ?? "").toLowerCase()]?.mime ?? "application/octet-stream";

/** Kenali gambar dari isinya (bukan dari nama berkas). */
function jenisGambar(buf: Buffer): string | null {
  for (const [ext, g] of Object.entries(GAMBAR)) if (g.tanda.every((b, i) => buf[i] === b)) {
    if (ext === "webp" && buf.subarray(8, 12).toString("latin1") !== "WEBP") continue;
    return ext;
  }
  return null;
}

/** Simpan foto utama + gambar kecil (keduanya sudah diperkecil di browser). Mengembalikan nama foto utama. */
export async function simpanFotoAlat(besar: File, kecil: File | null): Promise<{ foto: string } | { error: string }> {
  if (besar.size === 0) return { error: "Foto kosong." };
  if (besar.size > FOTO_ALAT.maksUnggah || (kecil && kecil.size > FOTO_ALAT.maksUnggah)) return { error: "Foto terlalu besar (maks 3 MB setelah diperkecil)." };
  const bufBesar = Buffer.from(await besar.arrayBuffer());
  const ext = jenisGambar(bufBesar);
  if (!ext) return { error: "Foto harus berupa gambar JPG, PNG, atau WEBP." };
  let bufKecil = bufBesar;
  if (kecil && kecil.size > 0) {
    const b = Buffer.from(await kecil.arrayBuffer());
    if (jenisGambar(b) !== ext) return { error: "Gambar kecil tidak cocok dengan foto utama." };
    bufKecil = b;
  }
  const foto = `${randomUUID()}.${ext}`;
  await mkdir(folderFotoAlat(), { recursive: true });
  await writeFile(join(folderFotoAlat(), foto), bufBesar);
  await writeFile(join(folderFotoAlat(), namaFotoKecil(foto)), bufKecil);
  return { foto };
}

/** Hapus berkas foto bila tak ada alat / produk HTA lain yang memakainya. */
export async function hapusFotoAlat(foto: string | null | undefined) {
  if (!foto || !POLA_FOTO_ALAT.test(foto)) return;
  if ((await prisma.alat.count({ where: { foto } })) > 0 || (await prisma.produkHta.count({ where: { foto } })) > 0) return;
  await unlink(join(folderFotoAlat(), foto)).catch(() => {});
  await unlink(join(folderFotoAlat(), namaFotoKecil(foto))).catch(() => {});
}

export type DokumenValid = { buf: Buffer; ext: string; mime: string; nama: string; ukuran: number };

export async function periksaDokumenAlat(file: File): Promise<DokumenValid | { error: string; status: number }> {
  if (file.size === 0) return { error: "Berkas kosong.", status: 400 };
  if (file.size > MAKS_DOKUMEN_ALAT) return { error: `${file.name}: ukuran melebihi 30 MB.`, status: 413 };
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  const tipe = TIPE_DOKUMEN[ext];
  if (!tipe) return { error: `${file.name}: format harus PDF, JPG, PNG, DOCX, atau XLSX.`, status: 400 };
  const buf = Buffer.from(await file.arrayBuffer());
  if (!tipe.tanda.some((t) => t.every((b, i) => buf[i] === b))) return { error: `${file.name}: isi berkas tidak cocok dengan format .${ext}.`, status: 400 };
  return { buf, ext: ext === "jpeg" ? "jpg" : ext, mime: tipe.mime, nama: file.name.slice(0, 200), ukuran: file.size };
}

export async function simpanDokumenAlat(d: DokumenValid): Promise<string> {
  const nama = `${randomUUID()}.${d.ext}`;
  await mkdir(folderDokumenAlat(), { recursive: true });
  await writeFile(join(folderDokumenAlat(), nama), d.buf);
  return nama;
}

/** Berkas dipakai bersama beberapa alat; hapus hanya bila tak dirujuk lagi. */
export async function hapusDokumenAlatJikaYatim(berkas: string | null | undefined) {
  if (!berkas || !POLA_DOKUMEN_ALAT.test(berkas)) return;
  if ((await prisma.dokumenAlat.count({ where: { berkas } })) > 0) return;
  await unlink(join(folderDokumenAlat(), berkas)).catch(() => {});
}
