import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { PackageTable } from "@/components/dashboard/package-table";
import { PaketToolbar } from "@/components/dashboard/paket-toolbar";
import { Pagination } from "@/components/dashboard/pagination";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { filterToQuery, first, resolveFilter, SEMUA_TAHAP, type SearchParams } from "@/lib/filter";
import { getPaketList } from "@/lib/queries";

export const metadata: Metadata = { title: "Paket" };
export const dynamic = "force-dynamic";

export default async function PaketPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const { filter, options } = await resolveFilter(sp);
  const q = (first(sp.q) ?? "").trim();
  const status = first(sp.status) ?? "";
  const page = Math.max(1, Number(first(sp.page)) || 1);
  const hasil = await getPaketList({ filter, q: q || undefined, status, page, pageSize: 25 });

  const query = new URLSearchParams(filterToQuery(filter, { q, status }).replace(/^\?/, ""));

  return (
    <>
      <PageHeader
        title="Paket"
        description="Daftar paket pemeliharaan dan pengadaan alat kesehatan beserta unit kerja, kategori, nilai, dan status serapan."
        actions={
          <>
            <Button variant="outline" size="sm" asChild><Link href={`/api/dataset/paket${filterToQuery(filter, { format: "xlsx" })}`}><Download /> XLSX</Link></Button>
            <Button variant="outline" size="sm" asChild><Link href={`/api/dataset/paket${filterToQuery(filter, { format: "csv" })}`}><Download /> CSV</Link></Button>
          </>
        }
      />
      <FilterBar filter={filter} options={options} />
      <Card className="overflow-hidden">
        <PaketToolbar q={q} status={status} />
        <PackageTable rows={hasil.data} tampilTahap={filter.tahap === SEMUA_TAHAP} kosong={q ? `Tidak ada paket yang cocok dengan "${q}".` : "Tidak ada paket untuk filter ini."} />
        <Pagination page={hasil.page} pages={hasil.pages} total={hasil.total} pageSize={hasil.pageSize} query={query} />
      </Card>
    </>
  );
}
