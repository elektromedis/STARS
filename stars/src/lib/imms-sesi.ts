import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { cukup, type Peran } from "./peran";

/**
 * Peran IMMS dipetakan ke peran STARS (proposal Tabel 3.5):
 * Pengguna ruangan = Viewer (dengan unit kerja) · Teknisi elektromedis = Operator ·
 * Kepala instalasi / Pimpinan (penyetuju usulan) = Admin · Admin sistem = Super Admin.
 */
export const PERAN_IMMS: Record<string, string> = { Viewer: "Pengguna ruangan", Operator: "Teknisi elektromedis", Admin: "Kepala instalasi / Pimpinan", "Super Admin": "Admin sistem", Tamu: "Tamu (baca saja)", Dosen: "Dosen Pembimbing (baca saja)" };

export async function sesiImms(minimal: Peran = "Viewer") {
  const s = await auth();
  if (!s?.user) redirect("/imms/login");
  if (!(await sesiBacaBerlaku(s.user.peran))) redirect("/imms/login?tamu=gagal"); // tautan/mode dicabut → sesi lama ikut mati
  // Tamu (tautan pratinjau) boleh membuka halaman tingkat Pengguna ruangan; aksi tulis menolak lewat tolakTamu().
  // Dosen Pembimbing melihat SEMUA halaman (baca saja); aksi tulis memakai sesiAksiImms() yang menolaknya.
  if (s.user.peran !== "Dosen" && !(minimal === "Viewer" && s.user.peran === "Tamu") && !cukup(s.user.peran, minimal)) redirect(`/imms?ditolak=${encodeURIComponent(PERAN_IMMS[minimal] ?? minimal)}`);
  return s;
}

/** Untuk aksi tulis yang terbuka bagi Pengguna ruangan: sesi tamu hanya boleh membaca. */
export function tolakTamu(s: { user: { peran: string } }) {
  if (s.user.peran === "Tamu" || s.user.peran === "Dosen") throw new Error("Mode pratinjau hanya untuk melihat. Masuk dengan akun untuk mengubah data.");
}

/** Untuk server action: sesi + peran, dan sesi baca-saja (Tamu/Dosen) selalu ditolak. */
export async function sesiAksiImms(minimal: Peran = "Viewer") {
  const s = await sesiImms(minimal);
  tolakTamu(s);
  return s;
}

/** Sesi Tamu/Dosen hanya berlaku selama tautan / Mode Dosen masih aktif. Peran biasa selalu benar. */
export async function sesiBacaBerlaku(peran: string | undefined) {
  if (peran !== "Tamu" && peran !== "Dosen") return true;
  const { statusDosen, statusTamu } = await import("./tamu");
  return Boolean(peran === "Dosen" ? await statusDosen() : await statusTamu());
}
