import type { Metadata } from "next";
import Link from "next/link";
import { Landmark } from "lucide-react";
import type { Peraturan } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sesiHalaman } from "@/lib/sesi";
import { JENIS_PERATURAN, namaPeraturan, STATUS_PERATURAN, SUBJEK_PERATURAN } from "@/lib/jdih";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { aksiPeraturan, simpanPeraturan } from "./actions";

export const metadata: Metadata = { title: "CMS JDIH" };
export const dynamic = "force-dynamic";
const inp = "h-9 w-full rounded-md border bg-white px-2 text-sm";
const L = "grid gap-1 text-sm";

function Formulir({ p }: { p?: Peraturan }) {
  return (
    <form action={simpanPeraturan} className="grid gap-2 sm:grid-cols-4">
      {p && <input type="hidden" name="id" value={p.id} />}
      <label className={L}>Jenis<input name="jenis" list="jenis-peraturan" required defaultValue={p?.jenis} className={inp} /></label>
      <label className={L}>Nomor<input name="nomor" required defaultValue={p?.nomor} className={inp} /></label>
      <label className={L}>Tahun<input name="tahun" type="number" min={1945} max={2100} required defaultValue={p?.tahun ?? new Date().getFullYear()} className={inp} /></label>
      <label className={L}>Status<select name="status" defaultValue={p?.status ?? "Berlaku"} className={inp}>{STATUS_PERATURAN.map((x) => <option key={x}>{x}</option>)}</select></label>
      <label className={`${L} sm:col-span-4`}>Tentang (judul)<input name="judul" required defaultValue={p?.judul} className={inp} /></label>
      <label className={L}>Pemrakarsa<input name="pemrakarsa" defaultValue={p?.pemrakarsa ?? ""} placeholder="Kementerian Kesehatan" className={inp} /></label>
      <label className={L}>Subjek<select name="subjek" defaultValue={p?.subjek ?? ""} className={inp}><option value="">—</option>{SUBJEK_PERATURAN.map((x) => <option key={x}>{x}</option>)}</select></label>
      <label className={`${L} sm:col-span-2`}>Tautan sumber (mis. halaman di peraturan.bpk.go.id)<input name="tautan" defaultValue={p?.tautan ?? ""} placeholder="https://peraturan.bpk.go.id/Details/…" className={inp} /></label>
      <label className={`${L} sm:col-span-2`}>Keterangan (mis. diubah/dicabut oleh …)<input name="keterangan" defaultValue={p?.keterangan ?? ""} className={inp} /></label>
      <label className={L}>Berkas PDF (≤ 5 MB){p?.berkas ? " — mengganti yang lama" : ""}<input name="berkas" type="file" accept="application/pdf" className="text-sm" /></label>
      <div className="flex items-end gap-3">
        {p?.berkas && <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" name="hapusBerkas" /> Hapus PDF</label>}
        <Button variant="teal">{p ? "Simpan perubahan" : "Tambah peraturan"}</Button>
      </div>
    </form>
  );
}

export default async function CmsJdih({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await sesiHalaman("Admin");
  const sp = await searchParams;
  const daftar = await prisma.peraturan.findMany({ orderBy: [{ tahun: "desc" }, { jenis: "asc" }, { id: "desc" }] });
  return (
    <div className="grid gap-4">
      {sp.ok && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{sp.ok}</p>}
      {sp.error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{sp.error}</p>}
      <datalist id="jenis-peraturan">{JENIS_PERATURAN.map((x) => <option key={x} value={x} />)}</datalist>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Landmark className="size-5 text-teal-700" /> JDIH — tambah peraturan</CardTitle>
          <CardDescription>Peraturan tampil di menu <Link href="/jdih" className="underline">JDIH</Link> untuk umum. Unggah PDF (milik RS, mis. Peraturan/Keputusan Direktur dan SOP) atau tautkan ke teks resmi di peraturan.bpk.go.id.</CardDescription></CardHeader>
        <CardContent><Formulir /></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Daftar peraturan ({daftar.length})</CardTitle></CardHeader>
        <CardContent className="grid gap-2">
          {daftar.map((p) => (
            <details key={p.id} className="rounded-lg border p-2 text-sm">
              <summary className="flex cursor-pointer flex-wrap items-center gap-2">
                <b>{namaPeraturan(p)}</b><span className="min-w-0 flex-1 truncate text-muted-foreground">{p.judul}</span>
                <span className="text-xs">{p.status}{p.berkas ? " · PDF" : ""}{p.aktif ? "" : " · tersembunyi"}</span>
              </summary>
              <div className="mt-3 grid gap-3 border-t pt-3">
                <Formulir p={p} />
                <form action={aksiPeraturan} className="flex gap-2"><input type="hidden" name="id" value={p.id} />
                  <Button size="sm" variant="outline" name="aksi" value="tampil">{p.aktif ? "Sembunyikan" : "Tampilkan"}</Button>
                  <Button size="sm" variant="outline" name="aksi" value="hapus">Hapus</Button></form>
              </div>
            </details>))}
        </CardContent>
      </Card>
    </div>
  );
}
