import type { Metadata } from "next";
import { CheckCircle2, Circle, ClipboardList, Printer } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { sesiHalaman } from "@/lib/sesi";
import { cukup } from "@/lib/peran";
import { unitTerkunci } from "@/lib/akses";
import { sidikDokumen } from "@/lib/tte";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { JUDUL_KIR, URUTAN_KIR, nomorKir } from "@/lib/kir";
import { resetKir, tandatanganiKir } from "./actions";

export const metadata: Metadata = { title: "KIR Ruangan" };
export const dynamic = "force-dynamic";

export default async function KirPage({ searchParams }: { searchParams: Promise<{ unit?: string; tahun?: string; ok?: string; error?: string }> }) {
  const s = await sesiHalaman("Viewer");
  const sp = await searchParams;
  const kunci = await unitTerkunci();
  const tahun = Number(sp.tahun) || new Date().getFullYear();
  const daftarUnit = kunci ? [{ nama: kunci.nama }] : await prisma.unitKerja.findMany({ orderBy: [{ urut: "asc" }, { nama: "asc" }], select: { nama: true } });
  const unit = kunci?.nama ?? sp.unit ?? daftarUnit[0]?.nama ?? "";
  const ruangan = await prisma.ruangan.findMany({
    where: { aktif: true, unitKerja: { nama: unit } }, orderBy: { nama: "asc" },
    select: { id: true, nama: true, gedung: true, kepala: true, _count: { select: { alat: { where: { aktif: true } } } } },
  });
  const nomor = ruangan.map((r) => nomorKir(r.id, tahun));
  const tte = await prisma.tandaTangan.findMany({ where: { nomor: { in: nomor } }, select: { nomor: true, peran: true, nama: true, hashIsi: true } });
  const berubah = new Set<string>();
  for (const n of new Set(tte.map((t) => t.nomor))) { const h = await sidikDokumen(n); if (tte.some((t) => t.nomor === n && t.hashIsi !== h)) berubah.add(n); }
  const operator = cukup(s.user.peran, "Operator"), admin = cukup(s.user.peran, "Admin");

  return (
    <div className="grid gap-4">
      {sp.ok && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{sp.ok}</p>}
      {sp.error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{sp.error}</p>}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ClipboardList className="size-5 text-teal-700" /> Kartu Inventaris Ruangan (KIR)</CardTitle>
          <CardDescription>Format kolom KIR Permendagri No. 47 Tahun 2021 dengan kop Pemerintah Provinsi DKI Jakarta. Disahkan berurutan dengan TTE: Kepala Ruangan/PJ Unit → PJ Alat Kesehatan → Pengurus Barang → Direktur. Cetak A4 lanskap untuk ditempel di setiap ruangan.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-wrap items-end gap-2">
            <label className="grid gap-1 text-sm">Unit kerja
              <select name="unit" defaultValue={unit} className="h-9 rounded-md border bg-white px-2 text-sm">{daftarUnit.map((u) => <option key={u.nama}>{u.nama}</option>)}</select></label>
            <label className="grid gap-1 text-sm">Tahun<input type="number" name="tahun" defaultValue={tahun} min={2000} max={2100} className="h-9 w-24 rounded-md border px-2 text-sm" /></label>
            <Button type="submit" variant="outline">Tampilkan</Button>
          </form>
        </CardContent>
      </Card>

      {ruangan.length === 0 && <p className="text-sm text-muted-foreground">Unit ini belum punya data ruangan. Isi kolom Ruangan pada Daftar Alat / impor Excel.</p>}
      {ruangan.map((r) => {
        const no = nomorKir(r.id, tahun), tt = tte.filter((t) => t.nomor === no);
        const berikut = URUTAN_KIR.find((p) => !tt.some((t) => t.peran === p));
        const boleh = berikut && (berikut === "KepalaRuangan" || operator) && r._count.alat > 0;
        return (
          <Card key={r.id}>
            <CardContent className="grid gap-3 pt-5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-navy-900">{r.nama}{r.gedung ? ` · ${r.gedung}` : ""}</p>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{r._count.alat} barang</span>
                <span className="font-mono text-xs text-muted-foreground">{no}</span>
                {!berikut && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">Sah — 4 TTE lengkap</span>}
                {berubah.has(no) && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">Isi ruangan berubah setelah TTE — sahkan ulang</span>}
                <Button size="sm" variant="teal" className="ml-auto" asChild><a href={`/api/admin/kir/${r.id}?tahun=${tahun}`} target="_blank" rel="noopener"><Printer /> Cetak KIR (A4)</a></Button>
              </div>
              <ol className="grid gap-1 text-sm sm:grid-cols-4">
                {URUTAN_KIR.map((p) => { const t = tt.find((z) => z.peran === p); return (
                  <li key={p} className="flex items-center gap-1.5">{t ? <CheckCircle2 className="size-4 text-emerald-600" /> : <Circle className="size-4 text-slate-300" />}
                    <span><b className="font-medium">{JUDUL_KIR[p]}</b><br /><span className="text-xs text-muted-foreground">{t?.nama ?? "belum"}</span></span></li>); })}
              </ol>
              {boleh && (
                <form action={tandatanganiKir} className="flex flex-wrap items-end gap-2 rounded-lg bg-slate-50 p-2">
                  <input type="hidden" name="ruanganId" value={r.id} /><input type="hidden" name="tahun" value={tahun} /><input type="hidden" name="unit" value={unit} /><input type="hidden" name="peran" value={berikut} />
                  <label className="grid gap-0.5 text-xs">Nama {JUDUL_KIR[berikut]}<input name="nama" required defaultValue={berikut === "KepalaRuangan" ? (r.kepala ?? s.user.name ?? "") : (s.user.name ?? "")} className="h-8 w-56 rounded border px-2 text-sm" /></label>
                  <label className="grid gap-0.5 text-xs">NIP (opsional)<input name="nip" inputMode="numeric" className="h-8 w-44 rounded border px-2 text-sm" /></label>
                  <Button size="sm" variant="teal">Tandatangani sebagai {JUDUL_KIR[berikut]}</Button>
                </form>
              )}
              {admin && tt.length > 0 && (
                <form action={resetKir}><input type="hidden" name="nomor" value={no} /><input type="hidden" name="unit" value={unit} />
                  <button className="text-xs text-muted-foreground hover:text-red-700">Batalkan semua TTE KIR ini</button></form>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
