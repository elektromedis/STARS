/** Bentuk item notifikasi (dipakai server & klien). */
export type TingkatNotif = "info" | "sukses" | "peringatan" | "bahaya";
export type ItemNotif = {
  /** Stabil antar-pemanggilan, untuk menandai sudah dibaca. */
  id: string;
  jenis: "laporan" | "wo" | "preventif" | "kalibrasi" | "laporan-saya";
  judul: string; isi: string; waktu: string; href: string; tingkat: TingkatNotif;
};
