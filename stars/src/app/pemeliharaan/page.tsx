import type { Metadata } from "next";
import Link from "next/link";
import { Activity, Send, Wrench } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { formatNumber } from "@/lib/utils";
import { batasUnit, getRingkasanPemeliharaan } from "@/lib/pemeliharaan-ringkasan";
import { unitTerkunci } from "@/lib/akses";
import { auth } from "@/auth";
import { adalahKolomInventaris, getInventaris, getUnitInventaris } from "@/lib/inventaris";
import { JENIS_ALAT, KONDISI_ALAT } from "@/lib/pemeliharaan";
import { FILTER_KALIBRASI } from "@/lib/kalibrasi";
import { InventarisAlat, type ParamInventaris } from "@/components/pemeliharaan/inventaris-alat";

export const metadata: Metadata = { title: "Pemeliharaan & Inventaris Alat Kesehatan" };
export const dynamic = "force-dynamic";

/** Daftar batang sederhana (tanpa JS) untuk hitungan. */
function Batang({ data, warna = "bg-teal-500" }: { data: { label: string; nilai: number }[]; warna?: string }) {
  const maks = Math.max(1, ...data.map((d) => d.nilai));
  if (data.every((d) => d.nilai === 0)) return <p className="py-6 text-center text-sm text-muted-foreground">Belum ada data.</p>;
  return (
    <ul className="space-y-2">
      {data.map((d) => (
        <li key={d.label} className="grid grid-cols-[7rem_1fr_2.5rem] items-center gap-2 text-sm">
          <span className="truncate text-muted-foreground">{d.label}</span>
          <span className="h-3 overflow-hidden rounded-full bg-muted"><span className={`block h-full rounded-full ${warna}`} style={{ width: `${(d.nilai / maks) * 100}%` }} /></span>
          <span className="text-right tabular-nums font-medium text-navy-800">{formatNumber(d.nilai)}</span>
        </li>
      ))}
    </ul>
  );
}

type Sp = Record<string, string | string[] | undefined>;
const satu = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
const pilih = <T extends string>(v: string, daftar: readonly T[]) => ((daftar as readonly string[]).includes(v) ? v : "");

