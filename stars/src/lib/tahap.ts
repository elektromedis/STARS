/**
 * Pilihan khusus filter tahap: gabungan semua tahap anggaran pada tahun terpilih.
 * Dipisah dari filter.ts (yang memuat Prisma) agar aman diimpor komponen klien.
 */
export const SEMUA_TAHAP = "semua";

export const labelTahap = (tahap: string) => (tahap === SEMUA_TAHAP ? "Semua Tahapan" : tahap);

export const labelFilter = (f: { tahap: string; tahun: number }) => `${labelTahap(f.tahap)} ${f.tahun}`;
