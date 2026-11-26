import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { sesiHalaman } from "@/lib/sesi";
import { unitTerkunci } from "@/lib/akses";
import { cukup } from "@/lib/peran";
import { hitungPenyusutan } from "@/lib/master";
import { inp, inputTgl, rp, tgl } from "@/lib/aksi-admin";
import { Flash } from "@/components/admin/flash";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { simpanAsetTambahan } from "./actions";

export const metadata: Metadata = { title: "Log Book Alat" };
export const dynamic = "force-dynamic";

type Kejadian = { waktu: Date; jenis: string; judul: string; rinci?: string | null; href?: string };

export default async function LogBookPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const se = await sesiHalaman("Viewer");
  const sp = await searchParams;
  const op = cukup(se.user.peran, "Operator") && process.env.STARS_MODE !== "internet";
  const kode = (sp.kode ?? "").trim();
  const kunci = await unitTerkunci();
  const alat = kode ? await prisma.alat.findFirst({ where: { kode, ...(kunci ? { unitKerja: { nama: kunci.nama } } : {}) }, include: { unitKerja: true, ruangan: true, penerimaan: { include: { rekanan: true } } } }) : null;
  let kejadian: Kejadian[] = [];
  let jad: { id: number; nama: string; berikutnya: Date | null; intervalHari: number }[] = [];
  if (alat) {
    const [wo, lk, kal, mut, jadwal] = await Promise.all([
      prisma.perintahKerja.findMany({ where: { alatId: alat.id }, orderBy: { createdAt: "desc" }, take: 200, include: { teknisi: { select: { nama: true } } } }),
      prisma.lembarKerja.findMany({ where: { alatId: alat.id }, orderBy: { tanggal: "desc" }, take: 200 }),
      prisma.kalibrasi.findMany({ where: { alatId: alat.id }, orderBy: { tanggal: "desc" }, take: 100 }),
      prisma.mutasiAlat.findMany({ where: { alatId: alat.id }, orderBy: { createdAt: "desc" }, take: 100 }),
      prisma.jadwalPreventif.findMany({ where: { alatId: alat.id, aktif: true }, orderBy: { berikutnya: "asc" } }),
    ]);
    kejadian = [
      ...wo.map((w) => ({ waktu: w.createdAt, jenis: `WO ${w.jenis}`, judul: `${w.nomor} — ${w.status}`, rinci: [w.deskripsi, w.tindakan && `Tindakan: ${w.tindakan}`, w.teknisi && `Teknisi: ${w.teknisi.nama}`, w.rating && `Rating ${w.rating}/5`].filter(Boolean).join(" · ") })),
      ...lk.map((l) => ({ waktu: l.tanggal, jenis: `Lembar kerja ${l.kegiatan}`, judul: `${l.nomor} — ${l.hasil} (${l.status})`, rinci: l.catatan, href: `/admin/lembar-kerja/${l.nomor}` })),
      ...kal.map((k) => ({ waktu: k.tanggal, jenis: k.jenis, judul: `${k.kalibrator} — ${k.laik ? "laik" : "tidak laik"}`, rinci: [k.nomorSertifikat && `No. ${k.nomorSertifikat}`, k.berlakuSampai && `berlaku s.d. ${tgl(k.berlakuSampai)}`].filter(Boolean).join(" · ") })),
      ...mut.map((m) => ({ waktu: m.createdAt, jenis: m.jenis, judul: `${m.nomor} — ${m.status}`, rinci: `${m.dariUnit}${m.dariRuangan ? ` / ${m.dariRuangan}` : ""} → ${m.keUnit}${m.keRuangan ? ` / ${m.keRuangan}` : ""}. ${m.alasan}` })),
    ].sort((a, b) => b.waktu.getTime() - a.waktu.getTime());
    jad = jadwal;
  }
  const susut = alat ? hitungPenyusutan(alat) : null;
  return (
    <div className="grid gap-4">
      <Flash ok={sp.ok} error={sp.error} />
      <Card><CardHeader><CardTitle>Log Book Alat</CardTitle><CardDescription>Seluruh riwayat satu alat dalam satu garis waktu: perbaikan, preventif, inspeksi, kalibrasi, dan mutasi.</CardDescription></CardHeader>
        <CardContent><form className="flex gap-2"><input name="kode" defaultValue={kode} placeholder="Kode alat" className={`${inp} max-w-xs`} /><Button variant="teal">Buka</Button></form>
          {kode && !alat && <p className="mt-2 text-sm text-red-700">Alat dengan kode “{kode}” tidak ditemukan.</p>}</CardContent></Card>
      {alat && <>
        <Card><CardHeader><CardTitle>{alat.nama} <span className="text-sm font-normal text-muted-foreground">({alat.kode})</span></CardTitle><CardDescription>{[alat.merek, alat.model, alat.nomorSeri && `SN ${alat.nomorSeri}`].filter(Boolean).join(" · ")} — {alat.unitKerja.nama}{alat.ruangan ? ` / ${alat.ruangan.nama}` : ""} · kondisi {alat.kondisi} · {alat.statusOperasi}</CardDescription></CardHeader>
          <CardContent className="grid gap-3 text-sm lg:grid-cols-2">
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1">
              <dt className="text-muted-foreground">Penerimaan</dt><dd>{alat.penerimaan ? <Link className="text-teal-800 hover:underline" href={`/admin/penerimaan?id=${alat.penerimaan.id}`}>{alat.penerimaan.nomor} · {alat.penerimaan.nomorKontrak}</Link> : "—"}</dd>
              <dt className="text-muted-foreground">Rekanan</dt><dd>{alat.penerimaan?.rekanan?.nama ?? "—"}</dd>
              <dt className="text-muted-foreground">Harga perolehan</dt><dd>{rp(alat.hargaPerolehan)}</dd>
              <dt className="text-muted-foreground">Penyusutan / tahun</dt><dd>{susut ? rp(susut.perTahun) : "— (lengkapi harga, usia teknis, tanggal terhitung)"}</dd>
              <dt className="text-muted-foreground">Nilai buku saat ini</dt><dd>{susut ? `${rp(susut.nilaiBuku)} (${susut.persen.toFixed(0)}% usia manfaat${susut.habis ? ", habis disusutkan" : ""})` : "—"}</dd>
              <dt className="text-muted-foreground">Jadwal preventif aktif</dt><dd>{jad.length ? jad.map((j) => `${j.nama} (tiap ${j.intervalHari} hr, berikut ${tgl(j.berikutnya)})`).join("; ") : "—"}</dd>
            </dl>
            {op ? <form action={simpanAsetTambahan} className="grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-3">
              <input type="hidden" name="kode" value={alat.kode} />
              <label className="grid gap-1 text-xs">No. internal<input name="noInternal" defaultValue={alat.noInternal ?? ""} className={inp} /></label>
              <label className="grid gap-1 text-xs">Urutan sejenis<input type="number" min={0} name="urutJenis" defaultValue={alat.urutJenis ?? ""} className={inp} /></label>
              <label className="grid gap-1 text-xs">Sole agent<input name="soleAgent" defaultValue={alat.soleAgent ?? ""} className={inp} /></label>
              <label className="grid gap-1 text-xs">Tanggal terhitung<input type="date" name="tanggalTerhitung" defaultValue={inputTgl(alat.tanggalTerhitung)} className={inp} /></label>
              <label className="grid gap-1 text-xs">Nilai residu (Rp)<input type="number" min={0} step="any" name="nilaiResidu" defaultValue={alat.nilaiResidu ?? ""} className={inp} /></label>
              <label className="grid gap-1 text-xs">No. penerimaan<input name="penerimaan" placeholder="PNR-2026-0001" defaultValue={alat.penerimaan?.nomor ?? ""} className={inp} /></label>
              <label className="grid gap-1 text-xs">Kode SIMAK<input name="kodeSimak" defaultValue={alat.kodeSimak ?? ""} className={inp} /></label>
              <label className="grid gap-1 text-xs">Kode SIMBADA<input name="kodeSimbada" defaultValue={alat.kodeSimbada ?? ""} className={inp} /></label>
              <Button variant="teal" className="self-end">Simpan</Button>
              <p className="text-xs text-muted-foreground sm:col-span-3">Kode SIMAK/SIMBADA dan ASPAK ({alat.kodeAspak ?? "belum diisi"}) hanya dicatat; STARS tidak tersambung ke sistem tersebut.</p>
            </form> : <dl className="grid grid-cols-2 gap-x-3 text-sm"><dt className="text-muted-foreground">No. internal</dt><dd>{alat.noInternal ?? "—"}</dd><dt className="text-muted-foreground">Sole agent</dt><dd>{alat.soleAgent ?? "—"}</dd><dt className="text-muted-foreground">SIMAK / SIMBADA</dt><dd>{alat.kodeSimak ?? "—"} / {alat.kodeSimbada ?? "—"}</dd></dl>}
          </CardContent></Card>
        <Card><CardHeader><CardTitle>Garis waktu ({kejadian.length})</CardTitle></CardHeader><CardContent>
          <ol className="grid gap-2 border-l-2 pl-4">{kejadian.map((k, i) => <li key={i} className="relative text-sm"><span className="absolute -left-[1.4rem] top-1.5 size-2.5 rounded-full bg-teal-600" /><div className="text-xs text-muted-foreground">{tgl(k.waktu)} · {k.jenis}</div><div className="font-medium">{k.href ? <Link className="text-teal-800 hover:underline" href={k.href}>{k.judul}</Link> : k.judul}</div>{k.rinci && <div className="text-muted-foreground">{k.rinci}</div>}</li>)}
            {!kejadian.length && <li className="text-sm text-muted-foreground">Belum ada riwayat untuk alat ini.</li>}</ol></CardContent></Card>
      </>}
    </div>
  );
}
