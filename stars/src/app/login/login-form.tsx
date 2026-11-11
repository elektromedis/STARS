"use client";

import { useActionState } from "react";
import { Loader2, LogIn, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
          <label className="grid gap-1.5 text-sm font-medium">
            Sandi
            <Input name="password" type="password" autoComplete="current-password" required minLength={8} />
          </label>
          {status?.error && (
            <p role="alert" className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"><XCircle className="mt-0.5 size-4 shrink-0" /> {status.error}</p>
          )}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? <Loader2 className="animate-spin" /> : <LogIn />} Masuk
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
