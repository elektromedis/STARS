import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardCheck, FilePlus2, ListChecks } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { sesiHalaman } from "@/lib/sesi";
import { cukup } from "@/lib/peran";
import { KEGIATAN } from "@/lib/lembar-kerja";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { hapusPromotif, tambahPromotif } from "./actions";

export const metadata: Metadata = { title: "Kegiatan Pemeliharaan & Lembar Kerja" };
export const dynamic = "force-dynamic";
const inp = "h-9 w-full rounded-md border bg-white px-2 text-sm";
const WARNA: Record<string, string> = { Draf: "bg-slate-100 text-slate-700", Diajukan: "bg-amber-100 text-amber-800", Disetujui: "bg-emerald-100 text-emerald-800", Ditolak: "bg-red-100 text-red-800" };
const tgl = (d: Date) => d.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", year: "numeric" });

export default async function LembarKerjaPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const se = await sesiHalaman("Viewer");
  const sp = await searchParams;
  const kegiatan = ["Inspeksi", "Preventif", "Promotif"].includes(sp.kegiatan ?? "") ? sp.kegiatan! : "Inspeksi";
  const status = sp.status && ["Draf", "Diajukan", "Disetujui", "Ditolak"].includes(sp.status) ? sp.status : undefined;
  const operator = cukup(se.user.peran, "Operator");
  const [daftar, hitung, promotif, nAlat, nWo] = await Promise.all([
    kegiatan === "Promotif" ? [] : prisma.lembarKerja.findMany({ where: { kegiatan, ...(status && { status }) }, orderBy: { id: "desc" }, take: 200 }),
    prisma.lembarKerja.groupBy({ by: ["kegiatan", "status"], _count: true }),
    kegiatan === "Promotif" ? prisma.kegiatanPromotif.findMany({ orderBy: { tanggal: "desc" }, take: 200 }) : [],
    prisma.alat.count({ where: { aktif: true } }),
    prisma.perintahKerja.count({ where: { status: { in: ["Terbuka", "Dikerjakan"] } } }).catch(() => 0),
  ]);
  const alat = new Map((await prisma.alat.findMany({ where: { id: { in: daftar.map((d) => d.alatId) } }, select: { id: true, kode: true, nama: true } })).map((a) => [a.id, a]));
  const n = (k: string, st?: string) => hitung.filter((h) => h.kegiatan === k && (!st || h.status === st)).reduce((a, h) => a + h._count, 0);
  const nPromotif = await prisma.kegiatanPromotif.count();
  const ringkas: Record<string, string> = { inventarisasi: `${nAlat} alat aktif`, promotif: `${nPromotif} kegiatan`, inspeksi: `${n("Inspeksi")} lembar · ${n("Inspeksi", "Diajukan")} menunggu`, preventif: `${n("Preventif")} lembar · ${n("Preventif", "Diajukan")} menunggu`, korektif: `${nWo} perintah kerja aktif` };
  return (
    <div className="grid gap-4">
      {sp.ok && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{sp.ok}</p>}
      {sp.error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{sp.error}</p>}
      <section aria-label="Kegiatan pemeliharaan Permenkes 15/2023 Pasal 3">
        <p className="mb-2 text-sm text-muted-foreground">Kegiatan Pemeliharaan Alat Kesehatan — Permenkes 15/2023 Pasal 3 ayat (1)</p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {KEGIATAN.map((k) => {
            const aktif = k.kode === kegiatan.toLowerCase();
            return (
              <Link key={k.kode} href={k.href} className={`grid gap-1 rounded-xl border p-3 transition hover:shadow-md ${aktif ? "border-teal-600 bg-teal-50 ring-1 ring-teal-600" : "bg-card"}`}>
                <span className="flex items-center gap-2 text-xs font-semibold text-teal-700"><span className="grid size-6 place-items-center rounded-full bg-teal-700 text-white">{k.huruf}</span>{k.ayat}</span>
                <span className="font-semibold text-navy-900">{k.judul}</span>
                <span className="text-xs text-muted-foreground">{k.ket}</span>
                <span className="mt-1 text-xs font-medium text-navy-700">{ringkas[k.kode]}</span>
              </Link>);
          })}
        </div>
      </section>

      {kegiatan === "Promotif" ? (
        <Card>
          <CardHeader><CardTitle>Pemeliharaan Promotif</CardTitle><CardDescription>Catat kegiatan petunjuk penggunaan/pengoperasian alat (sosialisasi, pelatihan pengguna) — Pasal 3 ayat (3).</CardDescription></CardHeader>
          <CardContent className="grid gap-3">
            {operator && <form action={tambahPromotif} className="grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-4">
              <label className="grid gap-1 text-sm">Tanggal<input type="date" name="tanggal" required defaultValue={new Date().toISOString().slice(0, 10)} className={inp} /></label>
              <label className="grid gap-1 text-sm">Kode alat (STARS)<input name="kodeAlat" placeholder="opsional" className={inp} /></label>
              <label className="grid gap-1 text-sm">Nama alat (jika tanpa kode)<input name="namaAlat" className={inp} /></label>
              <label className="grid gap-1 text-sm">Unit/ruangan<input name="unit" className={inp} /></label>
              <label className="grid gap-1 text-sm sm:col-span-2">Materi petunjuk penggunaan<input name="materi" required className={inp} /></label>
              <label className="grid gap-1 text-sm">Pemateri<input name="pemateri" required className={inp} /></label>
              <label className="grid gap-1 text-sm">Jumlah peserta<input type="number" min={0} name="peserta" defaultValue={0} className={inp} /></label>
              <label className="grid gap-1 text-sm sm:col-span-3">Catatan<input name="catatan" className={inp} /></label>
              <Button variant="teal" className="self-end">Catat kegiatan</Button>
            </form>}
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-2">Tanggal</th><th>Alat</th><th>Unit</th><th>Materi</th><th>Pemateri</th><th>Peserta</th><th /></tr></thead>
              <tbody>{promotif.map((p) => <tr key={p.id} className="border-b"><td className="py-2">{tgl(p.tanggal)}</td><td>{p.namaAlat}</td><td>{p.unit ?? "—"}</td><td>{p.materi}</td><td>{p.pemateri}</td><td>{p.peserta}</td>
                <td>{cukup(se.user.peran, "Admin") && <form action={hapusPromotif}><input type="hidden" name="id" value={p.id} /><Button size="sm" variant="ghost">Hapus</Button></form>}</td></tr>)}
                {!promotif.length && <tr><td colSpan={7} className="py-6 text-center text-muted-foreground">Belum ada kegiatan promotif.</td></tr>}</tbody></table></div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
            <div><CardTitle className="flex items-center gap-2"><ClipboardCheck className="size-5 text-teal-700" /> Lembar Kerja {kegiatan === "Inspeksi" ? "Pemantauan Fungsi / Inspeksi" : "Pemeliharaan Preventif"}</CardTitle>
              <CardDescription>Format IPM Pedoman Pengoperasian dan Pemeliharaan Peralatan Kesehatan (Kemenkes 2021). Alur: teknisi mengisi &amp; menandatangani → PJ Alat Kesehatan menyetujui (TTE).</CardDescription></div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild><Link href="/admin/lembar-kerja/template"><ListChecks /> Template per jenis alat</Link></Button>
              {operator && <form action="/admin/lembar-kerja/baru" className="flex gap-1"><input type="hidden" name="kegiatan" value={kegiatan} /><input name="alat" required placeholder="Kode alat" aria-label="Kode alat" className="h-9 w-32 rounded-md border px-2 text-sm" /><Button variant="teal" size="sm"><FilePlus2 /> Isi lembar kerja</Button></form>}
            </div>
          </CardHeader>
          <CardContent className="grid gap-3">
            <nav aria-label="Saring status" className="flex flex-wrap gap-1 text-sm">{[undefined, "Draf", "Diajukan", "Disetujui", "Ditolak"].map((st) => <Link key={st ?? "semua"} href={`/admin/lembar-kerja?kegiatan=${kegiatan}${st ? `&status=${st}` : ""}`} className={`rounded-full px-3 py-1 ${status === st ? "bg-navy-800 text-white" : "bg-slate-100 hover:bg-slate-200"}`}>{st ?? "Semua"} ({n(kegiatan, st)})</Link>)}</nav>
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-2">Nomor</th><th>Tanggal</th><th>Alat</th><th>Hasil</th><th>Pemeriksa</th><th>Status</th></tr></thead>
              <tbody>{daftar.map((l) => <tr key={l.id} className="border-b"><td className="py-2"><Link href={`/admin/lembar-kerja/${l.nomor}`} className="font-medium text-teal-800 hover:underline">{l.nomor}</Link></td><td>{tgl(l.tanggal)}</td><td>{alat.get(l.alatId)?.nama ?? "—"} <span className="text-xs text-muted-foreground">{alat.get(l.alatId)?.kode}</span></td><td>{l.hasil}</td><td>{l.pemeriksa}</td><td><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${WARNA[l.status]}`}>{l.status}</span></td></tr>)}
                {!daftar.length && <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">Belum ada lembar kerja. Masukkan kode alat lalu klik &quot;Isi lembar kerja&quot;, atau buka dari halaman detail alat.</td></tr>}</tbody></table></div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
