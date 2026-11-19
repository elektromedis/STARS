/**
 * Sistem pembobotan prioritas pemeliharaan alat kesehatan (skor 0–100).
 * Rujukan: WHO Medical equipment maintenance programme overview (2011) Lampiran A.1 (Fennigkoh–Smith: fungsi,
 * risiko fisik, kebutuhan pemeliharaan, riwayat kejadian); Wang–Levenson (misi kritis & utilisasi);
 * Permenkes 54/2015 Lampiran I (kelas risiko wajib uji); IKATEMI No. 1/2023 (risiko); usia teknis & kondisi (BMD).
 * Data kosong memakai cadangan dari klasifikasi regulasi, lalu nilai tengah — tampil sebagai "perkiraan".
 */
import { klasifikasiP54 } from "./permenkes54";
import { faktorRiwayat } from "./risiko-who";

export const BOBOT = [
  { kunci: "fungsi", label: "Fungsi alat (WHO)", bobot: 25 },
  { kunci: "risiko", label: "Risiko fisik / kelas risiko", bobot: 20 },
  { kunci: "pemeliharaan", label: "Kebutuhan pemeliharaan (WHO)", bobot: 15 },
  { kunci: "riwayat", label: "Riwayat kerusakan 30 bulan", bobot: 15 },
  { kunci: "usia", label: "Usia vs usia teknis", bobot: 10 },
  { kunci: "utilisasi", label: "Utilisasi", bobot: 10 },
  { kunci: "kondisi", label: "Kondisi alat", bobot: 5 },
] as const;
export type KunciBobot = (typeof BOBOT)[number]["kunci"];

export type MasukanBobot = {
  nama: string; emFungsi: number | null; emRisiko: number | null; emPemeliharaan: number | null; emrUtilisasi: number | null;
  ikatemiRisiko: string | null; tahunPerolehan: number | null; usiaTeknis: number | null; kondisi: string; kerusakan30Bulan: number;
};

export const KATEGORI = [
  { min: 70, nama: "Prioritas I", pm: 3, inspeksi: 3, warna: "bg-red-100 text-red-800" },
  { min: 50, nama: "Prioritas II", pm: 6, inspeksi: 6, warna: "bg-amber-100 text-amber-800" },
  { min: 30, nama: "Prioritas III", pm: 12, inspeksi: 12, warna: "bg-sky-100 text-sky-800" },
  { min: 0, nama: "Prioritas IV", pm: null, inspeksi: 12, warna: "bg-slate-100 text-slate-700" },
] as const;

export function hitungBobot(a: MasukanBobot, tahunKini = new Date().getFullYear()) {
  const p54 = klasifikasiP54(a.nama);
  const perkiraan: KunciBobot[] = [];
  const risikoCadangan = p54?.risiko === "High Risk" || a.ikatemiRisiko === "Tinggi" ? 5 : p54?.risiko === "Medium Risk" || a.ikatemiRisiko === "Sedang" ? 3 : p54 || a.ikatemiRisiko ? 1 : null;
  const v = (k: KunciBobot, x: number | null, cadangan: number) => { if (x == null) { perkiraan.push(k); return cadangan; } return x; };
  // tiap faktor dinormalkan ke 0..1
  const n: Record<KunciBobot, number> = {
    fungsi: (v("fungsi", a.emFungsi, p54?.risiko === "High Risk" ? 9 : p54 ? 6 : 4) - 2) / 8,
    risiko: (v("risiko", a.emRisiko ?? risikoCadangan, 2) - 1) / 4,
    pemeliharaan: (v("pemeliharaan", a.emPemeliharaan, p54 ? 3 : 2) - 1) / 4,
    riwayat: (faktorRiwayat(a.kerusakan30Bulan).nilai + 2) / 4,
    usia: a.tahunPerolehan && a.usiaTeknis ? Math.min(1, Math.max(0, (tahunKini - a.tahunPerolehan) / a.usiaTeknis)) : (perkiraan.push("usia"), 0.5),
    utilisasi: v("utilisasi", a.emrUtilisasi, 50) / 100,
    kondisi: a.kondisi === "Baik" ? 0 : a.kondisi === "Rusak Ringan" ? 0.6 : 1,
  };
  const rinci = BOBOT.map((b) => ({ ...b, nilai: Math.round(n[b.kunci] * b.bobot * 10) / 10 }));
  const skor = Math.round(rinci.reduce((s, r) => s + r.nilai, 0));
  let kat = KATEGORI.find((k) => skor >= k.min)!;
  // aturan wajib: Permenkes 54/2015 Pasal 8 — alat Lampiran I minimal uji/kalibrasi & pemeliharaan tahunan
  if (p54 && kat.pm == null) kat = KATEGORI[2];
  return { skor, kategori: kat, rinci, perkiraan, p54, kalibrasiBulan: p54 ? 12 : null };
}
