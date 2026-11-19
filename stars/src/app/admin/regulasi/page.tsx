import type { Metadata } from "next";
import Link from "next/link";
import { FileDown, Scale, Tag } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { sesiHalaman } from "@/lib/sesi";
import { unitTerkunci } from "@/lib/akses";
import { cukup } from "@/lib/peran";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { INTERNAL_RS, LAMPIRAN_I, klasifikasiP54, statusP54, type RisikoP54 } from "@/lib/permenkes54";
import { MatriksHta } from "./matriks-hta";

export const metadata: Metadata = { title: "Kepatuhan Regulasi" };
export const dynamic = "force-dynamic";

const WARNA: Record<string, string> = { patuh: "bg-emerald-100 text-emerald-800", belum: "bg-slate-200 text-slate-800", tidaklaik: "bg-red-100 text-red-800", pascaperbaikan: "bg-amber-100 text-amber-800", kedaluwarsa: "bg-orange-100 text-orange-800" };

export default async function RegulasiPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const s = await sesiHalaman("Viewer");
  const filter = (await searchParams).status ?? "";
  const kunci = await unitTerkunci();
  const alat = await prisma.alat.findMany({
    where: { aktif: true, ...(kunci ? { unitKerja: { nama: kunci.nama } } : {}) }, orderBy: [{ unitKerja: { urut: "asc" } }, { nama: "asc" }],
    select: { id: true, kode: true, nama: true, unitKerja: { select: { nama: true } },
      kalibrasi: { orderBy: [{ tanggal: "desc" }, { id: "desc" }], take: 1, select: { id: true, tanggal: true, berlakuSampai: true, laik: true } },
      perintah: { where: { status: "Selesai", tanggalSelesai: { not: null } }, orderBy: { tanggalSelesai: "desc" }, take: 1, select: { tanggalSelesai: true } } },
  });
  const baris = alat.flatMap((a) => {
    const kl = klasifikasiP54(a.nama);
    if (!kl) return [];
    const k = a.kalibrasi[0];
    return [{ a, kl, k, st: statusP54({ kalibrasiTerakhir: k?.tanggal ?? null, berlakuSampai: k?.berlakuSampai ?? null, laik: k?.laik ?? null, perbaikanTerakhir: a.perintah[0]?.tanggalSelesai ?? null }) }];
  });
  const hitung = (kode: string) => baris.filter((b) => b.st.kode === kode).length;
  const perRisiko = (r: RisikoP54) => baris.filter((b) => b.kl.risiko === r).length;
  const tampil = baris.filter((b) => !filter || b.st.kode === filter).sort((x, y) => Number(x.st.kode === "patuh") - Number(y.st.kode === "patuh")).slice(0, 300);
  const th = new Date().getFullYear(), tw = Math.floor(new Date().getMonth() / 3) + 1;

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Scale className="size-5 text-teal-700" /> Permenkes No. 54 Tahun 2015 — Pengujian dan Kalibrasi Alat Kesehatan</CardTitle>
          <CardDescription>Alat dicocokkan otomatis ke daftar Lampiran I (High/Medium/Low Risk). Pasal 8: uji/kalibrasi ≥ 1×/tahun dan wajib ulang setelah perbaikan; Pasal 9: sertifikat/surat keterangan + label hijau/merah; Pasal 36: laporan tiap 3 bulan.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
            {[["", "Wajib uji (Lampiran I)", baris.length], ["patuh", "Laik & berlaku", hitung("patuh")], ["kedaluwarsa", "Lewat 1 tahun", hitung("kedaluwarsa")], ["pascaperbaikan", "Uji ulang pasca-perbaikan", hitung("pascaperbaikan")], ["belum", "Belum pernah diuji", hitung("belum")], ["tidaklaik", "Tidak laik", hitung("tidaklaik")]].map(([k, l, n]) => (
              <Link key={String(k)} href={`/admin/regulasi${k ? `?status=${k}` : ""}`} className={`rounded-lg border p-3 hover:border-teal-500 ${filter === k ? "border-teal-600 ring-1 ring-teal-600" : ""}`}>
                <p className="text-2xl font-bold text-navy-900">{n}</p><p className="text-xs text-muted-foreground">{l}</p></Link>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Per risiko: High {perRisiko("High Risk")} · Medium {perRisiko("Medium Risk")} · Low {perRisiko("Low Risk")}. Alat yang boleh diuji internal oleh instalasi RS (Lampiran I.II): {INTERNAL_RS.join(", ")}.</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="teal" asChild><a href="/api/admin/kalibrasi/label" target="_blank" rel="noopener"><Tag /> Label laik/tidak laik pakai (semua)</a></Button>
            {cukup(s.user.peran, "Operator") && [1, 2, 3, 4].map((t) => (
              <Button key={t} size="sm" variant={t === tw ? "teal" : "outline"} asChild><a href={`/api/admin/kalibrasi/laporan?tahun=${th}&tw=${t}`} target="_blank" rel="noopener"><FileDown /> Laporan TW {["I", "II", "III", "IV"][t - 1]} {th}</a></Button>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] text-sm">
              <thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-1">Alat</th><th>Unit</th><th>Jenis Lampiran I</th><th>Risiko</th><th>Status Pasal 8</th><th>Dokumen</th></tr></thead>
              <tbody>
                {tampil.map(({ a, kl, k, st }) => (
                  <tr key={a.id} className="border-b">
                    <td className="py-1.5"><Link href={`/alat?kode=${encodeURIComponent(a.kode)}`} className="font-medium text-navy-800 hover:underline">{a.nama}</Link><br /><span className="font-mono text-xs text-muted-foreground">{a.kode}</span></td>
                    <td>{a.unitKerja.nama}</td><td>{kl.jenis}</td>
                    <td><span className={`rounded px-1.5 py-0.5 text-xs ${kl.risiko === "High Risk" ? "bg-red-50 text-red-700" : kl.risiko === "Medium Risk" ? "bg-amber-50 text-amber-700" : "bg-sky-50 text-sky-700"}`}>{kl.risiko}</span></td>
                    <td><span className={`rounded-full px-2 py-0.5 text-xs ${WARNA[st.kode]}`}>{st.label}</span></td>
                    <td className="whitespace-nowrap text-xs">{k ? <><a className="text-teal-700 hover:underline" href={`/api/admin/kalibrasi/${k.id}/sertifikat`} target="_blank" rel="noopener">{k.laik ? "Sertifikat" : "Surat ket."}</a> · <a className="text-teal-700 hover:underline" href={`/api/admin/kalibrasi/label?id=${k.id}`} target="_blank" rel="noopener">Label</a></> : <Link href={`/admin/kalibrasi?alat=${a.id}`} className="text-teal-700 hover:underline">Catat uji</Link>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {tampil.length === 0 && <p className="p-4 text-center text-sm text-muted-foreground">Tidak ada alat untuk filter ini.</p>}
          </div>
          <details className="text-sm"><summary className="cursor-pointer font-medium">Daftar lengkap Lampiran I ({Object.values(LAMPIRAN_I).flat().length} jenis)</summary>
            <div className="mt-2 grid gap-3 sm:grid-cols-3">{(Object.keys(LAMPIRAN_I) as RisikoP54[]).map((r) => <div key={r}><p className="font-semibold">{r}</p><ol className="list-decimal pl-5 text-xs">{LAMPIRAN_I[r].map((x) => <li key={x.nama}>{x.nama}</li>)}</ol></div>)}</div></details>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Permenkes No. 51 Tahun 2017 — Penilaian Teknologi Kesehatan (HTA)</CardTitle>
          <CardDescription>Format 3: Matriks penilaian penetapan topik PTK dengan 8 kriteria (Pasal 3 ayat 2). Analisis produk & perbandingan tetap di menu <Link href="/hta" className="text-teal-700 underline">HTA</Link>.</CardDescription></CardHeader>
        <CardContent><MatriksHta /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Permenkes No. 51 Tahun 2015 — Juknis Jabatan Fungsional Teknisi Elektromedis dan Angka Kreditnya</CardTitle>
          <CardDescription>Berkas yang diunggah hanya memuat batang tubuh (Pasal 1–2); rincian butir kegiatan & angka kredit ada di Lampiran yang belum diunggah. Kegiatan pemeliharaan, perbaikan, dan uji/kalibrasi yang tercatat di STARS (WO, preventif, kalibrasi, TTE) dapat menjadi bukti kegiatan untuk DUPAK.</CardDescription></CardHeader>
      </Card>
    </div>
  );
}
