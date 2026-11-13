/** Validasi isian catatan kalibrasi (CMS) — dipakai route simpan & ubah. */
import { z } from "zod";
import { adalahIso, berlakuOtomatis, dariIso, isoTanggal } from "./kalibrasi";

const teksOpsional = (maks: number) => z.string().trim().max(maks).optional().nullable().transform((v) => v || null);

export const skemaBarisKalibrasi = z.object({
  alatId: z.coerce.number().int().positive({ message: "Alat wajib dipilih" }),
  tanggal: z.string().refine(adalahIso, "Tanggal kalibrasi tidak valid"),
  berlakuSampai: z.string().optional().nullable().transform((v) => v || null).refine((v) => v === null || adalahIso(v), "Tanggal berlaku tidak valid"),
  kalibrator: z.string().trim().min(1, "Lembaga kalibrator wajib diisi").max(160),
  nomorSertifikat: teksOpsional(120),
  laik: z.boolean(),
  petugas: teksOpsional(120),
  metode: teksOpsional(160),
  keterangan: teksOpsional(1000),
}).superRefine((d, ctx) => {
  if (d.tanggal > isoTanggal(new Date(Date.now() + 86_400_000))) ctx.addIssue({ code: "custom", message: "Tanggal kalibrasi tidak boleh di masa depan", path: ["tanggal"] });
  if (d.berlakuSampai && d.berlakuSampai < d.tanggal) ctx.addIssue({ code: "custom", message: "Berlaku sampai tidak boleh sebelum tanggal kalibrasi", path: ["berlakuSampai"] });
});
export type BarisKalibrasi = z.infer<typeof skemaBarisKalibrasi>;

/** Data Prisma dari baris valid; berlaku kosong → otomatis tanggal + 12 bulan. */
export const dataKalibrasi = (d: BarisKalibrasi) => ({
  tanggal: dariIso(d.tanggal),
  berlakuSampai: dariIso(d.berlakuSampai ?? berlakuOtomatis(d.tanggal)),
  kalibrator: d.kalibrator,
  nomorSertifikat: d.nomorSertifikat,
  laik: d.laik,
  petugas: d.petugas,
  metode: d.metode,
  keterangan: d.keterangan,
});

export const pesanZod = (e: z.ZodError) => [...new Set(e.issues.map((i) => i.message))].join("; ");
