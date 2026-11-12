"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Loader2, Save, SearchCheck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumber } from "@/lib/utils";
import { badgeKondisi } from "@/lib/pemeliharaan";

type Masalah = { baris: number; kolom: string; pesan: string };
type Pratinjau = { kode: string; status: "baru" | "diperbarui"; nama: string; merek: string | null; unitKerja: string; ruangan: string | null; kondisi: string; kalibrasi: string | null };
type Hasil = {
  mode: string; sheet: string; barisHeader: number; totalBaris: number; barisValid: number; barisBaru: number; barisDiperbarui: number; barisError: number;
  kolomDikenali: string[]; kolomTidakDikenali: string[]; unitTidakAda: number; kalibrasi: number; errors: Masalah[]; warnings: Masalah[]; pratinjau: Pratinjau[];
  simpan?: { logId: number; barisBaru: number; barisDiperbarui: number; ruanganBaru: number; kalibrasiBaru: number }; error?: string;
};

/** Impor inventaris alat: pilih berkas (ekspor Trilux / template) → Periksa → Simpan. */
export function ImporAlatForm({ bolehSimpan: izin = true }: { bolehSimpan?: boolean }) {
  const [file, setFile] = useState<File | null>(null);
  const [hasil, setHasil] = useState<Hasil | null>(null);
  const [sibuk, setSibuk] = useState<"" | "validasi" | "simpan">("");
  const [pesan, setPesan] = useState<string | null>(null);
  const router = useRouter();

  async function kirim(mode: "validasi" | "simpan") {
    if (!file) return;
    setSibuk(mode); setPesan(null);
    try {
      const fd = new FormData(); fd.append("file", file); fd.append("mode", mode);
      const res = await fetch("/api/admin/impor-alat", { method: "POST", body: fd });
      const data = (await res.json()) as Hasil;
      if (!res.ok && !data.totalBaris) { setPesan(data.error ?? `Gagal (${res.status})`); setHasil(null); } else { setHasil(data); if (data.error) setPesan(data.error); if (data.simpan) router.refresh(); }
    } catch (e) { setPesan(e instanceof Error ? e.message : String(e)); } finally { setSibuk(""); }
  }
  const tersimpan = Boolean(hasil?.simpan);
  const bolehSimpan = izin && Boolean(hasil && hasil.barisError === 0 && hasil.barisValid > 0 && !tersimpan);

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Impor inventaris alat (format Trilux CAMS)</CardTitle>
          <CardDescription>Unggah langsung hasil ekspor <em>Invetaris</em> dari Trilux (judul di baris 1, header di baris 3) atau template STARS. Sekaligus membuat ruangan dan catatan kalibrasi. Maksimal 15 MB.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex flex-1 cursor-pointer items-center gap-3 rounded-lg border border-dashed p-4 hover:border-teal-400" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); setFile(e.dataTransfer.files?.[0] ?? null); setHasil(null); setPesan(null); }}>
            <FileSpreadsheet className="size-8 text-teal-600" aria-hidden />
            <span className="text-sm">{file ? <><strong>{file.name}</strong> <span className="text-muted-foreground">({(file.size / 1024).toFixed(0)} KB)</span></> : <>Klik untuk memilih atau seret berkas <strong>.xlsx / .xls</strong> inventaris ke sini</>}</span>
            <input type="file" accept=".xlsx,.xlsm,.xls,.csv" className="sr-only" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setHasil(null); setPesan(null); }} />
          </label>
          <div className="flex gap-2">
            <Button variant="outline" asChild><Link href="/api/admin/template-alat"><Download /> Template</Link></Button>
            <Button onClick={() => kirim("validasi")} disabled={!file || sibuk !== ""}>{sibuk === "validasi" ? <Loader2 className="animate-spin" /> : <SearchCheck />} Periksa</Button>
          </div>
        </CardContent>
      </Card>

      {pesan && !tersimpan && <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"><XCircle className="mt-0.5 size-4 shrink-0" /> {pesan}</div>}

      {hasil && (
        <Card>
          <CardHeader>
            <CardTitle>Hasil pemeriksaan</CardTitle>
            <CardDescription>Sheet <code>{hasil.sheet}</code>, header di baris {hasil.barisHeader} • kolom dikenali: {hasil.kolomDikenali.join(", ")}{hasil.kolomTidakDikenali.length > 0 && <> • diabaikan: {hasil.kolomTidakDikenali.join(", ")}</>}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
              {[["Baris dibaca", hasil.totalBaris], ["Valid", hasil.barisValid], ["Baru", hasil.barisBaru], ["Diperbarui", hasil.barisDiperbarui], ["Unit TIDAK ADA", hasil.unitTidakAda], ["Dengan kalibrasi", hasil.kalibrasi]].map(([l, v]) => (
                <div key={String(l)} className="rounded-lg border bg-muted/30 p-3"><p className="text-xs text-muted-foreground">{l}</p><p className={`mt-1 text-lg font-bold tabular-nums ${l === "Unit TIDAK ADA" && Number(v) > 0 ? "text-amber-700" : "text-navy-800"}`}>{formatNumber(Number(v))}</p></div>
              ))}
            </div>
            {hasil.errors.length > 0 && <Daftar judul={`Error (${hasil.errors.length}) — harus diperbaiki`} items={hasil.errors} variant="danger" />}
            {hasil.warnings.length > 0 && <Daftar judul={`Peringatan (${hasil.warnings.length}) — tidak menghalangi`} items={hasil.warnings} variant="warning" />}
            {hasil.pratinjau.length > 0 && (
              <div className="overflow-hidden rounded-lg border">
                <p className="border-b bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground">Pratinjau {hasil.pratinjau.length} baris pertama</p>
                <Table>
                  <TableHeader><TableRow className="hover:bg-transparent"><TableHead>Kode</TableHead><TableHead>Status</TableHead><TableHead>Nama alat</TableHead><TableHead>Unit · Ruangan</TableHead><TableHead>Kondisi</TableHead><TableHead className="hidden md:table-cell">Kalibrasi</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {hasil.pratinjau.map((p) => (
                      <TableRow key={p.kode}>
                        <TableCell className="font-mono text-xs">{p.kode}</TableCell>
                        <TableCell><Badge variant={p.status === "baru" ? "teal" : "warning"}>{p.status}</Badge></TableCell>
                        <TableCell>{p.nama}{p.merek ? <span className="text-xs text-muted-foreground"> · {p.merek}</span> : null}</TableCell>
                        <TableCell className={p.unitKerja === "TIDAK ADA" ? "text-amber-700" : ""}>{p.unitKerja}{p.ruangan ? ` · ${p.ruangan}` : ""}</TableCell>
                        <TableCell><Badge variant={badgeKondisi[p.kondisi] ?? "outline"}>{p.kondisi}</Badge></TableCell>
                        <TableCell className="hidden text-xs md:table-cell">{p.kalibrasi ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
              {tersimpan ? (
                <p className="flex items-center gap-2 text-sm text-emerald-800"><CheckCircle2 className="size-5" /> Tersimpan: {formatNumber(hasil.simpan!.barisBaru)} alat baru, {formatNumber(hasil.simpan!.barisDiperbarui)} diperbarui, {formatNumber(hasil.simpan!.ruanganBaru)} ruangan baru, {formatNumber(hasil.simpan!.kalibrasiBaru)} catatan kalibrasi (log #{hasil.simpan!.logId}).</p>
              ) : <p className="text-sm text-muted-foreground">{hasil.barisError > 0 ? "Perbaiki error, lalu pilih berkas lagi dan Periksa ulang." : `${formatNumber(hasil.barisValid)} alat siap disimpan.`}</p>}
              <div className="flex gap-2">
                {tersimpan && <Button variant="outline" asChild><Link href="/admin/alat">Lihat Daftar Alat</Link></Button>}
                <Button variant="teal" onClick={() => kirim("simpan")} disabled={!bolehSimpan || sibuk !== ""}>{sibuk === "simpan" ? <Loader2 className="animate-spin" /> : <Save />} Simpan</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Daftar({ judul, items, variant }: { judul: string; items: Masalah[]; variant: "danger" | "warning" }) {
  const warna = variant === "danger" ? "border-red-200 bg-red-50 text-red-900" : "border-amber-200 bg-amber-50 text-amber-900";
  const Icon = variant === "danger" ? XCircle : AlertTriangle;
  return (
    <div className={`rounded-lg border p-3 text-sm ${warna}`}>
      <p className="mb-2 flex items-center gap-2 font-semibold"><Icon className="size-4" /> {judul}</p>
      <ul className="max-h-64 space-y-1 overflow-y-auto text-xs">{items.map((m, i) => <li key={i}><span className="font-mono">Baris {m.baris}</span> • <strong>{m.kolom}</strong>: {m.pesan}</li>)}</ul>
    </div>
  );
}
