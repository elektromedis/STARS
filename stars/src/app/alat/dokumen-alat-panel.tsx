"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ban, CheckCircle2, ExternalLink, FileCheck2, FileText, FolderOpen, Loader2, Lock, Plus, Trash2, Upload, X, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { infoJenisDokumenAlat, JENIS_DOKUMEN_ALAT, JENIS_UNGGAH_ALAT, KELOMPOK_DOKUMEN_ALAT, MAKS_DOKUMEN_ALAT, TERIMA_DOKUMEN_ALAT } from "@/lib/dokumen-alat";
import { ukuranMb } from "@/lib/lapor-media";
import { tglIndo } from "@/lib/kalibrasi";
import { unggahDenganKemajuan } from "@/lib/gambar";
import { cn } from "@/lib/utils";

export type DokumenRingkas = {
  id: number; jenis: string; namaBerkas: string; berkas: string; ukuran: number; nomor: string | null; tanggal: string | null; keterangan: string | null; createdAt: string;
};
type Sertifikat = { id: number; namaBerkas: string; tanggal: string; jenis: string } | null;

/**
 * Dokumen alat ala Trilux: File Penerimaan, File Pendukung, File Lainnya. Kotak abu-abu bertanda ⦸ = belum ada.
 * Daftar dokumen publik; MEMBUKA berkas wajib login. Operator+ dapat mengunggah & menghapus.
 */
