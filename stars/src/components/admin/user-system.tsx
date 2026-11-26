"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, Lock, Save, Search, ShieldCheck, Users, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { simpanAksesPeran, type StatusUs } from "@/app/admin/user-system/actions";
import { cn } from "@/lib/utils";

type Role = { nama: string; tingkat: string; ket: string; jumlah: number };
type Akses = { aksi: Record<string, boolean>; menu: Record<string, boolean> };

/** Sakelar ON/OFF (gaya tombol TRILUX). */
function Sakelar({ nama, nilai, ubah, terkunci, label }: { nama: string; nilai: boolean; ubah: (v: boolean) => void; terkunci?: boolean; label: string }) {
  return (
    <label className={cn("flex items-center gap-3 py-1.5 text-sm", terkunci ? "cursor-not-allowed opacity-70" : "cursor-pointer")}>
      <input type="hidden" name={nama} value={nilai ? "1" : "0"} />
      <button type="button" role="switch" aria-checked={nilai} aria-label={label} disabled={terkunci} onClick={() => ubah(!nilai)}
        className={cn("relative h-6 w-14 shrink-0 rounded-md text-[10px] font-bold tracking-wide text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600",
          nilai ? "bg-emerald-600" : "bg-rose-400")}>
        <span className={cn("absolute top-0.5 size-5 rounded bg-white shadow transition-all", nilai ? "left-[calc(100%-1.375rem)]" : "left-0.5")} />
        <span className={cn("absolute top-1/2 -translate-y-1/2", nilai ? "left-2" : "right-2")}>{nilai ? "ON" : "OFF"}</span>
      </button>
      <span className="text-navy-800">{label}</span>
    </label>
  );
}

