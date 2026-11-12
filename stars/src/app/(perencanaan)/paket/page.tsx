import type { Metadata } from "next";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { PackageTable } from "@/components/dashboard/package-table";
import { PaketToolbar } from "@/components/dashboard/paket-toolbar";
import { Pagination } from "@/components/dashboard/pagination";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { filterToQuery, first, resolveFilter, SEMUA_TAHAP, type SearchParams } from "@/lib/filter";
import { adalahKolomUrut, getPaketList, type Arah, type KolomUrut } from "@/lib/queries";

export const metadata: Metadata = { title: "Paket" };
export const dynamic = "force-dynamic";

export default async function PaketPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const { filter, options } = await resolveFilter(sp);
  const q = (first(sp.q) ?? "").trim();
  const status = first(sp.status) ?? "";
  const page = Math.max(1, Number(first(sp.page)) || 1);
  const urutReq = first(sp.urut);
  const urut: KolomUrut = adalahKolomUrut(urutReq) ? urutReq : "nilai";
  const arahReq = first(sp.arah);
  const arah: Arah = arahReq === "asc" || arahReq === "desc" ? arahReq : urut === "nilai" || urut === "serapan" ? "desc" : "asc";
  const hasil = await getPaketList({ filter, q: q || undefined, status, page, pageSize: 25, urut, arah, dokumen: true });

  const dasar = filterToQuery(filter, { q, status }).replace(/^\?/, "");
  const query = new URLSearchParams(filterToQuery(filter, { q, status, urut, arah }).replace(/^\?/, ""));

  return (
    <>
      <PageHeader
        title="Paket"
        description="Daftar paket pemeliharaan dan pengadaan alat kesehatan beserta unit kerja, nilai, status serapan, dan dokumen pendukung. Klik judul kolom untuk mengurutkan."
        actions={
          <>
            <Button variant="outline" size="sm" asChild><a href={`/api/dataset/paket${filterToQuery(filter, { format: "xlsx" })}`}><Download /> XLSX</a></Button>
            <Button variant="outline" size="sm" asChild><a href={`/api/dataset/paket${filterToQuery(filter, { format: "csv" })}`}><Download /> CSV</a></Button>
          </>
        }
      />
      <FilterBar filter={filter} options={options} />
      <Card className="overflow-hidden">
        <PaketToolbar q={q} status={status} />
        <PackageTable rows={hasil.data} tampilTahap={filter.tahap === SEMUA_TAHAP} dokumen pengurutan={{ urut, arah, query: dasar }} kosong={q ? `Tidak ada paket yang cocok dengan "${q}".` : "Tidak ada paket untuk filter ini."} />
        <Pagination page={hasil.page} pages={hasil.pages} total={hasil.total} pageSize={hasil.pageSize} query={query} />
      </Card>
    </>
  );
}
