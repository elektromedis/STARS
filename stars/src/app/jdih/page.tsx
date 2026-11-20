import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, FileText, Landmark, Search } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { JENIS_PERATURAN, namaPeraturan, STATUS_PERATURAN, SUBJEK_PERATURAN } from "@/lib/jdih";

export const metadata: Metadata = { title: "JDIH — Peraturan", description: "Jaringan Dokumentasi dan Informasi Hukum: peraturan terkait alat kesehatan dan STARS" };
export const dynamic = "force-dynamic";
const sel = "h-10 rounded-lg border bg-white px-2 text-sm";
const WARNA: Record<string, string> = { Berlaku: "bg-emerald-50 text-emerald-800", Diubah: "bg-amber-50 text-amber-800", Dicabut: "bg-red-50 text-red-800" };

export default async function JdihPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 100), tahun = Number(sp.tahun) || undefined;
  const where: Prisma.PeraturanWhereInput = {
    aktif: true,
    ...(sp.jenis && { jenis: sp.jenis }), ...(sp.subjek && { subjek: sp.subjek }), ...(sp.status && { status: sp.status }), ...(tahun && { tahun }),
    ...(q && { OR: [{ judul: { contains: q } }, { nomor: { contains: q } }, { jenis: { contains: q } }, { keterangan: { contains: q } }, { pemrakarsa: { contains: q } }] }),
  };
  const [daftar, perJenis, semuaTahun] = await Promise.all([
    prisma.peraturan.findMany({ where, orderBy: [{ tahun: "desc" }, { jenis: "asc" }, { id: "desc" }], take: 200 }),
    prisma.peraturan.groupBy({ by: ["jenis"], where: { aktif: true }, _count: true }),
    prisma.peraturan.findMany({ where: { aktif: true }, distinct: ["tahun"], select: { tahun: true }, orderBy: { tahun: "desc" } }),
  ]);
  const jenisAda = [...new Set([...JENIS_PERATURAN, ...perJenis.map((x) => x.jenis)])].filter((j) => perJenis.some((x) => x.jenis === j));
  const filter = Boolean(q || sp.jenis || sp.subjek || sp.status || tahun);
  return (
    <div className="grid gap-5">
      <section className="rounded-2xl bg-gradient-to-br from-[#1e3a5f] to-teal-700 px-5 py-8 text-white md:px-10">
        <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-emerald-200"><Landmark className="size-5" aria-hidden /> JDIH STARS</p>
        <h1 className="mt-2 text-2xl font-bold md:text-4xl">Jaringan Dokumentasi dan Informasi Hukum</h1>
        <p className="mt-2 max-w-3xl text-sm opacity-90 md:text-base">Kumpulan peraturan yang menjadi dasar pengelolaan alat kesehatan dan fitur STARS di RSUD Cipayung. Teks resmi peraturan pusat dapat dibuka di JDIH BPK.</p>
        <form method="get" role="search" className="mt-5 flex max-w-3xl flex-wrap gap-2">
          <label className="relative min-w-0 flex-1"><span className="sr-only">Kata kunci</span>
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input name="q" defaultValue={q} placeholder="Cari judul, nomor, atau jenis peraturan…" className="h-11 w-full rounded-lg bg-white pl-9 pr-3 text-sm text-navy-900" /></label>
          <button className="h-11 rounded-lg bg-emerald-500 px-5 text-sm font-semibold text-white hover:bg-emerald-600">Cari</button>
        </form>
        <div className="mt-5 flex flex-wrap gap-2">
          {jenisAda.map((j) => <Link key={j} href={`/jdih?jenis=${encodeURIComponent(j)}`} className={`rounded-full px-3 py-1 text-xs font-semibold ${sp.jenis === j ? "bg-white text-[#1e3a5f]" : "bg-white/15 hover:bg-white/25"}`}>{j} <span className="opacity-70">{perJenis.find((x) => x.jenis === j)?._count}</span></Link>)}
        </div>
      </section>

      <form method="get" className="flex flex-wrap items-end gap-2" aria-label="Saring peraturan">
        {q && <input type="hidden" name="q" value={q} />}
        <label className="grid gap-1 text-xs font-medium">Jenis<select name="jenis" defaultValue={sp.jenis ?? ""} className={sel}><option value="">Semua</option>{jenisAda.map((j) => <option key={j}>{j}</option>)}</select></label>
        <label className="grid gap-1 text-xs font-medium">Tahun<select name="tahun" defaultValue={tahun ?? ""} className={sel}><option value="">Semua</option>{semuaTahun.map((t) => <option key={t.tahun}>{t.tahun}</option>)}</select></label>
        <label className="grid gap-1 text-xs font-medium">Subjek<select name="subjek" defaultValue={sp.subjek ?? ""} className={sel}><option value="">Semua</option>{SUBJEK_PERATURAN.map((j) => <option key={j}>{j}</option>)}</select></label>
        <label className="grid gap-1 text-xs font-medium">Status<select name="status" defaultValue={sp.status ?? ""} className={sel}><option value="">Semua</option>{STATUS_PERATURAN.map((j) => <option key={j}>{j}</option>)}</select></label>
        <button className="h-10 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white">Terapkan</button>
        {filter && <Link href="/jdih" className="h-10 px-2 text-sm leading-10 text-teal-800 underline">Atur ulang</Link>}
        <p className="ml-auto text-sm text-muted-foreground" role="status">{daftar.length} peraturan</p>
      </form>

      <ul className="grid gap-3">
        {daftar.map((p) => (
          <li key={p.id} className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded bg-[#1e3a5f] px-2 py-0.5 font-semibold text-white">{p.jenis}</span>
              <span className={`rounded px-2 py-0.5 font-semibold ${WARNA[p.status] ?? "bg-slate-100"}`}>{p.status}</span>
              {p.subjek && <span className="rounded bg-slate-100 px-2 py-0.5">{p.subjek}</span>}
              {p.pemrakarsa && <span className="text-muted-foreground">{p.pemrakarsa}</span>}
            </div>
            <h2 className="mt-2 font-semibold text-navy-900"><Link href={`/jdih/${p.id}`} className="hover:underline">{namaPeraturan(p)}</Link></h2>
            <p className="text-sm text-slate-700">tentang {p.judul}</p>
            <div className="mt-2 flex flex-wrap gap-3 text-sm">
              <Link href={`/jdih/${p.id}`} className="font-medium text-teal-800 hover:underline">Detail</Link>
              {p.berkas && <a href={`/api/jdih/${p.id}/berkas?unduh=1`} className="flex items-center gap-1 font-medium text-teal-800 hover:underline"><FileText className="size-4" aria-hidden /> Unduh PDF</a>}
              {p.tautan && <a href={p.tautan} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 font-medium text-teal-800 hover:underline">{p.tautan.includes("bpk.go.id") ? "Buka di JDIH BPK" : "Sumber"} <ExternalLink className="size-3.5" aria-hidden /></a>}
            </div>
          </li>))}
        {!daftar.length && <li className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">Tidak ada peraturan yang cocok. Coba kata kunci lain, atau <a href={`https://peraturan.bpk.go.id/Search?keywords=${encodeURIComponent(q)}`} target="_blank" rel="noopener noreferrer" className="text-teal-800 underline">cari di JDIH BPK</a>.</li>}
      </ul>
      <p className="text-xs text-muted-foreground">Sumber teks resmi: <a href="https://peraturan.bpk.go.id/" target="_blank" rel="noopener noreferrer" className="underline">JDIH BPK RI (peraturan.bpk.go.id)</a>. Daftar ini disusun pengelola STARS sebagai rujukan; selalu periksa status terakhir pada sumber resmi.</p>
    </div>
  );
}
