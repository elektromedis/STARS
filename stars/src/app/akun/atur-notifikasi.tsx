"use client";

import { useActionState } from "react";
import { Send, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { simpanNotifSaya, type StatusNotif } from "./actions";

export function AturNotifikasi({ email, wa, emailSiap, waSiap }: { email: boolean; wa: string | null; emailSiap: boolean; waSiap: boolean }) {
  const [st, aksi, jalan] = useActionState<StatusNotif, FormData>(simpanNotifSaya, undefined);
  return (
    <form action={aksi} className="grid gap-3 text-sm">
      <label className="flex items-center gap-2"><input type="checkbox" name="email" defaultChecked={email} className="size-4" /> Kirim ke email akun saya</label>
      <label className="grid gap-1 font-medium text-navy-800">
        Nomor WhatsApp (kosongkan bila tidak ingin)
        <Input name="wa" defaultValue={wa ? `0${wa.slice(2)}` : ""} placeholder="mis. 0812xxxxxxx" inputMode="tel" autoComplete="tel" maxLength={20} className="max-w-xs" />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" name="uji" value="0" disabled={jalan}><Save /> Simpan</Button>
        <Button type="submit" name="uji" value="1" variant="outline" disabled={jalan}><Send /> Simpan &amp; kirim uji</Button>
      </div>
      {st?.ok && <p className="text-emerald-700" role="status">{st.ok}</p>}
      {st?.error && <p className="text-red-700" role="alert">{st.error}</p>}
      {(!emailSiap || !waSiap) && <p className="text-xs text-muted-foreground">{!emailSiap && "Email belum aktif di server (SMTP belum diatur). "}{!waSiap && "WA belum aktif di server (gateway WA belum diatur Admin)."}</p>}
    </form>
  );
}
