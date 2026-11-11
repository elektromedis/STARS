/** 28 Nama Unit Kerja RSUD Cipayung (urutan resmi). Sumber kebenaran ada di tabel UnitKerja; daftar ini untuk template & fallback. */
export const UNIT_KERJA = [
  "AMBULANS", "CSSD", "ELEKTROMEDIK", "FARMASI", "FISIOTERAPI", "GIZI", "GUDANG ALAT KESEHATAN",
  "GUDANG FARMASI", "GUDANG LOGISTIK", "GUDANG PERSIAPAN PEMUSNAHAN", "HCU-ICU", "IGD", "IT",
  "KEBIDANAN", "KESLING", "KMJ", "LAB", "OK", "PERINA", "POLI GIGI", "POLI OBGYN", "RADIOLOGI",
  "RAJAL", "RANAP", "RANAP ISO", "RECALL", "RM", "TIDAK ADA",
] as const;

/** Ejaan lain yang sering muncul di kertas kerja → nama unit resmi. */
const ALIAS: Record<string, string> = {
  "HCU/ICU": "HCU-ICU", ICU: "HCU-ICU", HCU: "HCU-ICU", "ICU-HCU": "HCU-ICU", "HCU - ICU": "HCU-ICU", INTENSIF: "HCU-ICU", "ICU-NICU": "HCU-ICU",
  LABORATORIUM: "LAB", LABORAT: "LAB", RADIOLOGY: "RADIOLOGI", RONTGEN: "RADIOLOGI",
  "KAMAR OPERASI": "OK", IBS: "OK", PERINATOLOGI: "PERINA", NICU: "PERINA",
  VK: "KEBIDANAN", PONEK: "KEBIDANAN", "KAMAR BERSALIN": "KEBIDANAN",
  "REKAM MEDIS": "RM", "REKAM MEDIK": "RM", "RAWAT JALAN": "RAJAL", POLIKLINIK: "RAJAL", POLI: "RAJAL", MCU: "RAJAL",
  "RAWAT INAP": "RANAP", "RANAP ISOLASI": "RANAP ISO", ISOLASI: "RANAP ISO",
  "GUDANG ALKES": "GUDANG ALAT KESEHATAN", "GUDANG KARANTINA ALAT KESEHATAN": "GUDANG ALAT KESEHATAN",
  "INSTALASI GIZI": "GIZI", DAPUR: "GIZI", "INSTALASI FARMASI": "FARMASI", APOTEK: "FARMASI",
  ELEKTROMEDIS: "ELEKTROMEDIK", IPSRS: "ELEKTROMEDIK", "KESEHATAN LINGKUNGAN": "KESLING", SANITASI: "KESLING",
  YANMED: "TIDAK ADA", "SELURUH UNIT": "TIDAK ADA", "SEMUA UNIT": "TIDAK ADA", "-": "TIDAK ADA", "": "TIDAK ADA",
};

const rapikan = (s: string) => s.replace(/\s+/g, " ").trim().toUpperCase();

/**
 * Mencocokkan teks lokasi dengan nama unit resmi.
 * Mengembalikan { unit, tepat } — `tepat=false` berarti hasil pemetaan (alias / unit pertama dari daftar gabungan)
 * sehingga layak diberi peringatan, bukan error. `null` bila tidak dikenali sama sekali.
 */
export function cocokkanUnit(teks: string, daftar: readonly string[] = UNIT_KERJA): { unit: string; tepat: boolean } | null {
  const u = rapikan(teks ?? "");
  const set = new Set(daftar.map(rapikan));
  if (set.has(u)) return { unit: daftar[[...set].indexOf(u)], tepat: true };
  if (u in ALIAS && set.has(ALIAS[u])) return { unit: ALIAS[u], tepat: false };
  for (const unit of [...daftar].sort((a, b) => b.length - a.length)) {
    if (unit !== "TIDAK ADA" && u.startsWith(rapikan(unit) + " ")) return { unit, tepat: false };
  }
  for (const bagian of u.split(/[,/;&]| DAN /)) {
    const b = bagian.trim();
    if (!b) continue;
    if (set.has(b) && b !== "TIDAK ADA") return { unit: daftar[[...set].indexOf(b)], tepat: false };
    if (b in ALIAS && ALIAS[b] !== "TIDAK ADA") return { unit: ALIAS[b], tepat: false };
  }
  return null;
}
