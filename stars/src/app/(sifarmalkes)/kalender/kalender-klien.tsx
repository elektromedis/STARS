"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, CalendarPlus, ChevronLeft, ChevronRight, Copy, ExternalLink, List, Loader2, Mail, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { WARNA_ACARA, type Acara, type JenisAcara } from "@/lib/kalender-warna";
import { buatTautanKalender, kirimKeEmail } from "./actions";

type AcaraG = Acara & { google: string };
const NAMA_BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const HARI = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const kunciTgl = (d: Date) => new Date(d.getTime() + 7 * 3_600_000).toISOString().slice(0, 10); // tanggal WIB
const jam = (s: string) => new Date(s).toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" }).replace(".", ":");
const tglPanjang = (s: string) => new Date(s).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", weekday: "long", day: "numeric", month: "long", year: "numeric" });

export function KalenderKlien({ tahun, bulan, acara, akun }: { tahun: number; bulan: number; acara: AcaraG[]; akun: { email: string; url: string | null } | null }) {
  const router = useRouter();
  const [tampil, setTampil] = useState<"bulan" | "agenda">("bulan");
  const [aktif, setAktif] = useState<Set<JenisAcara>>(new Set(Object.keys(WARNA_ACARA) as JenisAcara[]));
  const [pilih, setPilih] = useState<AcaraG | null>(null);
  const [url, setUrl] = useState(akun?.url ?? null);
  const [pesan, setPesan] = useState<{ ok?: string; error?: string } | null>(null);
  const [jalan, mulai] = useTransition();
  const hariIni = kunciTgl(new Date());
  const geser = (n: number) => { const d = new Date(Date.UTC(tahun, bulan + n, 1)); router.push(`/kalender?bulan=${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`); };

  const perHari = useMemo(() => {
    const m = new Map<string, AcaraG[]>();
    for (const a of acara) {
      if (!aktif.has(a.jenis)) continue;
      const s = new Date(a.mulai), e = new Date(a.selesai);
      const akhir = a.seharian ? new Date(e.getTime() - 1) : e;
      for (let t = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate())), n = 0; t <= akhir && n < 45; t = new Date(t.getTime() + 86_400_000), n++) {
        const k = a.seharian ? t.toISOString().slice(0, 10) : kunciTgl(t < s ? s : t);
        m.set(k, [...(m.get(k) ?? []), a]);
      }
    }
    return m;
  }, [acara, aktif]);

  // grid 6 minggu mulai Senin
  const pertama = new Date(Date.UTC(tahun, bulan, 1));
  const geserSenin = (pertama.getUTCDay() + 6) % 7;
  const sel = Array.from({ length: 42 }, (_, i) => new Date(pertama.getTime() + (i - geserSenin) * 86_400_000));
  const agenda = [...perHari.entries()].filter(([k]) => k.slice(0, 7) === `${tahun}-${String(bulan + 1).padStart(2, "0")}`).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
          <CalendarDays className="size-6 text-teal-600" aria-hidden />
          <h2 className="mr-2 text-xl font-semibold text-navy-900">{NAMA_BULAN[bulan]} {tahun}</h2>
          <Button size="sm" variant="outline" onClick={() => router.push("/kalender")}>Hari ini</Button>
          <Button size="icon" variant="ghost" onClick={() => geser(-1)} aria-label="Bulan sebelumnya"><ChevronLeft /></Button>
          <Button size="icon" variant="ghost" onClick={() => geser(1)} aria-label="Bulan berikutnya"><ChevronRight /></Button>
          <div className="ml-auto flex rounded-lg border p-0.5">
            <button onClick={() => setTampil("bulan")} className={cn("rounded-md px-3 py-1 text-sm", tampil === "bulan" ? "bg-navy-800 text-white" : "text-muted-foreground")}><CalendarDays className="mr-1 inline size-4" />Bulan</button>
            <button onClick={() => setTampil("agenda")} className={cn("rounded-md px-3 py-1 text-sm", tampil === "agenda" ? "bg-navy-800 text-white" : "text-muted-foreground")}><List className="mr-1 inline size-4" />Agenda</button>
          </div>
        </div>
        {tampil === "bulan" ? (
          <div className="overflow-x-auto">
            <div className="grid min-w-[44rem] grid-cols-7">
              {HARI.map((h) => <div key={h} className="border-b px-2 py-1.5 text-center text-[11px] font-semibold uppercase text-muted-foreground">{h}</div>)}
              {sel.map((d) => {
                const k = d.toISOString().slice(0, 10), isi = perHari.get(k) ?? [], luar = d.getUTCMonth() !== bulan;
                return (
                  <div key={k} className={cn("min-h-[6.5rem] border-b border-r p-1", luar && "bg-slate-50/70")}>
                    <p className={cn("mb-1 flex size-7 items-center justify-center rounded-full text-xs", k === hariIni ? "bg-teal-600 font-bold text-white" : luar ? "text-slate-400" : "text-navy-800")}>{d.getUTCDate()}</p>
                    <div className="grid gap-0.5">
                      {isi.slice(0, 3).map((a) => (
                        <button key={a.id + k} onClick={() => setPilih(a)} className="truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium text-white hover:opacity-90" style={{ background: WARNA_ACARA[a.jenis] }} title={a.judul}>
                          {!a.seharian && <span className="opacity-80">{jam(a.mulai)} </span>}{a.judul}
                        </button>
                      ))}
                      {isi.length > 3 && <button onClick={() => setTampil("agenda")} className="px-1.5 text-left text-[11px] font-medium text-muted-foreground hover:text-navy-800">+{isi.length - 3} lagi</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="divide-y">
            {agenda.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">Tidak ada acara bulan ini.</p> : agenda.map(([k, xs]) => (
              <div key={k} className="grid gap-1 px-4 py-3 sm:grid-cols-[9rem_1fr]">
                <p className={cn("text-sm font-semibold", k === hariIni ? "text-teal-700" : "text-navy-800")}>{tglPanjang(`${k}T05:00:00Z`)}</p>
                <div className="grid gap-1">{xs.map((a) => (
                  <button key={a.id} onClick={() => setPilih(a)} className="flex items-center gap-2 rounded-md px-2 py-1 text-left text-sm hover:bg-slate-50">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: WARNA_ACARA[a.jenis] }} />
                    <span className="w-16 shrink-0 text-xs text-muted-foreground">{a.seharian ? "Seharian" : jam(a.mulai)}</span>
                    <span className="truncate text-navy-800">{a.judul}</span>
                  </button>
                ))}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid content-start gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Jenis kegiatan</CardTitle></CardHeader>
          <CardContent className="grid gap-1.5">
            {(Object.keys(WARNA_ACARA) as JenisAcara[]).map((j) => (
              <label key={j} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={aktif.has(j)} onChange={() => setAktif((s) => { const n = new Set(s); if (n.has(j)) n.delete(j); else n.add(j); return n; })} className="size-4" style={{ accentColor: WARNA_ACARA[j] }} />
                <span className="size-2.5 rounded-full" style={{ background: WARNA_ACARA[j] }} />{j === "Preventif" ? "Pemeliharaan preventif" : j === "Kontrak" ? "Kontrak servis" : j}
                <span className="ml-auto text-xs text-muted-foreground">{acara.filter((a) => a.jenis === j).length}</span>
              </label>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><CalendarPlus className="size-4 text-teal-700" /> Tautkan ke Google Calendar</CardTitle>
            <CardDescription>Jadwal tampil otomatis di Google Calendar akun email Anda dan diperbarui berkala.</CardDescription></CardHeader>
          <CardContent className="grid gap-2 text-sm">
            {!akun ? <p className="text-muted-foreground"><Link href="/login?callbackUrl=/kalender" className="font-medium text-teal-700 underline">Masuk</Link> dengan akun terdaftar untuk menautkan.</p> : (
              <>
                <Button variant="teal" size="sm" disabled={jalan} onClick={() => mulai(async () => { const r = await kirimKeEmail(); setPesan(r ?? null); if (r?.url) setUrl(r.url); })}>{jalan ? <Loader2 className="animate-spin" /> : <Mail />} Kirim ke {akun.email}</Button>
                {url ? (
                  <>
                    <a href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(url.replace(/^https?:/, "webcal:"))}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-teal-700 hover:underline"><ExternalLink className="size-3.5" /> Buka di Google Calendar</a>
                    <div className="flex gap-1"><input readOnly value={url} className="h-8 min-w-0 flex-1 rounded border bg-slate-50 px-2 text-xs" aria-label="URL kalender" />
                      <Button size="icon" variant="outline" className="size-8" onClick={() => { navigator.clipboard?.writeText(url); setPesan({ ok: "URL disalin." }); }} aria-label="Salin URL"><Copy /></Button></div>
                    <button onClick={() => mulai(async () => { const r = await buatTautanKalender(true); setPesan(r ?? null); if (r?.url) setUrl(r.url); })} className="inline-flex items-center gap-1 text-left text-xs text-muted-foreground hover:text-red-700"><RefreshCw className="size-3" /> Buat ulang tautan (nonaktifkan yang lama)</button>
                  </>
                ) : <Button size="sm" variant="outline" disabled={jalan} onClick={() => mulai(async () => { const r = await buatTautanKalender(false); setPesan(r ?? null); if (r?.url) setUrl(r.url); })}>Buat tautan kalender</Button>}
                <p className="text-xs text-muted-foreground">Manual: Google Calendar › Setelan › Tambahkan kalender › <b>Dari URL</b> › tempel URL di atas. Jangan bagikan URL ini.</p>
              </>
            )}
            {pesan?.ok && <p className="text-xs text-emerald-700" role="status">{pesan.ok}</p>}
            {pesan?.error && <p className="text-xs text-red-700" role="alert">{pesan.error}</p>}
          </CardContent>
        </Card>
      </div>

      {pilih && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-navy-950/40 p-4" onClick={() => setPilih(null)} role="dialog" aria-modal="true" aria-label={pilih.judul}>
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <span className="mt-1.5 size-3.5 shrink-0 rounded" style={{ background: WARNA_ACARA[pilih.jenis] }} />
              <div className="min-w-0 flex-1">
                <p className="text-lg font-semibold text-navy-900">{pilih.judul}</p>
                <p className="text-sm text-muted-foreground">{tglPanjang(pilih.mulai)}{pilih.seharian ? "" : ` · ${jam(pilih.mulai)}–${jam(pilih.selesai)}`}</p>
                <p className="mt-2 text-sm text-navy-800">{pilih.ket}</p>
                {pilih.status && <p className="mt-1 text-xs text-muted-foreground">Status: {pilih.status}</p>}
              </div>
              <button onClick={() => setPilih(null)} aria-label="Tutup" className="rounded p-1 hover:bg-slate-100"><X className="size-5" /></button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" variant="teal" asChild><a href={pilih.google} target="_blank" rel="noopener noreferrer"><CalendarPlus /> Tambahkan ke Google Calendar</a></Button>
              <Button size="sm" variant="outline" asChild><Link href={pilih.href}>Buka detail</Link></Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
