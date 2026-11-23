"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { Loader2, LogIn, UserPlus, XCircle } from "lucide-react";
import { RobotLogin, type ModeRobot } from "@/components/akun/robot-login";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputSandi } from "@/components/ui/input-sandi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { masuk, type StatusLogin } from "./actions";

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [status, aksi, pending] = useActionState<StatusLogin, FormData>(masuk, undefined);
  const form = useRef<HTMLFormElement>(null);
  const [fokus, setFokus] = useState<"email" | "sandi" | "intip" | null>(null);
  const [arah, setArah] = useState(0);
  const [salah, setSalah] = useState(false);

  useEffect(() => {
    if (!status?.error) return;
    setSalah(true);
    const t = setTimeout(() => setSalah(false), 1600);
    return () => clearTimeout(t);
  }, [status]);

  /** Membaca jenis kolom yang aktif. Isi sandi tidak pernah dibaca. */
  const baca = () => {
    const f = form.current;
    if (!f) return;
    const aktif = document.activeElement;
    const sandi = f.elements.namedItem("password") as HTMLInputElement | null;
    const email = f.elements.namedItem("email") as HTMLInputElement | null;
    const diSandi = !!sandi && !!aktif && !!sandi.parentElement?.contains(aktif);
    if (aktif === email) { setFokus("email"); setArah(Math.min(1, (email?.value.length ?? 0) / 28)); }
    else if (diSandi) setFokus(sandi?.type === "text" ? "intip" : "sandi");
    else setFokus(null);
  };
  const nanti = () => setTimeout(baca, 0);
  const mode: ModeRobot = pending ? "proses" : salah ? "salah" : fokus ?? "diam";

  return (
    <Card>
      <CardHeader className="items-center text-center">
        <RobotLogin mode={mode} arah={arah} />
        <CardTitle className="pt-2">Masuk ke STARS</CardTitle>
        <CardDescription>Area administrasi data alat kesehatan RSUD Cipayung.</CardDescription>
      </CardHeader>
      <CardContent>
        <form ref={form} action={aksi} className="grid gap-4" onFocusCapture={nanti} onBlurCapture={nanti} onInput={baca} onClickCapture={nanti}>
          <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/admin"} />
          <label className="grid gap-1.5 text-sm font-medium">
            Email
            <Input name="email" type="email" autoComplete="username" required placeholder="nama@gmail.com" />
          </label>
          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="sandi-masuk" className="text-sm font-medium">Sandi</label>
              <Link href="/lupa-sandi" className="text-xs font-medium text-teal-700 hover:underline">Lupa sandi?</Link>
            </div>
            <InputSandi id="sandi-masuk" name="password" autoComplete="current-password" required minLength={8} />
          </div>
          {status?.error && (
            <p role="alert" className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"><XCircle className="mt-0.5 size-4 shrink-0" /> {status.error}</p>
          )}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? <Loader2 className="animate-spin" /> : <LogIn />} Masuk
          </Button>
        </form>
        <div className="mt-5 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" /> belum punya akun? <span className="h-px flex-1 bg-border" /></div>
        <Button variant="outline" className="mt-3 w-full" asChild><Link href="/daftar"><UserPlus /> Daftar akun baru</Link></Button>
      </CardContent>
    </Card>
  );
}
