import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { ArrowLeft, FileDown, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { sesiHalaman } from "@/lib/sesi";
import { cukup } from "@/lib/peran";
import { alamatQr } from "@/lib/alamat";
import { urlVerifikasi } from "@/lib/tte";
import type { IsiLK } from "@/lib/lembar-kerja";
import { Button } from "@/components/ui/button";
import { FormulirLK } from "../formulir";
import { alatUntukLK } from "../data";
import { hapusLK, putuskanLK } from "../actions";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ nomor: string }> }): Promise<Metadata> { return { title: (await params).nomor }; }
const inp = "h-9 w-full rounded-md border bg-white px-2 text-sm";
const H: Record<string, string> = { pass: "Pass", fail: "Fail", na: "N.A.", "": "—" };

export default async function DetailLK({ params, searchParams }: { params: Promise<{ nomor: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const se = await sesiHalaman("Viewer");
  const [{ nomor }, sp] = await Promise.all([params, searchParams]);
  const l = await prisma.lembarKerja.findUnique({ where: { nomor } });
  if (!l) notFound();
  const alat = await alatUntukLK({ id: l.alatId });
  if (!alat) notFound();
  const isi = JSON.parse(l.data) as IsiLK;
  const tte = await prisma.tandaTangan.findMany({ where: { nomor }, orderBy: { waktu: "asc" } });
  const dasar = alamatQr(await headers(), null, "");
  const bisaUbah = ["Draf", "Ditolak"].includes(l.status) && cukup(se.user.peran, "Operator") && (l.emailPemeriksa === se.user.email || cukup(se.user.peran, "Admin"));
  const admin = cukup(se.user.peran, "Admin");
  return (
    <div className="grid gap-4">
      <Link href={`/admin/lembar-kerja?kegiatan=${l.kegiatan}`} className="flex items-center gap-1 text-sm text-teal-800 hover:underline"><ArrowLeft className="size-4" /> Daftar lembar kerja</Link>
      {sp.ok && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{sp.ok}</p>}
      {sp.error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{sp.error}</p>}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-xl font-bold text-navy-900">{l.nomor} · Lembar Kerja {l.kegiatan === "Inspeksi" ? "Pemantauan Fungsi / Inspeksi" : "Pemeliharaan Preventif"}</h1>
          <p className="text-sm text-muted-foreground">{alat.nama} ({alat.kode}) · template {l.template ?? "—"} · status <b>{l.status}</b></p></div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild><a href={`/api/admin/lembar-kerja/${l.nomor}/pdf`} target="_blank" rel="noopener"><FileDown /> Cetak PDF</a></Button>
          {(admin || (l.status === "Draf" && l.emailPemeriksa === se.user.email)) && <form action={hapusLK}><input type="hidden" name="nomor" value={l.nomor} /><Button variant="ghost" size="sm">Hapus</Button></form>}
        </div>
      </div>

      {bisaUbah ? (
        <FormulirLK alat={alat} pemeriksa={l.pemeriksa} v={{ nomor: l.nomor, kegiatan: l.kegiatan, tipeInspeksi: l.tipeInspeksi, tanggal: l.tanggal.toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" }), hasil: l.hasil, perhatian: l.perhatian ?? "", catatan: l.catatan ?? "", template: l.template, isi, alasanTolak: l.status === "Ditolak" ? l.alasanTolak : null }} />
      ) : (
        <div className="grid gap-3 rounded-xl border bg-white p-4 text-sm md:grid-cols-2">
          <p><b>Inspeksi:</b> {l.tipeInspeksi} · <b>Tanggal:</b> {l.tanggal.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" })}</p>
          <p><b>Status hasil:</b> {l.hasil} · <b>Pemeriksa:</b> {l.pemeriksa}</p>
          {l.perhatian && <p className="md:col-span-2"><b>Perhatian khusus:</b> {l.perhatian}</p>}
          {isi.apparatus.length > 0 && <p className="md:col-span-2"><b>Test apparatus:</b> {isi.apparatus.map((a) => `${a.nama}${a.sn ? ` (${a.sn})` : ""}`).join("; ")}</p>}
          <div><p className="mb-1 font-semibold">Qualitative tasks</p><ul className="grid gap-0.5">{isi.kualitatif.map((q) => <li key={q.butir} className="flex justify-between gap-2 border-b py-0.5"><span>{q.butir}</span><b className={q.hasil === "fail" ? "text-red-700" : ""}>{H[q.hasil]}</b></li>)}</ul></div>
          <div className="grid content-start gap-3">
            {isi.kuantitatif.length > 0 && <div><p className="mb-1 font-semibold">Quantitative tasks</p><ul className="grid gap-0.5">{isi.kuantitatif.map((k) => <li key={k.parameter} className="flex justify-between gap-2 border-b py-0.5"><span>{k.parameter} <span className="text-xs text-muted-foreground">({k.kriteria})</span></span><span>{k.ukur || "—"} · <b className={k.hasil === "fail" ? "text-red-700" : ""}>{H[k.hasil]}</b></span></li>)}</ul></div>}
            <div><p className="mb-1 font-semibold">Preventive maintenance</p><ul className="grid gap-0.5">{isi.preventif.map((p) => <li key={p.butir} className="flex justify-between gap-2 border-b py-0.5"><span>{p.butir}</span><b>{p.done ? "✓" : "—"}</b></li>)}</ul></div>
          </div>
          {l.catatan && <p className="md:col-span-2"><b>Catatan:</b> {l.catatan}</p>}
        </div>
      )}

      <section aria-label="Persetujuan" className="grid gap-3 rounded-xl border bg-card p-4">
        <h2 className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-5 text-teal-700" /> Persetujuan (TTE)</h2>
        <ol className="grid gap-2 sm:grid-cols-2">
          {[["Teknisi", "Dikerjakan oleh Teknisi Elektromedis"], ["PjAlkes", "Disetujui PJ Alat Kesehatan / Ka. Instalasi"]].map(([p, j]) => { const t = tte.find((x) => x.peran === p); return (
            <li key={p} className={`rounded-lg border p-3 text-sm ${t ? "border-emerald-300 bg-emerald-50" : "border-dashed"}`}><p className="font-medium">{j}</p>
              {t ? <p>{t.nama}{t.identitas ? ` · ${t.identitas}` : ""}<br /><span className="text-xs text-muted-foreground">{t.waktu.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} · <a className="underline" href={urlVerifikasi(dasar, t.token)}>verifikasi</a></span></p> : <p className="text-muted-foreground">Belum ditandatangani</p>}</li>); })}
        </ol>
        {l.status === "Diajukan" && (admin ? (
          <div className="grid gap-3 md:grid-cols-2">
            <form action={putuskanLK} className="grid gap-2 rounded-lg bg-emerald-50 p-3"><input type="hidden" name="nomor" value={l.nomor} />
              <label className="grid gap-1 text-xs font-medium">Nama PJ Alkes<input name="nama" defaultValue={se.user.name ?? ""} className={inp} /></label>
              <label className="grid gap-1 text-xs font-medium">NIP/NRK (opsional)<input name="nip" inputMode="numeric" className={inp} /></label>
              <Button variant="teal" name="aksi" value="setujui">Setujui &amp; tandatangani</Button></form>
            <form action={putuskanLK} className="grid gap-2 rounded-lg bg-red-50 p-3"><input type="hidden" name="nomor" value={l.nomor} />
              <label className="grid gap-1 text-xs font-medium">Alasan dikembalikan<textarea name="alasan" rows={3} className="rounded-md border bg-white px-2 py-1 text-sm" /></label>
              <Button variant="outline" name="aksi" value="tolak">Kembalikan ke teknisi</Button></form>
          </div>
        ) : <p className="text-sm text-muted-foreground">Menunggu persetujuan PJ Alat Kesehatan (akun Admin).</p>)}
        {l.status === "Disetujui" && l.hasil !== "Lolos" && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">Hasil <b>{l.hasil}</b> — tindak lanjuti dengan <Link className="underline" href={`/lapor?alat=${encodeURIComponent(alat.kode)}`}>laporan kerusakan / pemeliharaan korektif</Link>{l.hasil === "KTD" && " dan pelaporan KTD ke Komite Mutu & Keselamatan Pasien"}.</p>}
      </section>
    </div>
  );
}
