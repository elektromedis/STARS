/**
 * Analitik manajemen teknologi kesehatan (HTM) — WHO Development of medical devices policies, 2nd ed. (2025)
 * dan WHO Inventory and maintenance management information system for medical devices (2025):
 * biaya total kepemilikan (TCO), prediksi kerusakan (MTBF), kecukupan tenaga elektromedis, keberlanjutan.
 */
const HARI = 86_400_000;

/** Biaya total kepemilikan = harga perolehan + biaya perintah kerja (servis/suku cadang) + estimasi energi. */
export function tco(o: { harga: number | null; biayaServis: number; dayaWatt: number | null; jamPerHari?: number; tarifKwh?: number; tahunPakai: number }) {
  const energi = o.dayaWatt ? (o.dayaWatt / 1000) * (o.jamPerHari ?? 8) * 365 * Math.max(1, o.tahunPakai) * (o.tarifKwh ?? 1444.7) : 0;
  const total = (o.harga ?? 0) + o.biayaServis + energi;
  return { energi: Math.round(energi), total: Math.round(total), rasioServis: o.harga ? o.biayaServis / o.harga : null };
}

/** Prediksi kerusakan berikutnya dari rata-rata selang antar-laporan kerusakan (MTBF). Perlu ≥ 2 kejadian. */
export function prediksiKerusakan(waktu: Date[], kini = new Date()) {
  const t = [...waktu].sort((a, b) => a.getTime() - b.getTime());
  if (t.length < 2) return null;
  const selang = t.slice(1).map((x, i) => (x.getTime() - t[i].getTime()) / HARI);
  const mtbf = selang.reduce((a, b) => a + b, 0) / selang.length;
  const berikut = new Date(t[t.length - 1].getTime() + mtbf * HARI);
  const sisaHari = Math.round((berikut.getTime() - kini.getTime()) / HARI);
  return { mtbf: Math.round(mtbf), berikut, sisaHari, kejadian: t.length };
}

/**
 * Kecukupan tenaga elektromedis (jabatan fungsional Teknisi Elektromedis — Permenpan RB 28/2013,
 * Permenkes 51/2015). Patokan indikatif WHO 2025 §8.2.4 (Lancet Global Health Commission): ±1 per 100 tempat tidur;
 * RS sekunder ≥1 di tempat, RS tersier >2. Bukan standar ketenagaan resmi Indonesia (gunakan ABK/WISN).
 */
export function kecukupanElektromedis(o: { tempatTidur: number; elektromedis: number; jumlahAlat: number; tersier: boolean }) {
  const kebutuhanTT = Math.ceil(o.tempatTidur / 100);
  const minimum = o.tersier ? 3 : 1;
  const kebutuhan = Math.max(kebutuhanTT, minimum);
  return { kebutuhan, kurang: Math.max(0, kebutuhan - o.elektromedis), alatPerOrang: o.elektromedis ? Math.round(o.jumlahAlat / o.elektromedis) : null, perSeratusTT: o.tempatTidur ? Math.round((o.elektromedis / o.tempatTidur) * 1000) / 10 : null };
}
