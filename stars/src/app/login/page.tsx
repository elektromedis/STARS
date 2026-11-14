import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { tujuanAman } from "@/lib/alamat";
import { BingkaiAkun } from "@/components/akun/bingkai-akun";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Masuk" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const s = await auth();
  const { callbackUrl } = await searchParams;
  if (s?.user) redirect(tujuanAman(callbackUrl)); // sudah login (mis. tab lain) → langsung ke tujuan
  return (
    <BingkaiAkun catatan={<>Akun baru aktif setelah disetujui Admin STARS. Setelah 10 kali sandi salah, akun terkunci 15 menit.</>}>
      <LoginForm callbackUrl={tujuanAman(callbackUrl)} />
    </BingkaiAkun>
  );
}
