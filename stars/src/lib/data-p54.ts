import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { DataUji } from "./pdf-p54";

export const pilihUji = {
  tanggal: true, berlakuSampai: true, laik: true, kalibrator: true, petugas: true, metode: true, keterangan: true, nomorSertifikat: true, jenis: true,
  alat: { select: { nama: true, merek: true, model: true, nomorSeri: true, kodeAspak: true, akl: true, lokasi: true, unitKerja: { select: { nama: true } }, ruangan: { select: { nama: true } } } },
} as const;
type Baris = { tanggal: Date; berlakuSampai: Date | null; laik: boolean; kalibrator: string; petugas: string | null; metode: string | null; keterangan: string | null; nomorSertifikat: string | null; jenis: string;
  alat: { nama: string; merek: string | null; model: string | null; nomorSeri: string | null; kodeAspak: string | null; akl: string | null; lokasi: string | null; unitKerja: { nama: string }; ruangan: { nama: string } | null } };
export const keDataUji = (k: Baris): DataUji => ({ ...k, alat: { ...k.alat, unit: k.alat.unitKerja.nama, ruangan: k.alat.ruangan?.nama ?? k.alat.lokasi } });
export const RADIASI = /x ?-?ray|rontgen|ct ?scan|c-?arm|mammo|fluoro|dental|panoramic|angio|nuklir/i;
let logo: string | null | undefined;
export async function logoRsud() { if (logo !== undefined) return logo; try { logo = `data:image/png;base64,${(await readFile(join(process.cwd(), "public", "label", "logo-rsud.png"))).toString("base64")}`; } catch { logo = null; } return logo; }
