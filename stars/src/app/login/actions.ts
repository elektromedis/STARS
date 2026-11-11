"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";

export type StatusLogin = { error?: string } | undefined;

export async function masuk(_sebelumnya: StatusLogin, formData: FormData): Promise<StatusLogin> {
  const callbackUrl = String(formData.get("callbackUrl") || "/admin");
  const tujuan = callbackUrl.startsWith("/") && !callbackUrl.startsWith("//") ? callbackUrl : "/admin";
  try {
    await signIn("credentials", { email: formData.get("email"), password: formData.get("password"), redirectTo: tujuan });
    return undefined;
  } catch (e) {
    if (e instanceof AuthError) {
      return { error: "Email atau sandi salah, akun nonaktif/terkunci, atau terlalu banyak percobaan. Coba lagi dalam beberapa menit." };
    }
    throw e; // termasuk NEXT_REDIRECT saat berhasil
  }
}

export async function keluar() {
  await signOut({ redirectTo: "/" });
}
