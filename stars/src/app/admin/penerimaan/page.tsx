import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { sesiHalaman } from "@/lib/sesi";
import { cukup } from "@/lib/peran";
import { JENIS_BERKAS, TIPE_PENERIMAAN } from "@/lib/master";
import { inp, inputTgl, rp, tgl } from "@/lib/aksi-admin";
import { Flash } from "@/components/admin/flash";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { hapusBerkas, lepasAlat, simpanPenerimaan, tautkanAlat, unggahBerkas } from "./actions";

export const metadata: Metadata = { title: "Penerimaan Alat (Kontrak & BAP)" };
export const dynamic = "force-dynamic";

export default async function PenerimaanPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const se = await sesiHalaman("Viewer");
  const sp = await searchParams;
  const op = cukup(se.user.peran, "Operator") && process.env.STARS_MODE !== "internet", adm = cukup(se.user.peran, "Admin");
  const id = Number(sp.id) || null;
  const [daftar, rekanan, detail] = await Promise.all([
    prisma.penerimaanAlat.findMany({ orderBy: { tanggal: "desc" }, take: 200, include: { rekanan: true, _count: { select: { alat: true, berkas: true } } } }),
    prisma.rekanan.findMany({ where: { aktif: true, jenis: { in: ["Supplier", "Rekanan"] } }, orderBy: { nama: "asc" } }),
    id ? prisma.penerimaanAlat.findUnique({ where: { id }, include: { rekanan: true, berkas: { orderBy: { id: "desc" } }, alat: { select: { id: true, kode: true, nama: true, nomorSeri: true }, orderBy: { kode: "asc" }, take: 300 } } }) : null,
  ]);
  return (
    <div className="grid gap-4">
      <Flash ok={sp.ok} error={sp.error} />
      <Card>
        <CardHeader><CardTitle>{detail ? `Penerimaan ${detail.nomor}` : "Penerimaan Alat Baru"}</CardTitle><CardDescription>Kontrak, Berita Acara Penerimaan (BAP), rekanan, dan berkas — lalu tautkan alat yang diterima.</CardDescription></CardHeader>
        <CardContent className="grid gap-3">
          {op && <form action={simpanPenerimaan} className="grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-4">
            {detail && <input type="hidden" name="id" value={detail.id} />}
            <label className="grid gap-1 text-sm sm:col-span-2">Nomor kontrak<input name="nomorKontrak" required defaultValue={detail?.nomorKontrak} className={inp} /></label>
            <label className="grid gap-1 text-sm">Tanggal kontrak<input type="date" name="tanggal" required defaultValue={inputTgl(detail?.tanggal) || new Date().toISOString().slice(0, 10)} className={inp} /></label>
            <label className="grid gap-1 text-sm">Nilai (Rp)<input type="number" min={0} step="any" name="nilai" defaultValue={detail?.nilai ?? ""} className={inp} /></label>
            <label className="grid gap-1 text-sm sm:col-span-2">Nomor BAP<input name="nomorBap" defaultValue={detail?.nomorBap ?? ""} className={inp} /></label>
            <label className="grid gap-1 text-sm">Tanggal BAP<input type="date" name="tanggalBap" defaultValue={inputTgl(detail?.tanggalBap)} className={inp} /></label>
            <label className="grid gap-1 text-sm">Rekanan<select name="rekananId" defaultValue={detail?.rekananId ?? ""} className={inp}><option value="">—</option>{rekanan.map((r) => <option key={r.id} value={r.id}>{r.nama}</option>)}</select></label>
            <label className="grid gap-1 text-sm">Tipe<select name="tipe" defaultValue={detail?.tipe ?? "Pembelian"} className={inp}>{TIPE_PENERIMAAN.map((t) => <option key={t}>{t}</option>)}</select></label>
            <label className="grid gap-1 text-sm">Jenis<select name="jenis" defaultValue={detail?.jenis ?? "Medik"} className={inp}><option>Medik</option><option>Non Medik</option></select></label>
            <label className="grid gap-1 text-sm sm:col-span-2">Catatan<input name="catatan" defaultValue={detail?.catatan ?? ""} className={inp} /></label>
            <Button variant="teal" className="self-end">{detail ? "Simpan perubahan" : "Simpan penerimaan"}</Button>
          </form>}
          {detail && (
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="rounded-lg border p-3"><h3 className="mb-2 text-sm font-semibold text-navy-900">Berkas ({detail.berkas.length})</h3>
                <ul className="grid gap-1 text-sm">{detail.berkas.map((b) => <li key={b.id} className="flex items-center justify-between gap-2"><a className="text-teal-800 hover:underline" href={`/api/penerimaan/berkas/${b.id}`}><span className="mr-1 rounded bg-slate-100 px-1.5 text-xs">{b.jenis}</span>{b.nama}</a>{adm && <form action={hapusBerkas}><input type="hidden" name="berkasId" value={b.id} /><button className="text-xs text-red-700 hover:underline">hapus</button></form>}</li>)}{!detail.berkas.length && <li className="text-muted-foreground">Belum ada berkas.</li>}</ul>
                {op && <form action={unggahBerkas} className="mt-2 flex flex-wrap items-end gap-2"><input type="hidden" name="id" value={detail.id} /><select name="jenis" className="h-9 rounded-md border bg-white px-2 text-sm">{JENIS_BERKAS.map((j) => <option key={j}>{j}</option>)}</select><input type="file" name="berkas" required accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx" className="text-sm" /><Button size="sm" variant="outline">Unggah</Button></form>}</div>
              <div className="rounded-lg border p-3"><h3 className="mb-2 text-sm font-semibold text-navy-900">Alat diterima ({detail.alat.length})</h3>
                <ul className="grid max-h-48 gap-1 overflow-auto text-sm">{detail.alat.map((a) => <li key={a.id} className="flex items-center justify-between gap-2"><Link className="text-teal-800 hover:underline" href={`/admin/logbook?kode=${encodeURIComponent(a.kode)}`}>{a.kode} · {a.nama}</Link>{op && <form action={lepasAlat}><input type="hidden" name="id" value={detail.id} /><input type="hidden" name="alatId" value={a.id} /><button className="text-xs text-red-700 hover:underline">lepas</button></form>}</li>)}{!detail.alat.length && <li className="text-muted-foreground">Belum ada alat tertaut.</li>}</ul>
                {op && <form action={tautkanAlat} className="mt-2 grid gap-1"><input type="hidden" name="id" value={detail.id} /><textarea name="kode" rows={2} required placeholder="Kode alat, pisahkan dengan spasi/koma/baris baru" className="rounded-md border bg-white p-2 text-sm" /><Button size="sm" variant="outline" className="w-fit">Tautkan alat</Button></form>}</div>
            </div>)}
        </CardContent>
      </Card>
      <Card><CardHeader><CardTitle>Riwayat Penerimaan</CardTitle></CardHeader><CardContent className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-2">Nomor</th><th>Kontrak</th><th>Tanggal</th><th>BAP</th><th>Rekanan</th><th>Tipe</th><th>Nilai</th><th>Alat</th><th>Berkas</th></tr></thead>
        <tbody>{daftar.map((p) => <tr key={p.id} className="border-b"><td className="py-2"><Link className="font-medium text-teal-800 hover:underline" href={`/admin/penerimaan?id=${p.id}`}>{p.nomor}</Link></td><td>{p.nomorKontrak}</td><td>{tgl(p.tanggal)}</td><td>{p.nomorBap ?? "—"}</td><td>{p.rekanan?.nama ?? "—"}</td><td>{p.tipe}</td><td>{rp(p.nilai)}</td><td>{p._count.alat}</td><td>{p._count.berkas}</td></tr>)}
          {!daftar.length && <tr><td colSpan={9} className="py-6 text-center text-muted-foreground">Belum ada penerimaan alat.</td></tr>}</tbody></table></CardContent></Card>
    </div>
  );
}
