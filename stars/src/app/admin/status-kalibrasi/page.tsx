import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { sesiHalaman } from "@/lib/sesi";
import { inp, tgl } from "@/lib/aksi-admin";
import { sisaBulan } from "@/lib/aspak";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Status Kalibrasi" };
export const dynamic = "force-dynamic";

export default async function StatusKalibrasiPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await sesiHalaman("Viewer");
  const sp = await searchParams;
  const unitId = Number(sp.unit) || 0, sisa = sp.sisa ?? "", laik = sp.laik ?? "";
  const [unit, alat] = await Promise.all([
    prisma.unitKerja.findMany({ orderBy: { nama: "asc" } }),
    prisma.alat.findMany({
      where: { aktif: true, ...(unitId ? { unitKerjaId: unitId } : {}) }, orderBy: [{ unitKerja: { nama: "asc" } }, { nama: "asc" }],
      select: { id: true, kode: true, nama: true, nomorSeri: true, unitKerja: { select: { nama: true } }, ruangan: { select: { nama: true } }, kalibrasi: { where: { jenis: "Kalibrasi" }, orderBy: { tanggal: "desc" }, take: 1 } },
    }),
  ]);
  const baris = alat.map((a) => { const k = a.kalibrasi[0]; return { a, k, bln: k ? sisaBulan(k.berlakuSampai) : null }; });
  const tampil = baris.filter(({ k, bln }) => {
    if (!k) return sisa === "belum";
    if (sisa === "belum") return false;
    if (sisa === "kadaluarsa" && bln !== 0) return false;
    if (/^\d+$/.test(sisa) && !(bln != null && bln > 0 && bln <= Number(sisa))) return false;
    if (laik === "ya" && !k.laik) return false;
    if (laik === "tidak" && k.laik) return false;
    return true;
  });
  const belum = baris.filter((b) => !b.k).length, kad = baris.filter((b) => b.k && b.bln === 0).length, tdkLaik = baris.filter((b) => b.k && !b.k.laik).length;
  return (
    <Card>
      <CardHeader><CardTitle>Status Kalibrasi Alat</CardTitle><CardDescription>Kalibrasi terakhir tiap alat aktif, masa berlaku, dan kelaikan. {belum} alat belum punya catatan kalibrasi · {kad} kedaluwarsa · {tdkLaik} tidak laik.</CardDescription></CardHeader>
      <CardContent className="grid gap-3">
        <form className="flex flex-wrap items-end gap-3 text-sm">
          <label className="grid gap-1">Unit<select name="unit" defaultValue={unitId || ""} className={inp}><option value="">Semua</option>{unit.map((u) => <option key={u.id} value={u.id}>{u.nama}</option>)}</select></label>
          <label className="grid gap-1">Sisa waktu<select name="sisa" defaultValue={sisa} className={inp}><option value="">Semua</option><option value="kadaluarsa">Kedaluwarsa</option>{[1, 2, 3, 6, 12].map((n) => <option key={n} value={n}>≤ {n} bulan</option>)}<option value="belum">Belum pernah dikalibrasi</option></select></label>
          <label className="grid gap-1">Kelaikan<select name="laik" defaultValue={laik} className={inp}><option value="">Semua</option><option value="ya">Laik</option><option value="tidak">Tidak laik</option></select></label>
          <Button variant="teal">Terapkan</Button>
        </form>
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-2">Alat</th><th>Ruangan</th><th>Terakhir</th><th>Berlaku s/d</th><th>Sisa</th><th>Laik</th></tr></thead>
          <tbody>{tampil.map(({ a, k, bln }) => <tr key={a.id} className="border-b"><td className="py-2"><span className="font-medium">{a.nama}</span><div className="text-xs text-muted-foreground">{a.kode}{a.nomorSeri ? ` · SN ${a.nomorSeri}` : ""}</div></td><td>{a.ruangan?.nama ?? a.unitKerja.nama}</td><td>{k ? tgl(k.tanggal) : "—"}</td><td>{tgl(k?.berlakuSampai)}</td>
            <td className={bln === 0 ? "font-medium text-red-700" : bln != null && bln <= 3 ? "text-amber-700" : ""}>{!k ? "—" : bln == null ? "tanpa tanggal" : bln === 0 ? "kedaluwarsa" : `${bln} bln`}</td><td>{k ? (k.laik ? "Ya" : <span className="text-red-700">Tidak</span>) : "—"}</td></tr>)}
            {!tampil.length && <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">Tidak ada alat yang sesuai.</td></tr>}</tbody></table></div>
        <p className="text-xs text-muted-foreground">Menampilkan {tampil.length} dari {baris.length} alat aktif. Pencatatan kalibrasi dilakukan di halaman alat.</p>
      </CardContent>
    </Card>
  );
}
