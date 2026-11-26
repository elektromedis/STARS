/** Fase B — master tugas, SKP (Sistem Kredit Poin), generator jadwal massal. */
import { z } from "zod";

export const JENIS_TUGAS = ["Preventif", "Kalibrasi", "Inspeksi", "Korektif"] as const;
const opsional = (n: number) => z.string().trim().max(n).optional().transform((v) => v || null);

export const skemaSkp = z.object({ kode: z.string().trim().min(1, "Kode SKP wajib diisi").max(60), nama: z.string().trim().min(2, "Nama SKP wajib diisi").max(200), poin: z.coerce.number().min(0, "Poin tidak boleh negatif").max(100_000), uraian: opsional(1000) });
export const skemaTugas = z.object({
  nama: z.string().trim().min(2, "Nama tugas wajib diisi").max(200),
  jenis: z.enum(JENIS_TUGAS),
  durasiMenit: z.coerce.number().int().min(1).max(100_000).default(60),
  periodeHari: z.coerce.number().int().min(1).max(3650).default(90),
  biaya: z.coerce.number().min(0).default(0),
  kritis: z.boolean().default(false),
  kataKunci: opsional(300), checklist: opsional(4000), sukuCadang: opsional(2000),
  skpId: z.coerce.number().int().positive().nullable().optional(),
});

/** Cocokkan nama alat dengan kata kunci tugas (dipisah koma; kosong = semua). */
export function cocokTugas(namaAlat: string, kataKunci: string | null | undefined) {
  const kata = (kataKunci ?? "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
  if (!kata.length) return true;
  const n = namaAlat.toLowerCase();
  return kata.some((k) => n.includes(k));
}
