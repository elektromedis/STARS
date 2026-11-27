import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { sesiHalaman } from "@/lib/sesi";
import { cukup } from "@/lib/peran";
import { inp, rp } from "@/lib/aksi-admin";
import { nilaiBuku, nilaiTerinflasi } from "@/lib/perencanaan";
import { Flash } from "@/components/admin/flash";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { hapusInflasi, simpanInflasi } from "./actions";

export const metadata: Metadata = { title: "Depresiasi & Inflasi" };
export const dynamic = "force-dynamic";

export default async function DepresiasiPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const se = await sesiHalaman("Viewer");
  const sp = await searchParams;
  const adm = cukup(se.user.peran, "Admin") && process.env.STARS_MODE !== "internet";
  const [infl, alat] = await Promise.all([
    prisma.inflasiTahun.findMany({ orderBy: { tahun: "desc" } }),
    prisma.alat.findMany({ where: { aktif: true, hargaPerolehan: { gt: 0 }, tahunPerolehan: { not: null } }, orderBy: { hargaPerolehan: "desc" }, take: 300, select: { id: true, kode: true, nama: true, hargaPerolehan: true, tahunPerolehan: true, usiaTeknis: true } }),
  ]);
  const im = new Map(infl.map((i) => [i.tahun, i.persen]));
  const baris = alat.map((a) => { const h = a.hargaPerolehan ?? 0, t = a.tahunPerolehan ?? 0, u = a.usiaTeknis ?? 0; return { a, h, buku: u > 0 ? nilaiBuku(h, t, u) : null, infl: nilaiTerinflasi(h, t, im) }; });
  const sum = baris.reduce((n, b) => ({ h: n.h + b.h, b: n.b + (b.buku ?? b.h), i: n.i + b.infl }), { h: 0, b: 0, i: 0 });
  return (
    <div className="grid gap-4">
      <Flash ok={sp.ok} error={sp.error} />
      <Card>
        <CardHeader><CardTitle>Inflasi Tahunan</CardTitle><CardDescription>Persentase inflasi per tahun dipakai menghitung nilai terinflasi (perkiraan biaya penggantian). Isi dari sumber resmi yang Anda pakai.</CardDescription></CardHeader>
        <CardContent className="grid gap-3">
          {adm && <form action={simpanInflasi} className="flex flex-wrap items-end gap-2 rounded-lg bg-slate-50 p-3 text-sm"><label className="grid gap-1">Tahun<input type="number" name="tahun" required className={`${inp} w-28`} /></label><label className="grid gap-1">Inflasi (%)<input name="persen" required className={`${inp} w-28`} /></label><Button variant="teal">Simpan</Button></form>}
          <div className="flex flex-wrap gap-2">{infl.map((i) => <span key={i.tahun} className="flex items-center gap-2 rounded-lg border px-2 py-1 text-sm">{i.tahun}: {i.persen}%{adm && <form action={hapusInflasi}><input type="hidden" name="tahun" value={i.tahun} /><button className="text-xs text-red-700 hover:underline">hapus</button></form>}</span>)}{!infl.length && <p className="text-sm text-muted-foreground">Belum ada data inflasi (nilai terinflasi = harga perolehan).</p>}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Nilai Alat: Perolehan, Buku, dan Terinflasi</CardTitle><CardDescription>Nilai buku garis lurus tanpa residu = harga × (1 − umur ÷ usia teknis). 300 alat bernilai terbesar. Total: perolehan {rp(sum.h)} · buku {rp(sum.b)} · terinflasi {rp(sum.i)}.</CardDescription></CardHeader>
        <CardContent className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-2">Alat</th><th>Tahun</th><th>Usia teknis</th><th>Perolehan</th><th>Nilai buku</th><th>Terinflasi</th></tr></thead>
          <tbody>{baris.map(({ a, h, buku, infl: ni }) => <tr key={a.id} className="border-b"><td className="py-2">{a.nama}<div className="text-xs text-muted-foreground">{a.kode}</div></td><td>{a.tahunPerolehan}</td><td>{a.usiaTeknis ?? "—"}</td><td>{rp(h)}</td><td>{buku == null ? "—" : rp(buku)}</td><td>{rp(ni)}</td></tr>)}
            {!baris.length && <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">Belum ada alat dengan harga dan tahun perolehan.</td></tr>}</tbody></table></CardContent>
      </Card>
    </div>
  );
}