export function UserSystem({ role, pilih, akses, aksi, menu, tingkatan }: {
  role: Role[]; pilih: string; akses: Record<string, Akses>; aksi: { kode: string; label: string }[];
  menu: { grup: string; item: { href: string; label: string }[] }[]; tingkatan: { nama: string; ket: string }[];
}) {
  const [cari, setCari] = useState("");
  const [aktif, setAktif] = useState(pilih);
  const [nilai, setNilai] = useState<Akses>(akses[pilih]);
  const [st, aksiSimpan, pend] = useActionState<StatusUs, FormData>(simpanAksesPeran, undefined);
  useEffect(() => { setNilai(akses[aktif]); }, [aktif, akses]);
  const penuh = aktif === "Super Administrator";
  const daftar = useMemo(() => role.filter((r) => r.nama.toLowerCase().includes(cari.trim().toLowerCase())), [role, cari]);
  const r = role.find((x) => x.nama === aktif)!;
  const semua = (grup: "aksi" | "menu", v: boolean, kunci?: string[]) =>
    setNilai((n) => ({ ...n, [grup]: Object.fromEntries(Object.keys(n[grup]).map((k) => [k, kunci && !kunci.includes(k) ? n[grup][k] : v])) }));

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="size-4 text-teal-700" /> Tingkatan sistem pengguna</CardTitle>
          <CardDescription>Setiap pengguna punya <strong>tingkatan</strong> (pengaman dasar) dan <strong>peran</strong> (menu &amp; aksi). Izin efektif = tingkatan mengizinkan <em>dan</em> sakelar peran ON. Tingkatan &amp; peran tiap akun diatur di <Link href="/admin/pengguna" className="text-teal-700 underline">Pengguna</Link>.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {tingkatan.map((t, i) => (
            <div key={t.nama} className="rounded-lg border bg-muted/30 p-3 text-sm"><p className="font-semibold text-navy-800">{i + 1}. {t.nama}</p><p className="mt-1 text-xs text-muted-foreground">{t.ket}</p></div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <Card className="overflow-hidden">
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
            <div><CardTitle className="flex items-center gap-2"><Users className="size-4 text-teal-700" /> Daftar peran ({role.length})</CardTitle><CardDescription>Pilih peran untuk mengatur aksesnya.</CardDescription></div>
            <div className="relative w-full sm:w-56"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari peran…" aria-label="Cari peran" className="h-9 w-full rounded-md border border-input bg-card pl-9 pr-3 text-sm" /></div>
          </CardHeader>
          <div className="max-h-[38rem] overflow-y-auto border-t">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-navy-800 text-left text-xs text-white"><tr><th className="px-3 py-2">Peran</th><th className="px-3 py-2">Tingkatan</th><th className="px-3 py-2 text-right">Akun</th></tr></thead>
              <tbody>
                {daftar.map((x) => (
                  <tr key={x.nama} onClick={() => setAktif(x.nama)} aria-selected={x.nama === aktif}
                    className={cn("cursor-pointer border-b transition-colors", x.nama === aktif ? "bg-teal-50" : "hover:bg-muted/50")}>
                    <td className="px-3 py-2"><button type="button" className="text-left font-medium text-navy-800" onClick={() => setAktif(x.nama)}>{x.nama}</button><div className="text-xs text-muted-foreground">{x.ket}</div></td>
                    <td className="px-3 py-2 text-xs">{x.tingkat}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{x.jumlah}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <form action={aksiSimpan} className="grid content-start gap-4">
          <input type="hidden" name="role" value={aktif} />
          <Card>
            <CardHeader className="flex-row flex-wrap items-start justify-between gap-2">
              <div><CardTitle>{r.nama}</CardTitle><CardDescription>Tingkatan bawaan: {r.tingkat} · {r.jumlah} akun</CardDescription></div>
              {penuh ? <span className="flex items-center gap-1 text-xs text-muted-foreground"><Lock className="size-3.5" /> Selalu penuh</span> : (
                <Button type="submit" variant="teal" size="sm" disabled={pend}>{pend ? <Loader2 className="animate-spin" /> : <Save />} Simpan</Button>
              )}
            </CardHeader>
            {st && <CardContent className="pt-0">{st.error ? <p role="alert" className="flex items-center gap-1.5 text-sm text-red-700"><XCircle className="size-4" /> {st.error}</p> : <p role="status" className="flex items-center gap-1.5 text-sm text-emerald-700"><CheckCircle2 className="size-4" /> {st.ok}</p>}</CardContent>}
          </Card>
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-base">Izin Akses</CardTitle>
              {!penuh && <span className="flex gap-2 text-xs"><button type="button" className="text-teal-700 hover:underline" onClick={() => semua("aksi", true)}>Semua ON</button><button type="button" className="text-rose-700 hover:underline" onClick={() => semua("aksi", false)}>Semua OFF</button></span>}
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2">
              {aksi.map((a) => <Sakelar key={a.kode} nama={`aksi:${a.kode}`} label={a.label} terkunci={penuh} nilai={penuh || nilai.aksi[a.kode] !== false} ubah={(v) => setNilai((n) => ({ ...n, aksi: { ...n.aksi, [a.kode]: v } }))} />)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-base">Akses Menu / Fitur</CardTitle>
              {!penuh && <span className="flex gap-2 text-xs"><button type="button" className="text-teal-700 hover:underline" onClick={() => semua("menu", true)}>Semua ON</button><button type="button" className="text-rose-700 hover:underline" onClick={() => semua("menu", false)}>Semua OFF</button></span>}
            </CardHeader>
            <CardContent className="grid gap-4">
              {menu.map((g) => (
                <fieldset key={g.grup}>
                  <legend className="mb-1 flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-teal-700">{g.grup}
                    {!penuh && <span className="flex gap-2 font-normal normal-case tracking-normal"><button type="button" className="hover:underline" onClick={() => semua("menu", true, g.item.map((i) => i.href))}>ON</button><button type="button" className="text-rose-700 hover:underline" onClick={() => semua("menu", false, g.item.map((i) => i.href))}>OFF</button></span>}</legend>
                  <div className="grid sm:grid-cols-2">
                    {g.item.map((m) => <Sakelar key={m.href} nama={`menu:${m.href}`} label={m.label} terkunci={penuh || (aktif === "Administrator" && ["/admin/user-system", "/admin/pengguna"].includes(m.href))} nilai={penuh || nilai.menu[m.href] !== false} ubah={(v) => setNilai((n) => ({ ...n, menu: { ...n.menu, [m.href]: v } }))} />)}
                  </div>
                </fieldset>
              ))}
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
