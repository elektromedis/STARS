import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { cariPengetahuan } from "@/lib/pengetahuan";
import { sesiHalaman } from "@/lib/sesi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { hapusDokumen } from "./actions";

export const metadata: Metadata = { title: "Basis Pengetahuan ALLIES" };
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await sesiHalaman("Admin");
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const [dok, hasil] = await Promise.all([
    prisma.dokumenPengetahuan.findMany({ orderBy: { id: "desc" }, include: { _count: { select: { potongan: true } } } }),
    q ? cariPengetahuan(q, 5) : Promise.resolve([]),
  ]);
  return (
    <div className="grid gap-6">
      <div><h1 className="text-2xl font-bold text-navy-800">Basis Pengetahuan ALLIES</h1><p className="text-sm text-muted-foreground">Dokumen rujukan yang dibaca Karyawan AI. Jangan unggah dokumen berisi data pasien atau data pribadi.</p></div>
      {sp.ok && <p role="status" className="rounded-lg bg-green-50 px-4 py-2 text-sm text-green-800">{sp.ok}</p>}
      {sp.error && <p role="alert" className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-800">{sp.error}</p>}
      <Card><CardHeader><CardTitle>Tambah dokumen</CardTitle><CardDescription>PDF berteks, TXT, atau MD, maksimal 40 MB.</CardDescription></CardHeader><CardContent>
        <form action="/api/admin/pengetahuan" method="post" encType="multipart/form-data" className="grid gap-3 md:grid-cols-[1fr_10rem_1fr_auto]">
          <Input name="judul" placeholder="Judul dokumen" aria-label="Judul dokumen" maxLength={200} />
          <select name="jenis" aria-label="Jenis dokumen" className="h-10 rounded-md border bg-white px-3 text-sm">{["Pedoman", "Peraturan", "SOP", "Manual Alat", "Lainnya"].map((x) => <option key={x}>{x}</option>)}</select>
          <input name="berkas" type="file" required accept=".pdf,.txt,.md" aria-label="Berkas" className="min-w-0 text-sm" />
          <Button type="submit">Unggah</Button>
        </form>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Dokumen ({dok.length})</CardTitle></CardHeader><CardContent>
        {dok.length ? <ul className="divide-y">{dok.map((d) => <li key={d.id} className="flex items-center justify-between gap-3 py-2"><span className="min-w-0"><span className="block font-medium text-navy-800">{d.judul}</span><span className="text-xs text-muted-foreground">{d.jenis} · {d.halaman} halaman · {d._count.potongan} potongan</span></span><form action={hapusDokumen}><input type="hidden" name="id" value={d.id} /><Button type="submit" variant="outline" size="sm">Hapus</Button></form></li>)}</ul> : <p className="text-sm text-muted-foreground">Belum ada dokumen.</p>}
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Uji pencarian</CardTitle></CardHeader><CardContent className="grid gap-3">
        <form className="flex gap-2"><Input name="q" defaultValue={q} placeholder="Contoh: pemeliharaan infusion pump" aria-label="Kata pencarian" /><Button type="submit">Cari</Button></form>
        {q && !hasil.length && <p className="text-sm text-muted-foreground">Tidak ditemukan.</p>}
        {hasil.map((h, i) => <blockquote key={i} className="rounded-lg border bg-slate-50 p-3 text-sm"><p className="mb-1 text-xs font-semibold text-teal-800">{h.judul}, hlm. {h.halaman}</p><p className="line-clamp-4 whitespace-pre-line">{h.kutipan}</p></blockquote>)}
      </CardContent></Card>
    </div>
  );
}
