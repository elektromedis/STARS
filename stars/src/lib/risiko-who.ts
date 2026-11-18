/**
 * Skor risiko inklusi inventaris alat medis — WHO "Introduction to medical equipment inventory management" (2011), Lampiran A.
 *  • EM  (Fennigkoh & Smith, 1989) = Fungsi + Risiko + Pemeliharaan; EM ≥ 12 → masuk inventaris / program pemeliharaan.
 *  • EMR (Wang & Levenson, 2000)   = Misi kritis + 2×Risiko + 2×Pemeliharaan (5–30; makin tinggi makin penting).
 *  • EMR tersesuaikan              = (Misi kritis + 2×Pemeliharaan) × Utilisasi + 2×Risiko (utilisasi 0–100 %).
 * Modul biasa (bukan "use client") agar bisa dipakai komponen server maupun klien.
 */
export type Pilihan = { nilai: number; label: string; grup?: string };

export const FUNGSI_ALAT: Pilihan[] = [
  { nilai: 10, label: "Life support (penunjang hidup)", grup: "Terapeutik" },
  { nilai: 9, label: "Bedah & perawatan intensif", grup: "Terapeutik" },
  { nilai: 8, label: "Terapi fisik & pengobatan", grup: "Terapeutik" },
  { nilai: 7, label: "Monitoring bedah & intensif", grup: "Diagnostik" },
  { nilai: 6, label: "Monitoring fisiologis & diagnostik lain", grup: "Diagnostik" },
  { nilai: 5, label: "Laboratorium analitik", grup: "Analitik" },
  { nilai: 4, label: "Aksesori laboratorium", grup: "Analitik" },
  { nilai: 3, label: "Komputer & terkait", grup: "Analitik" },
  { nilai: 2, label: "Terkait pasien & lainnya", grup: "Lain-lain" },
];
export const RISIKO_FISIK: Pilihan[] = [
  { nilai: 5, label: "Potensi kematian pasien" },
  { nilai: 4, label: "Potensi cedera pasien / operator" },
  { nilai: 3, label: "Terapi tidak tepat / salah diagnosis" },
  { nilai: 2, label: "Kerusakan alat" },
  { nilai: 1, label: "Tidak ada risiko berarti" },
];
export const KEBUTUHAN_PEMELIHARAAN: Pilihan[] = [
  { nilai: 5, label: "Ekstensif: kalibrasi rutin & penggantian komponen" },
  { nilai: 4, label: "Di atas rata-rata" },
  { nilai: 3, label: "Rata-rata: verifikasi kinerja & uji keselamatan" },
  { nilai: 2, label: "Di bawah rata-rata" },
  { nilai: 1, label: "Minimal: inspeksi visual" },
];
export const AMBANG_EM = 12;

export type SkorWho = {
  em: number | null; masuk: boolean | null;
  emr: number | null; emrSesuai: number | null;
  lengkapEm: boolean; lengkapEmr: boolean;
};

export function hitungSkor(a: { emFungsi?: number | null; emRisiko?: number | null; emPemeliharaan?: number | null; emrMisiKritis?: number | null; emrUtilisasi?: number | null }): SkorWho {
  const f = a.emFungsi ?? null, r = a.emRisiko ?? null, m = a.emPemeliharaan ?? null, mc = a.emrMisiKritis ?? null, u = a.emrUtilisasi ?? null;
  const lengkapEm = f != null && r != null && m != null;
  const em = lengkapEm ? f! + r! + m! : null;
  const lengkapEmr = mc != null && r != null && m != null;
  const emr = lengkapEmr ? mc! + 2 * r! + 2 * m! : null;
  const emrSesuai = lengkapEmr && u != null ? Math.round(((mc! + 2 * m!) * (u / 100) + 2 * r!) * 10) / 10 : null;
  return { em, masuk: em == null ? null : em >= AMBANG_EM, emr, emrSesuai, lengkapEm, lengkapEmr };
}

/** Kategori prioritas EMR (pembagian rentang 5–30 menjadi tiga; panduan internal, bukan angka WHO). */
export function prioritasEmr(emr: number | null): { label: string; nada: "danger" | "warning" | "success" | "outline" } {
  if (emr == null) return { label: "Belum dinilai", nada: "outline" };
  if (emr >= 22) return { label: "Prioritas tinggi", nada: "danger" };
  if (emr >= 14) return { label: "Prioritas sedang", nada: "warning" };
  return { label: "Prioritas rendah", nada: "success" };
}

export const labelPilihan = (daftar: Pilihan[], n: number | null | undefined) => daftar.find((p) => p.nilai === n)?.label ?? "—";
