import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { StatCard } from "@/components/dashboard/stat-card";
import { ChartCard } from "@/components/dashboard/chart-card";
import { TahunChart } from "@/components/charts/tahun-chart";
import { BarListChart } from "@/components/charts/bar-list-chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { filterToQuery, resolveFilter, type SearchParams } from "@/lib/filter";
import { getNilaiPerKategori, getNilaiPerTahun, getNilaiPerUnit, getRingkasan } from "@/lib/queries";
import { formatIDRCompact, formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Nilai" };
export const dynamic = "force-dynamic";

export default async function NilaiPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { filter, options } = await resolveFilter(await searchParams);
  const [ringkasan, perTahun, perKategori, perUnit] = await Promise.all([
    getRingkasan(filter), getNilaiPerTahun(filter), getNilaiPerKategori(filter), getNilaiPerUnit(filter),
  ]);
  const q = filterToQuery(filter);
  const kpis = [
    { label: "Total Nilai Anggaran", value: formatIDRCompact(ringkasan.totalNilai), hint: `${filter.tahap} ${filter.tahun}` },
    { label: "Nilai Terserap", value: formatIDRCompact(ringkasan.nilaiTerserap), hint: `${formatNumber(ringkasan.paketTerserap)} paket` },
    { label: "Belum Terserap", value: formatIDRCompact(ringkasan.totalNilai - ringkasan.nilaiTerserap), hint: `${formatNumber(ringkasan.jumlahPaket - ringkasan.paketTerserap)} paket` },
    { label: "Serapan", value: `${ringkasan.realisasiPersen.toFixed(1).replace(".", ",")}%`, hint: "dari total nilai anggaran" },
  ];

  return (
    <>
      <PageHeader
        title="Nilai"
        description="Nilai anggaran dan serapan pemeliharaan serta pengadaan alat kesehatan menurut tahun, tahap, unit kerja, dan kategori."
        actions={<Button variant="outline" size="sm" asChild><Link href={`/api/dataset/nilai-per-unit${filterToQuery(filter, { format: "xlsx" })}`}><Download /> Unduh XLSX</Link></Button>}
      />
      <FilterBar filter={filter} options={options} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{kpis.map((k) => <StatCard key={k.label} {...k} />)}</div>
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <ChartCard title="Nilai per Tahun dan Tahap" description="Perbandingan seluruh tahun anggaran yang tercatat"><TahunChart data={perTahun.data} tahapKeys={perTahun.tahapKeys} /></ChartCard>
        <ChartCard title="Nilai per Kategori" description={`${filter.tahap} ${filter.tahun}`}><BarListChart data={perKategori} label="Grafik batang nilai per kategori" /></ChartCard>
      </div>
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>Nilai per Unit Kerja</CardTitle>
            <CardDescription>Seluruh unit kerja dengan paket pada {filter.tahap} {filter.tahun}</CardDescription>
          </div>
          <Button variant="link" size="sm" asChild><Link href={`/paket${q}`}>Lihat paket</Link></Button>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent"><TableHead>#</TableHead><TableHead>Unit Kerja</TableHead><TableHead className="text-right">Paket</TableHead><TableHead className="text-right">Nilai</TableHead><TableHead className="hidden text-right sm:table-cell">Porsi</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {perUnit.map((u, i) => (
                <TableRow key={u.name}>
                  <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="font-medium text-navy-800"><Link className="hover:underline" href={`/paket${filterToQuery({ ...filter, unit: u.name })}`}>{u.name}</Link></TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(u.paket)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatIDRCompact(u.value)}</TableCell>
                  <TableCell className="hidden text-right tabular-nums text-muted-foreground sm:table-cell">{ringkasan.totalNilai ? ((u.value / ringkasan.totalNilai) * 100).toFixed(1).replace(".", ",") : "0"}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
