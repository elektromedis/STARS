import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Bot, CheckCircle2, ChevronDown, Circle, CircleAlert, CircleDot, Search, Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { unitTerkunci } from "@/lib/akses";
import { jawabAllies, ringkasanAllies, SARAN_PEMBUKA, type AnalisaAlat } from "@/lib/allies";
import { KEPUTUSAN, keputusan, LABEL_FASE, SIKLUS, TAHAP, type IdTahap } from "@/lib/allies-siklus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { DiagramSiklus } from "@/components/allies/diagram-siklus";
import { ObrolanAllies } from "@/components/allies/obrolan-allies";
import { cn, formatNumber, formatRupiah } from "@/lib/utils";

export const metadata: Metadata = { title: "ALLIES — Agen Pengelolaan Alat Medik" };
export const dynamic = "force-dynamic";

type Sp = Record<string, string | string[] | undefined>;
const satu = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() ?? "";

function BatangSkor({ skor }: { skor: number }) {
  const k = keputusan(skor);
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-200" aria-hidden><div className="selisih-isi h-full rounded-full" style={{ width: `${skor}%`, background: k.warna }} /></div>
      <span className="tabular-nums text-sm font-semibold text-navy-800">{skor}</span>
    </div>
  );
}

function LencanaKeputusan({ skor }: { skor: number }) {
  const k = keputusan(skor);
  const Ikon = k.kunci === "pertahankan" ? CheckCircle2 : CircleAlert;
  return <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-navy-800"><Ikon className="size-3.5" style={{ color: k.warna }} aria-hidden />{k.label}</span>;
}

