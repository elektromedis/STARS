/** Fase A — master rekanan/supplier/kalibrator, merk & tipe, penerimaan alat. */
import { z } from "zod";
import { prisma } from "./prisma";

export const JENIS_REKANAN = ["Supplier", "Rekanan", "Kalibrator", "Servis"] as const;
export const TIPE_PENERIMAAN = ["Pembelian", "Hibah", "Pinjam pakai", "KSO", "Lainnya"] as const;
export const JENIS_BERKAS = ["Kontrak", "BAP", "Faktur", "Lainnya"] as const;

const opsional = (n: number) => z.string().trim().max(n).optional().transform((v) => v || null);

export const skemaRekanan = z.object({
  nama: z.string().trim().min(2, "Nama wajib diisi").max(200),
  jenis: z.enum(JENIS_REKANAN),
  alamat: opsional(300), kontak: opsional(120), telepon: opsional(40),
  email: z.string().trim().max(160).optional().transform((v) => v || null).refine((v) => !v || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), "Format email tidak valid"),
  sertifikat: opsional(120), catatan: opsional(500),
});

export const skemaMerk = z.object({ nama: z.string().trim().min(1, "Nama merk wajib diisi").max(120), negara: opsional(80) });
export const skemaTipe = z.object({ merkId: z.coerce.number().int().positive("Pilih merk"), nama: z.string().trim().min(1, "Nama tipe wajib diisi").max(120), namaAlat: opsional(160) });

export const skemaPenerimaan = z.object({
  nomorKontrak: z.string().trim().min(1, "Nomor kontrak wajib diisi").max(120),
  tanggal: z.coerce.date(),
  nomorBap: opsional(120),
  tanggalBap: z.coerce.date().nullable().optional(),
  rekananId: z.coerce.number().int().positive().nullable().optional(),
  tipe: z.enum(TIPE_PENERIMAAN),
  jenis: z.enum(["Medik", "Non Medik"]),
  nilai: z.coerce.number().min(0).nullable().optional(),
  catatan: opsional(1000),
});

export async function nomorPenerimaanBaru() {
  const th = new Date().getFullYear();
  const akhir = await prisma.penerimaanAlat.findFirst({ where: { nomor: { startsWith: `PNR-${th}-` } }, orderBy: { nomor: "desc" }, select: { nomor: true } });
  return `PNR-${th}-${String((Number(akhir?.nomor.slice(9)) || 0) + 1).padStart(4, "0")}`;
}

/** Penyusutan garis lurus: (harga − residu) / usia manfaat, mulai `tanggalTerhitung` (atau tahun perolehan). */
export function hitungPenyusutan(a: { hargaPerolehan: number | null; nilaiResidu: number | null; usiaTeknis: number | null; tanggalTerhitung: Date | null; tahunPerolehan: number | null }, kini = new Date()) {
  const harga = a.hargaPerolehan ?? 0, residu = Math.min(a.nilaiResidu ?? 0, harga), umur = a.usiaTeknis ?? 0;
  if (!harga || umur <= 0) return null;
  const mulai = a.tanggalTerhitung ?? (a.tahunPerolehan ? new Date(a.tahunPerolehan, 0, 1) : null);
  if (!mulai) return null;
  const tahunBerjalan = Math.max(0, (kini.getTime() - mulai.getTime()) / (365.25 * 86_400_000));
  const perTahun = (harga - residu) / umur;
  const akum = Math.min(harga - residu, perTahun * tahunBerjalan);
  return { perTahun, akumulasi: akum, nilaiBuku: harga - akum, persen: Math.min(100, (tahunBerjalan / umur) * 100), habis: tahunBerjalan >= umur };
}
