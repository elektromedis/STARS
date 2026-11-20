import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { sesiHalaman } from "@/lib/sesi";
import { cukup } from "@/lib/peran";
import { baris } from "@/lib/lembar-kerja";
import { Button } from "@/components/ui/button";
import { simpanTemplate } from "../actions";

export const metadata: Metadata = { title: "Template Lembar Kerja" };
export const dynamic = "force-dynamic";
const inp = "h-9 w-full rounded-md border bg-white px-2 text-sm";
const ta = "rounded-md border bg-white px-2 py-1 font-mono text-xs";

function Form({ t }: { t?: { id: number; nama: string; kataKunci: string | null; halaman: number | null; kualitatif: string; kuantitatif: string; preventif: string; lengkap: boolean; aktif: boolean } }) {
  return (
    <form action={simpanTemplate} className="grid gap-2 sm:grid-cols-3">
      {t && <input type="hidden" name="id" value={t.id} />}
      <label className="grid gap-1 text-sm">Jenis alat<input name="nama" required defaultValue={t?.nama} className={inp} /></label>
      <label className="grid gap-1 text-sm">Kata kunci pencocok nama inventaris (koma)<input name="kataKunci" defaultValue={t?.kataKunci ?? ""} className={inp} /></label>
      <label className="grid gap-1 text-sm">Halaman pedoman<input name="halaman" type="number" defaultValue={t?.halaman ?? ""} className={inp} /></label>
      <label className="grid gap-1 text-sm">Qualitative tasks (1 butir/baris)<textarea name="kualitatif" rows={9} defaultValue={t?.kualitatif} className={ta} /></label>
      <label className="grid gap-1 text-sm">Quantitative tasks (Parameter | kriteria)<textarea name="kuantitatif" rows={9} defaultValue={t?.kuantitatif ?? "Ground Resistance | ≤0,5 Ω\nTouch Current | ≤500 µA\nChassis Leakage Current (installed equipment) | ≤10 mA\nLead-to-Ground Leakage Current | ≤100/500 µA grounded/un-grounded"} className={ta} /></label>
      <label className="grid gap-1 text-sm">Preventive maintenance (1 butir/baris)<textarea name="preventif" rows={9} defaultValue={t?.preventif ?? "Clean exterior and accessories\nPembersihan eksterior/luar alat\nPengencangan baut\nPenggantian spare part yang rusak\nPelabelan kalibrasi eksternal\nCalibrate/adjust electrical components\nCalibrate/adjust mechanical components\nReplace"} className={ta} /></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="lengkap" defaultChecked={t?.lengkap} /> Butir sudah sesuai pedoman</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="aktif" value="off" defaultChecked={t ? !t.aktif : false} /> Nonaktifkan</label>
      <Button variant="teal" className="justify-self-start">Simpan template</Button>
    </form>
  );
}

export default async function TemplateLK({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const se = await sesiHalaman("Viewer");
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const daftar = await prisma.templateLembarKerja.findMany({ where: q ? { OR: [{ nama: { contains: q } }, { kataKunci: { contains: q } }] } : {}, orderBy: { nama: "asc" } });
  const admin = cukup(se.user.peran, "Admin");
  const nLengkap = daftar.filter((t) => t.lengkap).length;
  return (
    <div className="grid gap-4">
      <Link href="/admin/lembar-kerja" className="flex items-center gap-1 text-sm text-teal-800 hover:underline"><ArrowLeft className="size-4" /> Lembar kerja</Link>
      {sp.ok && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{sp.ok}</p>}
      {sp.error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{sp.error}</p>}
      <div><h1 className="text-xl font-bold text-navy-900">Template Lembar Kerja per Jenis Alat</h1>
        <p className="text-sm text-muted-foreground">{daftar.length} jenis alat dari Pedoman Pengoperasian dan Pemeliharaan Peralatan Kesehatan (Kemenkes 2021) Bab IV · {nLengkap} sudah sesuai butir pedoman (✓), sisanya memakai butir umum — lengkapi dari halaman pedoman yang tercantum.</p></div>
      <form className="flex max-w-md gap-2"><input name="q" defaultValue={q} placeholder="Cari jenis alat…" aria-label="Cari jenis alat" className={inp} /><Button variant="outline">Cari</Button></form>
      {admin && <details className="rounded-xl border bg-card p-3"><summary className="cursor-pointer font-semibold">+ Tambah jenis alat</summary><div className="mt-3"><Form /></div></details>}
      <div className="grid gap-2">
        {daftar.map((t) => (
          <details key={t.id} open={daftar.length === 1} className="rounded-lg border bg-card p-2 text-sm">
            <summary className="flex cursor-pointer flex-wrap items-center gap-2"><b>{t.nama}</b>{t.lengkap ? <span className="rounded bg-emerald-100 px-1.5 text-xs text-emerald-800">✓ sesuai pedoman</span> : <span className="rounded bg-amber-100 px-1.5 text-xs text-amber-800">butir umum</span>}{!t.aktif && <span className="text-xs text-muted-foreground">nonaktif</span>}<span className="ml-auto text-xs text-muted-foreground">{t.halaman ? `hal. ${t.halaman} · ` : ""}{baris(t.kualitatif).length} butir</span></summary>
            <div className="mt-3 border-t pt-3">{admin ? <Form t={t} /> : <pre className="whitespace-pre-wrap text-xs">{t.kualitatif}</pre>}</div>
          </details>))}
      </div>
    </div>
  );
}
