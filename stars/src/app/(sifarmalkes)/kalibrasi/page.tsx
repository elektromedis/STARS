import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, Download, FileSpreadsheet, Gauge, Landmark, Lock, Search, Settings2, TableProperties } from "lucide-react";
import { auth } from "@/auth";
import { unitTerkunci } from "@/lib/akses";
import { getDataKalibrasi, JENIS_UJI, STATUS_DATA, type FilterKalibrasi } from "@/lib/kalibrasi-data";
import { tglIndo } from "@/lib/kalibrasi";
import { urlDetailAlat } from "@/lib/dokumen-alat";
import { formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Pagination } from "@/components/dashboard/pagination";
import { BatangPeringkat, BatangStatus, BatangTipis, KolomSatuSeri, KolomTahun, LencanaStatus } from "@/components/kalibrasi/grafik";

export const metadata: Metadata = { title: "Pengujian dan Kalibrasi" };
export const dynamic = "force-dynamic";

type Sp = Record<string, string | string[] | undefined>;
const satu = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
const JANGKAR = "data-kalibrasi";

function bacaFilter(sp: Sp): FilterKalibrasi {
  const status = satu(sp.status);
  const jenis = satu(sp.jenis);
  return {
    q: satu(sp.q).slice(0, 100), unit: satu(sp.unit).slice(0, 120), lembaga: satu(sp.lembaga).slice(0, 160), tahun: /^\d{4}$/.test(satu(sp.tahun)) ? satu(sp.tahun) : "",
    status: STATUS_DATA.some((s) => s.kode === status) ? status : "", jenis: (JENIS_UJI as readonly string[]).includes(jenis) ? jenis : "",
    mode: satu(sp.mode) === "riwayat" ? "riwayat" : "alat",
  };
}
const keQuery = (f: Partial<FilterKalibrasi>) => { const q = new URLSearchParams(); for (const [k, v] of Object.entries(f)) if (v && !(k === "mode" && v === "alat")) q.set(k, String(v)); return q; };

