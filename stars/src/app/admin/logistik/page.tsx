import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { sesiHalaman } from "@/lib/sesi";
import { unitTerkunci } from "@/lib/akses";
import { cukup } from "@/lib/peran";
import { inp, tgl } from "@/lib/aksi-admin";
import { Flash } from "@/components/admin/flash";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { catatJemput, gudangkanAtauKembalikan, usulHapus } from "./actions";

export const metadata: Metadata = { title: "Logistik Mutasi Alat" };
export const dynamic = "force-dynamic";

export default async function LogistikPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const se = await sesiHalaman("Viewer");
  const sp = await searchParams;
  const op = cukup(se.user.peran, "Operator") && process.env.STARS_MODE !== "internet";
  const kunci = await unitTerkunci();
  const u = kunci ? { OR: [{ dariUnit: kunci.nama }, { keUnit: kunci.nama }] } : {};
  const [berjalan, riwayat] = await Promise.all([
    prisma.mutasiAlat.findMany({ where: { ...u, status: { in: ["Diajukan", "Disetujui"] } }, orderBy: { id: "desc" }, include: { alat: { select: { kode: true, nama: true } } } }),
    prisma.mutasiAlat.findMany({ where: { ...u, status: { notIn: ["Diajukan", "Disetujui"] } }, orderBy: { id: "desc" }, take: 60, include: { alat: { select: { kode: true, nama: true } } } }),
  ]);
  const baris = (m: (typeof berjalan)[number]) => <>{m.dariUnit}{m.dariRuangan ? ` / ${m.dariRuangan}` : ""} → {m.keUnit}{m.keRuangan ? ` / ${m.keRuangan}` : ""}</>;
  return (
    <div className="grid gap-4">
      <Flash ok={sp.ok} error={sp.error} />
      <Card>
        <CardHeader><CardTitle>Logistik Mutasi Alat</CardTitle><CardDescription>Alur: permintaan → persetujuan (halaman mutasi yang sudah ada) → <strong>penjemputan</strong> → serah terima. Di sini juga <strong>penggudangan</strong>, <strong>pengembalian</strong>, dan usulan penghapusan alat yang tidak bisa diperbaiki. Seluruh riwayat tampil di panel alat dan <Link className="underline" href="/admin/logbook">Log Book</Link>.</CardDescription></CardHeader>
        <CardContent className="grid gap-3">
          {op && <div className="grid gap-2 lg:grid-cols-2">
            <form action={gudangkanAtauKembalikan} className="grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-3">
              <label className="grid gap-1 text-sm">Kode alat<input name="kode" required className={inp} /></label>
              <label className="grid gap-1 text-sm">Tindakan<select name="jenis" className={inp}><option>Penggudangan</option><option>Pengembalian</option></select></label>
              <label className="grid gap-1 text-sm">Gudang<input name="gudang" placeholder="Gudang IPSRS" className={inp} /></label>
              <label className="grid gap-1 text-sm sm:col-span-3">Alasan<input name="alasan" className={inp} /></label>
              <Button variant="teal" className="w-fit">Catat</Button>
            </form>
            <form action={usulHapus} className="grid gap-2 rounded-lg bg-red-50/60 p-3 sm:grid-cols-3">
              <label className="grid gap-1 text-sm">Kode alat<input name="kode" required className={inp} /></label>
              <label className="grid gap-1 text-sm sm:col-span-2">Keterangan (tidak bisa diperbaiki karena…)<input name="keterangan" className={inp} /></label>
              <Button variant="outline" className="w-fit">Usulkan penghapusan</Button>
            </form>
          </div>}
          <h3 className="text-sm font-semibold text-navy-900">Mutasi berjalan ({berjalan.length})</h3>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-2">Nomor</th><th>Alat</th><th>Rute</th><th>Status</th><th>Penjemputan</th><th /></tr></thead>
            <tbody>{berjalan.map((m) => <tr key={m.id} className="border-b"><td className="py-2 font-medium">{m.nomor}<div className="text-xs font-normal text-muted-foreground">{m.jenis}</div></td><td>{m.alat.kode} · {m.alat.nama}</td><td>{baris(m)}</td><td>{m.status}</td><td>{m.dijemputPada ? `${tgl(m.dijemputPada)} · ${m.dijemputOleh}` : "Belum"}</td>
              <td>{op && m.status === "Disetujui" && !m.dijemputPada && <form action={catatJemput} className="flex gap-1"><input type="hidden" name="id" value={m.id} /><input name="petugas" placeholder="petugas" className={`${inp} w-28`} /><Button size="sm" variant="outline">Dijemput</Button></form>}</td></tr>)}
              {!berjalan.length && <tr><td colSpan={6} className="py-4 text-center text-muted-foreground">Tidak ada mutasi berjalan.</td></tr>}</tbody></table></div>
          <h3 className="text-sm font-semibold text-navy-900">Riwayat terbaru</h3>
          <div className="overflow-x-auto"><table className="w-full text-sm"><tbody>{riwayat.map((m) => <tr key={m.id} className="border-b"><td className="py-1.5 font-medium">{m.nomor}</td><td>{m.jenis}</td><td>{m.alat.kode} · {m.alat.nama}</td><td>{baris(m)}</td><td>{m.status}</td><td>{tgl(m.updatedAt)}</td></tr>)}</tbody></table></div>
        </CardContent>
      </Card>
    </div>
  );
}
