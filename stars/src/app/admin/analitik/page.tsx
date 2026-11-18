import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Banknote, GraduationCap, Layers, LifeBuoy, ShieldAlert, Users, Wrench } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { sesiHalaman } from "@/lib/sesi";
import { unitTerkunci } from "@/lib/akses";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FUNGSI_IKATEMI, TEKNOLOGI_IKATEMI } from "@/lib/klasifikasi-ikatemi";
import { hitungSkor } from "@/lib/risiko-who";
import { statusBarang } from "@/lib/stok";
import { formatNumber, formatRupiah } from "@/lib/utils";

export const metadata: Metadata = { title: "Analitik Inventaris (WHO)" };
export const dynamic = "force-dynamic";

const HARI = 86_400_000;
const tgl = (d: Date) => d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });

function Tabel({ kepala, baris, kosong = "Tidak ada data." }: { kepala: string[]; baris: React.ReactNode[][]; kosong?: string }) {
  if (!baris.length) return <p className="text-sm text-muted-foreground">{kosong}</p>;
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase text-muted-foreground"><tr>{kepala.map((k) => <th key={k} className="px-3 py-2 font-medium">{k}</th>)}</tr></thead>
        <tbody className="divide-y">{baris.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className="px-3 py-2 align-top">{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

export default async function AnalitikPage() {
  await sesiHalaman("Viewer");
  const kunci = await unitTerkunci();
  const u = kunci ? { unitKerja: { nama: kunci.nama } } : {};
  const kini = Date.now(), tahunIni = new Date().getFullYear();
  const [alat, wr, stok] = await Promise.all([
    prisma.alat.findMany({ where: { ...u, aktif: true }, select: {
      id: true, kode: true, nama: true, merek: true, kondisi: true, statusOperasi: true, tahunPerolehan: true, tahunPembelian: true, hargaPerolehan: true, usiaTeknis: true,
      garansiSampai: true, kontrakServisSampai: true, penyediaServis: true, ikatemiFungsi: true, ikatemiTeknologi: true, ikatemiRisiko: true, ikatemiNama: true,
      emFungsi: true, emRisiko: true, emPemeliharaan: true, emrMisiKritis: true, emrUtilisasi: true, unitKerja: { select: { nama: true } },
    } }),
    prisma.permintaanKerja.findMany({ where: { createdAt: { gte: new Date(kini - 365 * HARI) }, ...(kunci ? { unitKerja: { nama: kunci.nama } } : {}) }, select: { alatId: true, namaAlat: true, unitKerja: { select: { nama: true } } } }),
    prisma.barangStok.findMany({ where: { aktif: true }, select: { stok: true, stokMinimum: true, kedaluwarsa: true, kalibrasiSampai: true, jenis: true } }),
  ]);

  // 9.1 & 9.9 anggaran, nilai sisa, kandidat penggantian
  const tahun = (a: (typeof alat)[number]) => a.tahunPerolehan ?? a.tahunPembelian;
  const nilaiPerolehan = alat.reduce((n, a) => n + (a.hargaPerolehan ?? 0), 0);
  const nilaiSisa = alat.reduce((n, a) => { const t = tahun(a); if (!a.hargaPerolehan || !t || !a.usiaTeknis) return n + (a.hargaPerolehan ?? 0); return n + a.hargaPerolehan * Math.max(0, 1 - (tahunIni - t) / a.usiaTeknis); }, 0);
  const ganti = alat.filter((a) => { const t = tahun(a); return (t && a.usiaTeknis && tahunIni - t >= a.usiaTeknis) || a.kondisi === "Rusak Berat" || a.kondisi === "Afkir"; })
    .sort((x, y) => (tahun(x) ?? 9999) - (tahun(y) ?? 9999));
  const biayaGanti = ganti.reduce((n, a) => n + (a.hargaPerolehan ?? 0), 0);
  // 9.5 kontrak servis & garansi
  const segera = (d: Date | null) => d != null && d.getTime() - kini <= 90 * HARI;
  const kontrak = alat.filter((a) => segera(a.kontrakServisSampai)).sort((x, y) => x.kontrakServisSampai!.getTime() - y.kontrakServisSampai!.getTime());
  const garansi = alat.filter((a) => a.garansiSampai && a.garansiSampai.getTime() >= kini - 30 * HARI && segera(a.garansiSampai));
  // 9.4 pelatihan (pola kerusakan 12 bulan)
  const hitung = <T,>(xs: T[], k: (x: T) => string) => { const m = new Map<string, number>(); for (const x of xs) m.set(k(x), (m.get(k(x)) ?? 0) + 1); return [...m.entries()].sort((a, b) => b[1] - a[1]); };
  const wrJenis = hitung(wr, (w) => w.namaAlat.trim().toUpperCase()).slice(0, 10);
  const wrUnit = hitung(wr, (w) => w.unitKerja?.nama ?? "Tanpa unit").slice(0, 10);
  const wrAlat = hitung(wr.filter((w) => w.alatId), (w) => String(w.alatId)).filter(([, n]) => n >= 3).slice(0, 10);
  const namaAlat = new Map(alat.map((a) => [String(a.id), a]));
  // 9.13 standardisasi
  const perJenis = new Map<string, Set<string>>(); const jumlahJenis = new Map<string, number>();
  for (const a of alat) { const k = a.ikatemiNama ?? a.nama.trim().toUpperCase(); jumlahJenis.set(k, (jumlahJenis.get(k) ?? 0) + 1); if (a.merek) perJenis.set(k, (perJenis.get(k) ?? new Set()).add(a.merek.trim().toUpperCase())); }
  const standar = [...perJenis.entries()].filter(([, m]) => m.size >= 3).sort((a, b) => b[1].size - a[1].size).slice(0, 12);
  // 9.12 bencana: life support
  const ls = alat.filter((a) => a.ikatemiFungsi === "Life Support" || a.emFungsi === 10);
  const lsJenis = hitung(ls, (a) => a.ikatemiNama ?? a.nama).map(([j, n]) => [j, n, ls.filter((a) => (a.ikatemiNama ?? a.nama) === j && a.statusOperasi !== "Tidak beroperasi" && a.kondisi !== "Rusak Berat" && a.kondisi !== "Afkir").length] as const);
  // 9.11 risiko & klasifikasi
  const skor = alat.map((a) => hitungSkor(a));
  const em12 = skor.filter((s) => s.masuk).length, emDinilai = skor.filter((s) => s.em != null).length;
  const ikatemi = alat.filter((a) => a.ikatemiFungsi).length;
  // 9.3 staf: kompleksitas teknologi
  const tek = TEKNOLOGI_IKATEMI.map((t) => [t, alat.filter((a) => a.ikatemiTeknologi === t).length] as const);
  const stokPerlu = stok.filter((b) => statusBarang(b)[0].kunci !== "aman").length;
  // WHO maintenance programme overview §5.4 — indikator kinerja (12 bulan)
  const [wo12, auditAkhir] = await Promise.all([
    prisma.perintahKerja.findMany({ where: { createdAt: { gte: new Date(kini - 365 * HARI) }, ...(kunci ? { alat: { unitKerja: { nama: kunci.nama } } } : {}) }, select: { status: true, createdAt: true, tanggalMulai: true, tanggalSelesai: true, biaya: true, jenis: true, permintaan: { select: { createdAt: true } } } }),
    prisma.auditInventaris.findFirst({ orderBy: { createdAt: "desc" }, include: { item: { select: { ditemukan: true } } } }),
  ]);
  const rata = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  const jam = (ms: number | null) => (ms == null ? "—" : ms < 2 * 86_400_000 ? `${Math.round(ms / 3_600_000)} jam` : `${(ms / 86_400_000).toFixed(1).replace(".", ",")} hari`);
  const respons = rata(wo12.filter((w) => w.permintaan).map((w) => w.createdAt.getTime() - w.permintaan!.createdAt.getTime()));
  const perbaikan = rata(wo12.filter((w) => w.tanggalMulai && w.tanggalSelesai).map((w) => w.tanggalSelesai!.getTime() - w.tanggalMulai!.getTime()));
  const terlambat = wo12.filter((w) => (w.status === "Terbuka" || w.status === "Dikerjakan") && kini - w.createdAt.getTime() > 30 * HARI).length;
  const pm = wo12.filter((w) => w.jenis === "Preventif");
  const pmSelesai = pm.length ? Math.round((pm.filter((w) => w.status === "Selesai").length / pm.length) * 100) : null;
  const biaya12 = wo12.reduce((n, w) => n + (w.biaya ?? 0), 0);
  const rasioBiaya = nilaiPerolehan ? (biaya12 / nilaiPerolehan) * 100 : null;
  const lokasi = auditAkhir && auditAkhir.item.length ? Math.round((auditAkhir.item.filter((i) => i.ditemukan).length / auditAkhir.item.length) * 100) : null;

  return (
    <div className="grid gap-5">
      <div><h2 className="text-xl font-bold text-navy-800">Analitik Inventaris (WHO)</h2><p className="text-sm text-muted-foreground">Inventaris sebagai alat bantu manajemen — WHO <i>Introduction to medical equipment inventory management</i> (2011), bab 9. {formatNumber(alat.length)} alat aktif{kunci ? ` unit ${kunci.nama}` : ""}.</p></div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card><CardContent className="pt-5"><p className="text-xs text-muted-foreground">Klasifikasi IKATEMI</p><p className="text-2xl font-bold text-navy-800">{formatNumber(ikatemi)}<span className="text-sm font-normal text-muted-foreground">/{formatNumber(alat.length)}</span></p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-xs text-muted-foreground">Skor EM dinilai · ≥ 12</p><p className="text-2xl font-bold text-navy-800">{formatNumber(emDinilai)} · <span className="text-red-700">{formatNumber(em12)}</span></p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-xs text-muted-foreground">Kandidat penggantian</p><p className="text-2xl font-bold text-navy-800">{formatNumber(ganti.length)}</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-xs text-muted-foreground">Stok perlu tindakan</p><p className="text-2xl font-bold text-navy-800"><Link href="/admin/stok" className="hover:underline">{formatNumber(stokPerlu)}</Link></p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Wrench className="size-5 text-teal-700" /> Indikator kinerja pemeliharaan (WHO 5.4)</CardTitle><CardDescription>12 bulan terakhir. Target WHO: penyelesaian IPM &gt; 90%, perintah kerja tidak terlambat &gt; 30 hari, rasio biaya servis 5–10% (negara maju; awal program boleh lebih tinggi).</CardDescription></CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {[
            ["Penyelesaian PM", pmSelesai == null ? "—" : `${pmSelesai}%`, pmSelesai != null && pmSelesai < 90],
            ["Waktu respons rata-rata", jam(respons), false],
            ["Waktu perbaikan rata-rata", jam(perbaikan), false],
            ["Perintah kerja terlambat > 30 hari", String(terlambat), terlambat > 0],
            ["Tingkat ditemukan (audit terakhir)", lokasi == null ? "—" : `${lokasi}%`, lokasi != null && lokasi < 95],
            ["Rasio biaya servis", rasioBiaya == null ? "—" : `${rasioBiaya.toFixed(1).replace(".", ",")}%`, false],
          ].map(([k, v, buruk]) => (
            <div key={String(k)} className="rounded-xl border bg-white p-3"><p className="text-xs text-muted-foreground">{k}</p><p className={`text-2xl font-bold tabular-nums ${buruk ? "text-red-700" : "text-navy-800"}`}>{v}</p></div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Banknote className="size-5 text-teal-700" /> Anggaran & penggantian (9.1, 9.9)</CardTitle>
          <CardDescription>Nilai perolehan {formatRupiah(nilaiPerolehan)} · nilai sisa garis lurus ±{formatRupiah(Math.round(nilaiSisa))} · estimasi biaya penggantian kandidat {formatRupiah(biayaGanti)} (harga perolehan).</CardDescription></CardHeader>
        <CardContent><Tabel kepala={["Alat", "Unit", "Tahun", "Umur teknis", "Kondisi", "Harga perolehan"]} kosong="Belum ada alat yang melewati umur teknis / rusak berat."
          baris={ganti.slice(0, 25).map((a) => [<Link key="a" href={`/alat?kode=${encodeURIComponent(a.kode)}`} className="font-medium text-navy-800 hover:underline">{a.nama}</Link>, a.unitKerja.nama, tahun(a) ?? "—", a.usiaTeknis ? `${a.usiaTeknis} th (usia ${tahunIni - (tahun(a) ?? tahunIni)})` : "—", a.kondisi, a.hargaPerolehan ? formatRupiah(a.hargaPerolehan) : "—"])} />
          {ganti.length > 25 && <p className="mt-2 text-xs text-muted-foreground">+{ganti.length - 25} alat lainnya.</p>}</CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2 [&>*]:min-w-0">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Wrench className="size-5 text-teal-700" /> Kontrak servis & garansi (9.5)</CardTitle><CardDescription>Berakhir dalam 90 hari atau sudah lewat.</CardDescription></CardHeader>
          <CardContent className="grid gap-3">
            <Tabel kepala={["Kontrak servis", "Penyedia", "Sampai"]} kosong="Tidak ada kontrak yang segera berakhir."
              baris={kontrak.slice(0, 15).map((a) => [a.nama, a.penyediaServis ?? "—", <Badge key="b" variant={a.kontrakServisSampai!.getTime() < kini ? "danger" : "warning"}>{tgl(a.kontrakServisSampai!)}</Badge>])} />
            <Tabel kepala={["Garansi", "Unit", "Sampai"]} kosong="Tidak ada garansi yang segera berakhir."
              baris={garansi.slice(0, 15).map((a) => [a.nama, a.unitKerja.nama, tgl(a.garansiSampai!)])} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><GraduationCap className="size-5 text-teal-700" /> Kebutuhan pelatihan (9.4)</CardTitle><CardDescription>Pola laporan kerusakan 12 bulan terakhir — kerusakan berulang per jenis alat / unit bisa menandakan kebutuhan pelatihan pengguna.</CardDescription></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Tabel kepala={["Jenis alat", "Laporan"]} baris={wrJenis.map(([k, n]) => [k, n])} />
            <Tabel kepala={["Unit", "Laporan"]} baris={wrUnit.map(([k, n]) => [k, n])} />
            {wrAlat.length > 0 && <div className="sm:col-span-2"><p className="mb-1 text-xs font-semibold text-red-700">Alat dengan ≥ 3 laporan (periksa penggunaan / pertimbangkan penggantian)</p>
              <Tabel kepala={["Alat", "Unit", "Laporan"]} baris={wrAlat.map(([id, n]) => { const a = namaAlat.get(id); return [a ? `${a.nama} (${a.kode})` : id, a?.unitKerja.nama ?? "—", n]; })} /></div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Layers className="size-5 text-teal-700" /> Standardisasi merek (9.13)</CardTitle><CardDescription>Jenis alat dengan ≥ 3 merek berbeda — standardisasi dapat menekan biaya suku cadang & pelatihan.</CardDescription></CardHeader>
          <CardContent><Tabel kepala={["Jenis alat", "Unit", "Merek"]} kosong="Belum ada jenis alat dengan ≥ 3 merek."
            baris={standar.map(([j, m]) => [j, jumlahJenis.get(j) ?? 0, <span key="m" className="text-xs">{m.size}: {[...m].slice(0, 6).join(", ")}{m.size > 6 ? "…" : ""}</span>])} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><LifeBuoy className="size-5 text-teal-700" /> Kesiapan bencana & kegawatdaruratan (9.12)</CardTitle><CardDescription>Alat life support (IKATEMI) atau fungsi EM = 10: jumlah total vs siap pakai.</CardDescription></CardHeader>
          <CardContent><Tabel kepala={["Jenis", "Total", "Siap pakai"]} kosong="Klasifikasikan alat (IKATEMI / skor EM) agar terhitung."
            baris={lsJenis.slice(0, 15).map(([j, n, siap]) => [j, n, <span key="s" className={siap < n ? "font-semibold text-red-700" : "text-emerald-700"}>{siap}</span>])} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ShieldAlert className="size-5 text-teal-700" /> Klasifikasi IKATEMI: fungsi × teknologi (9.11)</CardTitle><CardDescription>Sebaran alat berdasarkan Keputusan IKATEMI No. 1/2023.</CardDescription></CardHeader>
          <CardContent><Tabel kepala={["Fungsi", ...TEKNOLOGI_IKATEMI, "Risiko tinggi"]}
            baris={FUNGSI_IKATEMI.map((f) => [f, ...TEKNOLOGI_IKATEMI.map((t) => alat.filter((a) => a.ikatemiFungsi === f && a.ikatemiTeknologi === t).length), <span key="r" className="font-semibold text-red-700">{alat.filter((a) => a.ikatemiFungsi === f && a.ikatemiRisiko === "Tinggi").length}</span>])} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Users className="size-5 text-teal-700" /> Kebutuhan keahlian staf (9.3)</CardTitle><CardDescription>Komposisi tingkat teknologi menentukan kompetensi teknisi elektromedis yang dibutuhkan.</CardDescription></CardHeader>
          <CardContent className="grid gap-2">
            {tek.map(([t, n]) => <div key={t} className="flex items-center gap-3 text-sm"><span className="w-28">Teknologi {t}</span><div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-teal-500" style={{ width: `${alat.length ? (n / alat.length) * 100 : 0}%` }} /></div><b className="w-12 text-right tabular-nums">{n}</b></div>)}
            {ikatemi < alat.length && <p className="flex items-center gap-1.5 text-xs text-amber-800"><AlertTriangle className="size-3.5" /> {alat.length - ikatemi} alat belum diklasifikasikan — gunakan ADMIN › Daftar Alat › Klasifikasikan otomatis.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
