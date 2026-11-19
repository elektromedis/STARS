/** Tipe & warna acara kalender (modul biasa agar bisa dipakai komponen klien). */
export type JenisAcara = "Preventif" | "Perbaikan" | "Kalibrasi" | "Peminjaman" | "Kontrak";
export type Acara = { id: string; judul: string; mulai: string; selesai: string; seharian: boolean; jenis: JenisAcara; ket: string; href: string; status?: string };
export const WARNA_ACARA: Record<JenisAcara, string> = { Preventif: "#0d9488", Perbaikan: "#d03b3b", Kalibrasi: "#7c3aed", Peminjaman: "#2563eb", Kontrak: "#d97706" };
