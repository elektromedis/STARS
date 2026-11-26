import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { sesiHalaman } from "@/lib/sesi";
import { ambilKinerja, fmtJam } from "@/lib/kinerja";
import { hitungPenyusutan } from "@/lib/master";
import { inp, inputTgl, rp } from "@/lib/aksi-admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Kinerja Pemeliharaan & Penyusutan" };
export const dynamic = "force-dynamic";

const Angka = ({ label, nilai, ket }: { label: string; nilai: string; ket?: string }) => (
  <div className="rounded-xl border bg-card p-4"><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 text-2xl font-semibold text-navy-900">{nilai}</div>{ket && <div className="text-xs text-muted-foreground">{ket}</div>}</div>
);

export default async function KinerjaPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await sesiHalaman("Viewer");
  const sp = await searchParams;
  const sampai = sp.sampai && !Number.isNaN(Date.parse(sp.sampai)) ? new Date(`${sp.sampai}T23:59:59+07:00`) : new Date();
  const dari = sp.dari && !Number.isNaN(Date.parse(sp.dari)) ? new Date(`${sp.dari}T00:00:00+07:00`) : new Date(sampai.getTime() - 90 * 86_400_000);
  const k = await ambilKinerja(dari, sampai);

  const alat = await prisma.alat.findMany({ where: { aktif: true, hargaPerolehan: { not: null } }, select: { hargaPerolehan: true, nilaiResidu: true, usiaTeknis: true, tanggalTerhitung: true, tahunPerolehan: true, unitKerja: { select: { nama: true } } } });
  const unit = new Map<string, { n: number; harga: number; buku: number; akum: number; habis: number; tanpaData: number }>();
  for (const a of alat) {
    const e = unit.get(a.unitKerja.nama) ?? { n: 0, harga: 0, buku: 0, akum: 0, habis: 0, tanpaData: 0 };
    const p = hitungPenyusutan(a); e.n++; e.harga += a.hargaPerolehan ?? 0;
    if (p) { e.buku += p.nilaiBuku; e.akum += p.akumulasi; if (p.habis) e.habis++; } else { e.buku += a.hargaPerolehan ?? 0; e.tanpaData++; }
    unit.set(a.unitKerja.nama, e);
  }
  const tot = [...unit.values()].reduce((x, e) => ({ n: x.n + e.n, harga: x.harga + e.harga, buku: x.buku + e.buku, akum: x.akum + e.akum, habis: x.habis + e.habis, tanpaData: x.tanpaData + e.tanpaData }), { n: 0, harga: 0, buku: 0, akum: 0, habis: 0, tanpaData: 0 });

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader><CardTitle>Kinerja Pemeliharaan</CardTitle><CardDescription>Waktu tanggap, penyelesaian, kepatuhan preventif, dan kinerja teknisi pada rentang tanggal pembuatan perintah kerja.</CardDescription>
          <form className="flex flex-wrap items-end gap-2 pt-2"><label className="grid gap-1 text-xs">Dari<input type="date" name="dari" defaultValue={inputTgl(dari)} className={inp} /></label><label className="grid gap-1 text-xs">Sampai<input type="date" name="sampai" defaultValue={inputTgl(sampai)} className={inp} /></label><Button variant="outline">Terapkan</Button></form></CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Angka label="Waktu tanggap rata-rata (korektif)" nilai={fmtJam(k.tanggapRata)} ket={`median ${fmtJam(k.tanggapMedian)} · laporan → ditangani`} />
            <Angka label="Waktu penyelesaian rata-rata" nilai={fmtJam(k.selesaiRata)} ket={`median ${fmtJam(k.selesaiMedian)} · ${k.korektif} WO korektif`} />
            <Angka label="Kepatuhan preventif" nilai={k.kepatuhanPreventif == null ? "—" : `${k.kepatuhanPreventif.toFixed(0)}%`} ket={`${k.preventifSelesai}/${k.preventifTotal} WO preventif selesai`} />
            <Angka label="Jadwal preventif terlambat" nilai={String(k.jadwalTerlambat)} ket={`dari ${k.jadwalAktif} jadwal aktif`} />
            <Angka label="Rating pengguna" nilai={k.ratingRata == null ? "—" : `${k.ratingRata.toFixed(2)} / 5`} ket={`${k.jumlahRating} penilaian`} />
            <Angka label="Total perintah kerja" nilai={String(k.totalWo)} />
          </div>
          <div className="overflow-x-auto"><h3 className="mb-1 text-sm font-semibold text-navy-900">Kinerja teknisi</h3><table className="w-full text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-2">Teknisi</th><th>WO</th><th>Selesai</th><th>% selesai</th><th>Rata-rata pengerjaan</th><th>Rating</th><th>Poin SKP</th><th>Biaya</th></tr></thead>
            <tbody>{k.teknisi.map((t) => <tr key={t.nama} className="border-b"><td className="py-2 font-medium">{t.nama}</td><td>{t.total}</td><td>{t.selesai}</td><td>{t.persenSelesai.toFixed(0)}%</td><td>{fmtJam(t.rataJam)}</td><td>{t.rataRating == null ? "—" : t.rataRating.toFixed(2)}</td><td>{t.poin}</td><td>{rp(t.biaya)}</td></tr>)}
              {!k.teknisi.length && <tr><td colSpan={8} className="py-4 text-center text-muted-foreground">Belum ada perintah kerja pada rentang ini.</td></tr>}</tbody></table></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Penyusutan Aset Alat</CardTitle><CardDescription>Garis lurus: (harga perolehan − nilai residu) ÷ usia teknis, dihitung sejak tanggal terhitung (atau 1 Januari tahun perolehan). Alat tanpa harga/usia teknis dihitung utuh sebagai nilai buku. Lengkapi data di <Link className="underline" href="/admin/logbook">Log Book</Link>.</CardDescription></CardHeader>
        <CardContent className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-2">Unit kerja</th><th>Alat</th><th>Harga perolehan</th><th>Akumulasi penyusutan</th><th>Nilai buku</th><th>Habis disusutkan</th><th>Data belum lengkap</th></tr></thead>
          <tbody>{[...unit.entries()].sort((a, b) => b[1].harga - a[1].harga).map(([n, e]) => <tr key={n} className="border-b"><td className="py-2 font-medium">{n}</td><td>{e.n}</td><td>{rp(e.harga)}</td><td>{rp(e.akum)}</td><td>{rp(e.buku)}</td><td>{e.habis}</td><td>{e.tanpaData}</td></tr>)}
            <tr className="font-semibold"><td className="py-2">Total</td><td>{tot.n}</td><td>{rp(tot.harga)}</td><td>{rp(tot.akum)}</td><td>{rp(tot.buku)}</td><td>{tot.habis}</td><td>{tot.tanpaData}</td></tr></tbody></table></CardContent>
      </Card>
    </div>
  );
}
