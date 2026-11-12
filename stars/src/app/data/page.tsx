import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { DataTerbaru } from "@/components/dashboard/data-terbaru";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { labelFilter, resolveFilter, type SearchParams } from "@/lib/filter";
import { getDatasets } from "@/lib/queries";
import { formatRupiah, formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Data" };
export const dynamic = "force-dynamic";

const tgl = (d: Date | null) => (d ? new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(d) : "-");

function Unduh({ href, label = "" }: { href: string; label?: string }) {
  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" asChild><Link href={`${href}${href.includes("?") ? "&" : "?"}format=xlsx`}><Download /> XLSX{label}</Link></Button>
      <Button variant="outline" size="sm" asChild><Link href={`${href}${href.includes("?") ? "&" : "?"}format=csv`}><Download /> CSV{label}</Link></Button>
    </div>
  );
}

export default async function DataPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { filter } = await resolveFilter(await searchParams);
  const datasets = await getDatasets();
  const totalBaris = datasets.reduce((a, d) => a + d.baris, 0);

  return (
    <>
      <PageHeader title="Data" description="Dataset terbuka alat kesehatan RSUD Cipayung dalam format XLSX dan CSV. Kolom mengikuti template STARS sehingga dapat diedit dan diunggah kembali." />
      <DataTerbaru />

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Ringkasan</h2>
      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Daftar Unit Kerja</CardTitle><CardDescription>28 unit kerja beserta jumlah paket tercatat</CardDescription></CardHeader>
          <CardContent><Unduh href="/api/dataset/unit-kerja" /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Nilai per Unit Kerja</CardTitle><CardDescription>{labelFilter(filter)} • semua unit</CardDescription></CardHeader>
          <CardContent><Unduh href={`/api/dataset/nilai-per-unit?tahun=${filter.tahun}&tahap=${encodeURIComponent(filter.tahap)}`} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Nilai per Kategori</CardTitle><CardDescription>{labelFilter(filter)} • semua kategori</CardDescription></CardHeader>
          <CardContent><Unduh href={`/api/dataset/nilai-per-kategori?tahun=${filter.tahun}&tahap=${encodeURIComponent(filter.tahap)}`} /></CardContent>
        </Card>
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Paket per tahun dan tahap anggaran • {formatNumber(totalBaris)} baris</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {datasets.map((d) => (
          <Card key={`${d.tahun}-${d.tahap}`}>
            <CardHeader>
              <CardTitle>Paket Alat Kesehatan {d.tahun} — {d.tahap}</CardTitle>
              <CardDescription>{formatNumber(d.baris)} baris • {formatRupiah(d.nilai)} • Diperbarui {tgl(d.diperbarui)}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2"><Badge variant="teal">XLSX</Badge><Badge variant="teal">CSV</Badge><Badge variant="outline">BLUD</Badge></div>
              <Unduh href={`/api/dataset/paket?tahun=${d.tahun}&tahap=${encodeURIComponent(d.tahap)}`} />
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
