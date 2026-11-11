import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LogoFull } from "@/components/layout/logo";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Masuk" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const s = await auth();
  if (s?.user) redirect("/admin");
  const { callbackUrl } = await searchParams;
  return (
    <div className="mx-auto max-w-md py-8">
      <div className="mb-6 flex justify-center"><LogoFull width={260} /></div>
      <LoginForm callbackUrl={callbackUrl} />
      <p className="mt-4 text-center text-xs text-muted-foreground">
        Akun dibuat oleh Admin STARS. Lupa sandi? Hubungi Admin untuk disetel ulang. Setelah 10 kali sandi salah, akun terkunci 15 menit.
      </p>
    </div>
  );
}
