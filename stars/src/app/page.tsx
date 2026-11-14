import Link from "next/link";
import { Activity, ArrowRight, Bot, ClipboardList, Gauge, Scale, Settings, Thermometer, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { ChartCard } from "@/components/dashboard/chart-card";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { LaporCta } from "@/components/dashboard/lapor-cta";
import { PackageTable } from "@/components/dashboard/package-table";
import { BatangHitung } from "@/components/dashboard/batang-hitung";
import { TahunChart } from "@/components/charts/tahun-chart";
import { CategoryDonut } from "@/components/charts/category-donut";
import { BarListChart } from "@/components/charts/bar-list-chart";
import { BatangStatus, KolomSatuSeri } from "@/components/kalibrasi/grafik";
import { DiagramSiklus } from "@/components/allies/diagram-siklus";
import { StatusSinkron } from "@/components/layout/status-sinkron";
import { NAV_ITEMS, PERENCANAAN_TABS } from "@/lib/nav";
import { LogoAnimasi } from "@/components/layout/logo-animasi";
import { filterToQuery, labelNilai, resolveFilter, SEMUA_TAHAP, type SearchParams } from "@/lib/filter";
import { PerbandinganTahap } from "@/components/dashboard/perbandingan-tahap";
import { getNilaiPerKategori, getNilaiPerTahun, getNilaiPerUnit, getPaketList, getPerbandinganTahap, getRingkasan } from "@/lib/queries";
import { getRingkasanPemeliharaan } from "@/lib/pemeliharaan-ringkasan";
import { ringkasanMonitoring } from "@/lib/monitoring-data";
import { ringkasanLintasMenu } from "@/lib/dashboard-data";
import { ringkasanAllies } from "@/lib/allies";
import { keputusan } from "@/lib/allies-siklus";
import { badgeStatusPermintaan } from "@/lib/pemeliharaan";
import { unitTerkunci } from "@/lib/akses";
import { formatRupiah, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** Urutan bagian = urutan menu di sidebar (About STARS tidak punya data). */
const BAGIAN = [
  { id: "perencanaan", label: "Perencanaan-Pengadaan" },
  { id: "hta", label: "HTA" },
  { id: "pemeliharaan", label: "Pemeliharaan" },
  { id: "kalibrasi", label: "Pengujian & Kalibrasi" },
  { id: "lapor", label: "Lapor Kerusakan" },
  { id: "admin", label: "Data & Admin" },
  { id: "monitoring", label: "Live Monitoring" },
  { id: "allies", label: "ALLIES" },
];

function JudulBagian({ id, icon: Icon, judul, keterangan, href, tautan }: { id: string; icon: typeof Activity; judul: string; keterangan: string; href: string; tautan: string }) {
  return (
    <div id={id} className="muncul mb-5 flex scroll-mt-32 flex-col gap-2 pt-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-navy-800 md:text-3xl">
          <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-navy-700 text-white"><Icon className="size-5" aria-hidden /></span>
          {judul}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground md:text-base">{keterangan}</p>
      </div>
      <Button variant="link" size="sm" className="self-start px-0 sm:self-auto" asChild><Link href={href}>{tautan} <ArrowRight /></Link></Button>
    </div>
  );
}

const tglWib = (iso: string) => new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });

