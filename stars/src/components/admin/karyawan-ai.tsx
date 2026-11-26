"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Bot, Loader2, Play, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { jalankanSekarang, simpanJadwalKaryawan, type StatusKai } from "@/app/admin/karyawan-ai/actions";
import type { CatatanKerja, JadwalKaryawan } from "@/lib/karyawan-ai";
import { cn } from "@/lib/utils";

type K = { id: string; nama: string; bidang: string; tugas: string[]; jadwal: JadwalKaryawan; terakhir: string | null };
const waktu = (s: string) => new Date(s).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });
const WARNA = { info: "border-l-teal-500", peringatan: "border-l-amber-500", bahaya: "border-l-red-500" } as const;

function Jalankan({ id }: { id: string }) {
  const [st, aksi, jalan] = useActionState<StatusKai, FormData>(jalankanSekarang, undefined);
  return (
    <form action={aksi} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <Button type="submit" size="sm" variant="outline" disabled={jalan}>{jalan ? <Loader2 className="animate-spin" /> : <Play />} Jalankan sekarang</Button>
      {st?.ok && <span role="status" className="text-xs text-emerald-700">{st.ok}</span>}
      {st?.error && <span role="alert" className="text-xs text-red-700">{st.error}</span>}
    </form>
  );
}

export function KaryawanAiPanel({ karyawan, log, ai }: { karyawan: K[]; log: CatatanKerja[]; ai: boolean }) {
  const [aktif, setAktif] = useState<Record<string, boolean>>(Object.fromEntries(karyawan.map((k) => [k.id, k.jadwal.aktif])));
  const [st, simpan, jalan] = useActionState<StatusKai, FormData>(simpanJadwalKaryawan, undefined);
  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bot className="size-5 text-teal-700" /> Karyawan AI otomatis</CardTitle>
          <CardDescription>
            Nyalakan karyawan dan tentukan jam kerjanya (WIB). Server STARS di VPS menjalankan tugasnya otomatis sekali sehari. Hasilnya masuk ke <strong>Catatan kerja</strong> di bawah dan ke lonceng notifikasi petugas.
            Karyawan hanya membaca data dan melapor; mereka tidak mengubah data. {ai ? "Ringkasan harian ALLIES memakai AI." : "Kunci API AI belum diisi di server, jadi ringkasan harian disusun tanpa AI (gratis)."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form id="form-jadwal" action={simpan} className="grid gap-3">
            {karyawan.map((k) => (
              <div key={k.id} className="grid gap-3 rounded-xl border p-3 md:grid-cols-[minmax(0,1fr)_auto]">
                <div className="min-w-0">
                  <p className="font-semibold text-navy-800">{k.nama} <span className="font-normal text-muted-foreground">· {k.bidang}</span></p>
                  <ul className="mt-1 list-disc pl-5 text-sm text-muted-foreground">{k.tugas.map((t) => <li key={t}>{t}</li>)}</ul>
                  <p className="mt-1 text-xs text-muted-foreground">Terakhir bekerja: {k.terakhir ? waktu(k.terakhir) : "belum pernah"}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 md:justify-end">
                  <input type="hidden" name={`aktif:${k.id}`} value={aktif[k.id] ? "1" : "0"} />
                  <button type="button" role="switch" aria-checked={aktif[k.id]} aria-label={`Aktifkan ${k.nama}`} onClick={() => setAktif((a) => ({ ...a, [k.id]: !a[k.id] }))}
                    className={cn("relative inline-flex h-7 w-14 items-center rounded-full transition-colors", aktif[k.id] ? "bg-emerald-500" : "bg-slate-300")}>
                    <span className={cn("absolute left-1 size-5 rounded-full bg-white shadow transition-transform", aktif[k.id] && "translate-x-7")} />
                    <span className={cn("w-full text-[10px] font-bold text-white", aktif[k.id] ? "pr-7" : "pl-7 text-slate-600")}>{aktif[k.id] ? "ON" : "OFF"}</span>
                  </button>
                  <label className="flex items-center gap-1 text-sm">Jam <input type="time" name={`jam:${k.id}`} defaultValue={k.jadwal.jam} className="h-9 rounded-md border bg-background px-2" /></label>
                  <select name={`hari:${k.id}`} defaultValue={k.jadwal.hari} aria-label={`Hari kerja ${k.nama}`} className="h-9 rounded-md border bg-background px-2 text-sm">
                    <option value="kerja">Senin–Jumat</option><option value="setiap">Setiap hari</option>
                  </select>
                </div>
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" variant="teal" disabled={jalan}>{jalan ? <Loader2 className="animate-spin" /> : <Save />} Simpan jadwal</Button>
              {st?.ok && <span role="status" className="text-sm text-emerald-700">{st.ok}</span>}
              {st?.error && <span role="alert" className="text-sm text-red-700">{st.error}</span>}
            </div>
          </form>
          <div className="mt-4 grid gap-2 border-t pt-4">
            <p className="text-sm font-medium text-navy-800">Coba tanpa menunggu jadwal:</p>
            {karyawan.map((k) => <div key={k.id} className="flex flex-wrap items-center gap-3 text-sm"><span className="w-48">{k.nama}</span><Jalankan id={k.id} /></div>)}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Catatan kerja ({log.length})</CardTitle><CardDescription>Hasil kerja terbaru. Klik judul untuk menindaklanjuti.</CardDescription></CardHeader>
        <CardContent className="grid gap-2">
          {!log.length && <p className="text-sm text-muted-foreground">Belum ada catatan. Nyalakan karyawan, atau klik Jalankan sekarang.</p>}
          {log.map((c) => (
            <article key={c.id} className={cn("rounded-lg border border-l-4 bg-card p-3", WARNA[c.tingkat])}>
              <p className="flex flex-wrap items-baseline justify-between gap-2"><Link href={c.href} className="font-semibold text-navy-800 hover:underline">{c.judul}</Link><span className="text-xs text-muted-foreground">{waktu(c.waktu)}{c.manual ? " · manual" : " · terjadwal"}{c.ai ? " · AI" : ""}</span></p>
              <ul className="mt-1 list-disc pl-5 text-sm">{c.isi.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </article>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
