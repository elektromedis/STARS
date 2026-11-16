import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Circle, Search } from "lucide-react";
import { unitTerkunci } from "@/lib/akses";
import { dataTracking, lacakNomor, type Tahapan } from "@/lib/tracking";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SegarkanOtomatis } from "@/components/tracking/segarkan-otomatis";
import { cn, formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "SI-TRACKING" };
export const dynamic = "force-dynamic";

const WARNA: Record<NonNullable<Tahapan["nada"]>, string> = { selesai: "#0ca30c", proses: "#14A0A8", awas: "#fab219", bahaya: "#d03b3b", netral: "#94a3b8" };
const jamWib = (iso: string) => new Date(iso).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

/** Satu alur proses: langkah-langkah berpanah dengan jumlah + batang proporsi. */
function AlurProses({ tahapan, satuan }: { tahapan: Tahapan[]; satuan: string }) {
  const total = tahapan.reduce((a, t) => a + t.jumlah, 0);
  const selesai = tahapan.filter((t) => t.nada === "selesai").reduce((a, t) => a + t.jumlah, 0);
  return (
    <div className="grid gap-3">
      <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={tahapan.map((t) => `${t.label} ${t.jumlah}`).join(", ")}>
        {total > 0 && tahapan.filter((t) => t.jumlah > 0).map((t) => (
          <span key={t.label} className="selisih-isi h-full first:rounded-l-full last:rounded-r-full" style={{ width: `${(t.jumlah / total) * 100}%`, background: WARNA[t.nada ?? "netral"] }} title={`${t.label}: ${t.jumlah}`} />
        ))}
      </div>
      <ol className="flex flex-wrap items-stretch gap-1.5">
        {tahapan.map((t, i) => (
          <li key={t.label} className="flex items-center gap-1.5">
            <div className="rounded-lg border bg-white px-2.5 py-1.5">
              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><span className="size-2 rounded-full" style={{ background: WARNA[t.nada ?? "netral"] }} aria-hidden />{t.label}</p>
              <p className="text-lg font-bold tabular-nums leading-tight text-navy-800">{formatNumber(t.jumlah)}</p>
              {t.ket && <p className="text-[10px] text-muted-foreground">{t.ket}</p>}
            </div>
            {i < tahapan.length - 1 && <ArrowRight className="size-3.5 shrink-0 text-slate-300" aria-hidden />}
          </li>
        ))}
      </ol>
      <p className="text-xs text-muted-foreground">{formatNumber(total)} {satuan} · {total ? Math.round((selesai / total) * 100) : 0}% sudah tuntas/sesuai</p>
    </div>
  );
}

export default async function TrackingPage({ searchParams }: { searchParams: Promise<{ nomor?: string }> }) {
  const kunci = await unitTerkunci();
  const nomor = String((await searchParams).nomor ?? "").slice(0, 40);
  const [d, lacak] = await Promise.all([dataTracking(kunci), nomor ? lacakNomor(nomor, kunci) : Promise.resolve(null)]);

  return (
    <>
      <PageHeader
        title="SI-TRACKING — Live Tracking"
        description={`Pantau sampai mana proses kerja di setiap menu STARS${kunci ? ` (unit ${kunci.nama})` : ""} — perencanaan, laporan kerusakan, perintah kerja, preventif, kalibrasi, alarm monitoring, dan siklus alat ALLIES. Diperbarui otomatis.`}
        actions={<SegarkanOtomatis waktuServer={new Date().toISOString()} />}
      />

      <Card className="mb-6">
        <CardHeader><CardTitle>Lacak nomor laporan / perintah kerja</CardTitle><CardDescription>Ketik nomor WR (laporan) atau WO (perintah kerja), mis. WR-2026-0001.</CardDescription></CardHeader>
        <CardContent>
          <form method="get" className="flex max-w-lg gap-2" role="search">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden /><Input name="nomor" defaultValue={nomor} placeholder="WR-2026-0001 / WO-2026-0001" className="pl-9" aria-label="Nomor WR atau WO" /></div>
            <Button type="submit">Lacak</Button>
          </form>
          {nomor && !lacak && <p className="mt-4 text-sm text-muted-foreground">Nomor &ldquo;{nomor}&rdquo; tidak ditemukan.</p>}
          {lacak && (
            <div className="mt-5">
              <p className="text-sm text-navy-800"><strong>{lacak.nomor}</strong>{lacak.alat ? ` · ${lacak.alat}` : ""}{lacak.unit ? ` · ${lacak.unit}` : ""} — status: <strong>{lacak.status}</strong></p>
              <ol className="mt-4 grid gap-3 sm:grid-cols-5">
                {lacak.langkah.map((l, i) => (
                  <li key={l.label} className="relative flex gap-2 sm:flex-col sm:items-center sm:text-center">
                    {i < lacak.langkah.length - 1 && <span className={cn("absolute hidden h-0.5 sm:left-1/2 sm:top-3 sm:block sm:w-full", l.selesai && lacak.langkah[i + 1].selesai ? "bg-green-500" : "bg-slate-200")} aria-hidden />}
                    {l.selesai ? <CheckCircle2 className="relative size-6 shrink-0 rounded-full bg-white text-green-600" aria-hidden /> : <Circle className="relative size-6 shrink-0 rounded-full bg-white text-slate-300" aria-hidden />}
                    <span><span className={cn("block text-sm font-medium", l.selesai ? "text-navy-800" : "text-muted-foreground")}>{l.label}</span><span className="block text-xs text-muted-foreground">{l.waktu ? jamWib(l.waktu) : l.selesai ? "" : "menunggu"}</span></span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </CardContent>
      </Card>

      <section className="mb-8 grid gap-4 lg:grid-cols-2" aria-label="Alur proses per menu">
        {d.alur.map((a) => (
          <Card key={a.id} id={a.id} className={a.id === "allies" ? "lg:col-span-2" : undefined}>
            <CardHeader className="flex-row items-start justify-between gap-3">
              <div className="space-y-1"><p className="text-xs font-semibold uppercase tracking-wide text-teal-700">{a.menu}</p><CardTitle>{a.judul}</CardTitle>{a.catatan && <CardDescription>{a.catatan}</CardDescription>}</div>
              <Button variant="link" size="sm" asChild><Link href={a.href}>Buka <ArrowRight /></Link></Button>
            </CardHeader>
            <CardContent><AlurProses tahapan={a.tahapan} satuan={a.satuan} /></CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader><CardTitle>Aktivitas terbaru</CardTitle><CardDescription>Perubahan proses terakhir di semua menu</CardDescription></CardHeader>
        <CardContent>
          {d.kejadian.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">Belum ada aktivitas.</p> : (
            <ol className="relative grid gap-3 border-l-2 border-slate-200 pl-5">
              {d.kejadian.map((k, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[27px] top-1.5 size-3 rounded-full ring-4 ring-white" style={{ background: WARNA[k.nada ?? "netral"] }} aria-hidden />
                  <Link href={k.href} className="block rounded-md px-1 hover:bg-slate-50">
                    <span className="text-xs text-muted-foreground">{jamWib(k.waktu)} · {k.menu}</span>
                    <span className="block text-sm text-navy-800">{k.teks}</span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </>
  );
}