export default async function DashboardPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const { filter, options } = await resolveFilter(sp);
  const kunci = await unitTerkunci();
  const [ringkasan, perTahun, perKategori, perUnit, terbesar, pml, perTahap, mon, lintas, allies] = await Promise.all([
    getRingkasan(filter),
    getNilaiPerTahun(filter),
    getNilaiPerKategori(filter),
    getNilaiPerUnit(filter, 8),
    getPaketList({ filter, pageSize: 5, hanyaFinal: true }),
    getRingkasanPemeliharaan(filter.unitTerkunci ? filter.unit : null),
    filter.tahap === SEMUA_TAHAP ? getPerbandinganTahap(filter) : Promise.resolve([]),
    ringkasanMonitoring(kunci?.id ?? null),
    ringkasanLintasMenu(kunci),
    ringkasanAllies(kunci?.id ?? null),
  ]);
  const q = filterToQuery(filter);
  const kpis = [
    { label: "Total Nilai Anggaran", value: formatRupiah(ringkasan.totalNilai), hint: labelNilai(filter) },
    { label: "Jumlah Paket", value: formatNumber(ringkasan.jumlahPaket), hint: "baris RKPBU/RKBU alat kesehatan" },
    { label: "Alkes Dipelihara", value: formatNumber(ringkasan.alkesDipelihara), hint: "unit alat dalam rencana pemeliharaan" },
    { label: "Serapan", value: `${ringkasan.realisasiPersen.toFixed(1).replace(".", ",")}%`, hint: `${formatRupiah(ringkasan.nilaiTerserap)} terserap · selisih ${formatRupiah(ringkasan.totalNilai - ringkasan.nilaiTerserap)}` },
  ];
  const kpiPemeliharaan = [
    { label: "Alat terdaftar", value: formatNumber(pml.alatMedik + pml.alatNon), hint: `${formatNumber(pml.alatMedik)} medik · ${formatNumber(pml.alatNon)} non-medik` },
    { label: "Laporan kerusakan terbuka", value: formatNumber(pml.laporanTerbuka), hint: `${formatNumber(pml.laporanBaru)} baru · ${formatNumber(pml.woAktif)} perintah kerja aktif` },
    { label: "Preventif jatuh tempo", value: formatNumber(pml.preventifTempo), hint: `${formatNumber(pml.preventif30)} lagi dalam 30 hari` },
    { label: "Alat rusak", value: formatNumber(lintas.kondisi.filter((k) => k.label !== "Baik").reduce((a, k) => a + k.nilai, 0)), hint: "rusak ringan, rusak berat, atau afkir" },
  ];
  const kal = lintas.kalibrasi;
  const kpiMonitoring = [
    { label: "Titik dipantau", value: formatNumber(mon.total), hint: "kulkas, freezer, ruang alat bersensor" },
    { label: "Normal", value: formatNumber(mon.normal), hint: "dalam batas & sensor terhubung" },
    { label: "Alarm aktif", value: formatNumber(mon.alarm), hint: `${formatNumber(mon.belumDiakui)} alarm belum diakui (30 hari)` },
    { label: "Terputus / belum ada data", value: formatNumber(mon.terputus), hint: `${formatNumber(mon.luar)} lainnya di luar batas` },
  ];
  // Akses cepat ke seluruh menu: sub-menu Perencanaan-Pengadaan + menu utama lain (kecuali Dashboard dan menu gabungan itu sendiri).
  const pintasan = [...PERENCANAAN_TABS, ...NAV_ITEMS.filter((n) => n.href !== "/" && !n.match)];
  const denganFilter = new Set(PERENCANAAN_TABS.map((t) => t.href));

  return (
    <>
      {/* Hero */}
      <section className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-navy-900 via-navy-700 to-teal-800 p-6 text-white shadow-card md:p-12">
        <div aria-hidden className="hero-cahaya pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-teal-400/20 blur-3xl" />
        <div className="relative flex items-center justify-between gap-8">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2 animate-in fade-in duration-700 motion-reduce:animate-none">
              <p className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-teal-100">STARS • RSUD Cipayung • Tahun anggaran {filter.tahun}</p>
              <StatusSinkron className="sm:hidden" />
            </div>
            <h1 className="max-w-3xl text-3xl font-extrabold tracking-tight animate-in fade-in slide-in-from-bottom-6 fill-mode-both delay-100 duration-1000 motion-reduce:animate-none md:text-5xl">
              Sistem Terintegrasi Alat Kesehatan Rumah Sakit<span className="block bg-gradient-to-r from-teal-200 to-teal-400 bg-clip-text text-transparent">RSUD Cipayung</span>
            </h1>
            <p className="mt-4 max-w-2xl text-navy-100 animate-in fade-in slide-in-from-bottom-4 fill-mode-both delay-300 duration-1000 motion-reduce:animate-none md:text-lg">
              Satu tempat untuk perencanaan, HTA, pemeliharaan, kalibrasi, laporan kerusakan, monitoring lingkungan, dan agen ALLIES — seluruh siklus alat kesehatan.
            </p>
            <div className="mt-7 flex flex-wrap gap-3 animate-in fade-in slide-in-from-bottom-2 fill-mode-both delay-500 duration-1000 motion-reduce:animate-none">
              <Button variant="teal" size="lg" asChild><Link href={`/nilai${q}`}><ClipboardList /> Perencanaan-Pengadaan <ArrowRight /></Link></Button>
              <Button size="lg" className="bg-white/10 text-white hover:bg-white/20" asChild><Link href="/allies"><Bot /> Tanya ALLIES</Link></Button>
            </div>
          </div>
          <div className="hidden shrink-0 animate-in fade-in zoom-in-90 duration-1000 motion-reduce:animate-none xl:block">
            <LogoAnimasi className="w-[360px]" />
          </div>
        </div>
      </section>

      {/* Navigasi bagian (lengket di bawah header, gaya apple.com) */}
      <nav aria-label="Bagian dashboard" className="sticky top-16 z-10 -mx-4 mb-6 border-b bg-background/85 px-4 py-2 backdrop-blur md:mx-0 md:rounded-full md:border md:px-2 print:hidden">
        <ul className="flex gap-1 overflow-x-auto [scrollbar-width:none]">
          {BAGIAN.map((b) => <li key={b.id}><a href={`#${b.id}`} className="block whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium text-navy-700 transition-colors hover:bg-teal-50 hover:text-teal-800">{b.label}</a></li>)}
        </ul>
      </nav>

      <LaporCta />

      {/* 1. Perencanaan-Pengadaan */}
      <JudulBagian id="perencanaan" icon={ClipboardList} judul="Perencanaan-Pengadaan" keterangan="Nilai anggaran, serapan & selisih, dan paket RKPBU/RKBU alat kesehatan" href={`/nilai${q}`} tautan="Buka menu" />
      <FilterBar filter={filter} options={options} />
      <section aria-label="Indikator perencanaan-pengadaan" className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => <StatCard key={k.label} {...k} />)}
      </section>
      {filter.tahap === SEMUA_TAHAP && <PerbandinganTahap data={perTahap} tahun={filter.tahun} />}
      <section className="mb-6 grid gap-4 lg:grid-cols-5 [&>*]:min-w-0">
        <ChartCard className="lg:col-span-3" title="Nilai Anggaran per Tahun dan Tahap" description={`Pagu, serapan, dan selisih (pagu − serapan) · ${filter.unit ? `unit ${filter.unit}` : "seluruh unit kerja"}, semua tahun yang tercatat`}>
          <TahunChart data={perTahun.data} tahapKeys={perTahun.tahapKeys} />
        </ChartCard>
        <ChartCard className="lg:col-span-2" title="Distribusi per Kategori" description={`Porsi nilai menurut kategori, ${labelNilai(filter)}`}>
          <CategoryDonut data={perKategori} />
        </ChartCard>
      </section>
      <section className="mb-12 grid gap-4 xl:grid-cols-5 [&>*]:min-w-0">
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

      {/* 2. HTA */}
      <JudulBagian id="hta" icon={Scale} judul="HTA" keterangan="Health Technology Assessment — perbandingan merek & tipe alat kesehatan" href="/hta" tautan="Buka HTA (login)" />
      <section aria-label="Indikator HTA" className="mb-12 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Produk (merek & tipe)" value={formatNumber(lintas.hta.produk)} hint="model di inventaris + kandidat" />
        <StatCard label="Jenis alat" value={formatNumber(lintas.hta.jenis)} hint="kelompok jenis alat kesehatan" />
        <StatCard label="Siap dibandingkan" value={formatNumber(lintas.hta.bisaBanding)} hint="jenis dengan ≥ 2 merek/tipe" />
        <StatCard label="Kandidat pengadaan" value={formatNumber(lintas.hta.kandidat)} hint="produk baru dari e-Katalog dll." />
      </section>

      {/* 3. Pemeliharaan */}
      <JudulBagian id="pemeliharaan" icon={Activity} judul="Pemeliharaan Alat" keterangan="Kondisi alat, laporan kerusakan, perintah kerja, dan jadwal preventif" href="/pemeliharaan" tautan="Buka dashboard pemeliharaan" />
      <section aria-label="Indikator pemeliharaan" className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiPemeliharaan.map((k) => <StatCard key={k.label} {...k} />)}
      </section>
      <section className="mb-12 grid gap-4 md:grid-cols-2">
        <Card><CardHeader><CardTitle>Kondisi alat</CardTitle><CardDescription>Alat aktif terdaftar di inventaris</CardDescription></CardHeader><CardContent><BatangHitung data={lintas.kondisi} /></CardContent></Card>
        <Card><CardHeader><CardTitle>Laporan kerusakan menurut status</CardTitle><CardDescription>{formatNumber(lintas.lapor.total)} laporan tercatat</CardDescription></CardHeader><CardContent><BatangHitung data={lintas.lapor.status} warna="bg-amber-500" /></CardContent></Card>
      </section>

      {/* 4. Pengujian & Kalibrasi */}
      <JudulBagian id="kalibrasi" icon={Gauge} judul="Pengujian dan Kalibrasi" keterangan="Status sertifikat, cakupan, dan jatuh tempo pengujian & kalibrasi alat" href="/kalibrasi" tautan="Buka menu" />
      <section aria-label="Indikator kalibrasi" className="mb-4 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Alat wajib uji/kalibrasi" value={formatNumber(kal.total)} hint={`${formatNumber(kal.catatan)} catatan · ${formatNumber(kal.sertifikat)} bersertifikat digital`} />
        <StatCard label="Cakupan berlaku" value={`${(kal.cakupan * 100).toFixed(1).replace(".", ",")}%`} hint="alat dengan catatan yang masih berlaku" />
        <StatCard label="Kedaluwarsa / tidak laik" value={formatNumber(kal.hitung.bermasalah)} hint={`${formatNumber(kal.hitung.belum)} belum pernah diuji`} />
        <StatCard label="Jatuh tempo ≤ 90 hari" value={formatNumber(kal.jatuhTempo90)} hint={`${formatNumber(kal.hitung.segera)} di antaranya ≤ 30 hari`} />
      </section>
      <section className="mb-12 grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
        <Card><CardHeader><CardTitle>Status kalibrasi alat</CardTitle><CardDescription>Dari catatan terbaru tiap alat</CardDescription></CardHeader><CardContent><BatangStatus hitung={kal.hitung} total={kal.total} /></CardContent></Card>
        <Card><CardHeader><CardTitle>Jatuh tempo 12 bulan ke depan</CardTitle><CardDescription>Jumlah alat yang masa berlakunya habis per bulan</CardDescription></CardHeader><CardContent className="pt-4"><KolomSatuSeri data={lintas.kalibrasiBulan} satuan="alat" tinggi={140} /></CardContent></Card>
      </section>

      {/* 5. Lapor Kerusakan */}
      <JudulBagian id="lapor" icon={Wrench} judul="Lapor Kerusakan" keterangan="Laporan alat rusak dari seluruh unit (tanpa data pelapor)" href="/lapor" tautan="Buat laporan" />
      <section className="mb-12 grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
        <Card><CardHeader><CardTitle>Laporan masuk 6 bulan terakhir</CardTitle><CardDescription>Jumlah laporan per bulan (WIB)</CardDescription></CardHeader><CardContent className="pt-4"><KolomSatuSeri data={lintas.lapor.perBulan} satuan="laporan" tinggi={140} /></CardContent></Card>
        <Card>
          <CardHeader><CardTitle>Laporan terbaru</CardTitle><CardDescription>5 laporan terakhir</CardDescription></CardHeader>
          <CardContent>
            {lintas.lapor.terbaru.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">Belum ada laporan.</p> : (
              <ul className="divide-y">
                {lintas.lapor.terbaru.map((l) => (
                  <li key={l.nomor} className="flex items-start justify-between gap-3 py-2.5">
                    <div className="min-w-0"><p className="truncate text-sm font-medium text-navy-800">{l.alat}</p><p className="text-xs text-muted-foreground">{l.nomor} · {l.unit ?? "—"} · {tglWib(l.waktu)}{l.prioritas !== "Normal" ? ` · ${l.prioritas}` : ""}</p></div>
                    <Badge variant={badgeStatusPermintaan[l.status] ?? "default"}>{l.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      {/* 6. Admin / data */}
      <JudulBagian id="admin" icon={Settings} judul="Data & Admin" keterangan="Isi basis data STARS dan kapan terakhir diperbarui" href="/admin" tautan="Buka Admin (login)" />
      <section aria-label="Indikator data" className="mb-12 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Paket RKPBU/RKBU" value={formatNumber(lintas.data.paket)} hint="seluruh tahun & tahap" />
        <StatCard label="Alat di inventaris" value={formatNumber(lintas.data.alat)} hint="termasuk nonaktif" />
        <StatCard label="Dokumen alat" value={formatNumber(lintas.data.dokumenAlat)} hint="BA, kontrak, manual, SOP, dll." />
        <StatCard label="Sertifikat kalibrasi digital" value={formatNumber(lintas.data.sertifikat)} hint="catatan dengan berkas sertifikat" />
      </section>

      {/* 7. Live Monitoring */}
      <JudulBagian id="monitoring" icon={Thermometer} judul="Live Monitoring Lingkungan" keterangan="Suhu & kelembapan alat kesehatan dari sensor IoT, diperbarui real time" href="/monitoring" tautan="Buka live monitoring" />
      {mon.total > 0 ? (
        <section aria-label="Indikator monitoring lingkungan" className="mb-12 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpiMonitoring.map((k) => <StatCard key={k.label} {...k} />)}
        </section>
      ) : (
        <Card className="mb-12"><CardContent className="flex flex-col items-start gap-3 py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">Belum ada titik pantau. Tambahkan kulkas vaksin/darah, freezer, atau ruang alat beserta sensornya.</p>
          <Button variant="outline" asChild><Link href="/admin/monitoring">Atur di Admin → Monitoring</Link></Button>
        </CardContent></Card>
      )}

      {/* 8. ALLIES */}
      <JudulBagian id="allies" icon={Bot} judul="ALLIES" keterangan="Agen pengelolaan alat medik — posisi alat dalam siklus Pre-Market → Post-Market" href="/allies" tautan="Buka ALLIES" />
      <section className="mb-12 grid gap-4 lg:grid-cols-[1.1fr_1fr] [&>*]:min-w-0">
        <Card className="flex items-center justify-center p-2"><DiagramSiklus jumlah={allies.perTahap} /></Card>
        <Card>
          <CardHeader><CardTitle>Kandidat penggantian / penghapusan</CardTitle><CardDescription>{formatNumber(allies.kandidat.length)} alat · {formatNumber(allies.kalibrasi.length)} alat medik perlu tindakan kalibrasi</CardDescription></CardHeader>
          <CardContent>
            {allies.kandidat.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">Belum ada alat yang memenuhi kriteria penggantian.</p> : (
              <ul className="divide-y">
                {allies.kandidat.slice(0, 6).map((a) => (
                  <li key={a.id}>
                    <Link href={`/allies?alat=${encodeURIComponent(a.kode)}#alat`} className="flex items-center justify-between gap-3 py-2.5 hover:bg-slate-50">
                      <span className="min-w-0"><span className="block truncate text-sm font-medium text-navy-800">{a.nama}</span><span className="block truncate text-xs text-muted-foreground">{a.kode} · {a.unit} · {keputusan(a.skor).label}</span></span>
                      <span className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums text-white" style={{ background: keputusan(a.skor).warna }}>{a.skor}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Button variant="teal" className="mt-4 w-full" asChild><Link href="/allies#tanya"><Bot /> Tanya ALLIES</Link></Button>
          </CardContent>
        </Card>
      </section>

      <h2 className="muncul mb-4 text-2xl font-bold tracking-tight text-navy-800">Akses cepat seluruh menu</h2>
      <section aria-label="Pintasan menu" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {pintasan.map((s) => (
          <Link key={s.href} href={denganFilter.has(s.href) ? `${s.href}${q}` : s.href} className="group rounded-xl border bg-card p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md">
            <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-teal-50 text-teal-700 transition-colors group-hover:bg-teal-600 group-hover:text-white"><s.icon className="size-5" /></div>
            <h3 className="font-semibold text-navy-800">{denganFilter.has(s.href) ? `${s.label} · Perencanaan-Pengadaan` : s.label}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-teal-700">Buka <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></span>
          </Link>
        ))}
      </section>
    </>
  );
}
