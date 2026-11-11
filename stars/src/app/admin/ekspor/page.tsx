import type { Metadata } from "next";
import Link from "next/link";
import { Download, FileSpreadsheet, FileText, Printer } from "lucide-react";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { filterToQuery, resolveFilter, type SearchParams } from "@/lib/filter";
import { getRingkasan } from "@/lib/queries";
import { formatIDRCompact, formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Ekspor & Template" };
export const dynamic = "force-dynamic";

export default async function EksporPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { filter, options } = await resolveFilter(await searchParams);
  const r = await getRingkasan(filter);
  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Template kosong</CardTitle>
          <CardDescription>Excel berisi sheet <code>paket</code> (header + 2 contoh), <code>unit_kerja</code> (28 unit), dan <code>petunjuk</code> pengisian. Versi PDF berupa formulir kosong siap cetak untuk pengumpulan usulan tertulis dari unit.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild><Link href="/api/admin/template"><FileSpreadsheet /> Template Excel</Link></Button>
          <Button variant="outline" asChild><Link href="/api/admin/template?format=pdf"><Printer /> Formulir PDF (cetak)</Link></Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Ekspor data</CardTitle>
          <CardDescription>Pilih tahun, tahap, dan unit, lalu unduh. XLSX/CSV memuat kolom <code>kode</code> sehingga setelah diedit dapat diunggah kembali untuk memperbarui data yang sama. PDF berupa laporan siap cetak (baca saja, dengan total).</CardDescription>
        </CardHeader>
        <CardContent>
          <FilterBar filter={filter} options={options} />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">{formatNumber(r.jumlahPaket)} paket • {formatIDRCompact(r.totalNilai)} • {filter.tahap} {filter.tahun}{filter.unit ? ` • ${filter.unit}` : ""}</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" asChild><Link href={`/api/dataset/paket${filterToQuery(filter, { format: "xlsx" })}`}><Download /> XLSX</Link></Button>
              <Button variant="outline" asChild><Link href={`/api/dataset/paket${filterToQuery(filter, { format: "csv" })}`}><Download /> CSV</Link></Button>
              <Button variant="outline" asChild><Link href={`/api/dataset/paket${filterToQuery(filter, { format: "pdf" })}`}><FileText /> PDF</Link></Button>
              <Button variant="outline" asChild><Link href={`/api/dataset/nilai-per-unit${filterToQuery(filter, { format: "pdf" })}`}><FileText /> PDF rekap unit</Link></Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
