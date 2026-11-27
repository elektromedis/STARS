import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { sesiHalaman } from "@/lib/sesi";
import { cukup } from "@/lib/peran";
import { inp } from "@/lib/aksi-admin";
import { Flash } from "@/components/admin/flash";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isiOtomatis, simpanPadanan } from "./actions";

export const metadata: Metadata = { title: "Padanan Ruang ASPAK" };
export const dynamic = "force-dynamic";

export default async function RuanganAspakPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const se = await sesiHalaman("Viewer");
  const sp = await searchParams;
  const tulis = cukup(se.user.peran, "Operator") && process.env.STARS_MODE !== "internet";
  const [ruangan, std] = await Promise.all([
    prisma.ruangan.findMany({ where: { aktif: true }, orderBy: [{ unitKerja: { nama: "asc" } }, { nama: "asc" }], include: { unitKerja: true, _count: { select: { alat: true } } } }),
    prisma.standarAlat.findMany({ select: { namaRuangan: true }, distinct: ["namaRuangan"], orderBy: { namaRuangan: "asc" } }),
  ]);
  const per = new Map<string, typeof ruangan>();
  ruangan.forEach((r) => per.set(r.unitKerja.nama, [...(per.get(r.unitKerja.nama) ?? []), r]));
  const belum = ruangan.filter((r) => !r.padananAspak).length;
  return (
    <div className="grid gap-4">
      <Flash ok={sp.ok} error={sp.error} />
      <Card>
        <CardHeader><CardTitle>Padanan Ruang / Pelayanan ASPAK</CardTitle><CardDescription>Memetakan tiap ruangan di STARS ke ruang standar ASPAK (seperti kolom padanan di TRILUX Plus). Dipakai menghitung <a className="text-teal-800 underline" href="/admin/aspak">pemenuhan alat</a>. {belum} dari {ruangan.length} ruangan belum dipetakan.</CardDescription></CardHeader>
        <CardContent className="grid gap-3">
          <datalist id="ruang-standar">{std.map((x) => <option key={x.namaRuangan} value={x.namaRuangan} />)}</datalist>
          {tulis && <form action={isiOtomatis}><Button variant="outline" size="sm">Isi otomatis yang namanya identik</Button></form>}
          {!std.length && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Belum ada standar alat; saran nama ruang muncul setelah standar diimpor. Padanan tetap bisa diketik bebas.</p>}
          {[...per].map(([unit, rs]) => <div key={unit} className="rounded-lg border p-3"><p className="mb-2 text-sm font-semibold text-navy-900">{unit}</p>
            <div className="grid gap-2">{rs.map((r) => <form key={r.id} action={simpanPadanan} className="grid items-center gap-2 text-sm sm:grid-cols-[14rem_1fr_auto]">
              <input type="hidden" name="id" value={r.id} /><span>{r.nama} <span className="text-xs text-muted-foreground">({r._count.alat} alat)</span></span>
              <input name="padanan" list="ruang-standar" defaultValue={r.padananAspak ?? ""} placeholder="Ruang standar ASPAK" className={inp} disabled={!tulis} />
              {tulis && <Button size="sm" variant="teal">Simpan</Button>}</form>)}</div></div>)}
          {!ruangan.length && <p className="text-sm text-muted-foreground">Belum ada ruangan.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
