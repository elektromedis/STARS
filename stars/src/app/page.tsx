import Link from "next/link";
import { Activity, ArrowRight, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { ChartCard } from "@/components/dashboard/chart-card";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { LaporCta } from "@/components/dashboard/lapor-cta";
import { PackageTable } from "@/components/dashboard/package-table";
import { TahunChart } from "@/components/charts/tahun-chart";
import { CategoryDonut } from "@/components/charts/category-donut";
import { BarListChart } from "@/components/charts/bar-list-chart";
import { NAV_ITEMS, PERENCANAAN_TABS } from "@/lib/nav";
import { LogoAnimasi } from "@/components/layout/logo-animasi";
import { filterToQuery, labelNilai, resolveFilter, SEMUA_TAHAP, type SearchParams } from "@/lib/filter";
import { PerbandinganTahap } from "@/components/dashboard/perbandingan-tahap";
import { getNilaiPerKategori, getNilaiPerTahun, getNilaiPerUnit, getPaketList, getPerbandinganTahap, getRingkasan } from "@/lib/queries";
import { getRingkasanPemeliharaan } from "@/lib/pemeliharaan-ringkasan";
import { formatRupiah, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

function JudulBagian({ icon: Icon, judul, keterangan, href, tautan }: { icon: typeof Activity; judul: string; keterangan: string; href: string; tautan: string }) {
  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold text-navy-800"><Icon className="size-5 text-teal-600" aria-hidden /> {judul}</h2>
        <p className="text-sm text-muted-foreground">{keterangan}</p>
      </div>
      <Button variant="link" size="sm" className="self-start px-0 sm:self-auto" asChild><Link href={href}>{tautan} <ArrowRight /></Link></Button>
    </div>
  );
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const { filter, options } = await resolveFilter(sp);
  const [ringkasan, perTahun, perKategori, perUnit, terbesar, pml, perTahap] = await Promise.all([
    getRingkasan(filter),
    getNilaiPerTahun(filter),
    getNilaiPerKategori(filter),
    getNilaiPerUnit(filter, 8),
    getPaketList({ filter, pageSize: 5, hanyaFinal: true }),
    getRingkasanPemeliharaan(filter.unitTerkunci ? filter.unit : null),
    filter.tahap === SEMUA_TAHAP ? getPerbandinganTahap(filter) : Promise.resolve([]),
  ]);
  const q = filterToQuery(filter);
  const kpis = [
    { label: "Total Nilai Anggaran", value: formatRupiah(ringkasan.totalNilai), hint: labelNilai(filter) },
    { label: "Jumlah Paket", value: formatNumber(ringkasan.jumlahPaket), hint: "baris RKPBU/RKBU alat kesehatan" },
    { label: "Alkes Dipelihara", value: formatNumber(ringkasan.alkesDipelihara), hint: "unit alat dalam rencana pemeliharaan" },
    { label: "Serapan", value: `${ringkasan.realisasiPersen.toFixed(1).replace(".", ",")}%`, hint: `${formatRupiah(ringkasan.nilaiTerserap)} terserap` },
  ];
  const kpiPemeliharaan = [
    { label: "Alat terdaftar", value: formatNumber(pml.alatMedik + pml.alatNon), hint: `${formatNumber(pml.alatMedik)} medik · ${formatNumber(pml.alatNon)} non-medik` },
    { label: "Laporan kerusakan terbuka", value: formatNumber(pml.laporanTerbuka), hint: `${formatNumber(pml.laporanBaru)} baru · ${formatNumber(pml.woAktif)} perintah kerja aktif` },
    { label: "Preventif jatuh tempo", value: formatNumber(pml.preventifTempo), hint: `${formatNumber(pml.preventif30)} lagi dalam 30 hari` },
    { label: "Kalibrasi kedaluwarsa / tidak laik", value: formatNumber(pml.kalKedaluwarsa), hint: `${formatNumber(pml.kalSegera)} habis ≤30 hari · ${formatNumber(pml.kalLaik)} berlaku` },
  ];
  // Akses cepat ke seluruh menu: sub-menu Perencanaan-Pengadaan + menu utama lain (kecuali Dashboard dan menu gabungan itu sendiri).
  const pintasan = [...PERENCANAAN_TABS, ...NAV_ITEMS.filter((n) => n.href !== "/" && !n.match)];
  const denganFilter = new Set(PERENCANAAN_TABS.map((t) => t.href));

  return (
    <>
      <section className="mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-navy-800 via-navy-700 to-teal-800 p-6 text-white shadow-card md:p-10">
        <div className="flex items-center justify-between gap-8">
          <div>
            <p className="mb-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-teal-100">STARS • RSUD Cipayung • Tahun anggaran {filter.tahun}</p>
            <h1 className="max-w-3xl text-2xl font-bold tracking-tight md:text-4xl">
              Sistem Terintegrasi Alat Kesehatan Rumah Sakit - RSUD Cipayung
            </h1>
            <p className="mt-3 max-w-2xl text-navy-100 md:text-lg">
              Pantau perencanaan, pengadaan, dan pemeliharaan alat kesehatan di seluruh unit kerja dalam satu sistem terintegrasi.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="teal" size="lg" asChild><Link href={`/nilai${q}`}><ClipboardList /> Perencanaan-Pengadaan <ArrowRight /></Link></Button>
              <Button size="lg" className="bg-white/10 text-white hover:bg-white/20" asChild><Link href="/pemeliharaan"><Activity /> Pemeliharaan Alat</Link></Button>
            </div>
          </div>
          <div className="hidden shrink-0 xl:block">
            <LogoAnimasi className="w-[360px]" />
          </div>
        </div>
      </section>

      <LaporCta />

      <JudulBagian icon={ClipboardList} judul="Perencanaan-Pengadaan" keterangan="Nilai anggaran dan paket RKPBU/RKBU alat kesehatan" href={`/nilai${q}`} tautan="Buka menu" />
      <FilterBar filter={filter} options={options} />

      <section aria-label="Indikator perencanaan-pengadaan" className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => <StatCard key={k.label} {...k} />)}
      </section>
      {filter.tahap === SEMUA_TAHAP && <PerbandinganTahap data={perTahap} tahun={filter.tahun} />}

      <section className="mb-6 grid gap-4 lg:grid-cols-5">
        <ChartCard className="lg:col-span-3" title="Nilai Anggaran per Tahun dan Tahap" description={filter.unit ? `Unit ${filter.unit}, semua tahun yang tercatat` : "Seluruh unit kerja, semua tahun yang tercatat"}>
          <TahunChart data={perTahun.data} tahapKeys={perTahun.tahapKeys} />
        </ChartCard>
        <ChartCard className="lg:col-span-2" title="Distribusi per Kategori" description={`Porsi nilai menurut kategori, ${labelNilai(filter)}`}>
          <CategoryDonut data={perKategori} />
        </ChartCard>
      </section>

      <section className="mb-10 grid gap-4 xl:grid-cols-5">
        <ChartCard className="xl:col-span-2" title="Nilai per Unit Kerja" description="8 unit kerja dengan nilai tertinggi">
          <BarListChart data={perUnit} />
        </ChartCard>
        <Card className="xl:col-span-3">
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle>Paket Bernilai Terbesar</CardTitle>
              <CardDescription>5 paket dengan nilai tertinggi pada {labelNilai(filter)}</CardDescription>
            </div>
            <Button variant="link" size="sm" asChild><Link href={`/paket${q}`}>Lihat semua</Link></Button>
          </CardHeader>
          <CardContent className="px-0 pb-2"><PackageTable rows={terbesar.data} ringkas /></CardContent>
        </Card>
      </section>

      <JudulBagian icon={Activity} judul="Pemeliharaan Alat" keterangan="Kondisi alat, laporan kerusakan, jadwal preventif, dan kalibrasi (angka agregat)" href="/pemeliharaan" tautan="Buka dashboard pemeliharaan" />
      <section aria-label="Indikator pemeliharaan" className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiPemeliharaan.map((k) => <StatCard key={k.label} {...k} />)}
      </section>

      <h2 className="mb-4 text-lg font-bold text-navy-800">Akses cepat seluruh menu</h2>
      <section aria-label="Pintasan menu" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {pintasan.map((s) => (
          <Link key={s.href} href={denganFilter.has(s.href) ? `${s.href}${q}` : s.href} className="group rounded-xl border bg-card p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md">
            <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-teal-50 text-teal-700"><s.icon className="size-5" /></div>
            <h3 className="font-semibold text-navy-800">{denganFilter.has(s.href) ? `${s.label} · Perencanaan-Pengadaan` : s.label}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-teal-700">Buka <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></span>
          </Link>
        ))}
      </section>
    </>
  );
}
