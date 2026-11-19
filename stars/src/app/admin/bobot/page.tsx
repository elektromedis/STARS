import type { Metadata } from "next";
import Link from "next/link";
import { Weight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { sesiHalaman } from "@/lib/sesi";
import { unitTerkunci } from "@/lib/akses";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BOBOT, KATEGORI, hitungBobot } from "@/lib/bobot-pemeliharaan";

export const metadata: Metadata = { title: "Pembobotan Pemeliharaan" };
export const dynamic = "force-dynamic";

export default async function BobotPage({ searchParams }: { searchParams: Promise<{ unit?: string; kat?: string }> }) {
  await sesiHalaman("Viewer");
  const sp = await searchParams, kunci = await unitTerkunci();
  const unit = kunci?.nama ?? sp.unit ?? "";
  const daftarUnit = kunci ? [] : await prisma.unitKerja.findMany({ orderBy: [{ urut: "asc" }, { nama: "asc" }], select: { nama: true } });
  const batas = new Date(Date.now() - 913 * 86_400_000);
  const alat = await prisma.alat.findMany({
    where: { aktif: true, ...(unit ? { unitKerja: { nama: unit } } : {}) }, take: 5000,
    select: { id: true, kode: true, nama: true, emFungsi: true, emRisiko: true, emPemeliharaan: true, emrUtilisasi: true, ikatemiRisiko: true, tahunPerolehan: true, tahunPembelian: true, usiaTeknis: true, kondisi: true,
      unitKerja: { select: { nama: true } }, _count: { select: { permintaan: { where: { createdAt: { gte: batas } } } } } },
  });
  const hasil = alat.map((a) => ({ a, h: hitungBobot({ ...a, tahunPerolehan: a.tahunPerolehan ?? a.tahunPembelian, kerusakan30Bulan: a._count.permintaan }) })).sort((x, y) => y.h.skor - x.h.skor);
  const tampil = hasil.filter((x) => !sp.kat || x.h.kategori.nama === sp.kat).slice(0, 400);
  const q = (k: string) => `/admin/bobot?${new URLSearchParams({ ...(unit ? { unit } : {}), ...(k ? { kat: k } : {}) })}`;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Weight className="size-5 text-teal-700" /> Pembobotan prioritas pemeliharaan alat kesehatan</CardTitle>
        <CardDescription>Skor 0–100 dari 7 faktor berbobot — WHO Maintenance Programme Lampiran A.1 (Fennigkoh–Smith & riwayat kejadian), Wang–Levenson (utilisasi), Permenkes 54/2015 Lampiran I, IKATEMI 1/2023, usia teknis & kondisi. Hasilnya menentukan interval pemeliharaan preventif (PM) & inspeksi; alat wajib uji Permenkes 54 minimal tahunan.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 lg:grid-cols-2">
          <table className="text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th>Faktor</th><th className="text-right">Bobot</th></tr></thead>
            <tbody>{BOBOT.map((b) => <tr key={b.kunci} className="border-b"><td className="py-1">{b.label}</td><td className="text-right font-medium">{b.bobot}%</td></tr>)}</tbody></table>
          <table className="text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th>Kategori</th><th>Skor</th><th>PM</th><th>Inspeksi</th><th className="text-right">Alat</th></tr></thead>
            <tbody>{KATEGORI.map((k, i) => <tr key={k.nama} className="border-b"><td className="py-1"><Link href={q(k.nama)} className={`rounded-full px-2 py-0.5 text-xs ${k.warna}`}>{k.nama}</Link></td><td>{i === 0 ? "≥ 70" : `${k.min}–${KATEGORI[i - 1].min - 1}`}</td><td>{k.pm ? `${k.pm} bln` : "korektif"}</td><td>{k.inspeksi} bln</td><td className="text-right">{hasil.filter((x) => x.h.kategori.nama === k.nama).length}</td></tr>)}</tbody></table>
        </div>
        {!kunci && (
          <form className="flex items-end gap-2"><label className="grid gap-1 text-sm">Unit kerja
            <select name="unit" defaultValue={unit} className="h-9 rounded-md border bg-white px-2 text-sm"><option value="">Semua unit</option>{daftarUnit.map((u) => <option key={u.nama}>{u.nama}</option>)}</select></label>
            <button className="h-9 rounded-md border px-3 text-sm">Tampilkan</button>{sp.kat && <Link href={q("")} className="text-sm text-teal-700 underline">Hapus filter {sp.kat}</Link>}</form>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] text-sm">
            <thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-1">Alat</th><th>Unit</th><th className="text-right">Skor</th><th>Kategori</th><th>PM / Inspeksi / Kalibrasi</th><th>Rincian (poin)</th></tr></thead>
            <tbody>{tampil.map(({ a, h }) => (
              <tr key={a.id} className="border-b align-top">
                <td className="py-1.5"><Link href={`/alat?kode=${encodeURIComponent(a.kode)}`} className="font-medium text-navy-800 hover:underline">{a.nama}</Link><br /><span className="font-mono text-xs text-muted-foreground">{a.kode}</span>{h.p54 && <span className="ml-1 text-[11px] text-red-700">· {h.p54.risiko} (P54)</span>}</td>
                <td>{a.unitKerja.nama}</td>
                <td className="text-right text-lg font-bold text-navy-900">{h.skor}</td>
                <td><span className={`rounded-full px-2 py-0.5 text-xs ${h.kategori.warna}`}>{h.kategori.nama}</span></td>
                <td className="text-xs">{h.kategori.pm ? `${h.kategori.pm} bln` : "korektif"} / {h.kategori.inspeksi} bln / {h.kalibrasiBulan ? `${h.kalibrasiBulan} bln` : "—"}</td>
                <td className="text-[11px] text-muted-foreground">{h.rinci.map((r) => `${r.label.split(" ")[0]} ${r.nilai}`).join(" · ")}{h.perkiraan.length > 0 && <span className="block text-amber-700">perkiraan: {h.perkiraan.join(", ")} (lengkapi skor WHO di Daftar Alat)</span>}</td>
              </tr>))}</tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
