import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { sesiHalaman } from "@/lib/sesi";
import { cukup } from "@/lib/peran";
import { inp, rp } from "@/lib/aksi-admin";
import { KUNCI_PMK, PERSEN_PMK_BAWAAN, bucketUsia } from "@/lib/aspak";
import { Flash } from "@/components/admin/flash";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { simpanPersen } from "./actions";

export const metadata: Metadata = { title: "Perencanaan & Usia Alat" };
export const dynamic = "force-dynamic";

export default async function PerencanaanPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const se = await sesiHalaman("Viewer");
  const sp = await searchParams;
  const adm = cukup(se.user.peran, "Admin") && process.env.STARS_MODE !== "internet";
  const [set, alat] = await Promise.all([
    prisma.pengaturan.findUnique({ where: { kunci: KUNCI_PMK } }),
    prisma.alat.findMany({ where: { aktif: true }, select: { jenis: true, hargaPerolehan: true, tahunPerolehan: true, usiaTeknis: true, kondisi: true, unitKerja: { select: { nama: true } } } }),
  ]);
  const persen = Number(set?.nilai ?? PERSEN_PMK_BAWAAN);
  const total = alat.reduce((n, a) => n + (a.hargaPerolehan ?? 0), 0);
  const tanpaHarga = alat.filter((a) => !a.hargaPerolehan).length;
  const perUnit = new Map<string, { n: number; nilai: number }>();
  alat.forEach((a) => { const u = perUnit.get(a.unitKerja.nama) ?? { n: 0, nilai: 0 }; u.n++; u.nilai += a.hargaPerolehan ?? 0; perUnit.set(a.unitKerja.nama, u); });
  const bucket = new Map<number, number>(); let tanpaUsia = 0;
  alat.forEach((a) => { const b = bucketUsia(a.tahunPerolehan, a.usiaTeknis); if (b == null) tanpaUsia++; else bucket.set(b, (bucket.get(b) ?? 0) + 1); });
  const kondisi = new Map<string, number>(); alat.forEach((a) => kondisi.set(a.kondisi, (kondisi.get(a.kondisi) ?? 0) + 1));
  const maks = Math.max(1, ...bucket.values());
  const tahun = new Date().getFullYear() + 1;
  return (
    <div className="grid gap-4">
      <Flash ok={sp.ok} error={sp.error} />
      <Card>
        <CardHeader><CardTitle>Perencanaan Biaya Pemeliharaan {tahun}</CardTitle><CardDescription>Perkiraan = nilai perolehan alat aktif × persentase. Persentase bawaan {PERSEN_PMK_BAWAAN}% mengikuti rasio yang tampil di TRILUX Plus (label PMK 15/2023); sesuaikan dengan ketentuan yang Anda pakai.</CardDescription></CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Nilai perolehan alat aktif ({alat.length} alat)</p><p className="text-xl font-semibold">{rp(total)}</p>{tanpaHarga > 0 && <p className="text-xs text-amber-700">{tanpaHarga} alat belum ada harga</p>}</div>
            <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Persentase pemeliharaan</p>
              <form action={simpanPersen} className="mt-1 flex items-center gap-2"><input name="persen" defaultValue={persen} className={`${inp} w-20`} disabled={!adm} /><span>%</span>{adm && <Button size="sm" variant="teal">Simpan</Button>}</form></div>
            <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Perkiraan biaya pemeliharaan / tahun</p><p className="text-xl font-semibold text-teal-800">{rp(Math.round((total * persen) / 100))}</p></div>
          </div>
          <table className="w-full text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-2">Unit kerja</th><th>Alat</th><th>Nilai perolehan</th><th>Perkiraan pemeliharaan</th></tr></thead>
            <tbody>{[...perUnit].sort((a, b) => b[1].nilai - a[1].nilai).map(([u, v]) => <tr key={u} className="border-b"><td className="py-2">{u}</td><td>{v.n}</td><td>{rp(v.nilai)}</td><td>{rp(Math.round((v.nilai * persen) / 100))}</td></tr>)}</tbody></table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Usia Teknis Alat</CardTitle><CardDescription>Persentase usia teknis terpakai = (tahun ini − tahun perolehan) ÷ usia teknis. {tanpaUsia} alat belum lengkap datanya (tahun perolehan/usia teknis).</CardDescription></CardHeader>
        <CardContent className="grid gap-2">
          {[0, 20, 40, 60, 80, 100].map((b) => <div key={b} className="grid grid-cols-[6rem_1fr_3rem] items-center gap-2 text-sm"><span>Usia {b}%</span><div className="h-3 rounded bg-slate-100"><div className={`h-3 rounded ${b >= 80 ? "bg-red-500" : b >= 60 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${((bucket.get(b) ?? 0) / maks) * 100}%` }} /></div><span className="text-right">{bucket.get(b) ?? 0}</span></div>)}
          <p className="pt-2 text-xs text-muted-foreground">Kondisi: {[...kondisi].map(([k, n]) => `${k} ${n}`).join(" · ") || "—"}</p>
        </CardContent>
      </Card>
    </div>
  );
}
