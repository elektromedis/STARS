import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { cukup, type Peran } from "./peran";

/**
 * Peran IMMS dipetakan ke peran STARS (proposal Tabel 3.5):
 * Pengguna ruangan = Viewer (dengan unit kerja) · Teknisi elektromedis = Operator ·
 * Kepala instalasi / Pimpinan (penyetuju usulan) = Admin · Admin sistem = Super Admin.
 */
export const PERAN_IMMS: Record<string, string> = { Viewer: "Pengguna ruangan", Operator: "Teknisi elektromedis", Admin: "Kepala instalasi / Pimpinan", "Super Admin": "Admin sistem", Tamu: "Tamu (baca saja)" };

export async function sesiImms(minimal: Peran = "Viewer") {
  const s = await auth();
  if (!s?.user) redirect("/imms/login");
  // Tamu (tautan pratinjau) boleh membuka halaman tingkat Pengguna ruangan; aksi tulis menolak lewat tolakTamu().
  if (!(minimal === "Viewer" && s.user.peran === "Tamu") && !cukup(s.user.peran, minimal)) redirect(`/imms?ditolak=${encodeURIComponent(PERAN_IMMS[minimal] ?? minimal)}`);
  return s;
}

/** Untuk aksi tulis yang terbuka bagi Pengguna ruangan: sesi tamu hanya boleh membaca. */
export function tolakTamu(s: { user: { peran: string } }) {
  if (s.user.peran === "Tamu") throw new Error("Mode pratinjau hanya untuk melihat. Masuk dengan akun untuk mengubah data.");
}
