import type { Metadata } from "next";
import Link from "next/link";
import { BellRing, Filter, Settings2, Thermometer } from "lucide-react";
import { auth } from "@/auth";
import { unitTerkunci } from "@/lib/akses";
import { alarmPerluTindakan, dataDashboard } from "@/lib/monitoring-data";
import { durasi, fNilai, LABEL_ALARM, LABEL_STATUS, NAMA_JENIS, PERINGKAT_STATUS, tglJamWib, type JenisAlarm, type KunciStatusPantau } from "@/lib/monitoring";
import { cukup } from "@/lib/peran";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { KartuLokasiPantau } from "@/components/monitoring/kartu-lokasi";
import { PemantauLangsung, type AlarmPemberitahuan } from "@/components/monitoring/pemantau-langsung";
import { LencanaStatus } from "@/components/monitoring/grafik";
import { formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Live Medical Device Environmental Monitoring System" };
export const dynamic = "force-dynamic";

type Sp = Record<string, string | string[] | undefined>;
const satu = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
const STATUS_FILTER: KunciStatusPantau[] = ["alarm", "putus", "luar", "normal", "belum"];

export default async function MonitoringPage({ searchParams }: { searchParams: Promise<Sp> }) {
  const sp = await searchParams;
  const [kunci, sesi] = await Promise.all([unitTerkunci(), auth()]);
  const kini = Date.now();
  const [kartu, alarm] = await Promise.all([dataDashboard({ unitId: kunci?.id ?? null }, kini), alarmPerluTindakan({ unitId: kunci?.id ?? null }, kini)]);
  const fStatus = STATUS_FILTER.includes(satu(sp.status) as KunciStatusPantau) ? (satu(sp.status) as KunciStatusPantau) : "";
  const fJenis = NAMA_JENIS.includes(satu(sp.jenis)) ? satu(sp.jenis) : "";
  const unitAda = [...new Set(kartu.map((k) => k.unit).filter((u): u is string => !!u))].sort((a, b) => a.localeCompare(b, "id"));
  const fUnit = unitAda.includes(satu(sp.unit)) ? satu(sp.unit) : "";
  const tampil = kartu
    .filter((k) => (!fStatus || k.status.kunci === fStatus) && (!fJenis || k.jenis === fJenis) && (!fUnit || k.unit === fUnit))
    .sort((a, b) => PERINGKAT_STATUS[a.status.kunci] - PERINGKAT_STATUS[b.status.kunci] || a.kode.localeCompare(b.kode));
  const hitung = (s: KunciStatusPantau) => kartu.filter((k) => k.status.kunci === s).length;
  const alarmAktif = kartu.reduce((n, k) => n + k.alarmTerbuka.length, 0);
  const pemberitahuan: AlarmPemberitahuan[] = [
    ...alarm.filter((a) => !a.diakui && a.jenis !== "putus").map((a) => ({ id: a.id, teks: `${a.lokasi.nama}: ${LABEL_ALARM[a.jenis as JenisAlarm] ?? a.jenis}` })),
    ...kartu.filter((k) => k.status.putus).map((k) => ({ id: -k.id, teks: `${k.nama}: sensor terputus` })),
  ];
  const bolehKelola = cukup(sesi?.user?.peran, "Viewer");
  const adaFilter = Boolean(fStatus || fJenis || fUnit);

  return (
    <>
      <PageHeader
        title="Live Medical Device Environmental Monitoring System"
        description={`Pemantauan suhu & kelembapan alat kesehatan${kunci ? ` unit ${kunci.nama}` : " RSUD Cipayung"} secara real time dari sensor IoT — kulkas vaksin/obat, kulkas darah, freezer, dan ruang alat. Alarm berbunyi bila nilai keluar batas beberapa bacaan berturut-turut; sensor yang berhenti mengirim data ditandai terputus.`}
        actions={<Button variant="teal" asChild><Link href="/admin/monitoring"><Settings2 /> {bolehKelola ? "Kelola" : "Kelola (login)"}</Link></Button>}
      />

      <PemantauLangsung waktuServer={new Date(kini).toISOString()} alarm={pemberitahuan} />

      <section aria-label="Indikator" className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Titik dipantau" value={formatNumber(kartu.length)} hint={`${formatNumber(kartu.filter((k) => k.sensor).length)} bersensor`} />
        <StatCard label="Normal" value={formatNumber(hitung("normal"))} hint="dalam batas & sensor terhubung" />
        <StatCard label="Alarm aktif" value={formatNumber(alarmAktif)} hint={`${formatNumber(hitung("luar"))} lainnya di luar batas (menunggu konfirmasi)`} />
        <StatCard label="Terputus / belum ada data" value={formatNumber(kartu.filter((k) => k.status.putus).length + hitung("belum"))} hint="sensor tidak mengirim data" />
      </section>

      {kartu.length > 0 && (
        <form method="get" className="mb-6 flex flex-wrap items-end gap-3 print:hidden" aria-label="Saring titik pantau">
          <label className="grid min-w-[9rem] gap-1 text-xs font-medium text-muted-foreground">Status
            <Select name="status" defaultValue={fStatus}>
              <option value="">Semua status</option>
              {STATUS_FILTER.map((s) => <option key={s} value={s}>{LABEL_STATUS[s]} ({hitung(s)})</option>)}
            </Select>
          </label>
          <label className="grid min-w-[9rem] gap-1 text-xs font-medium text-muted-foreground">Jenis
            <Select name="jenis" defaultValue={fJenis}>
              <option value="">Semua jenis</option>
              {NAMA_JENIS.filter((j) => kartu.some((k) => k.jenis === j)).map((j) => <option key={j} value={j}>{j}</option>)}
            </Select>
          </label>
          {!kunci && unitAda.length > 1 && (
            <label className="grid min-w-[11rem] gap-1 text-xs font-medium text-muted-foreground">Unit
              <Select name="unit" defaultValue={fUnit}>
                <option value="">Semua unit</option>
                {unitAda.map((u) => <option key={u} value={u}>{u}</option>)}
              </Select>
            </label>
          )}
          <Button type="submit" variant="outline"><Filter /> Terapkan</Button>
          {adaFilter && <Button variant="ghost" asChild><Link href="/monitoring">Reset</Link></Button>}
        </form>
      )}

      {alarm.length > 0 && (
        <Card className="mb-6 overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BellRing className="size-4 text-red-600" /> Perlu tindakan</CardTitle>
            <CardDescription>Alarm yang masih berlangsung atau belum diakui petugas (30 hari terakhir). Pengakuan & catatan insiden diisi di halaman lokasi.</CardDescription>
          </CardHeader>
          <ul className="divide-y border-t sm:hidden">
            {alarm.slice(0, 15).map((a) => (
              <li key={a.id} className="grid gap-1 px-4 py-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/monitoring/${a.lokasi.kode}#alarm`} className="font-medium text-navy-800 hover:text-teal-700 hover:underline">{a.lokasi.nama}</Link>
                  {a.diakui ? <LencanaStatus kunci="normal" label="Diakui" /> : <LencanaStatus kunci="luar" label="Belum diakui" />}
                </div>
                <p className="text-navy-800">{LABEL_ALARM[a.jenis as JenisAlarm] ?? a.jenis}{a.puncak != null ? ` · puncak ${fNilai(a.jenis.startsWith("suhu") ? "suhu" : "lembap", a.puncak)}` : ""}</p>
                <p className="text-xs text-muted-foreground">{a.lokasi.kode} · mulai {tglJamWib(a.mulai)} · {a.selesai ? `selesai, ${durasi(Date.parse(a.selesai) - Date.parse(a.mulai))}` : <strong className="text-red-700">berlangsung {durasi(kini - Date.parse(a.mulai))}</strong>}</p>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto border-t sm:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Lokasi</TableHead><TableHead>Kejadian</TableHead><TableHead>Mulai</TableHead><TableHead>Durasi</TableHead><TableHead className="text-right">Puncak</TableHead><TableHead>Pengakuan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alarm.slice(0, 15).map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="max-w-[14rem]"><Link href={`/monitoring/${a.lokasi.kode}#alarm`} className="font-medium text-navy-800 hover:text-teal-700 hover:underline">{a.lokasi.nama}</Link><div className="text-xs text-muted-foreground">{a.lokasi.kode}</div></TableCell>
                    <TableCell className="whitespace-nowrap">{LABEL_ALARM[a.jenis as JenisAlarm] ?? a.jenis}</TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums">{tglJamWib(a.mulai)}</TableCell>
                    <TableCell className="whitespace-nowrap">{a.selesai ? durasi(Date.parse(a.selesai) - Date.parse(a.mulai)) : <strong className="text-red-700">Berlangsung · {durasi(kini - Date.parse(a.mulai))}</strong>}</TableCell>
                    <TableCell className="text-right tabular-nums">{a.puncak != null ? fNilai(a.jenis.startsWith("suhu") ? "suhu" : "lembap", a.puncak) : "–"}</TableCell>
                    <TableCell>{a.diakui ? <LencanaStatus kunci="normal" label="Diakui" /> : <LencanaStatus kunci="luar" label="Belum diakui" />}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {alarm.length > 15 && <p className="border-t px-4 py-2 text-xs text-muted-foreground">+{alarm.length - 15} alarm lain — lihat Admin → Monitoring → Alarm.</p>}
        </Card>
      )}

      {kartu.length === 0 ? (
        <Card>
          <CardContent className="grid place-items-center gap-3 py-14 text-center">
            <Thermometer className="size-10 text-teal-600" aria-hidden />
            <p className="max-w-md text-sm text-muted-foreground">Belum ada titik pantau. Tambahkan lokasi (mis. kulkas vaksin farmasi), daftarkan sensornya, lalu sensor mengirim data ke STARS — atau impor berkas ekspor data logger.</p>
            <Button variant="teal" asChild><Link href="/admin/monitoring">Atur di Admin → Monitoring</Link></Button>
          </CardContent>
        </Card>
      ) : tampil.length === 0 ? (
        <p className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">Tidak ada titik pantau yang cocok dengan saringan. <Link href="/monitoring" className="font-medium text-teal-700 underline">Tampilkan semua</Link></p>
      ) : (
        <section aria-label="Titik pantau" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {tampil.map((k) => <KartuLokasiPantau key={k.id} k={k} />)}
        </section>
      )}

      <p className="mt-6 text-xs text-muted-foreground">
        Pita warna: biru = di bawah batas, hijau = dalam batas aman, merah = di atas batas. Status &ldquo;Di luar batas&rdquo; berarti nilai terakhir sudah keluar batas tetapi belum mencapai jumlah bacaan berturut-turut untuk menjadi alarm.
      </p>
    </>
  );
}
