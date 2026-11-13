"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { CheckCircle2, KeyRound, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ubahSandiSendiri, type StatusSandi } from "./actions";

export function UbahSandi() {
  const [st, aksi, pending] = useActionState<StatusSandi, FormData>(ubahSandiSendiri, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (st?.ok) ref.current?.reset(); }, [st]);
  return (
    // onSubmit + startTransition: isian TIDAK dikosongkan otomatis bila gagal (mis. sandi lama salah); dikosongkan hanya bila berhasil.
    <form ref={ref} onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); startTransition(() => aksi(fd)); }} className="grid gap-3 sm:grid-cols-3">
      <label className="grid gap-1 text-sm font-medium text-navy-800">Sandi saat ini<Input name="lama" type="password" required autoComplete="current-password" maxLength={200} /></label>
      <label className="grid gap-1 text-sm font-medium text-navy-800">Sandi baru<Input name="baru" type="password" required minLength={8} autoComplete="new-password" maxLength={200} /></label>
      <label className="grid gap-1 text-sm font-medium text-navy-800">Ulangi sandi baru<Input name="ulang" type="password" required minLength={8} autoComplete="new-password" maxLength={200} /></label>
      <div className="flex flex-wrap items-center justify-between gap-2 sm:col-span-3">
        <div aria-live="polite">
          {st?.error && <p role="alert" className="flex items-center gap-1.5 text-sm text-red-700"><XCircle className="size-4" /> {st.error}</p>}
          {st?.ok && <p className="flex items-center gap-1.5 text-sm text-emerald-700"><CheckCircle2 className="size-4" /> {st.ok}</p>}
        </div>
        <Button type="submit" variant="teal" disabled={pending}>{pending ? <Loader2 className="animate-spin" /> : <KeyRound />} Simpan sandi</Button>
      </div>
    </form>
  );
}
