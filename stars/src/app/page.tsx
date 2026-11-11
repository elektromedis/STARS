import Link from "next/link";
import { ArrowRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { ChartCard } from "@/components/dashboard/chart-card";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { FiixCta } from "@/components/dashboard/fiix-cta";
import { PackageTable } from "@/components/dashboard/package-table";
import { TahunChart } from "@/components/charts/tahun-chart";
import { CategoryDonut } from "@/components/charts/category-donut";
import { BarListChart } from "@/components/charts/bar-list-chart";
import { NAV_ITEMS } from "@/lib/nav";
import { LogoFull } from "@/components/layout/logo";
import { filterToQuery, resolveFilter, type SearchParams } from "@/lib/filter";
import { getNilaiPerKategori, getNilaiPerTahun, getNilaiPerUnit, getPaketList, getRingkasan } from "@/lib/queries";
import { formatIDRCompact, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OverviewPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const { filter, options } = await resolveFilter(sp);
  const [ringkasan, perTahun, perKategori, perUnit, terbesar] = await Promise.all([
    getRingkasan(filter),
    getNilaiPerTahun(filter),
    getNilaiPerKategori(filter),
    getNilaiPerUnit(filter, 8),
    getPaketList({ filter, pageSize: 5 }),
  ]);
  const q = filterToQuery(filter);
  const shortcuts = NAV_ITEMS.filter((n) => ["/nilai", "/paket", "/data"].includes(n.href));
  const kpis = [
    { label: "Total Nilai Anggaran", value: formatIDRCompact(ringkasan.totalNilai), hint: `${filter.tahap} ${filter.tahun}` },
    { label: "Jumlah Paket", value: formatNumber(ringkasan.jumlahPaket), hint: "baris RKPBU/RKBU alat kesehatan" },
    { label: "Alkes Dipelihara", value: formatNumber(ringkasan.alkesDipelihara), hint: "unit alat dalam rencana pemeliharaan" },
    { label: "Serapan", value: `${ringkasan.realisasiPersen.toFixed(1).replace(".", ",")}%`, hint: `${formatIDRCompact(ringkasan.nilaiTerserap)} terserap` },
  ];

  return (
    <>
      <section className="mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-navy-800 via-navy-700 to-teal-800 p-6 text-white shadow-card md:p-10">
        <div className="flex items-center justify-between gap-8">
          <div>
            <p className="mb-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-teal-100">STARS • RSUD Cipayung • Tahun anggaran {filter.tahun}</p>
            <h1 className="max-w-3xl text-2xl font-bold tracking-tight md:text-4xl">
              Profil Perencanaan-Pengadaan Alat Kesehatan dan Pemeliharaan Alat Kesehatan di RSUD Cipayung
            </h1>
            <p className="mt-3 max-w-2xl text-navy-100 md:text-lg">
              Pantau perencanaan, pengadaan, dan pemeliharaan alat kesehatan di seluruh unit kerja dalam satu sistem terintegrasi.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="teal" size="lg" asChild><Link href={`/nilai${q}`}>Jelajahi Nilai <ArrowRight /></Link></Button>
              <Button size="lg" className="bg-white/10 text-white hover:bg-white/20" asChild><Link href={`/data${q}`}><Download /> Unduh Data</Link></Button>
            </div>
          </div>
          <div className="hidden shrink-0 rounded-2xl bg-white p-4 shadow-lg xl:block">
            <LogoFull width={300} />
          </div>
        </div>
      </section>

      <FiixCta />

      <FilterBar filter={filter} options={options} />

      <section aria-label="Indikator utama" className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => <StatCard key={k.label} {...k} />)}
      </section>

      <section className="mb-6 grid gap-4 lg:grid-cols-5">
        <ChartCard className="lg:col-span-3" title="Nilai Anggaran per Tahun dan Tahap" description={filter.unit ? `Unit ${filter.unit}, semua tahun yang tercatat` : "Seluruh unit kerja, semua tahun yang tercatat"}>
          <TahunChart data={perTahun.data} tahapKeys={perTahun.tahapKeys} />
        </ChartCard>
        <ChartCard className="lg:col-span-2" title="Distribusi per Kategori" description={`Porsi nilai menurut kategori, ${filter.tahap} ${filter.tahun}`}>
          <CategoryDonut data={perKategori} />
        </ChartCard>
      </section>

      <section className="mb-6 grid gap-4 lg:grid-cols-5">
        <ChartCard className="lg:col-span-2" title="Nilai per Unit Kerja" description="8 unit kerja dengan nilai tertinggi">
          <BarListChart data={perUnit} />
        </ChartCard>
        <Card className="lg:col-span-3">
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle>Paket Bernilai Terbesar</CardTitle>
              <CardDescription>5 paket dengan nilai tertinggi pada {filter.tahap} {filter.tahun}</CardDescription>
            </div>
            <Button variant="link" size="sm" asChild><Link href={`/paket${q}`}>Lihat semua</Link></Button>
          </CardHeader>
          <CardContent className="px-0 pb-2"><PackageTable rows={terbesar.data} /></CardContent>
        </Card>
      </section>

      <section aria-label="Pintasan" className="grid gap-4 md:grid-cols-3">
        {shortcuts.map((s) => (
          <Link key={s.href} href={`${s.href}${q}`} className="group rounded-xl border bg-card p-5 shadow-card transition-colors hover:border-teal-300">
            <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-teal-50 text-teal-700"><s.icon className="size-5" /></div>
            <h2 className="font-semibold text-navy-800">{s.label}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-teal-700">Buka <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></span>
          </Link>
        ))}
      </section>
    </>
  );
}
