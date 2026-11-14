"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/auth";
import { tujuanAman } from "@/lib/alamat";

export type StatusLogin = { error?: string } | undefined;

/**
 * Login lalu kembali ke path tujuan secara RELATIF, sehingga pengguna tetap di alamat yang sedang dipakai
 * (localhost, IP LAN, atau https Tailscale) — tidak dilempar ke AUTH_URL/localhost.
 */
export async function masuk(_sebelumnya: StatusLogin, formData: FormData): Promise<StatusLogin> {
  const tujuan = tujuanAman(formData.get("callbackUrl"));
  try {
    await signIn("credentials", { email: formData.get("email"), password: formData.get("password"), redirect: false });
  } catch (e) {
    if (e instanceof AuthError) {
      return { error: "Email atau sandi salah, akun belum disetujui Admin/nonaktif/terkunci, atau terlalu banyak percobaan. Coba lagi dalam beberapa menit." };
    }
    throw e;
  }
  redirect(tujuan);
}

export async function keluar() {
  await signOut({ redirect: false });
  redirect("/");
}
