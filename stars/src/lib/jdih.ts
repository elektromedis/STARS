import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

export const JENIS_PERATURAN = ["UU", "PP", "Perpres", "Permenkes", "Kepmenkes", "PermenPAN-RB", "Permendagri", "Pergub DKI", "Kepgub DKI", "Peraturan Direktur", "Keputusan Direktur", "SOP", "Pedoman/Standar"];
export const SUBJEK_PERATURAN = ["Alat Kesehatan", "Pengadaan", "Barang Milik Daerah", "SDM", "Data & TTE", "Mutu & Akreditasi", "Lainnya"];
export const STATUS_PERATURAN = ["Berlaku", "Diubah", "Dicabut"];
export const folderJdih = () => join(process.env.UPLOAD_DIR || join(process.cwd(), "uploads"), "jdih");
export const POLA_BERKAS_JDIH = /^[0-9a-f-]{36}\.pdf$/i;

/** Simpan PDF peraturan (maks 5 MB, dicek dari tanda %PDF). */
export async function simpanPdfJdih(f: File): Promise<string | { error: string }> {
  if (f.size > 5 * 1024 * 1024) return { error: "PDF maksimal 5 MB." };
  const buf = Buffer.from(await f.arrayBuffer());
  if (buf.subarray(0, 4).toString() !== "%PDF") return { error: "Berkas harus PDF." };
  await mkdir(folderJdih(), { recursive: true });
  const nama = `${randomUUID()}.pdf`;
  await writeFile(join(folderJdih(), nama), buf);
  return nama;
}
export const namaPeraturan = (p: { jenis: string; nomor: string; tahun: number }) => `${p.jenis} Nomor ${p.nomor} Tahun ${p.tahun}`;
