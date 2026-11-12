import type { Metadata } from "next";
import { Download, FileSpreadsheet, FileText, Printer } from "lucide-react";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { filterToQuery, labelFilter, resolveFilter, SEMUA_TAHAP, whereFilter, type SearchParams } from "@/lib/filter";
import { prisma } from "@/lib/prisma";
import { getRingkasan } from "@/lib/queries";
import { formatRupiah, formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Ekspor & Template" };
export const dynamic = "force-dynamic";

export default async function EksporPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { filter, options } = await resolveFilter(await searchParams);
  const [r, jumlahBaris] = await Promise.all([getRingkasan(filter), prisma.paket.count({ where: whereFilter(filter) })]);
  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Template kosong</CardTitle>
          <CardDescription>Excel berisi sheet <code>paket</code> (header + 2 contoh), <code>unit_kerja</code> (28 unit), dan <code>petunjuk</code> pengisian. Versi PDF berupa formulir kosong siap cetak untuk pengumpulan usulan tertulis dari unit.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild><a href="/api/admin/template"><FileSpreadsheet /> Template Excel</a></Button>
          <Button variant="outline" asChild><a href="/api/admin/template?format=pdf"><Printer /> Formulir PDF (cetak)</a></Button>
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
            <p className="text-sm text-muted-foreground">{formatNumber(jumlahBaris)} baris diekspor • {labelFilter(filter)}{filter.tahap === SEMUA_TAHAP ? ` • pagu final ${filter.tahapFinal}: ` : " • "}{formatRupiah(r.totalNilai)}{filter.unit ? ` • ${filter.unit}` : ""}</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" asChild><a href={`/api/dataset/paket${filterToQuery(filter, { format: "xlsx" })}`}><Download /> XLSX</a></Button>
              <Button variant="outline" asChild><a href={`/api/dataset/paket${filterToQuery(filter, { format: "csv" })}`}><Download /> CSV</a></Button>
              <Button variant="outline" asChild><a href={`/api/dataset/paket${filterToQuery(filter, { format: "pdf" })}`}><FileText /> PDF</a></Button>
              <Button variant="outline" asChild><a href={`/api/dataset/nilai-per-unit${filterToQuery(filter, { format: "pdf" })}`}><FileText /> PDF rekap unit</a></Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
