/**
 * Aturan kalibrasi yang dipakai bersama CMS Kalibrasi, Daftar/Inventaris Alat, dan dashboard.
 * Aman diimpor dari komponen klien (tanpa Prisma / Node API).
 */
import { TIPE_DOKUMEN } from "./dokumen";

export const HARI = 86_400_000;
/** Masa berlaku bawaan: tanggal kalibrasi + 12 bulan (sama dengan Trilux CAMS: kalibrasi_next = tgl + 1 tahun). */
export const INTERVAL_KALIBRASI_BULAN = 12;
export const PILIHAN_INTERVAL = [6, 12, 24, 36] as const;
/** Ambang "segera" (hari) sebelum masa berlaku habis. */
export const AMBANG_SEGERA = 30;

/** Sertifikat: PDF (dibaca otomatis) atau foto/pindaian JPG/PNG. */
export const EKSTENSI_SERTIFIKAT = ["pdf", "jpg", "jpeg", "png"] as const;
export const TERIMA_SERTIFIKAT = ".pdf,.jpg,.jpeg,.png";
export const tipeSertifikat = (ext: string) => ((EKSTENSI_SERTIFIKAT as readonly string[]).includes(ext) ? TIPE_DOKUMEN[ext] : undefined);

/** "YYYY-MM-DD" (UTC) dari Date/ISO. */
export const isoTanggal = (d: Date | string | null | undefined) => (d ? new Date(d).toISOString().slice(0, 10) : "");
export const dariIso = (s: string) => new Date(`${s}T00:00:00Z`);
export const adalahIso = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(dariIso(s).getTime()) && isoTanggal(dariIso(s)) === s;

/** Tambah n bulan; tanggal 31 → akhir bulan bila bulan tujuan lebih pendek (31 Jan + 1 bln = 28/29 Feb). */
export function tambahBulan(d: Date, n: number): Date {
  const hari = d.getUTCDate();
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
  const akhir = new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth() + 1, 0)).getUTCDate();
  x.setUTCDate(Math.min(hari, akhir));
  return x;
}
export const berlakuOtomatis = (tanggalIso: string, bulan: number = INTERVAL_KALIBRASI_BULAN) => (adalahIso(tanggalIso) ? isoTanggal(tambahBulan(dariIso(tanggalIso), bulan)) : "");

export type VarianStatus = "danger" | "warning" | "success" | "outline";
export type StatusKalibrasi = { kunci: "bermasalah" | "segera" | "berlaku" | "tanpa-batas" | "belum"; label: string; variant: VarianStatus; peringkat: number };

/** Status kalibrasi alat dari catatan TERBARU-nya (null = belum pernah dicatat). */
export function statusKalibrasi(k: { berlakuSampai: string | Date | null; laik: boolean } | null | undefined, kini = Date.now()): StatusKalibrasi {
  if (!k) return { kunci: "belum", label: "Belum ada data", variant: "outline", peringkat: 4 };
  if (!k.laik) return { kunci: "bermasalah", label: "Tidak laik", variant: "danger", peringkat: 0 };
  if (!k.berlakuSampai) return { kunci: "tanpa-batas", label: "Tanpa masa berlaku", variant: "outline", peringkat: 3 };
  const sisa = Math.ceil((new Date(k.berlakuSampai).getTime() - kini) / HARI);
  if (sisa < 0) return { kunci: "bermasalah", label: `Kedaluwarsa ${-sisa} hr`, variant: "danger", peringkat: 0 };
  if (sisa <= AMBANG_SEGERA) return { kunci: "segera", label: `${sisa} hari lagi`, variant: "warning", peringkat: 1 };
  return { kunci: "berlaku", label: "Berlaku", variant: "success", peringkat: 2 };
}

/** Filter status di Inventaris. */
export const FILTER_KALIBRASI = [
  { kode: "bermasalah", label: "Kedaluwarsa / tidak laik" },
  { kode: "segera", label: `Habis ≤ ${AMBANG_SEGERA} hari` },
  { kode: "berlaku", label: "Berlaku" },
  { kode: "belum", label: "Belum ada data" },
] as const;

export const tglIndo = (d: string | Date | null | undefined) => (d ? new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }) : "—");
