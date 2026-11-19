import type { Metadata } from "next";
import Link from "next/link";
import { Activity, Cable, FileDown, Leaf, PenLine, Recycle, TrendingDown, Users, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { sesiHalaman } from "@/lib/sesi";
import { cukup } from "@/lib/peran";
import { unitTerkunci } from "@/lib/akses";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { kecukupanElektromedis, prediksiKerusakan, tco } from "@/lib/htm";
import { ajukanPenghapusan, langkahPenghapusan } from "./actions";

export const metadata: Metadata = { title: "Manajemen Teknologi Kesehatan (WHO 2025)" };
export const dynamic = "force-dynamic";

const rp = (n: number) => "Rp " + Math.round(n).toLocaleString("id-ID");
const inp = "h-9 rounded-md border bg-white px-2 text-sm";

export default async function HtmPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const s = await sesiHalaman("Viewer");
  const sp = await searchParams;
  const kunci = await unitTerkunci();
  const u = kunci ? { unitKerja: { nama: kunci.nama } } : {};
  const operator = cukup(s.user.peran, "Operator"), admin = cukup(s.user.peran, "Admin");
  const kini = new Date(), th = kini.getFullYear();
  const [alat, operatorCount, penghapusan, ttd, acs] = await Promise.all([
    prisma.alat.findMany({
      where: { aktif: true, ...u }, take: 5000,
      select: { id: true, kode: true, nama: true, hargaPerolehan: true, tahunPerolehan: true, tahunPembelian: true, dayaWatt: true, kategoriLimbah: true, emdnKode: true, gmdnKode: true, udi: true, pembuanganKhusus: true,
        unitKerja: { select: { nama: true } }, perintah: { select: { biaya: true } }, permintaan: { select: { createdAt: true } } },
    }),
    prisma.pengguna.count({ where: { peran: { in: ["Operator", "Admin"] }, aktif: true } }).catch(() => 0),
    prisma.penghapusan.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.tandaTangan.findMany({ where: { nomor: { startsWith: "HPS-" } }, select: { nomor: true, peran: true, nama: true } }),
    prisma.barangStok.findMany({ where: { aktif: true }, select: { nama: true, stok: true, stokMinimum: true, kedaluwarsa: true, alatTerkait: true } }),
  ]);
  const namaAlat = new Map((await prisma.alat.findMany({ where: { id: { in: penghapusan.map((p) => p.alatId) } }, select: { id: true, kode: true, nama: true } })).map((a) => [a.id, a]));

  // 1. Elektromedis
  const tt = Number(sp.tt ?? process.env.STARS_TEMPAT_TIDUR ?? 0) || 0, em = Number(sp.em ?? operatorCount) || 0, tersier = sp.tipe === "tersier";
  const sdm = kecukupanElektromedis({ tempatTidur: tt, elektromedis: em, jumlahAlat: alat.length, tersier });
  // 2. TCO
  const tarif = Number(sp.tarif) || 1444.7, jam = Number(sp.jam) || 8;
  const tcoBaris = alat.map((a) => {
    const biaya = a.perintah.reduce((x, p) => x + (p.biaya || 0), 0);
    const t = tco({ harga: a.hargaPerolehan, biayaServis: biaya, dayaWatt: a.dayaWatt, jamPerHari: jam, tarifKwh: tarif, tahunPakai: th - (a.tahunPerolehan ?? a.tahunPembelian ?? th) });
    return { a, biaya, ...t };
  }).sort((x, y) => y.total - x.total);
  const totalTco = tcoBaris.reduce((x, b) => x + b.total, 0);
  const rasioTinggi = tcoBaris.filter((b) => b.rasioServis != null && b.rasioServis >= 0.5);
  // 3. Prediksi
  const prediksi = alat.map((a) => ({ a, p: prediksiKerusakan(a.permintaan.map((r) => r.createdAt), kini) })).filter((x) => x.p).sort((x, y) => x.p!.sisaHari - y.p!.sisaHari).slice(0, 25);
  // 4. Keberlanjutan & nomenklatur
  const totalWatt = alat.reduce((x, a) => x + (a.dayaWatt ?? 0), 0);
  const limbah = new Map<string, number>(); for (const a of alat) if (a.kategoriLimbah) limbah.set(a.kategoriLimbah, (limbah.get(a.kategoriLimbah) ?? 0) + 1);
  const pct = (n: number) => (alat.length ? Math.round((n / alat.length) * 100) : 0);
  const nEmdn = alat.filter((a) => a.emdnKode).length, nGmdn = alat.filter((a) => a.gmdnKode).length, nUdi = alat.filter((a) => a.udi).length;
  const acsKritis = acs.filter((b) => b.stok <= b.stokMinimum || (b.kedaluwarsa && b.kedaluwarsa.getTime() - kini.getTime() < 90 * 86_400_000));

  return (
    <div className="grid gap-4">
      {sp.ok && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{sp.ok}</p>}
      {sp.error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{sp.error}</p>}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="size-5 text-teal-700" /> Manajemen Teknologi Kesehatan — WHO 2025</CardTitle>
          <CardDescription>Menerapkan WHO <i>Development of medical devices policies</i> ed. 2 (2025), <i>Inventory and maintenance management information system for medical devices</i> (2025) dan <i>Roadmap 2025–2030</i>: nomenklatur EMDN/GMDN/UDI, uji terima, ACS, biaya total kepemilikan, prediksi kerusakan, tenaga elektromedis, keberlanjutan, dan penghapusan alat.</CardDescription></CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[["Kode EMDN", nEmdn], ["Kode GMDN", nGmdn], ["UDI tercatat", nUdi], ["ACS perlu tindakan", acsKritis.length]].map(([l, n]) => (
            <div key={String(l)} className="rounded-lg border p-3"><p className="text-2xl font-bold text-navy-900">{n}</p><p className="text-xs text-muted-foreground">{l}{typeof n === "number" && l !== "ACS perlu tindakan" ? ` · ${pct(n)}% alat` : ""}</p></div>
          ))}
          <p className="col-span-full text-xs text-muted-foreground">Isi kode EMDN/GMDN/UDI, daya (W) dan kategori limbah di <Link href="/admin/alat" className="text-teal-700 underline">Daftar Alat</Link> › Data standar WHO. WHO menganjurkan memakai nomenklatur internasional, bukan membuat sistem sendiri (§3). ACS (aksesori, bahan habis pakai, suku cadang) dikelola di <Link href="/admin/stok" className="text-teal-700 underline">Stok &amp; BHP</Link>.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Users className="size-5 text-teal-700" /> Kecukupan tenaga Elektromedis</CardTitle>
          <CardDescription>Di Indonesia tenaga teknik biomedis = jabatan fungsional <b>Teknisi Elektromedis</b> (Permenpan RB No. 28/2013, sebagian diubah Permenpan RB No. 1/2023; Permenkes No. 51/2015). Patokan WHO 2025 §8.2.4 bersifat indikatif: ±1 per 100 tempat tidur; RS sekunder ≥1 di tempat, RS tersier &gt;2. Kebutuhan resmi tetap dihitung dengan analisis beban kerja (ABK/WISN).</CardDescription></CardHeader>
        <CardContent className="grid gap-3">
          <form className="flex flex-wrap items-end gap-2 text-sm">
            <label className="grid gap-1">Tempat tidur<input name="tt" type="number" min={0} defaultValue={tt || ""} className={`${inp} w-28`} /></label>
            <label className="grid gap-1">Jumlah elektromedis<input name="em" type="number" min={0} defaultValue={em} className={`${inp} w-28`} /></label>
            <label className="grid gap-1">Tipe RS<select name="tipe" defaultValue={tersier ? "tersier" : "sekunder"} className={inp}><option value="sekunder">Sekunder (tipe C/D)</option><option value="tersier">Tersier (tipe A/B)</option></select></label>
            <Button size="sm" variant="outline">Hitung</Button>
          </form>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-sm">
            <div className="rounded-lg border p-3"><p className="text-2xl font-bold">{sdm.kebutuhan}</p><p className="text-xs text-muted-foreground">kebutuhan minimum indikatif</p></div>
            <div className={`rounded-lg border p-3 ${sdm.kurang ? "border-amber-400 bg-amber-50" : ""}`}><p className="text-2xl font-bold">{sdm.kurang}</p><p className="text-xs text-muted-foreground">kekurangan</p></div>
            <div className="rounded-lg border p-3"><p className="text-2xl font-bold">{sdm.perSeratusTT ?? "—"}</p><p className="text-xs text-muted-foreground">elektromedis per 100 TT</p></div>
            <div className="rounded-lg border p-3"><p className="text-2xl font-bold">{sdm.alatPerOrang ?? "—"}</p><p className="text-xs text-muted-foreground">alat aktif per elektromedis</p></div>
          </div>
          {!tt && <p className="text-xs text-amber-700">Isi jumlah tempat tidur (atau set STARS_TEMPAT_TIDUR di server). Jumlah elektromedis bawaan = akun Operator/Admin aktif.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Wallet className="size-5 text-teal-700" /> Biaya total kepemilikan (TCO)</CardTitle>
          <CardDescription>Harga perolehan + biaya perintah kerja (servis, suku cadang) + estimasi energi (daya × {jam} jam/hari × tarif). WHO §8.3: anggaran jangan hanya biaya modal. Rasio servis ≥ 50% harga = kandidat penggantian (§7.12).</CardDescription></CardHeader>
        <CardContent className="grid gap-3">
          <form className="flex flex-wrap items-end gap-2 text-sm">
            <label className="grid gap-1">Tarif listrik (Rp/kWh)<input name="tarif" type="number" step="any" defaultValue={tarif} className={`${inp} w-32`} /></label>
            <label className="grid gap-1">Jam pakai/hari<input name="jam" type="number" min={1} max={24} defaultValue={jam} className={`${inp} w-24`} /></label>
            <Button size="sm" variant="outline">Hitung ulang</Button>
          </form>
          <p className="text-sm">Total TCO {alat.length} alat: <b>{rp(totalTco)}</b> · kandidat penggantian (rasio servis ≥ 50%): <b>{rasioTinggi.length}</b></p>
          <div className="overflow-x-auto"><table className="w-full min-w-[40rem] text-sm">
            <thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-1">Alat</th><th className="text-right">Harga</th><th className="text-right">Servis</th><th className="text-right">Energi</th><th className="text-right">TCO</th><th className="text-right">Rasio servis</th></tr></thead>
            <tbody>{tcoBaris.slice(0, 20).map((b) => (
              <tr key={b.a.id} className="border-b"><td className="py-1"><Link href={`/alat?kode=${encodeURIComponent(b.a.kode)}`} className="text-navy-800 hover:underline">{b.a.nama}</Link> <span className="text-xs text-muted-foreground">{b.a.unitKerja.nama}</span></td>
                <td className="text-right">{b.a.hargaPerolehan ? rp(b.a.hargaPerolehan) : "—"}</td><td className="text-right">{rp(b.biaya)}</td><td className="text-right">{b.energi ? rp(b.energi) : "—"}</td><td className="text-right font-medium">{rp(b.total)}</td>
                <td className={`text-right ${b.rasioServis != null && b.rasioServis >= 0.5 ? "font-bold text-red-700" : ""}`}>{b.rasioServis != null ? `${Math.round(b.rasioServis * 100)}%` : "—"}</td></tr>))}</tbody>
          </table></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><TrendingDown className="size-5 text-teal-700" /> Prediksi kerusakan (pemeliharaan prediktif)</CardTitle>
          <CardDescription>WHO 2025 §7.8: data inventaris &amp; riwayat membuka jalan pemeliharaan prediktif. Perkiraan dari rata-rata selang antar-laporan kerusakan (MTBF); butuh ≥ 2 laporan. Gunakan sebagai prioritas inspeksi, bukan kepastian.</CardDescription></CardHeader>
        <CardContent>
          {prediksi.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada alat dengan ≥ 2 laporan kerusakan.</p> : (
            <div className="overflow-x-auto"><table className="w-full min-w-[36rem] text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-1">Alat</th><th>Kejadian</th><th>MTBF</th><th>Perkiraan berikut</th></tr></thead>
              <tbody>{prediksi.map(({ a, p }) => (
                <tr key={a.id} className="border-b"><td className="py-1">{a.nama} <span className="text-xs text-muted-foreground">{a.kode}</span></td><td>{p!.kejadian}×</td><td>{p!.mtbf} hari</td>
                  <td className={p!.sisaHari <= 30 ? "font-bold text-red-700" : p!.sisaHari <= 90 ? "text-amber-700" : ""}>{p!.berikut.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" })} ({p!.sisaHari < 0 ? `lewat ${-p!.sisaHari} hr` : `${p!.sisaHari} hr lagi`})</td></tr>))}</tbody></table></div>)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Leaf className="size-5 text-teal-700" /> Keberlanjutan</CardTitle>
          <CardDescription>WHO 2025 §10: jejak energi alat, limbah elektronik/merkuri/radioaktif, hierarki limbah (cegah → kurangi → pakai ulang → daur ulang → pulihkan → olah → buang).</CardDescription></CardHeader>
        <CardContent className="grid gap-2 text-sm">
          <p>Daya terpasang tercatat: <b>{(totalWatt / 1000).toLocaleString("id-ID")} kW</b> (≈ {Math.round((totalWatt / 1000) * jam * 365).toLocaleString("id-ID")} kWh/tahun, {rp((totalWatt / 1000) * jam * 365 * tarif)}). Alat dengan pembuangan khusus: <b>{alat.filter((a) => a.pembuanganKhusus).length}</b>.</p>
          <p className="flex flex-wrap gap-2">{[...limbah].map(([k, n]) => <span key={k} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{k}: {n}</span>)}{limbah.size === 0 && <span className="text-muted-foreground">Kategori limbah belum diisi.</span>}</p>
        </CardContent>
      </Card>

      <Card id="penghapusan">
        <CardHeader><CardTitle className="flex items-center gap-2"><Recycle className="size-5 text-teal-700" /> Penghapusan alat (decommissioning)</CardTitle>
          <CardDescription>WHO 2025 §7.10–7.13 &amp; WHO <i>Decommissioning medical devices</i>: keputusan disinvestasi → dekontaminasi &amp; hapus data pasien (TTE PJ Alkes) → persetujuan (TTE Direktur) → dibuang / didonasikan / dijual / tukar tambah / dialihkan. Berita acara PDF dapat dilampirkan pada usulan penghapusan BMD.</CardDescription></CardHeader>
        <CardContent className="grid gap-3">
          {operator && (
            <form action={ajukanPenghapusan} className="grid gap-2 rounded-lg bg-slate-50 p-3 text-sm sm:grid-cols-3">
              <label className="grid gap-1 sm:col-span-3">Alat<select name="alatId" required className={inp} defaultValue=""><option value="" disabled>— pilih alat —</option>{alat.map((a) => <option key={a.id} value={a.id}>{a.nama} · {a.kode} · {a.unitKerja.nama}</option>)}</select></label>
              <label className="grid gap-1">Alasan<select name="alasan" required className={inp}>{["Rusak berat", "Usang / obsolete", "Tidak ekonomis diperbaiki", "Tidak aman", "Lainnya"].map((x) => <option key={x}>{x}</option>)}</select></label>
              <label className="grid gap-1">Tujuan<select name="tujuan" required className={inp}>{["Dibuang", "Didonasikan", "Dijual / lelang", "Tukar tambah", "Dialihkan internal"].map((x) => <option key={x}>{x}</option>)}</select></label>
              <label className="grid gap-1">Kategori limbah<select name="kategoriLimbah" className={inp} defaultValue=""><option value="">(dari data alat)</option>{["Limbah elektronik", "Mengandung baterai", "Mengandung merkuri", "Radioaktif", "Infeksius", "Umum"].map((x) => <option key={x}>{x}</option>)}</select></label>
              <label className="grid gap-1 sm:col-span-3">Keterangan<input name="keterangan" className={inp} placeholder="mis. hasil evaluasi teknis, nomor WO terakhir" /></label>
              <Button size="sm" variant="teal" className="justify-self-start">Ajukan penghapusan</Button>
            </form>
          )}
          {penghapusan.map((h) => { const a = namaAlat.get(h.alatId), t = ttd.filter((x) => x.nomor === h.nomor); return (
            <div key={h.nomor} className="grid gap-2 rounded-lg border p-3 text-sm">
              <p className="flex flex-wrap items-center gap-2"><b className="font-mono">{h.nomor}</b><span className="rounded-full bg-slate-100 px-2 text-xs">{h.status}</span>{a?.nama} <span className="text-muted-foreground">· {h.alasan} → {h.tujuan}{h.kategoriLimbah ? ` · ${h.kategoriLimbah}` : ""}</span>
                <Button size="sm" variant="outline" className="ml-auto" asChild><a href={`/api/admin/htm/penghapusan/${h.nomor}`} target="_blank" rel="noopener"><FileDown /> Berita acara</a></Button></p>
              {t.length > 0 && <p className="flex gap-2">{t.map((x) => <span key={x.peran} className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 text-xs"><PenLine className="size-3" />{x.peran === "PjAlkes" ? "PJ Alkes" : x.peran}: {x.nama}</span>)}</p>}
              {operator && h.status === "Diajukan" && (
                <form action={langkahPenghapusan} className="flex flex-wrap items-center gap-3"><input type="hidden" name="nomor" value={h.nomor} />
                  <label className="flex items-center gap-1"><input type="checkbox" name="dekontaminasi" /> Sudah didekontaminasi</label>
                  <label className="flex items-center gap-1"><input type="checkbox" name="dataDihapus" /> Data pasien sudah dihapus aman</label>
                  <Button size="sm" variant="teal" name="aksi" value="verifikasi">Verifikasi &amp; tandatangani (PJ Alkes)</Button></form>)}
              {admin && h.status === "Diverifikasi" && (
                <form action={langkahPenghapusan} className="flex gap-2"><input type="hidden" name="nomor" value={h.nomor} />
                  <Button size="sm" variant="teal" name="aksi" value="setujui">Setujui &amp; tandatangani (Direktur)</Button><Button size="sm" variant="outline" name="aksi" value="tolak">Tolak</Button></form>)}
            </div>); })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Cable className="size-5 text-teal-700" /> Uji terima &amp; integrasi</CardTitle></CardHeader>
        <CardContent className="grid gap-2 text-sm">
          <p><b>Lembar uji terima</b> (WHO §7.3): buka detail alat di Daftar Alat atau gunakan <code>/api/admin/htm/uji-terima/&lt;id alat&gt;</code> — PDF berisi daftar periksa kelengkapan, keamanan mekanik/listrik, pencatatan inventaris, instalasi, pelatihan, dan tanda tangan.</p>
          <p><b>Bridging ke aplikasi lain</b>: API baca <code>/api/integrasi/alat</code> (JSON atau <code>?format=csv</code>) dengan header <code>Authorization: Bearer &lt;INTEGRASI_TOKEN&gt;</code>; data IoT masuk lewat <code>/api/iot/bacaan</code>; impor/ekspor Excel tersedia di menu Impor &amp; Ekspor.</p>
        </CardContent>
      </Card>
    </div>
  );
}
