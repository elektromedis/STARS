/** Peran pengguna, dari hak paling kecil ke paling besar. "Public" = pengunjung tanpa akun. */
export const PERAN = ["Viewer", "Operator", "Admin", "Super Admin"] as const;
export type Peran = (typeof PERAN)[number];

export const PERAN_KETERANGAN: Record<Peran, string> = {
  Viewer: "Hanya melihat & mengunduh data (tanpa impor). Bila diberi unit kerja, semua data & dokumen dibatasi ke unit itu",
  Operator: "Mengunggah/mengubah data paket untuk unit kerjanya (atau semua unit bila tidak dibatasi)",
  Admin: "Semua unit kerja, kelola pengguna, cadangan basis data",
  "Super Admin": "Admin + pengaturan sistem, menetapkan peran Super Admin",
};

export function adalahPeran(v: unknown): v is Peran {
  return typeof v === "string" && (PERAN as readonly string[]).includes(v);
}

/** Benar bila `peran` setara atau lebih tinggi dari `minimal`. */
export function cukup(peran: string | undefined | null, minimal: Peran) {
  if (!adalahPeran(peran)) return false;
  return PERAN.indexOf(peran) >= PERAN.indexOf(minimal);
}
