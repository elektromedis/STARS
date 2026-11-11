/**
 * Konstanta, skema validasi, dan pembantu untuk modul Pemeliharaan (CMMS internal).
 * Dipisah dari data pengadaan (Paket) agar tidak saling memengaruhi.
 */
import { z } from "zod";
import { prisma } from "./prisma";

export const PRIORITAS = ["Rendah", "Normal", "Tinggi", "Darurat"] as const;
export const STATUS_PERMINTAAN = ["Baru", "Ditinjau", "Diproses", "Selesai", "Ditolak"] as const;
export const STATUS_PERINTAH = ["Terbuka", "Dikerjakan", "Selesai", "Batal"] as const;
export const JENIS_PERINTAH = ["Korektif", "Preventif"] as const;
export const KONDISI_ALAT = ["Baik", "Rusak Ringan", "Rusak Berat", "Afkir"] as const;

export type Prioritas = (typeof PRIORITAS)[number];
export type StatusPermintaan = (typeof STATUS_PERMINTAAN)[number];
export type StatusPerintah = (typeof STATUS_PERINTAH)[number];

/** Warna badge untuk status/prioritas, memakai varian Badge yang sudah ada. */
export const badgePrioritas: Record<string, "outline" | "teal" | "warning" | "danger"> = {
  Rendah: "outline", Normal: "teal", Tinggi: "warning", Darurat: "danger",
};
export const badgeStatusPermintaan: Record<string, "default" | "teal" | "warning" | "success" | "danger"> = {
  Baru: "warning", Ditinjau: "teal", Diproses: "default", Selesai: "success", Ditolak: "danger",
};
export const badgeStatusPerintah: Record<string, "default" | "teal" | "warning" | "success" | "danger"> = {
  Terbuka: "warning", Dikerjakan: "teal", Selesai: "success", Batal: "danger",
};
export const badgeKondisi: Record<string, "success" | "warning" | "danger" | "outline"> = {
  Baik: "success", "Rusak Ringan": "warning", "Rusak Berat": "danger", Afkir: "outline",
};

const teks = (maks: number, pesan: string) => z.string().trim().min(1, pesan).max(maks);

/** Laporan kerusakan dari publik (tanpa akun). */
export const skemaPermintaan = z.object({
  namaAlat: teks(200, "Nama/jenis alat wajib diisi"),
  alatId: z.coerce.number().int().positive().nullable().optional(),
  unitKerjaId: z.coerce.number().int().positive().nullable().optional(),
  lokasi: z.string().trim().max(200).optional(),
  pelapor: teks(120, "Nama pelapor wajib diisi"),
  kontak: z.string().trim().max(120).optional(),
  keluhan: teks(2000, "Uraian keluhan wajib diisi"),
  prioritas: z.enum(PRIORITAS).default("Normal"),
});

export const skemaAlat = z.object({
  kode: teks(60, "Kode/nomor inventaris wajib diisi"),
  nama: teks(200, "Nama alat wajib diisi"),
  merek: z.string().trim().max(120).optional(),
  model: z.string().trim().max(120).optional(),
  nomorSeri: z.string().trim().max(120).optional(),
  unitKerjaId: z.coerce.number().int().positive({ message: "Unit kerja wajib dipilih" }),
  lokasi: z.string().trim().max(200).optional(),
  kategori: z.string().trim().max(120).optional(),
  tahunPerolehan: z.coerce.number().int().min(1950).max(2100).nullable().optional(),
  kondisi: z.enum(KONDISI_ALAT).default("Baik"),
  catatan: z.string().trim().max(1000).optional(),
});

/**
 * Nomor urut per tahun untuk Permintaan (WR) atau Perintah (WO) kerja.
 * SQLite penulis tunggal; cukup hitung yang ada pada tahun berjalan.
 */
export async function nomorBerikut(jenis: "WR" | "WO"): Promise<string> {
  const tahun = new Date().getFullYear();
  const prefix = `${jenis}-${tahun}-`;
  const terakhir =
    jenis === "WR"
      ? await prisma.permintaanKerja.findFirst({ where: { nomor: { startsWith: prefix } }, orderBy: { nomor: "desc" }, select: { nomor: true } })
      : await prisma.perintahKerja.findFirst({ where: { nomor: { startsWith: prefix } }, orderBy: { nomor: "desc" }, select: { nomor: true } });
  const n = terakhir ? Number(terakhir.nomor.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(n).padStart(4, "0")}`;
}