export default async function PemeliharaanPublikPage({ searchParams }: { searchParams: Promise<Sp> }) {
  const sp = await searchParams;
  const kunci = await unitTerkunci();
  const b = batasUnit(kunci?.nama);
  const urut = satu(sp.urut);
  const pInv: ParamInventaris = {
    q: satu(sp.q).slice(0, 100), unit: satu(sp.unit).slice(0, 100), jenis: pilih(satu(sp.jenis), JENIS_ALAT), kondisi: pilih(satu(sp.kondisi), KONDISI_ALAT),
    kal: pilih(satu(sp.kal), FILTER_KALIBRASI.map((f) => f.kode)), urut: adalahKolomInventaris(urut) ? urut : "unit", arah: satu(sp.arah) === "desc" ? "desc" : "asc",
  };
  const [r, kondisi, permintaanStatus, perintahStatus, woSelesaiTautan, inventaris, unitOpsi, sesi] = await Promise.all([
    getRingkasanPemeliharaan(kunci?.nama),
    prisma.alat.groupBy({ by: ["kondisi"], where: { ...b.alat, aktif: true }, _count: { _all: true } }),
    prisma.permintaanKerja.groupBy({ by: ["status"], where: b.permintaan, _count: { _all: true } }),
    prisma.perintahKerja.groupBy({ by: ["status"], where: b.perintah, _count: { _all: true } }),
    prisma.perintahKerja.findMany({ where: { ...b.perintah, status: "Selesai", permintaanId: { not: null }, tanggalSelesai: { not: null } }, select: { createdAt: true, tanggalSelesai: true, permintaan: { select: { createdAt: true } } }, take: 500, orderBy: { tanggalSelesai: "desc" } }),
    getInventaris({ kunci: kunci?.nama, ...pInv, page: Number(satu(sp.page)) || 1, pageSize: 25 }),
    kunci ? Promise.resolve([]) : getUnitInventaris(),
    auth(),
  ]);
  const hitung = <K extends string>(rows: (Record<K, string> & { _count: { _all: number } })[], kunci: K, nilai: string) => rows.find((r) => r[kunci] === nilai)?._count._all ?? 0;
  const kond = ["Baik", "Rusak Ringan", "Rusak Berat", "Afkir"].map((k) => ({ label: k, nilai: hitung(kondisi, "kondisi", k) }));
  const permintaan = ["Baru", "Ditinjau", "Diproses", "Selesai", "Ditolak"].map((k) => ({ label: k, nilai: hitung(permintaanStatus, "status", k) }));
  const perintah = ["Terbuka", "Dikerjakan", "Selesai", "Batal"].map((k) => ({ label: k, nilai: hitung(perintahStatus, "status", k) }));
  const rataRespon = woSelesaiTautan.length ? woSelesaiTautan.reduce((a, w) => a + (w.createdAt.getTime() - w.permintaan!.createdAt.getTime()), 0) / woSelesaiTautan.length / 3_600_000 : null;
  const rataSelesai = woSelesaiTautan.length ? woSelesaiTautan.reduce((a, w) => a + (w.tanggalSelesai!.getTime() - w.createdAt.getTime()), 0) / woSelesaiTautan.length / 3_600_000 : null;
  const jam = (h: number | null) => (h === null ? "—" : h < 48 ? `${h.toFixed(1).replace(".", ",")} jam` : `${(h / 24).toFixed(1).replace(".", ",")} hari`);

  return (
    <>
      <PageHeader
        title="Dashboard Pemeliharaan Alat"
        description={`Ringkasan kondisi alat, laporan kerusakan, perintah kerja, jadwal preventif, dan kalibrasi${kunci ? ` untuk unit ${kunci.nama}` : ""}, beserta Inventaris Alat Kesehatan dan QR tiap alat. Data pelapor tidak ditampilkan.`}
        actions={<div className="flex gap-2"><Button variant="teal" asChild><Link href="/lapor"><Send /> Lapor Kerusakan</Link></Button><Button variant="outline" asChild><Link href="/admin/pemeliharaan"><Wrench /> Kelola (login)</Link></Button></div>}
      />
      <section aria-label="Indikator" className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Alat medik" value={formatNumber(r.alatMedik)} hint={`${formatNumber(r.alatNon)} alat non-medik`} />
        <StatCard label="Laporan belum selesai" value={formatNumber(r.laporanTerbuka)} hint={`${formatNumber(r.laporanBaru)} baru belum ditinjau`} />
        <StatCard label="Preventif jatuh tempo" value={formatNumber(r.preventifTempo)} hint={`${formatNumber(r.preventif30)} lagi dalam 30 hari`} />
        <StatCard label="Kalibrasi kedaluwarsa / tidak laik" value={formatNumber(r.kalKedaluwarsa)} hint={`${formatNumber(r.kalSegera)} habis ≤30 hari · ${formatNumber(r.kalLaik)} berlaku`} />
      </section>
      <section className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card><CardHeader><CardTitle>Kondisi alat</CardTitle><CardDescription>{formatNumber(r.alatMedik + r.alatNon)} alat aktif terdaftar</CardDescription></CardHeader><CardContent><Batang data={kond} /></CardContent></Card>
        <Card><CardHeader><CardTitle>Laporan kerusakan</CardTitle><CardDescription>Menurut status</CardDescription></CardHeader><CardContent><Batang data={permintaan} warna="bg-amber-500" /></CardContent></Card>
        <Card><CardHeader><CardTitle>Perintah kerja</CardTitle><CardDescription>Menurut status</CardDescription></CardHeader><CardContent><Batang data={perintah} warna="bg-navy-700" /></CardContent></Card>
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Activity className="size-4 text-teal-700" /> Waktu tanggap rata-rata</CardTitle><CardDescription>Dari laporan masuk sampai perintah kerja dibuat ({formatNumber(woSelesaiTautan.length)} WO selesai)</CardDescription></CardHeader><CardContent><p className="text-3xl font-bold text-navy-800">{jam(rataRespon)}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Activity className="size-4 text-teal-700" /> Waktu penyelesaian rata-rata</CardTitle><CardDescription>Dari perintah kerja dibuat sampai selesai</CardDescription></CardHeader><CardContent><p className="text-3xl font-bold text-navy-800">{jam(rataSelesai)}</p></CardContent></Card>
      </section>
      <InventarisAlat hasil={inventaris} p={pInv} unitOpsi={unitOpsi} kunci={kunci?.nama ?? null} bolehLabel={Boolean(sesi?.user)} />
    </>
  );
}
