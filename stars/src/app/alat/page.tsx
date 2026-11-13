import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Banknote, Boxes, CalendarClock, ChevronRight, ClipboardList, Cpu, FileSearch, Gauge, Info, Lock, Printer, QrCode, Send, ShieldAlert } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { unitTerkunci } from "@/lib/akses";
import { cukup } from "@/lib/peran";
import { badgeKondisi, badgeStatusPerintah, badgeStatusPermintaan } from "@/lib/pemeliharaan";
import { statusKalibrasi, tglIndo } from "@/lib/kalibrasi";
import { formatRupiah } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FotoAlat } from "./foto-alat";
import { DokumenAlatPanel, type DokumenRingkas } from "./dokumen-alat-panel";

export const dynamic = "force-dynamic";

type Sp = { kode?: string };

async function cari(kode: string) {
  const sertakan = {
    unitKerja: { select: { nama: true } }, ruangan: { select: { nama: true, gedung: true } },
    kalibrasi: { orderBy: [{ tanggal: "desc" as const }, { id: "desc" as const }], take: 30 },
    dokumen: { orderBy: { createdAt: "desc" as const } },
    permintaan: { orderBy: { createdAt: "desc" as const }, take: 10, select: { nomor: true, status: true, prioritas: true, createdAt: true } },
    perintah: { orderBy: { createdAt: "desc" as const }, take: 10, select: { nomor: true, jenis: true, status: true, createdAt: true, tanggalSelesai: true } },
    jadwal: { where: { aktif: true }, orderBy: { berikutnya: "asc" as const }, select: { id: true, nama: true, intervalHari: true, berikutnya: true, terakhir: true } },
  };
  return (await prisma.alat.findUnique({ where: { kode }, include: sertakan }))
    ?? (await prisma.alat.findFirst({ where: { OR: [{ nomorSeri: kode }, { noUrutAset: kode }] }, include: sertakan, orderBy: { aktif: "desc" } }));
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<Sp> }): Promise<Metadata> {
  const kode = (await searchParams).kode?.trim().slice(0, 120);
  const a = kode ? await prisma.alat.findFirst({ where: { OR: [{ kode }, { nomorSeri: kode }] }, select: { nama: true, nomorSeri: true } }) : null;
  return { title: a ? `${a.nama}${a.nomorSeri ? ` — SN ${a.nomorSeri}` : ""}` : "Informasi Alat" };
}

function Baris({ label, children, mono }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[8.5rem_1fr] gap-3 border-b px-4 py-2.5 text-sm last:border-b-0 sm:grid-cols-[11rem_1fr]">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={mono ? "break-all font-mono text-navy-800" : "text-navy-800"}>{children ?? "—"}</dd>
    </div>
  );
}
const isi = (v: string | number | null | undefined) => (v === null || v === undefined || v === "" ? "—" : v);

