"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Loader2, Save, SearchCheck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatIDRCompact, formatNumber } from "@/lib/utils";

type Masalah = { baris: number; kolom: string; pesan: string };
type Pratinjau = { kode: string; status: "baru" | "diperbarui"; tahun: number; tahap: string; namaPaket: string; unitKerja: string; kategori: string; nilai: number; serapan: boolean };
type Hasil = {
  mode: string; sheet: string; totalBaris: number; barisValid: number; barisBaru: number; barisDiperbarui: number; barisError: number; totalNilai: number;
  kolomDikenali: string[]; kolomTidakDikenali: string[]; errors: Masalah[]; warnings: Masalah[]; pratinjau: Pratinjau[];
  simpan?: { logId: number; barisBaru: number; barisDiperbarui: number; totalNilai: number }; error?: string;
};

/** Alur tiga langkah: pilih berkas → Periksa (validasi tanpa menyimpan) → Simpan (hanya bila nol error). */
export function ImporForm({ bolehSimpan: izin = true }: { bolehSimpan?: boolean }) {
  const [file, setFile] = useState<File | null>(null);
  const [hasil, setHasil] = useState<Hasil | null>(null);
  const [sibuk, setSibuk] = useState<"" | "validasi" | "simpan">("");
  const [pesan, setPesan] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function kirim(mode: "validasi" | "simpan") {
    if (!file) return;
    setSibuk(mode); setPesan(null);
    try {
      const fd = new FormData();
      fd.append("file", file); fd.append("mode", mode);
      const res = await fetch("/api/admin/impor", { method: "POST", body: fd });
      const data = (await res.json()) as Hasil & { error?: string };
      if (!res.ok && !data.totalBaris) { setPesan(data.error ?? `Gagal (${res.status})`); setHasil(null); }
      else { setHasil(data); if (data.error) setPesan(data.error); }
    } catch (e) {
      setPesan(e instanceof Error ? e.message : String(e));
    } finally { setSibuk(""); }
  }

  function pilih(f: File | null) { setFile(f); setHasil(null); setPesan(null); }
  const tersimpan = Boolean(hasil?.simpan);
  const bolehSimpan = izin && Boolean(hasil && hasil.barisError === 0 && hasil.barisValid > 0 && !tersimpan);

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>1. Pilih berkas Excel</CardTitle>
          <CardDescription>Gunakan template STARS (sheet <code>paket</code>) atau hasil ekspor yang sudah diedit. Maksimal 10 MB.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex flex-1 cursor-pointer items-center gap-3 rounded-lg border border-dashed p-4 hover:border-teal-400"
            onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pilih(e.dataTransfer.files?.[0] ?? null); }}>
            <FileSpreadsheet className="size-8 text-teal-600" aria-hidden />
            <span className="text-sm">
              {file ? <><strong>{file.name}</strong> <span className="text-muted-foreground">({(file.size / 1024).toFixed(0)} KB)</span></> : <>Klik untuk memilih atau seret berkas <strong>.xlsx</strong> ke sini</>}
            </span>
            <input ref={inputRef} type="file" accept=".xlsx,.xlsm,.csv" className="sr-only" onChange={(e) => pilih(e.target.files?.[0] ?? null)} />
          </label>
          <div className="flex gap-2">
            <Button variant="outline" asChild><Link href="/api/admin/template"><Download /> Unduh template</Link></Button>
            <Button onClick={() => kirim("validasi")} disabled={!file || sibuk !== ""}>
              {sibuk === "validasi" ? <Loader2 className="animate-spin" /> : <SearchCheck />} Periksa
            </Button>
          </div>
        </CardContent>
      </Card>

      {pesan && !tersimpan && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"><XCircle className="mt-0.5 size-4 shrink-0" /> {pesan}</div>
      )}

      {hasil && (
        <Card>
          <CardHeader>
            <CardTitle>2. Hasil pemeriksaan</CardTitle>
            <CardDescription>Sheet <code>{hasil.sheet}</code> • kolom dikenali: {hasil.kolomDikenali.join(", ")}{hasil.kolomTidakDikenali.length > 0 && <> • diabaikan: {hasil.kolomTidakDikenali.join(", ")}</>}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <Ringkas label="Baris dibaca" nilai={formatNumber(hasil.totalBaris)} />
              <Ringkas label="Valid" nilai={formatNumber(hasil.barisValid)} warna="text-emerald-700" />
              <Ringkas label="Baru / Diperbarui" nilai={`${formatNumber(hasil.barisBaru)} / ${formatNumber(hasil.barisDiperbarui)}`} />
              <Ringkas label="Baris error" nilai={formatNumber(hasil.barisError)} warna={hasil.barisError ? "text-red-700" : "text-emerald-700"} />
              <Ringkas label="Total nilai valid" nilai={formatIDRCompact(hasil.totalNilai)} />
            </div>

            {hasil.errors.length > 0 && (
              <Daftar judul={`Error (${hasil.errors.length}) — harus diperbaiki`} items={hasil.errors} variant="danger" icon={<XCircle className="size-4" />} />
            )}
            {hasil.warnings.length > 0 && (
              <Daftar judul={`Peringatan (${hasil.warnings.length}) — tidak menghalangi penyimpanan`} items={hasil.warnings} variant="warning" icon={<AlertTriangle className="size-4" />} />
            )}

            {hasil.pratinjau.length > 0 && (
              <div className="overflow-hidden rounded-lg border">
                <p className="border-b bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground">Pratinjau {hasil.pratinjau.length} baris pertama yang valid</p>
                <Table>
                  <TableHeader><TableRow className="hover:bg-transparent"><TableHead>Kode</TableHead><TableHead>Status</TableHead><TableHead>Tahun/Tahap</TableHead><TableHead>Nama Paket</TableHead><TableHead>Unit</TableHead><TableHead className="hidden md:table-cell">Kategori</TableHead><TableHead className="text-right">Nilai</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {hasil.pratinjau.map((p) => (
                      <TableRow key={p.kode}>
                        <TableCell className="font-mono text-xs">{p.kode}</TableCell>
                        <TableCell><Badge variant={p.status === "baru" ? "teal" : "warning"}>{p.status}</Badge></TableCell>
                        <TableCell className="whitespace-nowrap text-xs">{p.tahun} {p.tahap}</TableCell>
                        <TableCell className="max-w-xs"><span className="line-clamp-2">{p.namaPaket}</span></TableCell>
                        <TableCell>{p.unitKerja}</TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">{p.kategori}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatIDRCompact(p.nilai)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {hasil && (
        <Card>
          <CardHeader>
            <CardTitle>3. Simpan ke basis data</CardTitle>
            <CardDescription>Semua baris valid disimpan dalam satu transaksi. Bila gagal di tengah, tidak ada data yang berubah.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {tersimpan ? (
              <p className="flex items-center gap-2 text-sm text-emerald-800"><CheckCircle2 className="size-5" /> Tersimpan: {formatNumber(hasil.simpan!.barisBaru)} baru, {formatNumber(hasil.simpan!.barisDiperbarui)} diperbarui, total {formatIDRCompact(hasil.simpan!.totalNilai)} (log #{hasil.simpan!.logId}).</p>
            ) : (
              <p className="text-sm text-muted-foreground">{hasil.barisError > 0 ? "Perbaiki error di atas, lalu pilih berkas lagi dan Periksa ulang." : `${formatNumber(hasil.barisValid)} baris siap disimpan.`}</p>
            )}
            <div className="flex gap-2">
              {tersimpan && <Button variant="outline" asChild><Link href={`/paket?tahun=${hasil.pratinjau[0]?.tahun ?? ""}&tahap=${encodeURIComponent(hasil.pratinjau[0]?.tahap ?? "")}`}>Lihat di dashboard</Link></Button>}
              {tersimpan && <Button variant="outline" asChild><Link href="/admin/log">Lihat log</Link></Button>}
              <Button variant="teal" onClick={() => kirim("simpan")} disabled={!bolehSimpan || sibuk !== ""}>
                {sibuk === "simpan" ? <Loader2 className="animate-spin" /> : <Save />} Simpan
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Ringkas({ label, nilai, warna = "text-navy-800" }: { label: string; nilai: string; warna?: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-bold tabular-nums ${warna}`}>{nilai}</p>
    </div>
  );
}

function Daftar({ judul, items, variant, icon }: { judul: string; items: Masalah[]; variant: "danger" | "warning"; icon: React.ReactNode }) {
  const warna = variant === "danger" ? "border-red-200 bg-red-50 text-red-900" : "border-amber-200 bg-amber-50 text-amber-900";
  return (
    <div className={`rounded-lg border p-3 text-sm ${warna}`}>
      <p className="mb-2 flex items-center gap-2 font-semibold">{icon} {judul}</p>
      <ul className="max-h-64 space-y-1 overflow-y-auto text-xs">
        {items.map((m, i) => (
          <li key={i}><span className="font-mono">{m.baris ? `Baris ${m.baris}` : "Header"}</span> • <strong>{m.kolom}</strong>: {m.pesan}</li>
        ))}
      </ul>
    </div>
  );
}
