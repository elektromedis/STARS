import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, BarChart3, BatteryMedium, CalendarDays, Download, FileSpreadsheet, Radio, Settings2, Siren, TableProperties } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { unitTerkunci } from "@/lib/akses";
import { cukup } from "@/lib/peran";
import { bacaRentang, halamanBacaan, PRESET_RENTANG, ringkasanHarian, seriGrafik, statistik, type StatParameter } from "@/lib/monitoring-data";
import { durasi, fNilai, fRentang, hariWib, LABEL_ALARM, relatif, sesiSekarang, statusLokasi, tglJamWib, type JenisAlarm, type Parameter } from "@/lib/monitoring";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/dashboard/page-header";
import { Pagination } from "@/components/dashboard/pagination";
import { GrafikGaris, KeteranganZona, LencanaStatus, MeterRentang } from "@/components/monitoring/grafik";
import { KalenderHarian } from "@/components/monitoring/kalender-harian";
import { PemantauLangsung } from "@/components/monitoring/pemantau-langsung";
import { AkuiAlarm, TombolCetak, TombolInspeksi } from "@/components/monitoring/aksi";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
type Sp = Record<string, string | string[] | undefined>;
const satu = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() ?? "";

async function ambilLokasi(kode: string) {
  if (!/^[\w-]{1,30}$/.test(kode)) return null;
  return prisma.lokasiPantau.findUnique({
    where: { kode },
    include: { unitKerja: { select: { nama: true } }, alat: { select: { kode: true, nama: true } }, sensor: true, _count: { select: { alarm: { where: { selesai: null, jenis: { not: "putus" } } } } } },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ kode: string }> }): Promise<Metadata> {
  const l = await ambilLokasi((await params).kode);
  return { title: l ? `${l.nama} — Monitoring` : "Monitoring" };
}

const persen = (a: number, b: number) => (b > 0 ? `${((a / b) * 100).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%` : "–");

function KotakStat({ label, nilai, ket, tegas }: { label: string; nilai: string; ket?: string; tegas?: boolean }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 flex items-center gap-1 text-lg font-bold text-navy-800">{tegas && <AlertTriangle className="size-4 shrink-0 text-red-600" aria-label="melewati batas" />}{nilai}</p>
      {ket && <p className="text-[11px] text-muted-foreground">{ket}</p>}
    </div>
  );
}

function StatParam({ p, s, batas }: { p: Parameter; s: StatParameter & { mkt?: number | null }; batas: [number | null, number | null] }) {
  if (s.jumlah === 0) return null;
  const luar = s.msDiatas + s.msDibawah;
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-navy-800">{p === "suhu" ? "Suhu" : "Kelembapan"} <span className="font-normal text-muted-foreground">· batas {fRentang(batas[0], batas[1], p)}</span></h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        <KotakStat label="Minimum" nilai={fNilai(p, s.min)} ket={s.minPada ? tglJamWib(s.minPada) : undefined} tegas={batas[0] != null && s.min != null && s.min < batas[0]} />
        <KotakStat label="Maksimum" nilai={fNilai(p, s.maks)} ket={s.maksPada ? tglJamWib(s.maksPada) : undefined} tegas={batas[1] != null && s.maks != null && s.maks > batas[1]} />
        <KotakStat label="Rata-rata" nilai={fNilai(p, s.rata, p === "suhu" ? 2 : 1)} />
        {p === "suhu" && <KotakStat label="MKT" nilai={fNilai("suhu", s.mkt ?? null, 2)} ket="Mean Kinetic Temperature" />}
        <KotakStat label="Dalam batas" nilai={batas[0] == null && batas[1] == null ? "–" : persen(s.msTotal - luar, s.msTotal)} ket={`dari ${durasi(s.msTotal)} terekam`} />
        <KotakStat label="Di atas batas" nilai={durasi(s.msDiatas)} tegas={s.msDiatas > 0} />
        <KotakStat label="Di bawah batas" nilai={durasi(s.msDibawah)} tegas={s.msDibawah > 0} />
      </div>
    </div>
  );
}

