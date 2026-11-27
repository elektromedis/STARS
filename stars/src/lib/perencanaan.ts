/** Perencanaan pengadaan (gaya TRILUX): usulan → verifikasi/nominasi → pagu; serta depresiasi dengan inflasi. */
import { z } from "zod";

export const SIFAT = ["Baru", "Tambah", "Ganti"] as const;
export const KONDISI_GANTI = ["Tidak beroperasi", "Rusak berat", "Rusak ringan", "Baik"] as const;
export const SUMBER_DANA = ["APBD", "APBN", "BLUD", "JKN", "DAK", "Hibah", "Swasta", "Lainnya"] as const;

const skor = z.coerce.number().int().min(1, "Skor 1–5").max(5, "Skor 1–5");
export const skemaUsulan = z.object({
  tahun: z.coerce.number().int().min(2020).max(2100),
  unitKerjaId: z.coerce.number().int().positive().nullable(),
  ruangan: z.string().max(120).optional(),
  namaAlat: z.string().min(2, "Nama alat wajib").max(200),
  sifat: z.enum(SIFAT),
  jumlah: z.coerce.number().int().min(1, "Jumlah minimal 1"),
  hargaSatuan: z.coerce.number().min(0, "Harga tidak boleh negatif"),
  gantiUsia: z.coerce.number().int().min(0).nullable(),
  gantiKondisi: z.enum(KONDISI_GANTI).nullable(),
  alasan: z.string().max(1000).optional(),
  skorUrgensi: skor, skorExisting: skor, skorPeruntukan: skor,
}).refine((v) => v.sifat !== "Ganti" || (v.gantiUsia != null && v.gantiKondisi != null), { message: "Usulan Ganti perlu usia dan kondisi alat lama" });

export const skemaVerifikasi = z.object({
  id: z.coerce.number().int().positive(),
  status: z.enum(["Disetujui", "Ditolak"]),
  jumlahSetuju: z.coerce.number().int().min(0),
  kabidUrgensi: skor, kabidExisting: skor, kabidPeruntukan: skor,
  sumberDana: z.string().max(40).optional(),
  masukPagu: z.boolean(), sesuaiIndikator: z.boolean(), sesuaiProgram: z.boolean(), sesuaiAspak: z.boolean(), sesuaiLegal: z.boolean(),
  catatan: z.string().max(500).optional(),
});

/** Skala 0–100 dari tiga skor 1–5 (rata-rata × 20). */
export const skorSkala = (a?: number | null, b?: number | null, c?: number | null) => (a && b && c ? Math.round(((a + b + c) / 3) * 20 * 10) / 10 : null);
/** Nilai akhir: bila ada penilaian verifikator → 40% pengusul + 60% verifikator; selain itu skor pengusul. (Bobot bawaan STARS, bukan salinan TRILUX.) */
export function skorAkhir(pengusul: number | null, kabid: number | null) {
  if (pengusul == null) return kabid;
  if (kabid == null) return pengusul;
  return Math.round((0.4 * pengusul + 0.6 * kabid) * 10) / 10;
}

/** Nilai terinflasi (perkiraan biaya penggantian) = harga × Π(1 + inflasi tahunan) dari tahun perolehan s.d. tahun berjalan. */
export function nilaiTerinflasi(harga: number, tahunPerolehan: number, inflasi: Map<number, number>, tahunIni = new Date().getFullYear()) {
  let f = 1; for (let t = tahunPerolehan + 1; t <= tahunIni; t++) f *= 1 + (inflasi.get(t) ?? 0) / 100;
  return Math.round(harga * f);
}
/** Nilai buku garis lurus (tanpa residu): harga × (1 − umur/usiaTeknis), minimal 0. */
export function nilaiBuku(harga: number, tahunPerolehan: number, usiaTeknis: number, tahunIni = new Date().getFullYear()) {
  if (usiaTeknis <= 0) return harga;
  return Math.round(harga * Math.max(0, 1 - (tahunIni - tahunPerolehan) / usiaTeknis));
}
