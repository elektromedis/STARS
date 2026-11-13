/** Validasi data ProdukHta (server). */
import { z } from "zod";
import { MAKS_SPESIFIKASI, bacaAngka, kunciProduk } from "./hta-banding";

const opsTeks = (maks: number) => z.string().trim().max(maks).transform((v) => v || null).nullable().optional();
const opsAngka = (min: number, max: number) => z.union([z.number(), z.string().trim()]).nullable().optional().transform((v, ctx) => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : bacaAngka(String(v));
  if (n === null || !Number.isFinite(n) || n < min || n > max) { ctx.addIssue({ code: "custom", message: `Harus angka ${min}–${max}` }); return z.NEVER; }
  return n;
});

export const skemaProdukHta = z.object({
  nama: z.string().trim().min(2, "Jenis alat wajib diisi").max(150),
  merek: opsTeks(100),
  model: opsTeks(150),
  harga: opsAngka(0, 1e13),
  garansiBulan: opsAngka(0, 600).transform((v) => (v === null ? null : Math.round(v))),
  usiaTeknis: opsAngka(0, 100).transform((v) => (v === null ? null : Math.round(v))),
  tkdn: opsAngka(0, 100),
  akl: opsTeks(100),
  asal: opsTeks(100),
  penyedia: opsTeks(200),
  tautan: z.string().trim().max(500).refine((v) => !v || /^https?:\/\//i.test(v), "Tautan harus diawali http:// atau https://").transform((v) => v || null).nullable().optional(),
  catatan: opsTeks(2000),
  spesifikasi: z.array(z.object({
    parameter: z.string().trim().min(1).max(80),
    nilai: z.string().trim().max(120).default(""),
    satuan: z.string().trim().max(30).default(""),
    arah: z.enum(["tinggi", "rendah", "-"]).default("-"),
  })).max(MAKS_SPESIFIKASI).default([]),
}).refine((d) => d.merek || d.model, { message: "Isi merek atau tipe/model agar produk dapat dibedakan", path: ["merek"] });

export function dataProdukHta(d: z.infer<typeof skemaProdukHta>) {
  return {
    kunci: kunciProduk(d.nama, d.merek, d.model),
    nama: d.nama, merek: d.merek ?? null, model: d.model ?? null, harga: d.harga ?? null, garansiBulan: d.garansiBulan ?? null,
    usiaTeknis: d.usiaTeknis ?? null, tkdn: d.tkdn ?? null, akl: d.akl ?? null, asal: d.asal ?? null, penyedia: d.penyedia ?? null,
    tautan: d.tautan ?? null, catatan: d.catatan ?? null, spesifikasi: d.spesifikasi.length ? JSON.stringify(d.spesifikasi) : null,
  };
}

export const pesanZodHta = (e: z.ZodError) => e.issues.slice(0, 3).map((i) => `${i.path.join(".") || "data"}: ${i.message}`).join("; ");
