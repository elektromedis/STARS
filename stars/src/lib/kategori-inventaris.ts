/** Kategorisasi inventaris (CMS Pemeliharaan → Inventarisasi). Alat kesehatan dipisahkan dari Sparepart & BHP-BMHP (tabel stok). */
export const KATEGORI_ALAT = ["Alat Elektromedik Non Radiasi", "Alat Elektromedik Radiasi", "Alat Non Elektromedik"] as const;
export const KATEGORI_STOK = ["Sparepart", "BHP-BMHP"] as const;
export const KATEGORI_INVENTARIS = [...KATEGORI_ALAT, ...KATEGORI_STOK] as const;

const RADIASI = /x[\s-]?ray|rontgen|r[oö]ntgen|radiograf|fluoro|c[\s-]?arm|ct[\s-]?scan|\bct\b|mammo|panoram|cephalo|dental\s*x|cath\s*lab|angiograf|linac|bone\s*densit|dexa|spect|pet[\s-]?ct|brakhi|radioterapi|\bdr\b|\bcr\b/i;
const NON_ELEKTRO = /tempat\s*tidur|bed\b|kursi|meja|lemari|troli|trolley|stretcher|brankar|tiang\s*infus|standar\s*infus|stetoskop|tensimeter\s*(air\s*raksa|aneroid)|gunting|pinset|klem|bak\s*instrumen|baskom|nierbeken|instrumen|set\b|timbangan\s*(bayi\s*)?manual|kruk|walker|tabung\s*oksigen|regulator|flowmeter|spekulum|kom\b|sterilisator\s*kering/i;

/** Tebakan kategori dari nama/jenis alat (dipakai tombol "Kategorikan otomatis"). */
export function tebakKategoriAlat(nama: string, jenis?: string | null): (typeof KATEGORI_ALAT)[number] {
  if (RADIASI.test(nama)) return "Alat Elektromedik Radiasi";
  if (jenis === "Non Medik" || NON_ELEKTRO.test(nama)) return "Alat Non Elektromedik";
  return "Alat Elektromedik Non Radiasi";
}
