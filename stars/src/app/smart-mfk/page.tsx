import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowLeftRight, ExternalLink, RefreshCw, ShieldCheck } from "lucide-react";
import { auth } from "@/auth";
import { cukup } from "@/lib/peran";
import { ambilRingkasanMfk, konfigSmartMfk } from "@/lib/integrasi";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { sinkronSmartMfk } from "./actions";

export const metadata: Metadata = { title: "SMART MFK" };
export const dynamic = "force-dynamic";

const WARNA_BAND: Record<string, string> = { EKSTREM: "bg-red-600 text-white", TINGGI: "bg-orange-500 text-white", SEDANG: "bg-yellow-300 text-black", RENDAH: "bg-emerald-600 text-white" };

export default async function SmartMfkPage({ searchParams }: { searchParams: Promise<{ ok?: string; galat?: string }> }) {
  const q = await searchParams;
  const [s, { data: d, galat }] = await Promise.all([auth(), ambilRingkasanMfk()]);
  const k = konfigSmartMfk();
  const op = cukup(s?.user?.peran, "Operator");
  const mfk = (p: string) => `${k.publik}${p}`;

  return (
    <>
      <PageHeader
        title="SMART MFK"
        description="Manajemen Fasilitas dan Keselamatan (KMK HK.01.07/MENKES/1128/2022) — data langsung dari aplikasi SMART MFK: nilai bab MFK, risiko alat medis, recall, dan insiden alat. Inventaris, kalibrasi, & perbaikan STARS otomatis menjadi bukti MFK 7 di SMART MFK."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild><Link href="/smart-mfk"><RefreshCw />Perbarui</Link></Button>
            {op && k.aktif && <form action={sinkronSmartMfk}><Button type="submit" variant="teal"><ArrowLeftRight />Sinkron ke SMART MFK</Button></form>}
            <Button asChild><a href={mfk("/")} target="_blank" rel="noopener noreferrer">Buka SMART MFK<ExternalLink /></a></Button>
          </div>
        }
      />
      {q.ok && <p className="mb-4 rounded-xl bg-teal-50 p-4 text-sm text-teal-900"><b>Sinkron berhasil.</b> {q.ok}</p>}
      {q.galat && <p className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-800"><b>Sinkron gagal.</b> {q.galat}</p>}

      {!d ? (
        <Card className="p-8 text-center">
          <AlertTriangle className="mx-auto size-8 text-amber-500" aria-hidden />
          <p className="mt-3 font-semibold text-navy-800">Data SMART MFK belum dapat ditampilkan</p>
          <p className="mt-1 text-sm text-muted-foreground">{galat}</p>
          <a className="mt-4 inline-block text-sm font-medium text-teal-700 underline" href={mfk("/")} target="_blank" rel="noopener noreferrer">Buka SMART MFK langsung</a>
        </Card>
      ) : (
        <div className="grid gap-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Nilai bab MFK" value={`${d.bab.persen.toFixed(1)}%`} hint={`${d.bab.lulus ? "Lulus" : "Belum lulus"} · ambang ≥${d.bab.ambang}% · ${d.bab.dinilai}/${d.bab.berlaku} EP dinilai`} />
            <StatCard label="Risiko MFK aktif" value={String(d.risiko.aktif)} hint={`${d.risiko.band.EKSTREM} ekstrem · ${d.risiko.band.TINGGI} tinggi`} />
            <StatCard label="Recall alat terbuka" value={String(d.recall.length)} hint="pemberitahuan produsen / Kemenkes / BPOM" />
            <StatCard label="Insiden alat (12 bln)" value={String(d.insidenAlat.length)} hint="laporan insiden keselamatan pasien terkait alat" />
          </div>

          {d.recall.length > 0 && (
            <Card className="border-red-200">
              <CardHeader><CardTitle className="flex items-center gap-2 text-red-700"><AlertTriangle className="size-5" />Recall & pemberitahuan bahaya alat (MFK 7)</CardTitle></CardHeader>
              <CardContent>
                <ul className="grid gap-2 text-sm">
                  {d.recall.map((r, i) => (
                    <li key={i} className="rounded-lg bg-red-50 p-3">
                      <b>{r.produk}</b> {[r.merk, r.tipe, r.lot && `lot ${r.lot}`].filter(Boolean).join(" · ")} — {r.sumber}, {r.tanggal} · <span className="font-semibold">{r.status}</span>
                      {r.kodeAlat && <> · alat <Link className="text-teal-700 underline" href={`/alat?kode=${encodeURIComponent(r.kodeAlat)}`}>{r.kodeAlat}</Link></>}
                      <span className="block text-muted-foreground">{r.uraian}{r.tindakan ? ` — Tindakan: ${r.tindakan}` : ""}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="size-5 text-teal-600" />Capaian per standar MFK</CardTitle><CardDescription>Skor EP ÷ skor maksimal EP berlaku; lulus bila ≥ 80%.</CardDescription></CardHeader>
              <CardContent>
                <ul className="grid gap-2">
                  {d.standar.map((x) => (
                    <li key={x.kode}>
                      <a href={mfk(`/standar/${x.kode}`)} target="_blank" rel="noopener noreferrer" className="block rounded-lg p-1.5 hover:bg-slate-50">
                        <div className="flex justify-between gap-2 text-sm"><span className="truncate"><b>{x.kode}</b> {x.nama}</span><span className="shrink-0 tabular-nums font-semibold">{x.persen.toFixed(0)}%</span></div>
                        <div className="mt-1 h-2 rounded-full bg-slate-100"><div className={`h-2 rounded-full ${x.lulus ? "bg-teal-500" : "bg-amber-400"}`} style={{ width: `${Math.min(100, x.persen)}%` }} /></div>
                      </a>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <div className="grid content-start gap-6">
              <Card>
                <CardHeader><CardTitle>Risiko area peralatan medis</CardTitle><CardDescription>Register risiko SMART MFK area MFK 7, skor tertinggi lebih dulu.</CardDescription></CardHeader>
                <CardContent>
                  {d.risiko.alkes.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada risiko area peralatan medis yang aktif.</p> : (
                    <ul className="grid gap-2 text-sm">
                      {d.risiko.alkes.map((r) => (
                        <li key={r.kode} className="flex items-start gap-2">
                          <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${WARNA_BAND[r.band] ?? "bg-slate-200"}`}>{r.skor}</span>
                          <span>{r.pernyataan}<span className="block text-xs text-muted-foreground">{[r.kode, r.unit, r.pic && `PIC ${r.pic}`, r.status].filter(Boolean).join(" · ")}</span></span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Insiden terkait alat medis</CardTitle></CardHeader>
                <CardContent>
                  {d.insidenAlat.length === 0 ? <p className="text-sm text-muted-foreground">Tidak ada insiden alat dalam 12 bulan terakhir.</p> : (
                    <ul className="grid gap-1.5 text-sm">
                      {d.insidenAlat.map((x) => (
                        <li key={x.nomor}>{x.tanggal} · <b>{x.judul}</b> · {x.status}{x.kodeAlat && <> · <Link className="text-teal-700 underline" href={`/alat?kode=${encodeURIComponent(x.kodeAlat)}`}>{x.kodeAlat}</Link></>}</li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Program fasilitas perlu tindakan</CardTitle><CardDescription>{d.fasilitas.perluTindakan} dari {d.fasilitas.total} item/kegiatan wajib.</CardDescription></CardHeader>
                <CardContent>
                  <ul className="grid grid-cols-2 gap-2 text-sm">
                    {d.fasilitas.perKategori.map((f) => <li key={f.kode} className="flex justify-between rounded-lg bg-slate-50 px-3 py-2"><span>{f.nama}</span><b className={f.perlu ? "text-red-600" : "text-teal-700"}>{f.perlu}</b></li>)}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><ArrowLeftRight className="size-5 text-teal-600" />Data yang terhubung otomatis</CardTitle></CardHeader>
            <CardContent className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
              <p><b className="text-navy-800">STARS → SMART MFK:</b> inventaris alat, riwayat pengujian & kalibrasi, perintah kerja selesai (perbaikan & preventif) menjadi bukti MFK 7.</p>
              <p><b className="text-navy-800">SMART MFK → STARS:</b> laporan kerusakan alat dari SMART MFK masuk sebagai Permintaan Kerja (WR) bertanda “[SMART MFK …]”; statusnya kembali ke SMART MFK.</p>
              <p className="md:col-span-2">Sinkron otomatis berjalan berkala di SMART MFK; tombol <b>Sinkron ke SMART MFK</b> menjalankannya sekarang. Data diambil {new Date(d.dibuat).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}.</p>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
