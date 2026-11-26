"use client";

import { useActionState, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, Loader2, PackagePlus, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { catatMutasi, simpanBarang, type StatusAksi } from "@/app/admin/stok/actions";
import { JENIS_BARANG, JENIS_MUTASI, statusBarang } from "@/lib/stok";
import { formatRupiah } from "@/lib/utils";

export type Barang = {
  id: number; kode: string; nama: string; jenis: string; satuan: string; stok: number; stokMinimum: number; lokasi: string | null; nomorLot: string | null;
  kedaluwarsa: string | null; kalibrasiSampai: string | null; harga: number | null; alatTerkait: string | null; pemasok: string | null; catatan: string | null;
  mutasi: { id: number; jenis: string; jumlah: number; stokSetelah: number; keterangan: string | null; oleh: string | null; waktu: string }[];
};
const tgl = (d: string | null) => (d ? d.slice(0, 10) : "");
const tglId = (d: string) => new Date(d).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const nada: Record<string, "danger" | "warning" | "success" | "outline"> = { habis: "danger", menipis: "warning", kedaluwarsa: "danger", "segera-kedaluwarsa": "warning", kalibrasi: "warning", aman: "success" };

function Pesan({ st }: { st: StatusAksi }) {
  if (!st) return null;
  return st.error ? <p role="alert" className="flex items-center gap-1.5 text-xs text-red-700"><XCircle className="size-3.5" /> {st.error}</p>
    : <p role="status" className="flex items-center gap-1.5 text-xs text-emerald-700"><CheckCircle2 className="size-3.5" /> {st.ok}</p>;
}

function MedanBarang({ b }: { b?: Barang }) {
  const L = "grid gap-1 text-xs text-muted-foreground";
  const [jenis, setJenis] = useState(b?.jenis ?? "Sparepart");
  return (
    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6 [&>*]:min-w-0">
      {b && <input type="hidden" name="id" value={b.id} />}
      <label className={L}>Kode *<Input name="kode" required maxLength={60} defaultValue={b?.kode} className="h-9" /></label>
      <label className={`${L} lg:col-span-2`}>Nama barang *<Input name="nama" required maxLength={200} defaultValue={b?.nama} className="h-9" /></label>
      <label className={L}>Jenis<Select name="jenis" value={jenis} onChange={(e) => setJenis(e.target.value)} className="h-9">{JENIS_BARANG.map((j) => <option key={j}>{j}</option>)}</Select></label>
      <label className={L}>Satuan<Input name="satuan" maxLength={30} defaultValue={b?.satuan ?? "pcs"} className="h-9" /></label>
      {!b && <label className={L}>Stok awal<Input name="stokAwal" type="number" min={0} defaultValue={0} className="h-9" /></label>}
      <label className={L}>Stok minimum (pesan ulang)<Input name="stokMinimum" type="number" min={0} defaultValue={b?.stokMinimum ?? 0} className="h-9" /></label>
      <label className={L}>Lokasi simpan<Input name="lokasi" maxLength={120} defaultValue={b?.lokasi ?? ""} className="h-9" /></label>
      <label className={L}>Nomor lot<Input name="nomorLot" maxLength={80} defaultValue={b?.nomorLot ?? ""} className="h-9" /></label>
      <label className={L}>Kedaluwarsa<Input name="kedaluwarsa" type="date" defaultValue={tgl(b?.kedaluwarsa ?? null)} className="h-9" /></label>
      {jenis === "Alat uji" && <label className={L}>Kalibrasi berlaku s/d<Input name="kalibrasiSampai" type="date" defaultValue={tgl(b?.kalibrasiSampai ?? null)} className="h-9" /></label>}
      <label className={L}>Harga satuan (Rp)<Input name="harga" type="number" min={0} defaultValue={b?.harga ?? ""} className="h-9" /></label>
      <label className={`${L} lg:col-span-2`}>Dipakai untuk alat<Input name="alatTerkait" maxLength={300} defaultValue={b?.alatTerkait ?? ""} className="h-9" placeholder="mis. Bedside Monitor Mindray iMEC" /></label>
      <label className={L}>Pemasok<Input name="pemasok" maxLength={160} defaultValue={b?.pemasok ?? ""} className="h-9" /></label>
      <label className={`${L} lg:col-span-2`}>Catatan<Input name="catatan" maxLength={1000} defaultValue={b?.catatan ?? ""} className="h-9" /></label>
    </div>
  );
}

function BarisBarang({ b, boleh }: { b: Barang; boleh: boolean }) {
  const [stU, ubah, jU] = useActionState<StatusAksi, FormData>(simpanBarang, undefined);
  const [stM, mutasi, jM] = useActionState<StatusAksi, FormData>(catatMutasi, undefined);
  const st = statusBarang(b);
  return (
    <details className="group border-b last:border-b-0">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 hover:bg-muted/40">
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
        <span className="font-mono text-xs text-muted-foreground">{b.kode}</span>
        <span className="min-w-0 flex-1 truncate font-medium text-navy-800">{b.nama}<span className="font-normal text-muted-foreground"> · {b.jenis}</span></span>
        <span className="tabular-nums text-sm font-semibold text-navy-800">{b.stok} <span className="font-normal text-muted-foreground">{b.satuan}</span></span>
        {st.map((s) => <Badge key={s.kunci} variant={nada[s.kunci]}>{s.label}</Badge>)}
      </summary>
      <div className="grid gap-4 bg-muted/20 px-4 py-4">
        {boleh && (
          <form action={mutasi} className="flex flex-wrap items-end gap-2 rounded-lg border bg-white p-3">
            <input type="hidden" name="barangId" value={b.id} />
            <label className="grid gap-1 text-xs text-muted-foreground">Catat<Select name="jenis" className="h-9">{JENIS_MUTASI.map((j) => <option key={j}>{j}</option>)}</Select></label>
            <label className="grid gap-1 text-xs text-muted-foreground">Jumlah<Input name="jumlah" type="number" min={0} required className="h-9 w-28" /></label>
            <label className="grid flex-1 gap-1 text-xs text-muted-foreground">Keterangan<Input name="keterangan" maxLength={300} className="h-9" placeholder="mis. dipakai WO-2026-0012 / pembelian" /></label>
            <Button type="submit" size="sm" variant="teal" disabled={jM}>{jM && <Loader2 className="animate-spin" />} Simpan</Button>
            <Pesan st={stM} />
          </form>
        )}
        {boleh && (
          <form action={ubah} className="grid gap-2">
            <MedanBarang b={b} />
            <div className="flex items-center justify-end gap-3"><Pesan st={stU} /><Button type="submit" size="sm" variant="outline" disabled={jU}>{jU && <Loader2 className="animate-spin" />} Simpan perubahan data</Button></div>
          </form>
        )}
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Riwayat mutasi terakhir</p>
          {b.mutasi.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada mutasi.</p> : (
            <ul className="grid gap-1 text-sm">{b.mutasi.map((m) => (
              <li key={m.id} className="flex flex-wrap gap-x-3 text-navy-800"><span className="text-muted-foreground">{tglId(m.waktu)}</span><b>{m.jenis} {m.jumlah > 0 && m.jenis !== "Keluar" ? "+" : ""}{m.jenis === "Keluar" ? `−${m.jumlah}` : m.jumlah}</b><span>→ {m.stokSetelah}</span>{m.keterangan && <span className="text-muted-foreground">{m.keterangan}</span>}</li>
            ))}</ul>
          )}
        </div>
      </div>
    </details>
  );
}

export function StokManager({ data, boleh }: { data: Barang[]; boleh: boolean }) {
  const [stB, tambah, jB] = useActionState<StatusAksi, FormData>(simpanBarang, undefined);
  const [cari, setCari] = useState(""); const [jenis, setJenis] = useState(""); const [hanyaPerlu, setHanyaPerlu] = useState(false);
  const tampil = useMemo(() => data.filter((b) => (!jenis || b.jenis === jenis) && (!cari || `${b.kode} ${b.nama} ${b.alatTerkait ?? ""}`.toLowerCase().includes(cari.toLowerCase())) && (!hanyaPerlu || statusBarang(b)[0].kunci !== "aman")), [data, cari, jenis, hanyaPerlu]);
  const perlu = data.filter((b) => statusBarang(b)[0].kunci !== "aman").length;
  const nilai = data.reduce((n, b) => n + (b.harga ?? 0) * b.stok, 0);
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {JENIS_BARANG.map((j) => <Card key={j}><CardContent className="pt-5"><p className="text-xs text-muted-foreground">{j}</p><p className="text-2xl font-bold text-navy-800">{data.filter((b) => b.jenis === j).length}</p></CardContent></Card>)}
      </div>
      <p className="flex flex-wrap items-center gap-3 text-sm">
        {perlu > 0 ? <span className="inline-flex items-center gap-1.5 font-medium text-amber-800"><AlertTriangle className="size-4" /> {perlu} barang perlu tindakan (stok menipis / kedaluwarsa / kalibrasi alat uji)</span> : <span className="text-emerald-700">Semua stok aman.</span>}
        <span className="text-muted-foreground">Nilai persediaan: <b className="text-navy-800">{formatRupiah(nilai)}</b></span>
      </p>
      {boleh && (
        <Card>
          <details>
            <summary className="cursor-pointer list-none"><CardHeader><CardTitle className="flex items-center gap-2"><PackagePlus className="size-5 text-teal-700" /> Tambah barang</CardTitle><CardDescription>Suku cadang, bahan habis pakai, alat kerja, atau alat uji bengkel.</CardDescription></CardHeader></summary>
            <CardContent>
              <form action={tambah} className="grid gap-3"><MedanBarang /><div className="flex items-center justify-end gap-3"><Pesan st={stB} /><Button type="submit" variant="teal" disabled={jB}>{jB && <Loader2 className="animate-spin" />} Tambah</Button></div></form>
            </CardContent>
          </details>
        </Card>
      )}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-end gap-2 border-b p-3">
          <Input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari kode, nama, atau alat…" className="h-9 max-w-xs" aria-label="Cari barang" />
          <Select value={jenis} onChange={(e) => setJenis(e.target.value)} className="h-9 w-40" aria-label="Jenis"><option value="">Semua jenis</option>{JENIS_BARANG.map((j) => <option key={j}>{j}</option>)}</Select>
          <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={hanyaPerlu} onChange={(e) => setHanyaPerlu(e.target.checked)} className="size-4 accent-teal-600" /> Hanya yang perlu tindakan</label>
          <span className="ml-auto text-xs text-muted-foreground">{tampil.length} barang</span>
        </div>
        {tampil.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">Belum ada barang.</p> : tampil.map((b) => <BarisBarang key={b.id} b={b} boleh={boleh} />)}
      </Card>
    </div>
  );
}
