/**
 * Pilihan khusus filter tahap: "Semua Tahapan" pada tahun terpilih.
 * Daftar paket menampilkan baris dari semua tahap, sedangkan angka total/grafik memakai
 * PAGU FINAL (tahap terakhir tahun itu) agar paket yang sama tidak terhitung dua kali.
 * Dipisah dari filter.ts (yang memuat Prisma) agar aman diimpor komponen klien.
 */
export const SEMUA_TAHAP = "semua";

export const labelTahap = (tahap: string) => (tahap === SEMUA_TAHAP ? "Semua Tahapan" : tahap);

export const labelFilter = (f: { tahap: string; tahun: number }) => `${labelTahap(f.tahap)} ${f.tahun}`;

/** Label untuk angka total: saat "Semua Tahapan" menyebut tahap pagu final yang dipakai. */
export const labelNilai = (f: { tahap: string; tahun: number; tahapFinal?: string }) =>
  f.tahap === SEMUA_TAHAP ? `Pagu final ${f.tahapFinal ?? ""} ${f.tahun}`.replace(/\s+/g, " ") : labelFilter(f);

/** Urutan tahap anggaran dari paling awal ke paling akhir. */
export const TAHAP_URUT = ["Ranwal", "Penetapan", "Pergeseran", "Perubahan", "Perubahan II"] as const;
