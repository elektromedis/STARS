"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Loader2, LogIn, UserPlus, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputSandi } from "@/components/ui/input-sandi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { masuk, type StatusLogin } from "./actions";

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [status, aksi, pending] = useActionState<StatusLogin, FormData>(masuk, undefined);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Masuk ke STARS</CardTitle>
        <CardDescription>Area administrasi data alat kesehatan RSUD Cipayung.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={aksi} className="grid gap-4">
          <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/admin"} />
          <label className="grid gap-1.5 text-sm font-medium">
            Email
            <Input name="email" type="email" autoComplete="username" required placeholder="nama@rsudcipayung.go.id" />
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
