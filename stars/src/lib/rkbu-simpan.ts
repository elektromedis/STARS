/** Validasi & penyimpanan dokumen RKBU (server saja). */
import { mkdir, readdir, stat, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "./prisma";
import { GAMBAR_RKBU, KOLOM_RKBU, MAKS_BARIS_RKBU, MAKS_LAMPIRAN_RKBU, POLA_GAMBAR_RKBU, gambarDirujuk, totalRkbu, type IsiRkbu } from "./rkbu";

const dasar = () => process.env.UPLOAD_DIR || join(process.cwd(), "uploads");
export const folderRkbu = () => join(dasar(), "rkbu");

const teks = (maks: number) => z.string().max(maks, `Teks terlalu panjang (maks ${maks} karakter)`).default("");
const angka = z.coerce.number().refine(Number.isFinite, "Angka tidak valid");
const gambar = z.string().regex(POLA_GAMBAR_RKBU, "Nama gambar tidak valid").nullable().default(null);

const skemaBaris = z.object({
  id: z.string().min(1).max(64),
  // batas longgar: uraian di kertas kerja RS bisa sangat panjang (daftar suku cadang/spesifikasi)
  rekening: teks(1000), barang: teks(5000), uraian: teks(20000), lokasi: teks(1000), kodeBarang: teks(200),
  vol1: angka.min(0), satuan1: teks(60), vol2: angka.min(0), satuan2: teks(60),
  harga: angka.min(0).max(1e13), jumlahManual: angka.min(0).max(1e14).nullable().default(null),
  prioritas: teks(60), keterangan: teks(5000), paketKode: z.string().max(60).optional(),
});

export const skemaIsiRkbu = z.object({
  versi: z.literal(1),
  jenis: z.enum(["Pemeliharaan", "Pengadaan"]),
  tahun: z.coerce.number().int().min(2000).max(2100),
  tahap: z.string().min(1).max(40),
  kop: z.object({ tampil: z.boolean(), logo: gambar, pemerintah: teks(200), nama: teks(200), alamat: teks(300), kontak: teks(300), kota: teks(100), kodePos: teks(100) }),
  judul: z.array(teks(300)).max(6),
  identitas: z.array(z.object({ label: teks(100), nilai: teks(300) })).max(12),
  kolom: z.object(Object.fromEntries([...KOLOM_RKBU, "kelompokJumlah", "kelompokHarga"].map((k) => [k, teks(80)]))) as unknown as z.ZodType<IsiRkbu["kolom"]>,
  ppn: angka.min(0).max(100),
  baris: z.array(skemaBaris).max(MAKS_BARIS_RKBU, `Maksimal ${MAKS_BARIS_RKBU} baris`),
  catatan: z.array(teks(500)).max(12),
  pengesahan: z.object({
    pembuka: teks(200), tempatTanggal: teks(120),
    ttd: z.array(z.object({ jabatan: teks(300), nama: teks(120), nip: teks(60) })).max(4, "Maksimal 4 penandatangan"),
  }),
  lampiran: z.array(z.object({ id: z.string().min(1).max(64), judul: teks(300), gambar })).max(MAKS_LAMPIRAN_RKBU, `Maksimal ${MAKS_LAMPIRAN_RKBU} lampiran`),
  cetak: z.object({ kertas: z.enum(["A4", "F4"]), orientasi: z.enum(["landscape", "portrait"]), huruf: angka.min(6).max(12), nomorHalaman: z.boolean(), barisUtuh: z.boolean().default(false) }),
});

export const skemaSimpanRkbu = z.object({ judul: z.string().trim().min(1, "Nama dokumen wajib diisi").max(200), isi: skemaIsiRkbu });

export const pesanZod = (e: z.ZodError) => e.issues.slice(0, 3).map((i) => `${i.path.join(".") || "isi"}: ${i.message}`).join("; ");

/** Ringkasan untuk kolom daftar dokumen. */
export function ringkasRkbu(judul: string, isi: IsiRkbu) {
  const unit = isi.identitas.find((i) => /unit/i.test(i.label))?.nilai || null;
  return { judul, jenis: isi.jenis, tahun: isi.tahun, tahap: isi.tahap, unit, jumlahBaris: isi.baris.length, total: totalRkbu(isi), isi: JSON.stringify(isi) };
}

/** Pastikan gambar yang dirujuk benar-benar ada di folder (mencegah rujukan ke berkas sembarang). */
export async function gambarAda(isi: IsiRkbu) {
  for (const g of gambarDirujuk(isi)) {
    try { await stat(join(folderRkbu(), g)); } catch { return `Gambar ${g} tidak ditemukan — unggah ulang.`; }
  }
  return null;
}

const TANDA: Record<string, number[]> = { jpg: [0xff, 0xd8, 0xff], png: [0x89, 0x50, 0x4e, 0x47], webp: [0x52, 0x49, 0x46, 0x46] };
export const mimeGambarRkbu = (nama: string) => ({ jpg: "image/jpeg", png: "image/png", webp: "image/webp" })[(nama.split(".").pop() ?? "").toLowerCase()] ?? "application/octet-stream";

export async function simpanGambarRkbu(f: File): Promise<{ gambar: string } | { error: string }> {
  if (f.size === 0) return { error: "Gambar kosong." };
  if (f.size > GAMBAR_RKBU.maksUnggah) return { error: "Gambar terlalu besar (maks 4 MB setelah diperkecil)." };
  const buf = Buffer.from(await f.arrayBuffer());
  const ext = Object.entries(TANDA).find(([e, t]) => t.every((b, i) => buf[i] === b) && (e !== "webp" || buf.subarray(8, 12).toString("latin1") === "WEBP"))?.[0];
  if (!ext) return { error: "Berkas harus gambar JPG, PNG, atau WEBP." };
  const gambar = `${randomUUID()}.${ext}`;
  await mkdir(folderRkbu(), { recursive: true });
  await writeFile(join(folderRkbu(), gambar), buf);
  return { gambar };
}

/**
 * Hapus gambar di UPLOAD_DIR/rkbu yang tidak dirujuk dokumen mana pun dan berumur > 1 hari
 * (gambar baru diunggah tetapi dokumennya belum disimpan tetap aman).
 */
export async function bersihkanGambarRkbu() {
  let nama: string[];
  try { nama = await readdir(folderRkbu()); } catch { return 0; }
  const dipakai = new Set<string>();
  for (const d of await prisma.dokumenRkbu.findMany({ select: { isi: true } })) {
    try { for (const g of gambarDirujuk(JSON.parse(d.isi) as IsiRkbu)) dipakai.add(g); } catch { /* isi rusak: abaikan */ }
  }
  const batas = Date.now() - 24 * 3600 * 1000;
  let n = 0;
  for (const f of nama) {
    if (!POLA_GAMBAR_RKBU.test(f) || dipakai.has(f)) continue;
    const s = await stat(join(folderRkbu(), f)).catch(() => null);
    if (s && s.mtimeMs < batas) { await unlink(join(folderRkbu(), f)).catch(() => {}); n++; }
  }
  return n;
}

/** Isi dokumen tersimpan → objek; null bila rusak. */
export function bacaIsiRkbu(json: string): IsiRkbu | null {
  try {
    const r = skemaIsiRkbu.safeParse(JSON.parse(json));
    return r.success ? (r.data as IsiRkbu) : null;
  } catch { return null; }
}
