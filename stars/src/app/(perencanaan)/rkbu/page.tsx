import type { Metadata } from "next";
import Link from "next/link";
import { Copy, FilePlus2, FileText, Pencil } from "lucide-react";
import { auth } from "@/auth";
import { sesiHalaman } from "@/lib/sesi";
import { unitTerkunci } from "@/lib/akses";
import { cukup } from "@/lib/peran";
import { prisma } from "@/lib/prisma";
import { first, type SearchParams } from "@/lib/filter";
import { opsiRkbu } from "@/lib/rkbu-data";
import { angkaRkbu } from "@/lib/rkbu";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { HapusDokumenRkbu } from "@/components/rkbu/hapus-dokumen";

export const metadata: Metadata = { title: "Cetak RKBU" };
export const dynamic = "force-dynamic";

const tgl = (d: Date) => d.toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default async function RkbuPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await sesiHalaman("Viewer");
  const s = await auth();
  const sp = await searchParams;
  const kunci = await unitTerkunci();
  const [docs, opsi] = await Promise.all([
    prisma.dokumenRkbu.findMany({ orderBy: { updatedAt: "desc" }, select: { id: true, judul: true, jenis: true, tahun: true, tahap: true, unit: true, jumlahBaris: true, total: true, diubahOleh: true, updatedAt: true } }),
    opsiRkbu(kunci?.nama),
  ]);
  const bolehUbah = cukup(s?.user?.peran, "Operator") && process.env.STARS_MODE !== "internet";
  const tahunQ = Number(first(sp.tahun));
  const tahapQ = first(sp.tahap);
  const awalTt = opsi.tahunTahap.find((t) => t.tahun === tahunQ && tahapQ && t.tahap.includes(tahapQ)) ? `${tahunQ}|${tahapQ}` : opsi.tahunTahap[0] ? `${opsi.tahunTahap[0].tahun}|${opsi.tahunTahap[0].tahap.at(-1)}` : "";

  return (
    <>
      <PageHeader title="Cetak RKBU / RKPBU" description="Susun dokumen Rencana Kebutuhan (Pemeliharaan) Barang Unit ber-kop RSUD Cipayung dari data paket, ubah isinya sesuai kebutuhan, lalu cetak atau simpan sebagai PDF/Excel." />

      <section aria-labelledby="judul-baru" className="mb-8 rounded-xl border bg-card p-4 shadow-card md:p-5">
        <h2 id="judul-baru" className="mb-1 flex items-center gap-2 font-semibold text-navy-800"><FilePlus2 className="size-4 text-teal-700" /> Dokumen baru</h2>
        <p className="mb-4 text-sm text-muted-foreground">Baris tabel diambil dari menu Paket sesuai pilihan; kop, penandatangan, dan catatan disalin dari dokumen terakhir. Semua bisa diubah di editor.</p>
        <form action="/rkbu/baru" method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6 [&>*]:min-w-0">
          <label className="grid gap-1 text-xs font-medium text-navy-700">Jenis dokumen
            <Select name="jenis" defaultValue="Pemeliharaan" className="h-9 text-sm font-normal"><option value="Pemeliharaan">RKPBU (Pemeliharaan)</option><option value="Pengadaan">RKBU (Pengadaan)</option></Select>
          </label>
          <label className="grid gap-1 text-xs font-medium text-navy-700">Tahun & tahap
            <Select name="tt" defaultValue={awalTt} className="h-9 text-sm font-normal">
              {opsi.tahunTahap.flatMap((t) => t.tahap.map((tp) => <option key={`${t.tahun}|${tp}`} value={`${t.tahun}|${tp}`}>{t.tahun} — {tp}</option>))}
              {opsi.tahunTahap.length === 0 && <option value={`${new Date().getFullYear()}|Ranwal`}>{new Date().getFullYear()} — Ranwal</option>}
            </Select>
          </label>
          <label className="grid gap-1 text-xs font-medium text-navy-700">Unit kerja / lokasi
            <Select name="unit" defaultValue="" className="h-9 text-sm font-normal"><option value="">{kunci ? kunci.nama : "Semua unit"}</option>{!kunci && opsi.units.map((u) => <option key={u}>{u}</option>)}</Select>
          </label>
          <label className="grid gap-1 text-xs font-medium text-navy-700">Kode rekening
            <Select name="rekening" defaultValue="" className="h-9 text-sm font-normal"><option value="">Semua rekening</option>{opsi.rekening.map((r) => <option key={r}>{r}</option>)}</Select>
          </label>
          <label className="grid gap-1 text-xs font-medium text-navy-700">Isi tabel
            <Select name="isi" defaultValue="paket" className="h-9 text-sm font-normal"><option value="paket">Dari data Paket</option><option value="kosong">Kosong (isi manual)</option></Select>
          </label>
          <div className="flex items-end"><Button type="submit" variant="teal" className="w-full"><FilePlus2 /> Buat & buka editor</Button></div>
        </form>
      </section>

      <section aria-labelledby="judul-daftar">
        <h2 id="judul-daftar" className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Dokumen tersimpan • {docs.length}</h2>
        {docs.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Belum ada dokumen tersimpan. Buat dokumen baru di atas{bolehUbah ? ", lalu tekan Simpan di editor." : " (menyimpan perlu peran Operator)."}</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr><th className="px-4 py-3">Dokumen</th><th className="px-4 py-3">Tahap</th><th className="px-4 py-3 text-right">Baris</th><th className="px-4 py-3 text-right">Grand total (Rp)</th><th className="px-4 py-3">Terakhir diubah</th><th className="px-4 py-3 text-right">Aksi</th></tr>
              </thead>
              <tbody>
                {docs.map((d) => (
                  <tr key={d.id} className="border-t">
                    <td className="px-4 py-3">
                      <Link href={`/rkbu/${d.id}`} className="flex items-start gap-2 font-medium text-navy-800 hover:text-teal-800"><FileText className="mt-0.5 size-4 shrink-0 text-teal-700" />{d.judul}</Link>
                      <span className="ml-6 text-xs text-muted-foreground">{d.unit ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3"><Badge variant={d.jenis === "Pengadaan" ? "outline" : "teal"}>{d.jenis === "Pengadaan" ? "RKBU" : "RKPBU"}</Badge> <span className="whitespace-nowrap">{d.tahap} {d.tahun}</span></td>
                    <td className="px-4 py-3 text-right tabular-nums">{d.jumlahBaris}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{angkaRkbu(d.total)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{tgl(d.updatedAt)}{d.diubahOleh ? <><br />{d.diubahOleh}</> : null}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button asChild variant="outline" size="sm"><Link href={`/rkbu/${d.id}`}><Pencil /> Buka</Link></Button>
                        <Button asChild variant="ghost" size="sm" title="Salin menjadi dokumen baru (mis. untuk tahap berikutnya)"><Link href={`/rkbu/baru?salin=${d.id}`} aria-label={`Salin ${d.judul}`}><Copy /></Link></Button>
                        {bolehUbah && <HapusDokumenRkbu id={d.id} judul={d.judul} />}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