export default async function DetailMonitoringPage({ params, searchParams }: { params: Promise<{ kode: string }>; searchParams: Promise<Sp> }) {
  const [{ kode }, sp] = await Promise.all([params, searchParams]);
  const [l, kunci, sesi] = await Promise.all([ambilLokasi(kode), unitTerkunci(), auth()]);
  if (!l || (kunci && l.unitKerjaId !== kunci.id)) notFound();
  const kini = Date.now();
  const rg = bacaRentang({ r: satu(sp.r) || undefined, dari: satu(sp.dari) || undefined, sampai: satu(sp.sampai) || undefined }, kini);
  const hariIni = hariWib(kini);
  const bulan = /^\d{4}-(0[1-9]|1[0-2])$/.test(satu(sp.bulan)) && satu(sp.bulan) <= hariIni.slice(0, 7) ? satu(sp.bulan) : hariIni.slice(0, 7);
  const halaman = Math.max(1, Number(satu(sp.page)) || 1);
  const masuk = Boolean(sesi?.user);
  const bolehUbah = cukup(sesi?.user?.peran, "Operator") && process.env.STARS_MODE !== "internet";
  const batas = { suhuMin: l.suhuMin, suhuMaks: l.suhuMaks, lembapMin: l.lembapMin, lembapMaks: l.lembapMaks };

  const [seri, stat, hari, alarm, tabel, inspeksiKini] = await Promise.all([
    seriGrafik(l.id, rg.dari, rg.sampai),
    statistik(l.id, rg.dari, rg.sampai, batas, l.batasPutusMenit),
    ringkasanHarian(l.id, bulan, masuk),
    prisma.alarmPantau.findMany({
      where: { lokasiId: l.id, OR: [{ selesai: null }, { mulai: { gte: new Date(rg.dari) } }, { selesai: { gte: new Date(rg.dari) } }] },
      orderBy: { mulai: "desc" }, take: 100,
    }),
    halamanBacaan(l.id, rg.dari, rg.sampai, halaman),
    prisma.inspeksiPantau.findUnique({ where: { lokasiId_tanggal_sesi: { lokasiId: l.id, tanggal: hariIni, sesi: sesiSekarang(kini) } } }),
  ]);
  const st = statusLokasi(l, l._count.alarm, kini);
  const adaLembap = l.lembapMin != null || l.lembapMaks != null || stat.lembap.jumlah > 0 || l.terakhirLembap != null;
  const adaSuhu = l.suhuMin != null || l.suhuMaks != null || stat.suhu.jumlah > 0 || l.terakhirSuhu != null || !adaLembap;
  const qRentang = new URLSearchParams(rg.kode === "kustom" ? { dari: satu(sp.dari), ...(satu(sp.sampai) ? { sampai: satu(sp.sampai) } : {}) } : rg.kode === "24j" ? {} : { r: rg.kode });
  const hrefDengan = (tambah: Record<string, string>) => { const q = new URLSearchParams(qRentang); for (const [k, v] of Object.entries(tambah)) q.set(k, v); return `?${q.toString()}`; };
  const celahMs = Math.max(seri.ukuranMs * 3, (l.batasPutusMenit > 0 ? l.batasPutusMenit : 120) * 60_000);
  const titik = (p: Parameter) => seri.titik.map((x) => (p === "suhu" ? { t: x.t, v: x.s, vMin: x.sMin, vMaks: x.sMaks } : { t: x.t, v: x.l, vMin: x.lMin, vMaks: x.lMaks }));
  const pemberitahuan = alarm.filter((a) => !a.diakuiPada && a.jenis !== "putus").map((a) => ({ id: a.id, teks: `${l.nama}: ${LABEL_ALARM[a.jenis as JenisAlarm] ?? a.jenis}` }));
  if (st.putus) pemberitahuan.push({ id: -l.id, teks: `${l.nama}: sensor terputus` });
  const tglInput = (ms: number) => hariWib(ms);

  return (
    <>
      <div className="mb-2 print:hidden"><Link href="/monitoring" className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:underline"><ArrowLeft className="size-4" /> Semua titik pantau</Link></div>
      <PageHeader
        title={l.nama}
        description={`${l.kode} · ${l.jenis}${l.unitKerja ? ` · ${l.unitKerja.nama}` : ""}${l.penanggungJawab ? ` · penanggung jawab ${l.penanggungJawab}` : ""}${l.deskripsi ? ` — ${l.deskripsi}` : ""}`}
        actions={<div className="flex flex-wrap gap-2 print:hidden">
          <Button variant="outline" asChild><a href={`/api/monitoring/${l.kode}/ekspor?format=csv${qRentang.toString() ? `&${qRentang}` : ""}`}><Download /> CSV</a></Button>
          <Button variant="outline" asChild><a href={`/api/monitoring/${l.kode}/ekspor?format=xlsx${qRentang.toString() ? `&${qRentang}` : ""}`}><FileSpreadsheet /> Excel</a></Button>
          <TombolCetak />
          <Button variant="teal" asChild><Link href={`/admin/monitoring?lokasi=${l.id}`}><Settings2 /> {masuk ? "Kelola" : "Kelola (login)"}</Link></Button>
        </div>}
      />
      <p className="mb-4 hidden text-xs text-muted-foreground print:block">Laporan STARS · dicetak {tglJamWib(kini)} WIB · rentang {rg.label} ({tglJamWib(rg.dari)} – {tglJamWib(rg.sampai)})</p>

      {rg.langsung && <PemantauLangsung waktuServer={new Date(kini).toISOString()} alarm={pemberitahuan} intervalDetik={30} />}

      <Card className="mb-6">
        <CardContent className="grid gap-5 p-5 md:grid-cols-[1fr_1fr_1.2fr]">
          {adaSuhu && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Suhu terkini</p>
              <p className="mt-1 text-4xl font-bold text-navy-800">{fNilai("suhu", l.terakhirSuhu)}</p>
              <MeterRentang nilai={l.terakhirSuhu} min={l.suhuMin} maks={l.suhuMaks} parameter="suhu" />
            </div>
          )}
          {adaLembap && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Kelembapan terkini</p>
              <p className="mt-1 text-4xl font-bold text-navy-800">{fNilai("lembap", l.terakhirLembap)}</p>
              <MeterRentang nilai={l.terakhirLembap} min={l.lembapMin} maks={l.lembapMaks} parameter="lembap" />
            </div>
          )}
          <div className="grid content-start gap-2 text-sm">
            <div className="flex flex-wrap items-center gap-2"><LencanaStatus kunci={st.kunci} besar />{st.putus && st.kunci !== "putus" && <LencanaStatus kunci="putus" besar />}<span className="text-muted-foreground">diperbarui {relatif(st.menitSejak)}</span></div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              <dt className="text-muted-foreground">Batas suhu</dt><dd>{fRentang(l.suhuMin, l.suhuMaks, "suhu")}</dd>
              {adaLembap && <><dt className="text-muted-foreground">Batas lembap</dt><dd>{fRentang(l.lembapMin, l.lembapMaks, "lembap")}</dd></>}
              <dt className="text-muted-foreground">Alarm setelah</dt><dd>{l.tundaAlarm} bacaan berturut-turut</dd>
              <dt className="text-muted-foreground">Terputus bila</dt><dd>{l.batasPutusMenit > 0 ? `tanpa data > ${l.batasPutusMenit} menit` : "tidak dipantau"}</dd>
              <dt className="text-muted-foreground">Sensor</dt>
              <dd className="flex flex-wrap items-center gap-x-2">{l.sensor ? <><span className="inline-flex items-center gap-1"><Radio className="size-3.5" aria-hidden />{l.sensor.serial}{l.sensor.model ? ` (${l.sensor.model})` : ""}</span>{l.sensor.baterai != null && <span className={cn("inline-flex items-center gap-1", l.sensor.baterai < 20 && "font-semibold text-red-700")}><BatteryMedium className="size-3.5" aria-hidden />{Math.round(l.sensor.baterai)}%</span>}{l.sensor.sinyal != null && <span>{l.sensor.sinyal} dBm</span>}</> : "belum terpasang"}</dd>
              {l.alat && <><dt className="text-muted-foreground">Alat</dt><dd><Link href={`/alat?kode=${encodeURIComponent(l.alat.kode)}`} className="text-teal-700 hover:underline">{l.alat.nama} ({l.alat.kode})</Link></dd></>}
            </dl>
          </div>
        </CardContent>
      </Card>

      <form method="get" className="mb-6 flex flex-wrap items-end gap-2 print:hidden" aria-label="Rentang waktu">
        <div role="group" aria-label="Rentang cepat" className="flex flex-wrap rounded-lg border bg-card p-1 text-sm">
          {PRESET_RENTANG.map((p) => (
            <Link key={p.kode} href={p.kode === "24j" ? "?" : `?r=${p.kode}`} scroll={false} aria-current={rg.kode === p.kode ? "true" : undefined}
              className={cn("rounded-md px-3 py-1.5 font-medium", rg.kode === p.kode ? "bg-navy-800 text-white" : "text-muted-foreground hover:bg-muted")}>{p.label}</Link>
          ))}
        </div>
        <label className="grid gap-1 text-xs font-medium text-muted-foreground">Dari<Input type="date" name="dari" defaultValue={tglInput(rg.dari)} max={hariIni} className="h-9" /></label>
        <label className="grid gap-1 text-xs font-medium text-muted-foreground">Sampai<Input type="date" name="sampai" defaultValue={tglInput(rg.sampai - 1)} max={hariIni} className="h-9" /></label>
        <Button type="submit" variant="outline" size="sm" className="h-9">Terapkan</Button>
        <span className="text-xs text-muted-foreground">Menampilkan {rg.label} · {stat.jumlah.toLocaleString("id-ID")} bacaan</span>
      </form>

      <Card className="mb-6">
        <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="size-4 text-teal-700" /> Ringkasan statistik</CardTitle>
          <CardDescription>{stat.awal ? `${tglJamWib(stat.awal)} – ${tglJamWib(stat.akhir!)} WIB` : "Belum ada bacaan pada rentang ini"} · Durasi dihitung dari selisih antar-bacaan (celah &gt; batas putus tidak dihitung). MKT memakai ΔH/R 10.000 K.</CardDescription></CardHeader>
        <CardContent className="grid gap-5">
          {adaSuhu && <StatParam p="suhu" s={stat.suhu} batas={[l.suhuMin, l.suhuMaks]} />}
          {adaLembap && <StatParam p="lembap" s={stat.lembap} batas={[l.lembapMin, l.lembapMaks]} />}
          {Object.keys(stat.alarm).length > 0 && <p className="text-sm text-navy-800"><Siren className="mr-1 inline size-4 text-red-600" aria-hidden />Alarm pada rentang ini: {Object.entries(stat.alarm).map(([j, n]) => `${LABEL_ALARM[j as JenisAlarm] ?? j} ${n}×`).join(" · ")}</p>}
          {stat.jumlah === 0 && <p className="text-sm text-muted-foreground">Belum ada bacaan pada rentang ini.</p>}
        </CardContent>
      </Card>

      <div className="mb-6 grid gap-6 [&>*]:min-w-0">
        {adaSuhu && (
          <Card className="break-inside-avoid">
            <CardHeader><CardTitle>Grafik suhu</CardTitle><CardDescription>{seri.mode === "agregat" ? `Rata-rata per ${durasi(seri.ukuranMs)} dengan pita min–maks.` : "Setiap bacaan sensor."} Arahkan kursor (atau fokus lalu tombol panah) untuk melihat nilai.</CardDescription></CardHeader>
            <CardContent>
              <GrafikGaris titik={titik("suhu")} parameter="suhu" min={l.suhuMin} maks={l.suhuMaks} dari={rg.dari} sampai={rg.sampai} celahMs={celahMs} judul={`Suhu ${l.nama}`} />
              <KeteranganZona parameter="suhu" adaPita={seri.mode === "agregat"} />
            </CardContent>
          </Card>
        )}
        {adaLembap && (
          <Card className="break-inside-avoid">
            <CardHeader><CardTitle>Grafik kelembapan</CardTitle><CardDescription>{seri.mode === "agregat" ? `Rata-rata per ${durasi(seri.ukuranMs)} dengan pita min–maks.` : "Setiap bacaan sensor."}</CardDescription></CardHeader>
            <CardContent>
              <GrafikGaris titik={titik("lembap")} parameter="lembap" min={l.lembapMin} maks={l.lembapMaks} dari={rg.dari} sampai={rg.sampai} celahMs={celahMs} judul={`Kelembapan ${l.nama}`} tinggi={220} />
              <KeteranganZona parameter="lembap" adaPita={seri.mode === "agregat"} />
            </CardContent>
          </Card>
        )}
      </div>

      <Card className="mb-6 break-inside-avoid">
        <CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="size-4 text-teal-700" /> Ringkasan harian</CardTitle>
          <CardDescription>Min/maks harian, hari beralarm, dan inspeksi pagi/sore petugas (seperti Day Summary LogTag).</CardDescription></CardHeader>
        <CardContent className="grid gap-4">
          {bolehUbah && l.aktif && <div className="print:hidden"><TombolInspeksi lokasiId={l.id} sesi={sesiSekarang(kini)} sudahOleh={inspeksiKini?.oleh ?? null} /></div>}
          <KalenderHarian hari={hari} bulan={bulan} hariIni={hariIni} adaSuhu={adaSuhu} adaLembap={adaLembap} href={(b) => hrefDengan({ bulan: b })} />
        </CardContent>
      </Card>

      <Card id="alarm" className="mb-6 scroll-mt-24 overflow-hidden">
        <CardHeader><CardTitle className="flex items-center gap-2"><Siren className="size-4 text-red-600" /> Riwayat alarm</CardTitle>
          <CardDescription>Alarm pada rentang {rg.label} dan yang masih berlangsung.{bolehUbah ? " Akui alarm dan catat tindakan, produk terdampak, serta pencegahannya." : masuk ? "" : " Login untuk melihat siapa yang mengakui & catatan insidennya."}</CardDescription></CardHeader>
        {alarm.length === 0 ? <CardContent><p className="text-sm text-muted-foreground">Tidak ada alarm pada rentang ini.</p></CardContent> : (
          <div className="overflow-x-auto border-t">
            <Table>
              <TableHeader><TableRow className="hover:bg-transparent">
                <TableHead>Kejadian</TableHead><TableHead>Mulai</TableHead><TableHead>Selesai / durasi</TableHead><TableHead className="text-right">Puncak</TableHead><TableHead>Pengakuan & catatan</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {alarm.map((a) => {
                  const p = a.jenis.startsWith("suhu") ? "suhu" : a.jenis.startsWith("lembap") ? "lembap" : null;
                  return (
                    <TableRow key={a.id} className="align-top">
                      <TableCell className="whitespace-nowrap font-medium text-navy-800">{LABEL_ALARM[a.jenis as JenisAlarm] ?? a.jenis}{a.batas != null && p && <div className="text-xs font-normal text-muted-foreground">batas {fNilai(p, a.batas)}</div>}</TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums">{tglJamWib(a.mulai)}</TableCell>
                      <TableCell className="whitespace-nowrap">{a.selesai ? <>{tglJamWib(a.selesai)}<div className="text-xs text-muted-foreground">{durasi(a.selesai.getTime() - a.mulai.getTime())}</div></> : <strong className="text-red-700">Berlangsung · {durasi(kini - a.mulai.getTime())}</strong>}</TableCell>
                      <TableCell className="text-right tabular-nums">{a.puncak != null && p ? fNilai(p, a.puncak) : "–"}</TableCell>
                      <TableCell className="min-w-[14rem]">
                        <div className="grid justify-items-start gap-1.5">
                          {a.diakuiPada ? <span className="text-xs"><LencanaStatus kunci="normal" label="Diakui" />{masuk && <span className="ml-1 text-muted-foreground">{a.diakuiOleh} · {tglJamWib(a.diakuiPada)}</span>}</span> : <LencanaStatus kunci="luar" label="Belum diakui" />}
                          {masuk && a.tindakan && <p className="whitespace-pre-line text-xs"><strong>Tindakan:</strong> {a.tindakan}</p>}
                          {masuk && a.dampak && <p className="whitespace-pre-line text-xs"><strong>Dampak:</strong> {a.dampak}</p>}
                          {masuk && a.pencegahan && <p className="whitespace-pre-line text-xs"><strong>Pencegahan:</strong> {a.pencegahan}</p>}
                          {bolehUbah && <div className="print:hidden"><AkuiAlarm a={{ id: a.id, diakui: a.diakuiPada != null, tindakan: a.tindakan, dampak: a.dampak, pencegahan: a.pencegahan }} /></div>}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <Card id="data" className="scroll-mt-24 overflow-hidden print:hidden">
        <CardHeader><CardTitle className="flex items-center gap-2"><TableProperties className="size-4 text-teal-700" /> Data bacaan</CardTitle><CardDescription>Seluruh bacaan pada rentang {rg.label}, terbaru di atas (waktu WIB). Unduh CSV/Excel untuk data lengkap.</CardDescription></CardHeader>
        <div className="overflow-x-auto border-t">
          <Table>
            <TableHeader><TableRow className="hover:bg-transparent"><TableHead>Waktu</TableHead>{adaSuhu && <TableHead className="text-right">Suhu</TableHead>}{adaLembap && <TableHead className="text-right">Kelembapan</TableHead>}<TableHead>Sensor</TableHead><TableHead>Sumber</TableHead></TableRow></TableHeader>
            <TableBody>
              {tabel.baris.length === 0 && <TableRow><TableCell colSpan={5} className="py-6 text-center text-muted-foreground">Belum ada bacaan.</TableCell></TableRow>}
              {tabel.baris.map((b) => (
                <TableRow key={b.waktu}>
                  <TableCell className="whitespace-nowrap tabular-nums">{tglJamWib(b.waktu)}</TableCell>
                  {adaSuhu && <TableCell className="text-right tabular-nums">{fNilai("suhu", b.suhu, 2)}</TableCell>}
                  {adaLembap && <TableCell className="text-right tabular-nums">{fNilai("lembap", b.lembap, 1)}</TableCell>}
                  <TableCell className="text-xs text-muted-foreground">{b.serial ?? "–"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{b.sumber === "api" ? "sensor" : b.sumber}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {tabel.total > tabel.ukuran && <Pagination page={tabel.halaman} pages={Math.ceil(tabel.total / tabel.ukuran)} total={tabel.total} pageSize={tabel.ukuran} query={new URLSearchParams(qRentang)} satuan="bacaan" jangkar="data" />}
      </Card>
    </>
  );
}
