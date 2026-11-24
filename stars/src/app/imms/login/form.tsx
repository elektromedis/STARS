"use client";

import { useActionState } from "react";
import { masuk, type StatusLogin } from "@/app/login/actions";

export function FormMasuk() {
  const [st, aksi, jalan] = useActionState<StatusLogin, FormData>(masuk, undefined);
  return (
    <form action={aksi} className="space-y-3 text-left">
      <input type="hidden" name="callbackUrl" value="/imms" />
      <div><label className="lbl" htmlFor="email">Email</label><input id="email" name="email" type="email" required autoComplete="username" className="isian" /></div>
      <div><label className="lbl" htmlFor="password">Sandi</label><input id="password" name="password" type="password" required autoComplete="current-password" className="isian" /></div>
      {st?.error && <p role="alert" className="text-[12px]" style={{ color: "var(--merah)" }}>{st.error}</p>}
      <button className="kapsul utama w-full" disabled={jalan}>{jalan ? "Memeriksa…" : "Masuk"}</button>
    </form>
  );
}