export function DokumenAlatPanel({ alat, dokumen, sertifikat, masuk, bolehKelola, sejenis, dipakaiBersama }: {
  alat: { id: number; kode: string; nama: string; tipe: string }; dokumen: DokumenRingkas[]; sertifikat: Sertifikat;
  masuk: boolean; bolehKelola: boolean; sejenis: number; dipakaiBersama: Record<string, number>;
}) {
  const [terbuka, setTerbuka] = useState<string | null>(null);
  const [unggah, setUnggah] = useState<string | null>(null);
  const perJenis = (j: string) => dokumen.filter((d) => d.jenis === j);
  const lainnya = perJenis("LAINNYA");
  const slotTerisi = JENIS_DOKUMEN_ALAT.filter((j) => j.kelompok !== "lainnya" && (j.dariKalibrasi ? sertifikat : perJenis(j.kode).length)).length;

  return (
    <Card id="dokumen" className="scroll-mt-24">
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2"><FolderOpen className="size-4 text-teal-700" /> File Penerimaan &amp; File Pendukung</CardTitle>
          <CardDescription>{slotTerisi} dari {JENIS_DOKUMEN_ALAT.filter((j) => j.kelompok !== "lainnya").length} jenis dokumen tersedia{lainnya.length ? ` · ${lainnya.length} file lainnya` : ""}. {masuk ? "Klik dokumen untuk membuka." : "Masuk sebagai petugas untuk membuka berkas."}</CardDescription>
        </div>
        {bolehKelola && <Button size="sm" variant="teal" onClick={() => setUnggah("")}><Upload /> Unggah dokumen</Button>}
      </CardHeader>
      <CardContent className="grid gap-6">
        {KELOMPOK_DOKUMEN_ALAT.filter((k) => k.kode !== "lainnya").map((k) => {
          const jenis = JENIS_DOKUMEN_ALAT.filter((j) => j.kelompok === k.kode);
          const pilihan = jenis.find((j) => j.kode === terbuka);
          return (
            <section key={k.kode} aria-labelledby={`judul-${k.kode}`}>
              <h4 id={`judul-${k.kode}`} className="mb-2 text-sm font-semibold text-navy-800">{k.judul}</h4>
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                {jenis.map((j) => {
                  const n = j.dariKalibrasi ? (sertifikat ? 1 : 0) : perJenis(j.kode).length;
                  const ada = n > 0;
                  const aktif = terbuka === j.kode;
                  return (
                    <li key={j.kode}>
                      <button type="button" aria-expanded={ada ? aktif : undefined}
                        onClick={() => (ada ? setTerbuka(aktif ? null : j.kode) : bolehKelola && !j.dariKalibrasi ? setUnggah(j.kode) : setTerbuka(aktif ? null : j.kode))}
                        title={ada ? `${j.label}: ${n} berkas` : `${j.label}: belum ada`}
                        className={cn("relative flex h-24 w-full flex-col items-center justify-center gap-1.5 rounded-lg border p-2 text-center text-[11px] font-medium leading-tight transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400",
                          ada ? "border-teal-200 bg-teal-50/60 text-navy-800 hover:border-teal-400 hover:bg-teal-50" : "border-dashed bg-muted/30 text-muted-foreground hover:bg-muted/60",
                          aktif && "border-teal-500 ring-2 ring-teal-200")}>
                        {ada ? <FileCheck2 className="size-7 text-teal-600" aria-hidden /> : <Ban className="size-7 opacity-50" aria-hidden />}
                        {j.singkat}
                        {n > 1 && <span className="absolute right-1.5 top-1.5 rounded-full bg-teal-600 px-1.5 text-[10px] font-bold text-white">{n}</span>}
                        {!ada && bolehKelola && !j.dariKalibrasi && <span className="absolute right-1.5 top-1.5 text-teal-700"><Plus className="size-3.5" /></span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
              {pilihan && (
                <div className="mt-3 rounded-lg border bg-muted/20 p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-navy-800">{pilihan.label}</p>
                    <div className="flex gap-2">
                      {bolehKelola && !pilihan.dariKalibrasi && <Button size="sm" variant="outline" onClick={() => setUnggah(pilihan.kode)}><Plus /> Tambah berkas</Button>}
                      {bolehKelola && pilihan.dariKalibrasi && <Button size="sm" variant="outline" asChild><Link href={`/admin/kalibrasi?alat=${alat.id}#input-kalibrasi`}><Plus /> Catat di CMS Kalibrasi</Link></Button>}
                      <Button size="sm" variant="ghost" onClick={() => setTerbuka(null)} aria-label="Tutup daftar"><X /></Button>
                    </div>
                  </div>
                  {pilihan.dariKalibrasi ? (
                    sertifikat ? (
                      <ul className="divide-y rounded-md border bg-card">
                        <li className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                          <FileText className="size-4 shrink-0 text-teal-700" />
                          <span className="min-w-0 flex-1 truncate">{sertifikat.namaBerkas}<span className="block text-xs text-muted-foreground">{sertifikat.jenis} {tglIndo(sertifikat.tanggal)}</span></span>
                          <BukaBerkas href={`/api/kalibrasi/${sertifikat.id}/sertifikat`} masuk={masuk} kode={alat.kode} />
                        </li>
                      </ul>
                    ) : <p className="text-sm text-muted-foreground">Belum ada sertifikat. Sertifikat diunggah lewat Admin → Kalibrasi (isi otomatis dari PDF).</p>
                  ) : (
                    <DaftarBerkas daftar={perJenis(pilihan.kode)} masuk={masuk} bolehKelola={bolehKelola} kode={alat.kode} dipakaiBersama={dipakaiBersama} kosong="Belum ada berkas." />
                  )}
                </div>
              )}
            </section>
          );
        })}

        <section aria-labelledby="judul-lainnya">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h4 id="judul-lainnya" className="text-sm font-semibold text-navy-800">File Lainnya</h4>
            {bolehKelola && <Button size="sm" variant="outline" onClick={() => setUnggah("LAINNYA")}><Plus /> Tambah</Button>}
          </div>
          <DaftarBerkas daftar={lainnya} masuk={masuk} bolehKelola={bolehKelola} kode={alat.kode} dipakaiBersama={dipakaiBersama} kosong="Tidak ada file lainnya (mis. foto penerimaan, brosur, surat dukungan)." />
        </section>
      </CardContent>
      {unggah !== null && <DialogUnggah alat={alat} jenisAwal={unggah} sejenis={sejenis} onTutup={() => setUnggah(null)} />}
    </Card>
  );
}

function BukaBerkas({ href, masuk, kode }: { href: string; masuk: boolean; kode: string }) {
  if (masuk) return <Button size="sm" variant="outline" asChild><a href={href} target="_blank" rel="noopener noreferrer"><ExternalLink /> Buka</a></Button>;
  return <Button size="sm" variant="ghost" asChild><Link href={`/login?callbackUrl=${encodeURIComponent(`/alat?kode=${kode}#dokumen`)}`}><Lock /> Masuk untuk membuka</Link></Button>;
}

function DaftarBerkas({ daftar, masuk, bolehKelola, kode, dipakaiBersama, kosong }: {
  daftar: DokumenRingkas[]; masuk: boolean; bolehKelola: boolean; kode: string; dipakaiBersama: Record<string, number>; kosong: string;
}) {
  const router = useRouter();
  const [hapus, setHapus] = useState<number | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  async function lakukanHapus(d: DokumenRingkas, semua: boolean) {
    const n = dipakaiBersama[d.berkas] ?? 1;
    if (!window.confirm(semua ? `Lepas "${d.namaBerkas}" dari SEMUA ${n} alat yang memakainya?` : `Hapus "${d.namaBerkas}" dari alat ini?`)) return;
    setHapus(d.id); setGalat(null);
    const r = await fetch(`/api/admin/alat/dokumen/${d.id}${semua ? "?semua=1" : ""}`, { method: "DELETE" }).catch(() => null);
    setHapus(null);
    if (r?.ok) router.refresh(); else setGalat(((await r?.json().catch(() => null)) as { error?: string } | null)?.error ?? "Gagal menghapus.");
  }
  if (daftar.length === 0) return <p className="text-sm text-muted-foreground">{kosong}</p>;
  return (
    <>
      <ul className="divide-y rounded-md border bg-card">
        {daftar.map((d) => {
          const bersama = dipakaiBersama[d.berkas] ?? 1;
          return (
            <li key={d.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
              <FileText className="size-4 shrink-0 text-teal-700" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-navy-800">{d.namaBerkas}</span>
                <span className="block text-xs text-muted-foreground">
                  {[infoJenisDokumenAlat(d.jenis)?.label, d.nomor ? `No. ${d.nomor}` : null, d.tanggal ? tglIndo(d.tanggal) : null, ukuranMb(d.ukuran), bolehKelola && bersama > 1 ? `dipakai ${bersama} alat` : null].filter(Boolean).join(" · ")}
                </span>
                {d.keterangan && <span className="block text-xs text-muted-foreground">{d.keterangan}</span>}
              </span>
              <BukaBerkas href={`/api/alat/dokumen/${d.id}`} masuk={masuk} kode={kode} />
              {bolehKelola && (
                <span className="flex gap-1">
                  <Button size="sm" variant="ghost" disabled={hapus === d.id} onClick={() => lakukanHapus(d, false)} aria-label={`Hapus ${d.namaBerkas} dari alat ini`} title="Hapus dari alat ini">
                    {hapus === d.id ? <Loader2 className="animate-spin" /> : <Trash2 />}
                  </Button>
                  {bersama > 1 && <Button size="sm" variant="ghost" className="text-red-700" disabled={hapus === d.id} onClick={() => lakukanHapus(d, true)} title={`Lepas dari semua ${bersama} alat`}>Semua ({bersama})</Button>}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {galat && <p role="alert" className="mt-1 text-xs text-red-700">{galat}</p>}
    </>
  );
}

function DialogUnggah({ alat, jenisAwal, sejenis, onTutup }: { alat: { id: number; nama: string; tipe: string }; jenisAwal: string; sejenis: number; onTutup: () => void }) {
  const router = useRouter();
  const [jenis, setJenis] = useState(jenisAwal || JENIS_UNGGAH_ALAT[0].kode);
  const [file, setFile] = useState<File | null>(null);
  const [terapkan, setTerapkan] = useState(Boolean(infoJenisDokumenAlat(jenisAwal)?.samaModel));
  const [kirim, setKirim] = useState<{ persen: number } | null>(null);
  const [hasil, setHasil] = useState<{ ok?: string; error?: string } | null>(null);
  const tutupRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    tutupRef.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onTutup(); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onTutup]);

  function gantiJenis(j: string) { setJenis(j); setTerapkan(Boolean(infoJenisDokumenAlat(j)?.samaModel)); }

  async function simpan(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) { setHasil({ error: "Pilih berkas dokumen." }); return; }
    if (file.size > MAKS_DOKUMEN_ALAT) { setHasil({ error: `Berkas ${ukuranMb(file.size)} melebihi 30 MB.` }); return; }
    const fd = new FormData(e.currentTarget);
    fd.set("alatId", String(alat.id)); fd.set("jenis", jenis); fd.set("sejenis", terapkan && sejenis > 0 ? "1" : "0"); fd.set("file", file);
    setKirim({ persen: 0 }); setHasil(null);
    const r = await unggahDenganKemajuan("/api/admin/alat/dokumen", fd, (p) => setKirim({ persen: p }));
    setKirim(null);
    if (r.status === 200) { setHasil({ ok: String(r.data.ok ?? "Tersimpan.") }); router.refresh(); window.setTimeout(onTutup, 900); }
    else setHasil({ error: String(r.data.error ?? `Gagal (kode ${r.status}).`) });
  }

  return createPortal(
    <div className="fixed inset-0 z-[75] flex items-end justify-center bg-navy-950/60 backdrop-blur-sm sm:items-center sm:p-4" onClick={onTutup}>
      <div role="dialog" aria-modal="true" aria-label="Unggah dokumen alat" onClick={(e) => e.stopPropagation()} className="w-full max-w-lg overflow-hidden rounded-t-2xl bg-card shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
          <div className="min-w-0">
            <h2 className="font-semibold text-navy-800">Unggah dokumen alat</h2>
            <p className="truncate text-xs text-muted-foreground">{alat.nama}{alat.tipe ? ` · ${alat.tipe}` : ""}</p>
          </div>
          <Button ref={tutupRef} variant="ghost" size="icon" onClick={onTutup} aria-label="Tutup"><X className="size-5" /></Button>
        </div>
        <form onSubmit={simpan} className="grid gap-3 p-5">
          <label className="grid gap-1 text-sm font-medium text-navy-800">Jenis dokumen
            <Select value={jenis} onChange={(e) => gantiJenis(e.target.value)}>
              {KELOMPOK_DOKUMEN_ALAT.map((k) => (
                <optgroup key={k.kode} label={k.judul}>
                  {JENIS_UNGGAH_ALAT.filter((j) => j.kelompok === k.kode).map((j) => <option key={j.kode} value={j.kode}>{j.label}</option>)}
                </optgroup>
              ))}
            </Select>
          </label>
          <label className="grid gap-1 text-sm font-medium text-navy-800">Berkas (PDF, JPG, PNG, DOCX, XLSX — maks 30 MB)
            <Input type="file" accept={TERIMA_DOKUMEN_ALAT} required onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="h-auto py-2 file:mr-3 file:rounded file:border-0 file:bg-teal-50 file:px-3 file:py-1 file:text-teal-700" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium text-navy-800">Nomor dokumen <span className="font-normal text-muted-foreground">(opsional)</span><Input name="nomor" maxLength={120} placeholder="mis. 027/SP/2024" /></label>
            <label className="grid gap-1 text-sm font-medium text-navy-800">Tanggal dokumen <span className="font-normal text-muted-foreground">(opsional)</span><Input name="tanggal" type="date" /></label>
          </div>
          <label className="grid gap-1 text-sm font-medium text-navy-800">Keterangan <span className="font-normal text-muted-foreground">(opsional)</span><Input name="keterangan" maxLength={500} /></label>
          {sejenis > 0 && (
            <label className="flex items-start gap-2 rounded-lg border border-teal-200 bg-teal-50/60 p-3 text-sm text-teal-900">
              <input type="checkbox" checked={terapkan} onChange={(e) => setTerapkan(e.target.checked)} className="mt-0.5 size-4 accent-teal-600" />
              <span>Terapkan juga ke <strong>{sejenis} alat lain</strong> dengan nama, merek &amp; tipe sama{alat.tipe ? ` (${alat.tipe})` : ""}. <span className="text-teal-800/80">Cocok untuk User Manual, Service Manual, SOP, AKD/AKL — berkas disimpan sekali.</span></span>
            </label>
          )}
          {kirim && (
            <div aria-live="polite" className="grid gap-1">
              <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-teal-500 transition-[width]" style={{ width: `${kirim.persen}%` }} /></div>
              <p className="text-xs text-muted-foreground">Mengunggah… {kirim.persen}%</p>
            </div>
          )}
          {hasil?.error && <p role="alert" className="flex items-center gap-1.5 text-sm text-red-700"><XCircle className="size-4" /> {hasil.error}</p>}
          {hasil?.ok && <p className="flex items-center gap-1.5 text-sm text-emerald-700"><CheckCircle2 className="size-4" /> {hasil.ok}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onTutup}>Batal</Button>
            <Button type="submit" variant="teal" disabled={Boolean(kirim)}>{kirim ? <Loader2 className="animate-spin" /> : <Upload />} Simpan</Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