/** Kartu siklus satu alat: status di tiap tahap 1–10. */
async function KartuAlat({ a }: { a: AnalisaAlat }) {
  const d = await prisma.alat.findUnique({ where: { id: a.id }, select: { akl: true, produsen: true, distributor: true, tanggalUjiFungsi: true, garansiSampai: true, _count: { select: { permintaan: true, perintah: true, kalibrasi: true, dokumen: true, jadwal: true } } } });
  const tgl = (x: Date | null | undefined) => (x ? x.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Jakarta" }) : null);
  const status: Record<IdTahap, { teks: string; nada: "selesai" | "kini" | "perlu" | "nanti" }> = {
    kebutuhan: { teks: a.tahun ? `Kebutuhan terpenuhi (alat ada sejak ${a.tahun})` : "Alat sudah ada; tahun perolehan belum dicatat", nada: "selesai" },
    perencanaan: { teks: a.harga ? `Harga perolehan ${formatRupiah(a.harga)}` : "Harga perolehan belum dicatat", nada: a.harga ? "selesai" : "perlu" },
    penilaian: { teks: [a.merek, a.model].filter(Boolean).join(" ") || "Merek/tipe belum dicatat", nada: a.merek ? "selesai" : "perlu" },
    pengadaan: { teks: `Izin edar: ${d?.akl || "belum dicatat"}${d?.produsen ? ` · ${d.produsen}` : ""}${d?.garansiSampai ? ` · garansi s.d. ${tgl(d.garansiSampai)}` : ""}`, nada: d?.akl ? "selesai" : "perlu" },
    penerimaan: { teks: a.penerimaanLengkap ? `Uji fungsi/BA penerimaan tercatat${d?.tanggalUjiFungsi ? ` (${tgl(d.tanggalUjiFungsi)})` : ""}` : "BA Penerimaan / Uji Fungsi belum diunggah", nada: a.penerimaanLengkap ? "selesai" : "perlu" },
    operasional: { teks: `Kondisi ${a.kondisi}${a.aktif ? "" : " · nonaktif"}${a.umur != null ? ` · umur ${a.umur} dari ${a.umurTeknis} th${a.umurAsumsi ? " (asumsi)" : ""}` : ""}`, nada: a.kondisi === "Baik" && a.aktif ? "selesai" : "perlu" },
    pemeliharaan: { teks: `${d?._count.perintah ?? 0} perintah kerja · ${a.kerusakan12} korektif/12 bln · biaya ${formatRupiah(a.biaya)}${a.punyaJadwal ? (a.preventifTempo ? " · preventif JATUH TEMPO" : " · jadwal preventif ada") : " · belum ada jadwal preventif"}`, nada: a.woTerbuka || a.preventifTempo || !a.punyaJadwal ? "perlu" : "selesai" },
    kalibrasi: { teks: `${a.kal.label}${a.kalBerlaku ? ` · berlaku s.d. ${tgl(new Date(a.kalBerlaku))}` : ""} · ${d?._count.kalibrasi ?? 0} catatan`, nada: a.kal.kunci === "berlaku" || a.kal.kunci === "tanpa-batas" ? "selesai" : "perlu" },
    surveilans: { teks: `${d?._count.permintaan ?? 0} laporan kerusakan tercatat${a.laporanTerbuka ? ` · ${a.laporanTerbuka} belum selesai` : ""}`, nada: a.laporanTerbuka ? "perlu" : "selesai" },
    penghapusan: { teks: `Skor ${a.skor}/100 → ${keputusan(a.skor).label}`, nada: a.keputusan === "hapus" || a.keputusan === "ganti" ? "perlu" : "nanti" },
  };
  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-navy-800 to-teal-800 text-white">
        <CardTitle className="text-white">{a.nama}</CardTitle>
        <CardDescription className="text-navy-100">{[a.merek, a.model].filter(Boolean).join(" ") || "—"} · {a.kode} · {a.unit} · posisi saat ini: <strong className="text-white">{TAHAP[a.tahap].no}. {TAHAP[a.tahap].nama}</strong></CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 pt-6 lg:grid-cols-[1.4fr_1fr]">
        <ol className="relative grid gap-3 border-l-2 border-slate-200 pl-5">
          {SIKLUS.map((t) => {
            const s = status[t.id];
            const kini = a.tahap === t.id;
            const Ikon = s.nada === "selesai" ? CheckCircle2 : s.nada === "perlu" ? CircleAlert : kini ? CircleDot : Circle;
            return (
              <li key={t.id} className={cn("relative rounded-lg px-3 py-2", kini && "bg-teal-50 ring-1 ring-teal-200")}>
                <Ikon className={cn("absolute -left-[31px] top-2.5 size-5 rounded-full bg-white", s.nada === "selesai" ? "text-green-600" : s.nada === "perlu" ? "text-amber-600" : "text-slate-400")} aria-hidden />
                <p className="text-sm font-semibold text-navy-800">{t.no}. {t.nama} {kini && <span className="ml-1 rounded-full bg-teal-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">posisi kini</span>}</p>
                <p className="text-xs text-muted-foreground">{s.teks}</p>
              </li>
            );
          })}
        </ol>
        <div className="grid content-start gap-4">
          <div className="rounded-xl border p-4">
            <p className="text-xs font-medium text-muted-foreground">Skor kelayakan penghapusan</p>
            <p className="mt-1 text-4xl font-bold tabular-nums text-navy-800">{a.skor}<span className="text-lg text-muted-foreground">/100</span></p>
            <div className="mt-2"><LencanaKeputusan skor={a.skor} /></div>
            {a.alasan.length > 0 ? <ul className="mt-3 list-disc space-y-1 pl-4 text-sm text-navy-800">{a.alasan.map((x) => <li key={x}>{x}</li>)}</ul> : <p className="mt-3 text-sm text-muted-foreground">Tidak ada faktor risiko penggantian.</p>}
          </div>
          {a.saran.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-navy-800"><Sparkles className="size-4 text-amber-600" /> Saran ALLIES</p>
              <ol className="list-decimal space-y-1 pl-4 text-sm text-navy-800">{a.saran.map((x) => <li key={x}>{x}</li>)}</ol>
            </div>
          )}
          <Button variant="outline" asChild><Link href={`/alat?kode=${encodeURIComponent(a.kode)}`}>Buka detail alat <ArrowRight /></Link></Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function AlliesPage({ searchParams }: { searchParams: Promise<Sp> }) {
  const sp = await searchParams;
  const kunci = await unitTerkunci();
  const [r, pembuka] = await Promise.all([ringkasanAllies(kunci?.id ?? null), jawabAllies("halo", kunci?.id ?? null)]);
  const qAlat = satu(sp.alat).slice(0, 120);
  const qn = qAlat.toLowerCase();
  const cocok = qAlat ? r.semua.filter((a) => a.kode.toLowerCase() === qn || `${a.kode} ${a.nama} ${a.merek ?? ""} ${a.model ?? ""}`.toLowerCase().includes(qn)) : [];
  const dipilih = cocok.find((a) => a.kode.toLowerCase() === qn) ?? (cocok.length === 1 ? cocok[0] : null);
  const agenda = [
    ...r.kandidat.filter((a) => a.keputusan === "hapus").slice(0, 3).map((a) => ({ a, teks: "Usulkan penghapusan & penggantian", nada: "bahaya" as const })),
    ...r.kalibrasi.filter((a) => a.kal.kunci === "bermasalah").slice(0, 3).map((a) => ({ a, teks: `Kalibrasi: ${a.kal.label}`, nada: "bahaya" as const })),
    ...r.semua.filter((a) => a.laporanTerbuka > 0 && a.woTerbuka === 0).slice(0, 3).map((a) => ({ a, teks: "Laporan kerusakan belum dibuatkan WO", nada: "awas" as const })),
    ...r.kalibrasi.filter((a) => a.kal.kunci === "segera").slice(0, 3).map((a) => ({ a, teks: `Kalibrasi habis ${a.kal.label}`, nada: "awas" as const })),
    ...r.kandidat.filter((a) => a.keputusan === "ganti").slice(0, 3).map((a) => ({ a, teks: "Rencanakan penggantian", nada: "awas" as const })),
  ].slice(0, 8);

  return (
    <>
      {/* Hero */}
      <section className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-navy-900 via-navy-800 to-teal-900 p-6 text-white shadow-card md:p-10">
        <div className="grid items-center gap-6 xl:grid-cols-[1fr_1.1fr]">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 motion-reduce:animate-none">
            <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-teal-100"><Bot className="size-3.5" /> Agen pengelolaan alat medik STARS{kunci ? ` · unit ${kunci.nama}` : ""}</p>
            <h1 className="text-4xl font-extrabold tracking-tight md:text-6xl"><span className="bg-gradient-to-r from-white via-teal-100 to-teal-300 bg-clip-text text-transparent">ALLIES</span></h1>
            <p className="mt-3 max-w-xl text-navy-100 md:text-lg">Membantu siklus hidup alat kesehatan dari <strong className="text-white">Analisa Kebutuhan</strong> sampai <strong className="text-white">Penghapusan</strong>, lalu mengulang siklus Pre-Market → Post-Market untuk alat penggantinya — berdasarkan data inventaris, pemeliharaan, kalibrasi, dan perencanaan STARS.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="teal" size="lg" asChild><a href="#tanya"><Bot /> Tanya ALLIES</a></Button>
              <Button size="lg" className="bg-white/10 text-white hover:bg-white/20" asChild><a href="#rekomendasi">Lihat rekomendasi</a></Button>
            </div>
          </div>
          <div className="flex justify-center rounded-2xl bg-white/95 p-2 animate-in fade-in zoom-in-95 duration-1000 motion-reduce:animate-none"><DiagramSiklus jumlah={r.perTahap} /></div>
        </div>
      </section>

      <section aria-label="Indikator ALLIES" className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Alat dianalisis" value={formatNumber(r.aktif)} hint={`${formatNumber(r.total - r.aktif)} nonaktif · ${formatNumber(r.perTahap.operasional)} beroperasi normal`} />
        <StatCard label="Kandidat ganti / hapus" value={formatNumber(r.kandidat.length)} hint={`${formatNumber(r.perKeputusan.hapus)} usul hapus · ${formatNumber(r.perKeputusan.ganti)} rencana ganti`} />
        <StatCard label="Perlu tindakan kalibrasi" value={formatNumber(r.kalibrasi.length)} hint="kedaluwarsa, tidak laik, atau habis ≤ 30 hari" />
        <StatCard label="Data alat belum lengkap" value={formatNumber(r.dataKurang)} hint="tanpa tahun/harga perolehan → penilaian terbatas" />
      </section>

      {/* Tanya + Agenda */}
      <section id="tanya" className="mb-10 grid scroll-mt-24 gap-4 lg:grid-cols-[1.3fr_1fr]">
        <ObrolanAllies pembuka={pembuka} saranAwal={SARAN_PEMBUKA} />
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="size-4 text-amber-500" /> Agenda prioritas</CardTitle><CardDescription>Disusun otomatis dari data terkini; klik untuk melihat kartu siklus alat.</CardDescription></CardHeader>
          <CardContent>
            {agenda.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Tidak ada tindakan mendesak. 🎉</p> : (
              <ul className="divide-y">
                {agenda.map(({ a, teks, nada }, i) => (
                  <li key={`${a.id}-${i}`}>
                    <Link href={`/allies?alat=${encodeURIComponent(a.kode)}#alat`} className="flex gap-3 py-2.5 hover:bg-slate-50">
                      <CircleAlert className={cn("mt-0.5 size-4 shrink-0", nada === "bahaya" ? "text-red-600" : "text-amber-600")} aria-hidden />
                      <span className="min-w-0"><span className="block truncate text-sm font-medium text-navy-800">{a.nama}</span><span className="block text-xs text-muted-foreground">{teks} · {a.kode} · {a.unit}</span></span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Kartu siklus alat */}
      <section id="alat" className="mb-10 scroll-mt-24">
        <h2 className="mb-1 text-2xl font-bold tracking-tight text-navy-800">Kartu siklus alat</h2>
        <p className="mb-4 text-sm text-muted-foreground">Lihat posisi satu alat di siklus 1–10, skor kelayakan penghapusan beserta alasannya, dan saran tindakan berikutnya.</p>
        <form method="get" action="/allies#alat" className="mb-4 flex max-w-xl gap-2" role="search">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden /><Input name="alat" defaultValue={qAlat} placeholder="Kode inventaris, nama, merek, atau tipe alat" className="pl-9" aria-label="Cari alat" /></div>
          <Button type="submit">Analisis</Button>
        </form>
        {dipilih ? <KartuAlat a={dipilih} /> : qAlat ? (
          cocok.length ? (
            <Card><CardContent className="pt-6"><p className="mb-2 text-sm text-muted-foreground">{cocok.length} alat cocok — pilih satu:</p>
              <ul className="grid gap-1 sm:grid-cols-2">{cocok.slice(0, 30).map((a) => <li key={a.id}><Link className="block rounded-md px-2 py-1.5 text-sm hover:bg-slate-50" href={`/allies?alat=${encodeURIComponent(a.kode)}#alat`}><span className="font-medium text-navy-800">{a.nama}</span> <span className="text-xs text-muted-foreground">{a.kode} · {a.unit}</span></Link></li>)}</ul>
            </CardContent></Card>
          ) : <p className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">Alat &ldquo;{qAlat}&rdquo; tidak ditemukan.</p>
        ) : null}
      </section>

      {/* Rekomendasi */}
      <section id="rekomendasi" className="mb-10 scroll-mt-24">
        <h2 className="mb-1 text-2xl font-bold tracking-tight text-navy-800">Rekomendasi penggantian & penghapusan</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Skor 0–100 dari: umur vs umur teknis (maks 35), kondisi (maks 40), biaya perbaikan kumulatif vs harga perolehan (maks 25), perbaikan korektif 12 bulan (maks 20), dan hasil kalibrasi (maks 15).
          {" "}{KEPUTUSAN.map((k) => `${k.label} ≥ ${k.min}`).join(" · ")}. Skor adalah alat bantu telaah — keputusan akhir tetap melalui telaah teknis & prosedur BMD.
        </p>
        <Card className="overflow-hidden">
          {r.kandidat.length + r.pantau.length === 0 ? <CardContent className="py-10 text-center text-sm text-muted-foreground">Belum ada alat yang perlu dipantau atau diganti menurut data saat ini.</CardContent> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs text-muted-foreground"><tr><th className="px-4 py-2 font-medium">Alat</th><th className="px-4 py-2 font-medium">Unit</th><th className="px-4 py-2 font-medium">Skor</th><th className="px-4 py-2 font-medium">Rekomendasi</th><th className="hidden px-4 py-2 font-medium md:table-cell">Dasar</th></tr></thead>
                <tbody className="divide-y">
                  {[...r.kandidat, ...r.pantau].slice(0, 40).map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-2.5"><Link href={`/allies?alat=${encodeURIComponent(a.kode)}#alat`} className="font-medium text-navy-800 hover:text-teal-700 hover:underline">{a.nama}</Link><div className="text-xs text-muted-foreground">{a.kode}{a.merek ? ` · ${a.merek}` : ""}</div></td>
                      <td className="px-4 py-2.5 text-xs">{a.unit}</td>
                      <td className="px-4 py-2.5"><BatangSkor skor={a.skor} /></td>
                      <td className="px-4 py-2.5"><LencanaKeputusan skor={a.skor} /></td>
                      <td className="hidden max-w-md px-4 py-2.5 text-xs text-muted-foreground md:table-cell">{a.alasan.join("; ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>

      {/* Tahap */}
      <section aria-labelledby="judul-tahap" className="mb-10">
        <h2 id="judul-tahap" className="mb-1 text-2xl font-bold tracking-tight text-navy-800">Panduan 10 tahap siklus</h2>
        <p className="mb-4 text-sm text-muted-foreground">Daftar periksa, keluaran, rujukan, dan menu STARS untuk tiap tahap. Klik tahap untuk membuka.</p>
        {(["pre", "post"] as const).map((fase) => (
          <div key={fase} className="mb-6">
            <h3 className={cn("mb-3 text-sm font-semibold uppercase tracking-wide", fase === "pre" ? "text-teal-700" : "text-[#6250d6]")}>{LABEL_FASE[fase]}</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {SIKLUS.filter((t) => t.fase === fase).map((t) => (
                <details key={t.id} id={`tahap-${t.id}`} className="group scroll-mt-24 rounded-xl border bg-card shadow-card open:ring-1 open:ring-teal-200">
                  <summary className="flex cursor-pointer list-none items-start gap-3 p-4 [&::-webkit-details-marker]:hidden">
                    <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl text-white", fase === "pre" ? "bg-teal-600" : "bg-[#6250d6]")}><t.ikon className="size-5" aria-hidden /></span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 font-semibold text-navy-800">{t.no}. {t.nama} <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">{formatNumber(r.perTahap[t.id])} alat</span></span>
                      <span className="mt-0.5 block text-sm text-muted-foreground">{t.ringkas}</span>
                    </span>
                    <ChevronDown className="mt-1 size-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" aria-hidden />
                  </summary>
                  <div className="grid gap-4 border-t px-4 pb-4 pt-3 text-sm">
                    <div><p className="mb-1 text-xs font-semibold uppercase tracking-wide text-teal-800">Daftar periksa</p><ul className="space-y-1">{t.periksa.map((x) => <li key={x} className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-teal-600" aria-hidden />{x}</li>)}</ul></div>
                    <div><p className="mb-1 text-xs font-semibold uppercase tracking-wide text-teal-800">Keluaran</p><p>{t.keluaran.join(" · ")}</p></div>
                    <div><p className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-teal-800"><BookOpen className="size-3.5" /> Rujukan</p><ul className="list-disc space-y-0.5 pl-4 text-muted-foreground">{t.rujukan.map((x) => <li key={x}>{x}</li>)}</ul></div>
                    <div className="flex flex-wrap gap-2">{t.menu.map((m) => <Button key={m.href} variant="outline" size="sm" asChild><Link href={m.href}>{m.label} <ArrowRight /></Link></Button>)}</div>
                  </div>
                </details>
              ))}
            </div>
          </div>
        ))}
      </section>

      <p className="text-xs text-muted-foreground">
        ALLIES bekerja tanpa AI eksternal: semua jawaban dihitung di server STARS dari data yang ada, dan pertanyaan tidak disimpan. Umur teknis yang kosong memakai asumsi 8 tahun (ditandai &ldquo;asumsi&rdquo;).
        Nomor peraturan dalam rujukan perlu dicek ulang ke JDIH sebelum dikutip di dokumen resmi.
      </p>
    </>
  );
}
