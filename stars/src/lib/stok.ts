/** Inventaris pendukung (WHO §4 & §9.7): suku cadang, BHP, alat kerja, alat uji. */
import { z } from "zod";

export const JENIS_BARANG = ["Suku cadang", "BHP", "Alat kerja", "Alat uji"] as const;
export const JENIS_MUTASI = ["Masuk", "Keluar", "Penyesuaian"] as const;
export const HARI_PERINGATAN = 60;

const opsional = (n: number) => z.string().trim().max(n).optional().transform((v) => v || null);
export const skemaBarang = z.object({
  kode: z.string().trim().min(1, "Kode wajib diisi").max(60),
  nama: z.string().trim().min(1, "Nama wajib diisi").max(200),
  jenis: z.enum(JENIS_BARANG),
  satuan: z.string().trim().min(1).max(30).default("pcs"),
  stokMinimum: z.coerce.number().int().min(0).max(1_000_000).default(0),
  lokasi: opsional(120), nomorLot: opsional(80), alatTerkait: opsional(300), pemasok: opsional(160), catatan: opsional(1000),
  kedaluwarsa: z.coerce.date().nullable().optional(),
  kalibrasiSampai: z.coerce.date().nullable().optional(),
  harga: z.coerce.number().min(0).nullable().optional(),
});
export const skemaMutasi = z.object({
  barangId: z.coerce.number().int().positive(),
  jenis: z.enum(JENIS_MUTASI),
  jumlah: z.coerce.number().int().min(0).max(1_000_000),
  keterangan: opsional(300),
});

export type StatusBarang = { kunci: "habis" | "menipis" | "kedaluwarsa" | "segera-kedaluwarsa" | "kalibrasi" | "aman"; label: string };
export function statusBarang(b: { stok: number; stokMinimum: number; kedaluwarsa: Date | string | null; kalibrasiSampai: Date | string | null; jenis: string }, kini = Date.now()): StatusBarang[] {
  const hasil: StatusBarang[] = [];
  const hari = (d: Date | string | null) => (d ? (new Date(d).getTime() - kini) / 86_400_000 : null);
  if (b.stok <= 0) hasil.push({ kunci: "habis", label: "Stok habis" });
  else if (b.stok <= b.stokMinimum) hasil.push({ kunci: "menipis", label: "Perlu pesan ulang" });
  const k = hari(b.kedaluwarsa);
  if (k != null && k < 0) hasil.push({ kunci: "kedaluwarsa", label: "Kedaluwarsa" });
  else if (k != null && k <= HARI_PERINGATAN) hasil.push({ kunci: "segera-kedaluwarsa", label: `Kedaluwarsa ${Math.ceil(k)} hari lagi` });
  const c = hari(b.kalibrasiSampai);
  if (b.jenis === "Alat uji" && c != null && c <= 30) hasil.push({ kunci: "kalibrasi", label: c < 0 ? "Kalibrasi kedaluwarsa" : `Kalibrasi ${Math.ceil(c)} hari lagi` });
  return hasil.length ? hasil : [{ kunci: "aman", label: "Aman" }];
}