export default async function KalibrasiPublikPage({ searchParams }: { searchParams: Promise<Sp> }) {
  const sp = await searchParams;
  const f = bacaFilter(sp);
  const [kunci, sesi] = await Promise.all([unitTerkunci(), auth()]);
  const d = await getDataKalibrasi({ kunci: kunci?.nama ?? null, f: kunci ? { ...f, unit: "" } : f, page: Number(satu(sp.page)) || 1, pageSize: 25 });
  const r = d.ringkasan;
  const masuk = Boolean(sesi?.user);
  const adaFilter = Boolean(f.q || f.unit || f.status || f.jenis || f.lembaga || f.tahun);
  const qEkspor = keQuery(f).toString();

  return (
    <>
      <PageHeader
        title="Pengujian dan Kalibrasi Alat"
        description={`Status pengujian & kalibrasi alat kesehatan${kunci ? ` unit ${kunci.nama}` : " RSUD Cipayung"}: masa berlaku, jatuh tempo, lembaga penguji, dan riwayat lengkap per alat. Status alat dihitung dari catatan terbarunya.`}
        actions={<>
          <Button variant="outline" asChild><a href={`/api/kalibrasi/ekspor${qEkspor ? `?${qEkspor}` : ""}`}><FileSpreadsheet /> Unduh Excel</a></Button>
          <Button variant="teal" asChild><Link href="/admin/kalibrasi"><Settings2 /> Kelola (login)</Link></Button>
        </>}
      />

      <section aria-label="Indikator" className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Alat wajib uji/kalibrasi" value={formatNumber(r.total)} hint="alat medik aktif & alat yang pernah diuji" />
        <StatCard label="Cakupan berlaku" value={`${(r.cakupan * 100).toFixed(1).replace(".", ",")}%`} hint={`${formatNumber(r.hitung.berlaku + r.hitung.segera + r.hitung["tanpa-batas"])} alat punya catatan yang masih berlaku`} />
        <StatCard label="Kedaluwarsa / tidak laik" value={formatNumber(r.hitung.bermasalah)} hint={`${formatNumber(r.tidakLaik)} tidak laik · ${formatNumber(r.hitung.belum)} belum pernah`} />
        <StatCard label="Jatuh tempo ≤ 90 hari" value={formatNumber(r.jatuhTempo90)} hint={`${formatNumber(r.hitung.segera)} di antaranya ≤ 30 hari`} />
      </section>

      <Card className="mb-6">
        <CardHeader><CardTitle className="flex items-center gap-2"><Gauge className="size-4 text-teal-700" /> Status kalibrasi alat</CardTitle><CardDescription>{formatNumber(r.total)} alat · {formatNumber(r.catatan)} catatan ({formatNumber(r.pengujian)} pengujian) · {formatNumber(r.sertifikat)} bersertifikat digital</CardDescription></CardHeader>
        <CardContent><BatangStatus hitung={r.hitung} total={r.total} /></CardContent>
      </Card>

      <div className="mb-6 grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><CalendarClock className="size-4 text-teal-700" /> Jatuh tempo 12 bulan ke depan</CardTitle><CardDescription>Jumlah alat yang masa berlakunya habis per bulan — rencanakan anggaran & jadwal kalibrasi.</CardDescription></CardHeader>
          <CardContent><KolomSatuSeri data={d.bulan} satuan="alat jatuh tempo" /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Landmark className="size-4 text-teal-700" /> Lembaga penguji / kalibrator</CardTitle><CardDescription>Jumlah catatan per lembaga (seluruh riwayat).</CardDescription></CardHeader>
          <CardContent><BatangPeringkat data={d.lembaga} satuan="catatan" /></CardContent>
        </Card>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-[2fr_3fr] [&>*]:min-w-0">
        <Card>
          <CardHeader><CardTitle>Catatan per tahun</CardTitle><CardDescription>Realisasi pengujian & kalibrasi menurut tahun pelaksanaan.</CardDescription></CardHeader>
          <CardContent><KolomTahun data={d.perTahun} /></CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardHeader><CardTitle>Per unit kerja</CardTitle><CardDescription>Klik unit untuk menyaring tabel data di bawah.</CardDescription></CardHeader>
          <div className="max-h-[22rem] overflow-y-auto border-t">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow className="hover:bg-transparent">
                  <TableHead>Unit</TableHead><TableHead className="text-right">Alat</TableHead><TableHead className="w-[38%]">Komposisi</TableHead>
                  <TableHead className="text-right">Berlaku</TableHead><TableHead className="text-right">Bermasalah</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {d.perUnit.map((u) => (
                  <TableRow key={u.nama}>
                    <TableCell className="max-w-[12rem]"><Link href={`?${keQuery({ ...f, unit: u.nama }).toString()}#${JANGKAR}`} scroll={false} className="font-medium text-navy-800 hover:text-teal-700 hover:underline">{u.nama}</Link></TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(u.total)}</TableCell>
                    <TableCell><BatangTipis hitung={u} total={u.total} /></TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(u.berlaku + u.segera + u["tanpa-batas"])}</TableCell>
                    <TableCell className={cn("text-right tabular-nums", u.bermasalah > 0 && "font-semibold text-red-700")}>{formatNumber(u.bermasalah)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      <section id={JANGKAR} aria-labelledby="judul-data-kalibrasi" className="scroll-mt-24">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="judul-data-kalibrasi" className="flex items-center gap-2 text-xl font-bold text-navy-800"><TableProperties className="size-5 text-teal-700" /> Data Pengujian &amp; Kalibrasi</h2>
            <p className="mt-1 text-sm text-muted-foreground">{f.mode === "alat" ? "Satu baris per alat dengan catatan terbarunya; yang paling mendesak di atas." : "Seluruh catatan pengujian & kalibrasi, terbaru di atas."}</p>
          </div>
          <div role="tablist" aria-label="Tampilan data" className="flex rounded-lg border bg-card p-1 text-sm">
            {([["alat", "Per alat (status terkini)"], ["riwayat", "Seluruh riwayat"]] as const).map(([m, label]) => (
              <Link key={m} role="tab" aria-selected={f.mode === m} href={`?${keQuery({ ...f, mode: m }).toString()}#${JANGKAR}`} scroll={false}
                className={cn("rounded-md px-3 py-1.5 font-medium transition", f.mode === m ? "bg-navy-800 text-white" : "text-muted-foreground hover:text-navy-800")}>{label}</Link>
            ))}
          </div>
        </div>
        <Card className="overflow-hidden">
          <form method="get" action={`/kalibrasi#${JANGKAR}`} className="grid gap-3 border-b p-4">
            {f.mode === "riwayat" && <input type="hidden" name="mode" value="riwayat" />}
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input name="q" defaultValue={f.q} placeholder="Cari nama alat, nomor seri, ruangan, nomor sertifikat…" className="pl-9" aria-label="Cari" />
              </div>
              <Button type="submit"><Search /> Cari</Button>
              {adaFilter && <Button variant="outline" asChild><Link href={`/kalibrasi${f.mode === "riwayat" ? "?mode=riwayat" : ""}#${JANGKAR}`} scroll={false}>Reset</Link></Button>}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {kunci ? <p className="flex h-10 items-center rounded-md border bg-muted/40 px-3 text-sm text-muted-foreground">Unit: <strong className="ml-1 truncate text-navy-800">{kunci.nama}</strong></p> : (
                <Select name="unit" defaultValue={f.unit} aria-label="Unit kerja"><option value="">Semua unit kerja</option>{d.opsi.unit.map((u) => <option key={u} value={u}>{u}</option>)}</Select>
              )}
              <Select name="status" defaultValue={f.status} aria-label="Status"><option value="">Semua status</option>{STATUS_DATA.map((s) => <option key={s.kode} value={s.kode}>{s.label}</option>)}</Select>
              <Select name="jenis" defaultValue={f.jenis} aria-label="Jenis"><option value="">Pengujian &amp; kalibrasi</option>{JENIS_UJI.map((j) => <option key={j} value={j}>{j}</option>)}</Select>
              <Select name="lembaga" defaultValue={f.lembaga} aria-label="Lembaga"><option value="">Semua lembaga</option>{d.opsi.lembaga.map((l) => <option key={l} value={l}>{l}</option>)}</Select>
              <Select name="tahun" defaultValue={f.tahun} aria-label="Tahun pelaksanaan"><option value="">Semua tahun</option>{d.opsi.tahun.map((t) => <option key={t} value={t}>{t}</option>)}</Select>
            </div>
          </form>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="hidden whitespace-nowrap md:table-cell">Nomor Seri (SN)</TableHead>
                <TableHead>Nama Alat</TableHead>
                <TableHead className="hidden lg:table-cell">Unit / Ruangan</TableHead>
                <TableHead className="hidden sm:table-cell">Tgl uji/kalibrasi</TableHead>
                <TableHead className="hidden xl:table-cell">Lembaga &amp; sertifikat</TableHead>
                <TableHead>Berlaku s/d</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {d.tabel.data.length === 0 && <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">{adaFilter ? "Tidak ada data yang cocok dengan pencarian/filter ini." : "Belum ada data."}</TableCell></TableRow>}
              {d.tabel.data.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="hidden max-w-[10rem] break-all font-mono text-xs md:table-cell">{b.nomorSeri ?? <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="max-w-xs">
                    <Link href={urlDetailAlat(b.kode)} className="font-medium text-navy-800 hover:text-teal-700 hover:underline">{b.nama}</Link>
                    {b.tipe && <span className="block text-xs text-muted-foreground">{b.tipe}</span>}
                    <span className="block text-xs text-muted-foreground md:hidden">{b.nomorSeri ? `SN ${b.nomorSeri}` : ""}</span>
                    <span className="block text-xs text-muted-foreground lg:hidden">{b.unit}</span>
                    {b.tanggal && <span className="block text-xs text-muted-foreground sm:hidden">{b.jenis} {tglIndo(b.tanggal)}</span>}
                  </TableCell>
                  <TableCell className="hidden text-sm lg:table-cell">{b.unit}{b.ruangan && <span className="block text-xs text-muted-foreground">{b.ruangan}</span>}</TableCell>
                  <TableCell className="hidden whitespace-nowrap text-sm sm:table-cell">{b.tanggal ? <>{tglIndo(b.tanggal)}<span className="block text-xs text-muted-foreground">{b.jenis}</span></> : <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="hidden max-w-[16rem] text-xs xl:table-cell">
                    {b.kalibrator ?? "—"}
                    {b.nomorSertifikat && <span className="block break-all font-mono text-muted-foreground">{b.nomorSertifikat}</span>}
                    {b.adaBerkas && b.catatanId && (masuk
                      ? <a href={`/api/kalibrasi/${b.catatanId}/sertifikat`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-teal-700 hover:underline"><Download className="size-3" /> Sertifikat</a>
                      : <span className="inline-flex items-center gap-1 text-muted-foreground"><Lock className="size-3" /> sertifikat (login)</span>)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">{tglIndo(b.berlakuSampai)}{b.laik === false && <span className="block text-xs font-medium text-red-700">Tidak laik</span>}</TableCell>
                  <TableCell><LencanaStatus kunci={b.st.kunci} label={b.st.label} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination page={d.tabel.page} pages={d.tabel.pages} total={d.tabel.total} pageSize={d.tabel.pageSize} query={keQuery(f)} satuan={f.mode === "alat" ? "alat" : "catatan"} jangkar={JANGKAR} />
        </Card>
      </section>
    </>
  );
}
