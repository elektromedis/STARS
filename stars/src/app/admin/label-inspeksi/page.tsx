import type { Metadata } from "next";
import { Printer, Tag } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { sesiHalaman } from "@/lib/sesi";
import { unitTerkunci } from "@/lib/akses";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { JENIS_LABEL_INSPEKSI, warnaTahun } from "@/lib/label-inspeksi";

export const metadata: Metadata = { title: "Label Inspeksi" };
export const dynamic = "force-dynamic";
const inp = "h-9 w-full rounded-md border bg-white px-2 text-sm";

export default async function LabelInspeksiPage() {
  await sesiHalaman("Viewer");
  const kunci = await unitTerkunci();
  const unit = kunci ? [{ nama: kunci.nama }] : await prisma.unitKerja.findMany({ orderBy: [{ urut: "asc" }, { nama: "asc" }], select: { nama: true } });
  const kini = new Date(Date.now() + 7 * 3_600_000), th = kini.getUTCFullYear();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Tag className="size-5 text-teal-700" /> Label inspeksi (WHO Lampiran E)</CardTitle>
        <CardDescription>Cetak label tempel berlogo RSUD Cipayung & STARS: catatan inspeksi, hasil uji, pemberitahuan rusak, cek baterai. Interval inspeksi berikut dihitung dari skor EM WHO (bawaan 12 bulan). A4, 10 label per lembar (95 × 54 mm).</CardDescription>
      </CardHeader>
      <CardContent>
        <form action="/api/admin/label-inspeksi" method="get" target="_blank" className="grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1 text-sm">Jenis label
            <select name="jenis" className={inp}>{Object.entries(JENIS_LABEL_INSPEKSI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label className="grid gap-1 text-sm">Unit kerja
            <select name="unit" className={inp} defaultValue={kunci?.nama ?? ""}>{!kunci && <option value="">Semua unit</option>}{unit.map((u) => <option key={u.nama}>{u.nama}</option>)}</select></label>
          <label className="grid gap-1 text-sm">Tanggal<input type="date" name="tanggal" defaultValue={kini.toISOString().slice(0, 10)} className={inp} /></label>
          <Button type="submit" variant="teal" className="sm:justify-self-start"><Printer /> Cetak PDF</Button>
        </form>
        <p className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">Warna pita per tahun:
          {[th - 1, th, th + 1, th + 2].map((t) => <span key={t} className="inline-flex items-center gap-1"><span className="size-3 rounded" style={{ background: `rgb(${warnaTahun(t).join(",")})` }} />{t}</span>)}
          <span className="inline-flex items-center gap-1"><span className="size-3 rounded bg-[#d03b3b]" />Rusak</span></p>
      </CardContent>
    </Card>
  );
}
