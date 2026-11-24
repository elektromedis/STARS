import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { cukup, type Peran } from "./peran";

/**
 * Peran IMMS dipetakan ke peran STARS (proposal Tabel 3.5):
 * Pengguna ruangan = Viewer (dengan unit kerja) · Teknisi elektromedis = Operator ·
 * Kepala instalasi / Pimpinan (penyetuju usulan) = Admin · Admin sistem = Super Admin.
 */
export const PERAN_IMMS: Record<string, string> = { Viewer: "Pengguna ruangan", Operator: "Teknisi elektromedis", Admin: "Kepala instalasi / Pimpinan", "Super Admin": "Admin sistem" };

export async function sesiImms(minimal: Peran = "Viewer") {
  const s = await auth();
  if (!s?.user) redirect("/imms/login");
  if (!cukup(s.user.peran, minimal)) redirect(`/imms?ditolak=${encodeURIComponent(PERAN_IMMS[minimal] ?? minimal)}`);
  return s;
}