export default async function DetailAlatPage({ searchParams }: { searchParams: Promise<Sp> }) {
  const kode = (await searchParams).kode?.trim().slice(0, 120);
  if (!kode) redirect("/pemeliharaan#inventaris");
  const [a, sesi, kunci] = await Promise.all([cari(kode), auth(), unitTerkunci()]);
  const masuk = Boolean(sesi?.user);

  if (!a || (!a.aktif && !masuk)) {
    return (
      <div className="mx-auto grid max-w-xl justify-items-center gap-3 rounded-2xl border border-dashed bg-card px-6 py-12 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-amber-50 text-amber-700"><ShieldAlert className="size-7" /></span>
        <h1 className="text-xl font-bold text-navy-800">Alat tidak ditemukan</h1>
        <p className="text-sm text-muted-foreground">Kode <span className="font-mono">{kode}</span> tidak cocok dengan alat aktif di Inventaris STARS. Labelnya mungkin sudah lama, atau alat sudah dihapus dari daftar.</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button variant="teal" asChild><Link href="/lapor"><Send /> Lapor kerusakan manual</Link></Button>
          <Button variant="outline" asChild><Link href="/pemeliharaan#inventaris"><Boxes /> Cari di Inventaris</Link></Button>
        </div>
      </div>
    );
  }
  if (kunci && a.unitKerja.nama !== kunci.nama) {
    return (
      <div className="mx-auto grid max-w-xl justify-items-center gap-3 rounded-2xl border border-dashed bg-card px-6 py-12 text-center">
        <Lock className="size-8 text-muted-foreground" />
        <h1 className="text-xl font-bold text-navy-800">Alat milik unit lain</h1>
        <p className="text-sm text-muted-foreground">Akun Anda dibatasi ke unit {kunci.nama}. Anda tetap bisa melapor kerusakan alat ini.</p>
        <Button variant="teal" asChild><Link href={`/lapor?alat=${encodeURIComponent(a.kode)}`}><Send /> Lapor kerusakan</Link></Button>
      </div>
    );
  }

  const bolehKelola = cukup(sesi?.user?.peran, "Operator") && process.env.STARS_MODE !== "internet";
  const kini = Date.now();
  const kalTerbaru = a.kalibrasi[0] ?? null;
  const stKal = statusKalibrasi(kalTerbaru, kini);
  const sertifikat = a.kalibrasi.find((k) => k.berkas) ?? null;
  const sejenis = bolehKelola ? await prisma.alat.count({ where: { aktif: true, nama: a.nama, merek: a.merek, model: a.model, NOT: { id: a.id } } }) : 0;
  const tahun = a.tahunPembelian ?? a.tahunPerolehan;
  const umur = tahun ? new Date().getFullYear() - tahun : null;
  const rasioSisa = umur !== null && a.usiaTeknis ? Math.max(0, 1 - umur / a.usiaTeknis) : null;
  const laporanTerbuka = a.permintaan.filter((p) => ["Baru", "Ditinjau", "Diproses"].includes(p.status)).length;
  const tipe = [a.merek, a.model].filter(Boolean).join(" ");

  const dokumen: DokumenRingkas[] = a.dokumen.map((d) => ({
    id: d.id, jenis: d.jenis, namaBerkas: d.namaBerkas, berkas: d.berkas, ukuran: d.ukuran, nomor: d.nomor, tanggal: d.tanggal?.toISOString() ?? null,
    keterangan: d.keterangan, createdAt: d.createdAt.toISOString(),
  }));
  const dipakaiBersama = bolehKelola && dokumen.length
    ? Object.fromEntries((await prisma.dokumenAlat.groupBy({ by: ["berkas"], where: { berkas: { in: [...new Set(dokumen.map((d) => d.berkas))] } }, _count: { _all: true } })).map((g) => [g.berkas, g._count._all]))
    : {};

  return (
    <div className="mx-auto grid max-w-5xl gap-5 [&>*]:min-w-0">
      <nav aria-label="Jejak" className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        <Link href="/pemeliharaan" className="hover:text-teal-700">Pemeliharaan</Link><ChevronRight className="size-3.5" />
        <Link href="/pemeliharaan#inventaris" className="hover:text-teal-700">Inventaris Alat Kesehatan</Link><ChevronRight className="size-3.5" />
        <span className="truncate text-navy-800">{a.nama}</span>
      </nav>

      {/* Kepala: identitas + aksi utama */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-navy-800 to-teal-800 px-5 py-4 text-white sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-100">Informasi Alat</p>
          <h1 className="text-xl font-bold leading-snug sm:text-2xl">{a.nama}{a.nomorSeri ? <span className="font-normal text-navy-100"> — {a.nomorSeri}</span> : null}</h1>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge variant={badgeKondisi[a.kondisi] ?? "outline"}>{a.kondisi}</Badge>
            <Badge variant={stKal.variant} className={stKal.variant === "outline" ? "border-white/40 text-white" : undefined}>Kalibrasi: {stKal.label}</Badge>
            {!a.aktif && <Badge variant="danger">Nonaktif</Badge>}
            {laporanTerbuka > 0 && <Badge variant="warning">{laporanTerbuka} laporan kerusakan sedang ditangani</Badge>}
          </div>
        </div>
        <div className="grid gap-5 p-5 sm:p-6 md:grid-cols-[minmax(0,300px)_1fr] [&>*]:min-w-0">
          <FotoAlat id={a.id} foto={a.foto} nama={a.nama} bolehKelola={bolehKelola} />
          <div className="grid content-start gap-4">
            <dl className="overflow-hidden rounded-lg border">
              <Baris label="SN" mono>{isi(a.nomorSeri)}</Baris>
              <Baris label="Merk">{isi(a.merek)}</Baris>
              <Baris label="Tipe">{isi(a.model)}</Baris>
              <Baris label="Tahun">{tahun ?? "—"}{a.tahunPembukuan && a.tahunPembukuan !== tahun ? <span className="text-muted-foreground"> · pembukuan {a.tahunPembukuan}</span> : null}</Baris>
              <Baris label="Lokasi">{a.ruangan?.nama ?? a.lokasi ?? "—"}{a.ruangan?.gedung ? <span className="text-muted-foreground"> · {a.ruangan.gedung}</span> : null}</Baris>
              <Baris label="Pelayanan">
                <span className="block">{a.unitKerja.nama}</span>
                {a.pelayanan && a.pelayanan !== a.unitKerja.nama && <span className="block text-muted-foreground">{a.pelayanan}</span>}
                {a.instalasi && <span className="block text-muted-foreground">{a.instalasi}</span>}
              </Baris>
              <Baris label="Kode inventaris" mono>{a.kode}</Baris>
            </dl>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <Button variant="teal" size="lg" asChild><Link href={`/lapor?alat=${encodeURIComponent(a.kode)}`}><Send /> Lapor Kerusakan</Link></Button>
              <Button variant="outline" size="lg" asChild><a href="#dokumen"><FileSearch /> Dokumen</a></Button>
              {masuk && <Button variant="outline" asChild className="col-span-2 sm:col-span-1"><a href={`/api/admin/alat/label?id=${a.id}&ukuran=kecil`} target="_blank" rel="noopener noreferrer"><Printer /> Cetak label QR</a></Button>}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2 [&>*]:min-w-0">
        {/* Pendanaan */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Banknote className="size-4 text-teal-700" /> Pendanaan</CardTitle></CardHeader>
          <CardContent>
            {masuk ? (
              <dl className="overflow-hidden rounded-lg border">
                <Baris label="Sumber dana">{isi(a.pendanaan)}</Baris>
                <Baris label="Biaya perolehan">{a.hargaPerolehan ? formatRupiah(a.hargaPerolehan) : "—"}</Baris>
                <Baris label="Tahun pembelian">{tahun ?? "—"}</Baris>
                <Baris label="Umur manfaat">{a.usiaTeknis ? `${a.usiaTeknis} tahun` : "—"}{umur !== null ? <span className="text-muted-foreground"> · usia kini {umur} tahun</span> : null}</Baris>
                <Baris label="Rasio sisa">{rasioSisa !== null ? `${(rasioSisa * 100).toFixed(1).replace(".", ",")} %` : "—"}</Baris>
                <Baris label="Nilai sisa (garis lurus)">{rasioSisa !== null && a.hargaPerolehan ? formatRupiah(Math.round(a.hargaPerolehan * rasioSisa)) : "—"}</Baris>
              </dl>
            ) : (
              <p className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground"><Lock className="mt-0.5 size-4 shrink-0" /> <span>Data pendanaan hanya untuk petugas. <Link href={`/login?callbackUrl=${encodeURIComponent(`/alat?kode=${a.kode}`)}`} className="font-medium text-teal-700 hover:underline">Masuk</Link> untuk melihatnya.</span></p>
            )}
          </CardContent>
        </Card>

        {/* Data teknis */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Cpu className="size-4 text-teal-700" /> Data Teknis</CardTitle></CardHeader>
          <CardContent>
            <dl className="overflow-hidden rounded-lg border">
              <Baris label="Kondisi alat"><Badge variant={badgeKondisi[a.kondisi] ?? "outline"}>{a.kondisi}</Badge></Baris>
              <Baris label="Jenis">{a.jenis}{a.kategori ? <span className="text-muted-foreground"> · {a.kategori}</span> : null}</Baris>
              <Baris label="Kelompok teknologi">{isi(a.teknologi)}</Baris>
              <Baris label="Kelas risiko">{isi(a.kelasRisiko ?? a.risiko)}</Baris>
              <Baris label="Izin edar (AKL)" mono>{isi(a.akl)}</Baris>
              <Baris label="Produsen">{isi(a.produsen)}</Baris>
              <Baris label="Distributor">{isi(a.distributor)}</Baris>
              <Baris label="Garansi sampai">{a.garansiSampai ? tglIndo(a.garansiSampai) : "—"}</Baris>
              <Baris label="Uji fungsi">{a.tanggalUjiFungsi ? tglIndo(a.tanggalUjiFungsi) : "—"}</Baris>
              {a.kodeAspak && <Baris label="Kode ASPAK" mono>{a.kodeAspak}</Baris>}
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Pengujian & kalibrasi */}
      <Card>
        <CardHeader className="flex-row flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2"><Gauge className="size-4 text-teal-700" /> Pengujian &amp; Kalibrasi</CardTitle>
            <CardDescription>
              {kalTerbaru ? <>Terakhir {kalTerbaru.jenis.toLowerCase()} {tglIndo(kalTerbaru.tanggal)} oleh {kalTerbaru.kalibrator}{kalTerbaru.berlakuSampai ? `, berlaku s/d ${tglIndo(kalTerbaru.berlakuSampai)}` : ""}.</> : "Belum ada catatan pengujian/kalibrasi."}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={stKal.variant}>{stKal.label}</Badge>
            {bolehKelola && <Button size="sm" variant="outline" asChild><Link href={`/admin/kalibrasi?alat=${a.id}#input-kalibrasi`}>Catat kalibrasi</Link></Button>}
          </div>
        </CardHeader>
        {a.kalibrasi.length > 0 && (
          <CardContent className="px-0 pb-2">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-y bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr><th className="px-4 py-2 font-medium">Tanggal</th><th className="px-4 py-2 font-medium">Jenis</th><th className="px-4 py-2 font-medium">Lembaga</th><th className="hidden px-4 py-2 font-medium sm:table-cell">No. sertifikat</th><th className="px-4 py-2 font-medium">Hasil</th><th className="px-4 py-2 font-medium">Berlaku s/d</th><th className="px-4 py-2 font-medium">Sertifikat</th></tr>
                </thead>
                <tbody className="divide-y">
                  {a.kalibrasi.map((k) => (
                    <tr key={k.id}>
                      <td className="whitespace-nowrap px-4 py-2">{tglIndo(k.tanggal)}</td>
                      <td className="px-4 py-2">{k.jenis}</td>
                      <td className="px-4 py-2">{k.kalibrator}</td>
                      <td className="hidden break-all px-4 py-2 font-mono text-xs sm:table-cell">{k.nomorSertifikat ?? "—"}</td>
                      <td className="px-4 py-2"><Badge variant={k.laik ? "success" : "danger"}>{k.laik ? "Laik" : "Tidak laik"}</Badge></td>
                      <td className="whitespace-nowrap px-4 py-2">{tglIndo(k.berlakuSampai)}</td>
                      <td className="px-4 py-2">{k.berkas ? (masuk ? <a href={`/api/kalibrasi/${k.id}/sertifikat`} target="_blank" rel="noopener noreferrer" className="font-medium text-teal-700 hover:underline">Buka</a> : <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Lock className="size-3" /> login</span>) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Dokumen */}
      <DokumenAlatPanel
        alat={{ id: a.id, kode: a.kode, nama: a.nama, tipe }}
        dokumen={dokumen}
        sertifikat={sertifikat ? { id: sertifikat.id, namaBerkas: sertifikat.namaBerkas ?? "Sertifikat", tanggal: sertifikat.tanggal.toISOString(), jenis: sertifikat.jenis } : null}
        masuk={masuk} bolehKelola={bolehKelola} sejenis={sejenis} dipakaiBersama={dipakaiBersama}
      />

      <div className="grid gap-5 lg:grid-cols-2 [&>*]:min-w-0">
        {/* Riwayat pemeliharaan */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ClipboardList className="size-4 text-teal-700" /> Riwayat Pemeliharaan</CardTitle><CardDescription>Laporan kerusakan & perintah kerja terakhir (tanpa data pelapor).</CardDescription></CardHeader>
          <CardContent className="grid gap-3 text-sm">
            {a.permintaan.length === 0 && a.perintah.length === 0 && <p className="text-muted-foreground">Belum ada laporan kerusakan atau perintah kerja untuk alat ini.</p>}
            {a.permintaan.length > 0 && (
              <ul className="divide-y rounded-lg border">
                {a.permintaan.map((p) => (
                  <li key={p.nomor} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                    <span><span className="font-mono text-xs">{p.nomor}</span> <span className="text-xs text-muted-foreground">· {tglIndo(p.createdAt)} · {p.prioritas}</span></span>
                    <Badge variant={badgeStatusPermintaan[p.status] ?? "default"}>{p.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
            {a.perintah.length > 0 && (
              <ul className="divide-y rounded-lg border">
                {a.perintah.map((w) => (
                  <li key={w.nomor} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                    <span><span className="font-mono text-xs">{w.nomor}</span> <span className="text-xs text-muted-foreground">· {w.jenis} · {tglIndo(w.createdAt)}{w.tanggalSelesai ? ` → ${tglIndo(w.tanggalSelesai)}` : ""}</span></span>
                    <Badge variant={badgeStatusPerintah[w.status] ?? "default"}>{w.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Jadwal & QR */}
        <div className="grid content-start gap-5">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><CalendarClock className="size-4 text-teal-700" /> Jadwal Preventif</CardTitle></CardHeader>
            <CardContent className="text-sm">
              {a.jadwal.length === 0 ? <p className="text-muted-foreground">Belum ada jadwal pemeliharaan preventif.</p> : (
                <ul className="divide-y rounded-lg border">
                  {a.jadwal.map((j) => (
                    <li key={j.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                      <span>{j.nama} <span className="text-xs text-muted-foreground">· tiap {j.intervalHari} hari</span></span>
                      <span className="text-xs">{j.berikutnya ? <>berikutnya <strong>{tglIndo(j.berikutnya)}</strong></> : "—"}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><QrCode className="size-4 text-teal-700" /> Kode QR</CardTitle><CardDescription>Tempel pada alat. Scan → halaman ini (detail & lapor kerusakan).</CardDescription></CardHeader>
            <CardContent className="flex flex-wrap items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element -- SVG dari API sendiri */}
              <img src={`/api/qr/alat?kode=${encodeURIComponent(a.kode)}`} alt={`QR code ${a.nama}`} width={140} height={140} className="rounded-lg border bg-white p-1" />
              <div className="grid gap-2 text-sm">
                <Button variant="outline" size="sm" asChild><a href={`/api/qr/alat?kode=${encodeURIComponent(a.kode)}`} download={`QR-${a.kode.replace(/[^\w.-]+/g, "_")}.svg`}>Unduh QR</a></Button>
                {masuk && <Button variant="outline" size="sm" asChild><a href={`/api/admin/alat/label?id=${a.id}&ukuran=besar`} target="_blank" rel="noopener noreferrer"><Printer /> Label besar</a></Button>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <Link href="/pemeliharaan#inventaris" className="inline-flex items-center gap-1 font-medium text-teal-700 hover:underline"><ArrowLeft className="size-4" /> Kembali ke Inventaris</Link>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Info className="size-3.5" /> Data diperbarui {a.updatedAt.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}</p>
      </div>
    </div>
  );
}
