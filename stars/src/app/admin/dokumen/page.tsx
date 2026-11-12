import type { Metadata } from "next";
import Link from "next/link";
import { FileCheck2, FolderOpen } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { sesiHalaman } from "@/lib/sesi";
import { first, filterToQuery, resolveFilter, whereFilter, type SearchParams } from "@/lib/filter";
import { getPaketList } from "@/lib/queries";
import { JENIS_DOKUMEN } from "@/lib/dokumen";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { PaketToolbar } from "@/components/dashboard/paket-toolbar";
import { Pagination } from "@/components/dashboard/pagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn, formatNumber, formatRupiah } from "@/lib/utils";

export const metadata: Metadata = { title: "Dokumen Paket" };
export const dynamic = "force-dynamic";

/** CMS dokumen paket: kelengkapan RKPBU, AKPA, Nota Dinas, SP/SPK, Invoice/Faktur per paket. */
export default async function DokumenPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await sesiHalaman("Viewer");
  const sp = await searchParams;
  const { filter, options } = await resolveFilter(sp);
  const q = (first(sp.q) ?? "").trim();
  const status = first(sp.status) ?? "";
  const page = Math.max(1, Number(first(sp.page)) || 1);
  const [hasil, kodeSemua] = await Promise.all([
    getPaketList({ filter, q: q || undefined, status, page, pageSize: 25, urut: "nama", arah: "asc", dokumen: true }),
    prisma.paket.findMany({ where: whereFilter(filter), select: { kode: true } }),
  ]);
  const grup = await prisma.dokumenPaket.groupBy({ by: ["jenis", "paketKode"], where: { paketKode: { in: kodeSemua.map((k) => k.kode) } } });
  const lengkap = Object.fromEntries(JENIS_DOKUMEN.map((j) => [j.kode, grup.filter((g) => g.jenis === j.kode).length]));
  const query = new URLSearchParams(filterToQuery(filter, { q, status }).replace(/^\?/, ""));

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FolderOpen className="size-5 text-teal-700" /> Kelengkapan dokumen</CardTitle>
          <CardDescription>Jumlah paket yang sudah memiliki tiap dokumen, dari {formatNumber(kodeSemua.length)} paket pada filter ini.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {JENIS_DOKUMEN.map((j) => {
            const n = lengkap[j.kode] ?? 0;
            const persen = kodeSemua.length ? Math.round((n / kodeSemua.length) * 100) : 0;
            return (
              <div key={j.kode} className="rounded-lg border bg-muted/30 p-3">
                <p className="text-xs font-medium text-muted-foreground">{j.label}</p>
                <p className="mt-1 text-lg font-bold tabular-nums text-navy-800">{formatNumber(n)} <span className="text-sm font-normal text-muted-foreground">/ {formatNumber(kodeSemua.length)}</span></p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-teal-500 transition-[width] duration-500" style={{ width: `${persen}%` }} /></div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <FilterBar filter={filter} options={options} />

      <Card className="overflow-hidden">
        <PaketToolbar q={q} status={status} />
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Kode</TableHead><TableHead>Nama Paket</TableHead><TableHead className="hidden md:table-cell">Unit</TableHead>
              <TableHead className="hidden text-right lg:table-cell">Nilai</TableHead><TableHead>Dokumen</TableHead><TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {hasil.data.length === 0 && <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">Tidak ada paket untuk filter ini.</TableCell></TableRow>}
            {hasil.data.map((p) => {
              const jumlah = JENIS_DOKUMEN.filter((j) => p.dokumen?.[j.kode]).length;
              return (
                <TableRow key={p.kode}>
                  <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">{p.kode}</TableCell>
                  <TableCell className="min-w-[14rem] max-w-md font-medium text-navy-800"><span className="line-clamp-2">{p.namaPaket}</span><span className="block text-xs font-normal text-muted-foreground">{p.tahap} {p.tahun} • {p.kategori}</span></TableCell>
                  <TableCell className="hidden md:table-cell">{p.unit}</TableCell>
                  <TableCell className="hidden whitespace-nowrap text-right tabular-nums lg:table-cell">{formatRupiah(p.nilai)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {JENIS_DOKUMEN.map((j) => {
                        const ada = p.dokumen?.[j.kode];
                        return (
                          <span key={j.kode} title={`${j.label}: ${ada ? `${ada.jumlah} berkas` : "belum ada"}`}
                            className={cn("inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold", ada ? "border-teal-200 bg-teal-50 text-teal-800" : "border-dashed text-muted-foreground")}>
                            {ada && <FileCheck2 className="size-3" aria-hidden />}{j.label}
                          </span>
                        );
                      })}
                    </div>
                    <span className="mt-1 block text-[11px] text-muted-foreground">{jumlah}/{JENIS_DOKUMEN.length} lengkap</span>
                  </TableCell>
                  <TableCell className="text-right"><Button size="sm" variant="outline" asChild><Link href={`/admin/dokumen/${encodeURIComponent(p.kode)}`}>Kelola</Link></Button></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <Pagination page={hasil.page} pages={hasil.pages} total={hasil.total} pageSize={hasil.pageSize} query={query} />
      </Card>
    </div>
  );
}
