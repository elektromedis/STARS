"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronDown, FileSpreadsheet, FileUp, Loader2, Upload, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TERIMA_SERTIFIKAT, tglIndo } from "@/lib/kalibrasi";
import type { BarisImpor } from "@/lib/kalibrasi-impor";
import { cn } from "@/lib/utils";

const MAKS_PER_KIRIM = 300;

/**
 * Impor massal: satu Excel (data kalibrasi per alat + nama_berkas) + banyak berkas sertifikat sekaligus.
 * Berkas dicocokkan dengan kolom nama_berkas (tanpa beda huruf besar/kecil). Disimpan per kelompok berkas
 * lewat POST /api/admin/kalibrasi (validasi & aturan "alat + tanggal sama = diperbarui" sama dengan input manual).
 */
export function ImporSertifikat() {
  const router = useRouter();
  const [buka, setBuka] = useState(false);
  const [baris, setBaris] = useState<BarisImpor[] | null>(null);
  const [namaExcel, setNamaExcel] = useState("");
  const [berkas, setBerkas] = useState<Map<string, File>>(new Map());
  const [sibuk, setSibuk] = useState<string | null>(null);
  const [pesan, setPesan] = useState<{ ok?: string; error?: string } | null>(null);
  const [progres, setProgres] = useState<[number, number] | null>(null);
  const refExcel = useRef<HTMLInputElement>(null);
  const refBerkas = useRef<HTMLInputElement>(null);

  async function pilihExcel(f: File | undefined) {
    if (!f) return;
    setSibuk("Membaca Excel…"); setPesan(null); setBaris(null); setNamaExcel(f.name);
    const fd = new FormData(); fd.set("excel", f);
    try {
      const r = await fetch("/api/admin/kalibrasi/impor", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) setPesan({ error: j.error ?? `Gagal (kode ${r.status}).` }); else setBaris(j.baris);
    } catch { setPesan({ error: "Koneksi terputus." }); }
    setSibuk(null);
  }
  function pilihBerkas(list: FileList | null) {
    if (!list) return;
    // Salin dulu: FileList ikut kosong begitu input di-reset (value = ""), sebelum updater state dijalankan.
    const daftar = Array.from(list);
    setBerkas((m) => { const n = new Map(m); for (const f of daftar) n.set(f.name.toLowerCase(), f); return n; });
  }

  const ringkas = useMemo(() => {
    if (!baris) return null;
    const valid = baris.filter((b) => b.data);
    const kurangBerkas = valid.filter((b) => b.namaBerkas && !berkas.has(b.namaBerkas.toLowerCase()));
    const siap = valid.filter((b) => !b.namaBerkas || berkas.has(b.namaBerkas.toLowerCase()));
    const dipakai = new Set(siap.map((b) => b.namaBerkas?.toLowerCase()).filter(Boolean));
    const tidakDirujuk = [...berkas.keys()].filter((k) => !dipakai.has(k) && !baris.some((b) => b.namaBerkas?.toLowerCase() === k));
    return { valid, siap, kurangBerkas, galat: baris.length - valid.length, tidakDirujuk };
  }, [baris, berkas]);

  async function simpan() {
    if (!ringkas || ringkas.siap.length === 0) return;
    const kelompok = new Map<string, BarisImpor[]>();
    for (const b of ringkas.siap) { const k = b.namaBerkas?.toLowerCase() ?? ""; kelompok.set(k, [...(kelompok.get(k) ?? []), b]); }
    const tugas: { file: File | null; baris: BarisImpor[] }[] = [];
    for (const [k, rs] of kelompok) for (let i = 0; i < rs.length; i += MAKS_PER_KIRIM) tugas.push({ file: k ? berkas.get(k)! : null, baris: rs.slice(i, i + MAKS_PER_KIRIM) });
    let baru = 0, diperbarui = 0; const gagal: string[] = [];
    setPesan(null); setSibuk("Menyimpan…"); setProgres([0, tugas.length]);
    for (const [i, t] of tugas.entries()) {
      const fd = new FormData();
      if (t.file) fd.set("file", t.file);
      fd.set("baris", JSON.stringify(t.baris.map((b) => b.data)));
      try {
        const r = await fetch("/api/admin/kalibrasi", { method: "POST", body: fd });
        const j = await r.json().catch(() => ({}));
        if (r.ok) { baru += j.baru ?? 0; diperbarui += j.diperbarui ?? 0; }
        else gagal.push(`${t.file?.name ?? "tanpa sertifikat"} (baris ${t.baris.map((b) => b.baris).join(", ")}): ${j.error ?? r.status}`);
      } catch { gagal.push(`${t.file?.name ?? "tanpa sertifikat"}: koneksi terputus`); }
      setProgres([i + 1, tugas.length]);
    }
    setSibuk(null); setProgres(null);
    setPesan(gagal.length ? { error: `${baru + diperbarui} catatan tersimpan; ${gagal.length} kelompok gagal — ${gagal.slice(0, 5).join(" | ")}` } : { ok: `Selesai: ${baru + diperbarui} catatan kalibrasi tersimpan (${baru} baru, ${diperbarui} diperbarui) dari ${tugas.length} kiriman.` });
    if (!gagal.length) { setBaris(null); setBerkas(new Map()); setNamaExcel(""); }
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="cursor-pointer select-none" onClick={() => setBuka((x) => !x)}>
        <CardTitle className="flex items-center gap-2"><FileSpreadsheet className="size-5 text-teal-700" /> Impor massal sertifikat (Excel)
          <ChevronDown className={cn("ml-auto size-5 text-muted-foreground transition-transform", buka && "rotate-180")} aria-hidden /></CardTitle>
        <CardDescription>Unggah banyak sertifikat sekaligus: satu berkas Excel berisi data kalibrasi tiap alat + semua file sertifikat (PDF/JPG/PNG). Input manual satu per satu tetap tersedia di bawah.</CardDescription>
      </CardHeader>
      {buka && (
        <CardContent className="grid gap-4">
          <ol className="grid gap-3 md:grid-cols-3">
            <li className="rounded-xl border bg-slate-50 p-3 text-sm">
              <p className="font-semibold text-navy-800">1. Siapkan Excel</p>
              <p className="mt-1 text-muted-foreground">Kolom: kode_alat, tanggal, kalibrator, nomor_sertifikat, hasil, nama_berkas, dst.</p>
              <Button asChild variant="outline" size="sm" className="mt-2">
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- unduhan berkas, bukan navigasi halaman */}
                <a href="/api/admin/kalibrasi/impor" download><FileSpreadsheet /> Unduh templat</a>
              </Button>
            </li>
            <li className="rounded-xl border bg-slate-50 p-3 text-sm">
              <p className="font-semibold text-navy-800">2. Pilih Excel</p>
              <p className="mt-1 truncate text-muted-foreground">{namaExcel || ".xlsx / .xls / .csv"}</p>
              <input ref={refExcel} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => { void pilihExcel(e.target.files?.[0]); e.target.value = ""; }} />
              <Button size="sm" className="mt-2" onClick={() => refExcel.current?.click()} disabled={!!sibuk}><Upload /> Pilih Excel</Button>
            </li>
            <li className="rounded-xl border bg-slate-50 p-3 text-sm">
              <p className="font-semibold text-navy-800">3. Pilih semua file sertifikat</p>
              <p className="mt-1 text-muted-foreground">{berkas.size ? `${berkas.size} file dipilih` : "Bisa pilih banyak sekaligus (Ctrl+A)"}</p>
              <input ref={refBerkas} type="file" multiple accept={TERIMA_SERTIFIKAT} className="hidden" onChange={(e) => { pilihBerkas(e.target.files); e.target.value = ""; }} />
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => refBerkas.current?.click()} disabled={!!sibuk}><FileUp /> Pilih file</Button>
                {berkas.size > 0 && <Button size="sm" variant="ghost" onClick={() => setBerkas(new Map())} disabled={!!sibuk}>Kosongkan</Button>}
              </div>
            </li>
          </ol>

          {sibuk && <p className="flex items-center gap-2 text-sm text-navy-800" role="status"><Loader2 className="size-4 animate-spin" /> {sibuk}{progres ? ` ${progres[0]}/${progres[1]}` : ""}</p>}
          {progres && <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-teal-500 transition-all" style={{ width: `${(progres[0] / Math.max(1, progres[1])) * 100}%` }} /></div>}
          {pesan?.ok && <p className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800" role="status"><CheckCircle2 className="mt-0.5 size-4 shrink-0" /> {pesan.ok}</p>}
          {pesan?.error && <p className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert"><XCircle className="mt-0.5 size-4 shrink-0" /> {pesan.error}</p>}

          {baris && ringkas && (
            <>
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-800 ring-1 ring-emerald-200">{ringkas.siap.length} siap disimpan</span>
                {ringkas.kurangBerkas.length > 0 && <span className="rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-800 ring-1 ring-amber-200">{ringkas.kurangBerkas.length} menunggu file sertifikat</span>}
                {ringkas.galat > 0 && <span className="rounded-full bg-red-50 px-3 py-1 font-medium text-red-800 ring-1 ring-red-200">{ringkas.galat} baris bermasalah (dilewati)</span>}
                {ringkas.tidakDirujuk.length > 0 && <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">{ringkas.tidakDirujuk.length} file tidak dirujuk Excel</span>}
              </div>
              <div className="max-h-[28rem] overflow-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase text-muted-foreground">
                    <tr><th className="px-3 py-2">Baris</th><th className="px-3 py-2">Alat</th><th className="px-3 py-2">Tanggal</th><th className="px-3 py-2">No. sertifikat</th><th className="px-3 py-2">Hasil</th><th className="px-3 py-2">File sertifikat</th><th className="px-3 py-2">Status</th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {baris.map((b) => {
                      const ada = b.namaBerkas ? berkas.has(b.namaBerkas.toLowerCase()) : null;
                      return (
                        <tr key={b.baris} className={cn(b.galat.length ? "bg-red-50/60" : ada === false ? "bg-amber-50/60" : "")}>
                          <td className="px-3 py-2 tabular-nums text-muted-foreground">{b.baris}</td>
                          <td className="px-3 py-2">{b.alat ? <><span className="font-medium text-navy-800">{b.alat.nama}</span><span className="block text-xs text-muted-foreground">{b.alat.kode} · {b.alat.unit}</span></> : <span className="text-muted-foreground">{b.kodeAlat || "—"}</span>}</td>
                          <td className="whitespace-nowrap px-3 py-2">{b.data ? tglIndo(b.data.tanggal) : "—"}</td>
                          <td className="px-3 py-2">{b.data?.nomorSertifikat ?? "—"}</td>
                          <td className="px-3 py-2">{b.data ? (b.data.laik ? "Laik" : "Tidak laik") : "—"}</td>
                          <td className="max-w-[12rem] truncate px-3 py-2" title={b.namaBerkas ?? ""}>{b.namaBerkas ? <>{ada ? "✓" : "✗"} {b.namaBerkas}</> : <span className="text-muted-foreground">tanpa file</span>}</td>
                          <td className="px-3 py-2 text-xs">{b.galat.length ? <span className="text-red-700">{b.galat.join("; ")}</span> : ada === false ? <span className="text-amber-700">Pilih file ini</span> : <span className="text-emerald-700">Siap</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="teal" onClick={simpan} disabled={!!sibuk || ringkas.siap.length === 0}><CheckCircle2 /> Simpan {ringkas.siap.length} catatan</Button>
                <p className="text-xs text-muted-foreground">Baris bermasalah & yang filenya belum dipilih dilewati. Alat + tanggal yang sudah tercatat akan diperbarui.</p>
              </div>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}
