import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { cukup, type Peran } from "./peran";

/** Untuk halaman: pastikan sudah login dan peran mencukupi; kalau tidak, alihkan. */
export async function sesiHalaman(minimal: Peran = "Viewer") {
  const s = await auth();
  if (!s?.user) redirect("/login");
  if (!cukup(s.user.peran, minimal)) redirect(`/admin?ditolak=${encodeURIComponent(minimal)}`);
  return s;
}

/** Untuk Route Handler: kembalikan sesi, atau NextResponse 401/403 yang tinggal di-return. */
export async function sesiApi(minimal: Peran = "Viewer") {
  const s = await auth();
  if (!s?.user) return { sesi: null, tolak: NextResponse.json({ error: "Autentikasi diperlukan." }, { status: 401 }) };
  if (!cukup(s.user.peran, minimal)) return { sesi: null, tolak: NextResponse.json({ error: `Peran ${minimal} atau lebih tinggi diperlukan.` }, { status: 403 }) };
  return { sesi: s, tolak: null };
}
