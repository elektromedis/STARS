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
export const JENIS_ALAT = ["Medik", "Non Medik"] as const;
export const RISIKO_ALAT = ["Tinggi", "Sedang", "Rendah"] as const;
export const INTERVAL_PRESET = [
  { label: "Harian (1 hari)", hari: 1 }, { label: "Mingguan (7 hari)", hari: 7 }, { label: "Bulanan (30 hari)", hari: 30 },
  { label: "Triwulan (90 hari)", hari: 90 }, { label: "Semester (180 hari)", hari: 180 }, { label: "Tahunan (365 hari)", hari: 365 },
] as const;

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
  ruanganId: z.coerce.number().int().positive().nullable().optional(),
  lokasi: z.string().trim().max(200).optional(),
  kategori: z.string().trim().max(120).optional(),
  jenis: z.enum(JENIS_ALAT).default("Medik"),
  risiko: z.enum(RISIKO_ALAT).nullable().optional(),
  tahunPerolehan: z.coerce.number().int().min(1950).max(2100).nullable().optional(),
  hargaPerolehan: z.coerce.number().min(0).nullable().optional(),
  usiaTeknis: z.coerce.number().int().min(0).max(100).nullable().optional(),
  garansiSampai: z.coerce.date().nullable().optional(),
  kondisi: z.enum(KONDISI_ALAT).default("Baik"),
  catatan: z.string().trim().max(1000).optional(),
  kodeAspak: z.string().trim().max(40).optional(),
  pendanaan: z.string().trim().max(80).optional(),
  akl: z.string().trim().max(120).optional(),
  produsen: z.string().trim().max(160).optional(),
  distributor: z.string().trim().max(160).optional(),
  tanggalUjiFungsi: z.coerce.date().nullable().optional(),
});

export const skemaRuangan = z.object({
  nama: teks(120, "Nama ruangan wajib diisi"),
  gedung: z.string().trim().max(120).optional(),
  unitKerjaId: z.coerce.number().int().positive({ message: "Unit kerja wajib dipilih" }),
  kepala: z.string().trim().max(120).optional(),
});

export const skemaJadwal = z.object({
  alatId: z.coerce.number().int().positive({ message: "Alat wajib dipilih" }),
  nama: teks(160, "Nama pemeliharaan wajib diisi"),
  intervalHari: z.coerce.number().int().min(1, "Interval minimal 1 hari").max(3650),
  checklist: z.string().trim().max(4000).optional(),
  mulai: z.coerce.date(),
});

export const skemaKalibrasi = z.object({
  alatId: z.coerce.number().int().positive({ message: "Alat wajib dipilih" }),
  tanggal: z.coerce.date(),
  kalibrator: teks(160, "Lembaga kalibrator wajib diisi"),
  petugas: z.string().trim().max(120).optional(),
  metode: z.string().trim().max(160).optional(),
  laik: z.coerce.boolean().default(true),
  nomorSertifikat: z.string().trim().max(120).optional(),
  berlakuSampai: z.coerce.date().nullable().optional(),
  keterangan: z.string().trim().max(1000).optional(),
});

/** Tambah N hari ke tanggal (UTC-aman untuk SQLite). */
export const tambahHari = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);

/** Baris checklist: "[x] tugas" = selesai, "[ ] tugas"/"tugas" = belum. */
export function urai(checklist: string | null | undefined) {
  return (checklist ?? "").split(/\r?\n/).map((b) => b.trim()).filter(Boolean).map((b) => {
    const m = /^\[([ xX])\]\s*(.*)$/.exec(b);
    return m ? { selesai: m[1].toLowerCase() === "x", tugas: m[2] } : { selesai: false, tugas: b };
  });
}

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
