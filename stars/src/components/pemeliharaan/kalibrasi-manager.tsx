"use client";

import { useActionState } from "react";
import { BadgeCheck, CheckCircle2, Loader2, Plus, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { buatKalibrasi, hapusKalibrasi, type StatusAksi } from "@/app/admin/kalibrasi/actions";

type AlatRingkas = { id: number; kode: string; nama: string; unitKerja: { nama: string } };
export type Kalibrasi = {
  id: number; alatId: number; tanggal: string | Date; kalibrator: string; petugas: string | null; metode: string | null; laik: boolean;
  nomorSertifikat: string | null; berlakuSampai: string | Date | null; keterangan: string | null; alat: { kode: string; nama: string; unitKerja: { nama: string } };
};

const HARI = 86_400_000;
const tgl = (d: string | Date | null) => (d ? new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "—");

export function masaBerlaku(k: { berlakuSampai: string | Date | null; laik: boolean }): { label: string; variant: "danger" | "warning" | "success" | "outline" } {
  if (!k.laik) return { label: "Tidak laik", variant: "danger" };
  if (!k.berlakuSampai) return { label: "Tanpa masa berlaku", variant: "outline" };
  const sisa = Math.ceil((new Date(k.berlakuSampai).getTime() - Date.now()) / HARI);
  if (sisa < 0) return { label: `Kedaluwarsa ${-sisa} hr`, variant: "danger" };
  if (sisa <= 30) return { label: `${sisa} hari lagi`, variant: "warning" };
  return { label: "Berlaku", variant: "success" };
}

function Pesan({ status }: { status: StatusAksi }) {
  if (!status) return null;
  return status.error
    ? <p role="alert" className="flex items-center gap-1.5 text-xs text-red-700"><XCircle className="size-3.5" /> {status.error}</p>
    : <p className="flex items-center gap-1.5 text-xs text-emerald-700"><CheckCircle2 className="size-3.5" /> {status.ok}</p>;
}

function Hapus({ id }: { id: number }) {
  const [st, aksi, pend] = useActionState<StatusAksi, FormData>(hapusKalibrasi, undefined);
  return (
    <form action={aksi} onSubmit={(e) => { if (!window.confirm("Hapus catatan kalibrasi ini?")) e.preventDefault(); }} className="flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <Button type="submit" size="sm" variant="ghost" title="Hapus" disabled={pend}>{pend ? <Loader2 className="animate-spin" /> : <Trash2 className="text-red-600" />}</Button>
      {st?.error && <span className="text-xs text-red-700">{st.error}</span>}
    </form>
  );
}

export function KalibrasiManager({ data, alat, bolehKelola }: { data: Kalibrasi[]; alat: AlatRingkas[]; bolehKelola: boolean }) {
  const [st, aksi, pend] = useActionState<StatusAksi, FormData>(buatKalibrasi, undefined);
  // Status terkini per alat = catatan terbaru (data sudah urut tanggal desc)
  const terkini = new Map<number, Kalibrasi>();
  for (const k of data) if (!terkini.has(k.alatId)) terkini.set(k.alatId, k);
  const perlu = [...terkini.values()].filter((k) => { const m = masaBerlaku(k); return m.variant === "danger" || m.variant === "warning"; });
  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><BadgeCheck className="size-4 text-teal-700" /> Perlu perhatian ({perlu.length})</CardTitle><CardDescription>Alat yang kalibrasi terakhirnya tidak laik, kedaluwarsa, atau habis ≤ 30 hari.</CardDescription></CardHeader>
        {perlu.length > 0 && (
          <CardContent className="flex flex-wrap gap-1.5 pt-0 text-xs">
            {perlu.map((k) => { const m = masaBerlaku(k); return <span key={k.alatId} className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1">{k.alat.nama} <span className="font-mono text-muted-foreground">{k.alat.kode}</span> <Badge variant={m.variant}>{m.label}</Badge></span>; })}
          </CardContent>
        )}
      </Card>

      {bolehKelola && (
        <Card>
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center gap-2 p-5 text-sm font-semibold text-navy-800"><Plus className="size-4 text-teal-700 transition-transform group-open:rotate-45" aria-hidden /> Catat kalibrasi / pengujian</summary>
            <form action={aksi} className="grid gap-3 border-t px-5 py-4 sm:grid-cols-3">
              <label className="grid gap-1 text-xs text-muted-foreground sm:col-span-3">Alat *
                <Select name="alatId" defaultValue="" required className="h-9"><option value="" disabled>— pilih alat —</option>{alat.map((a) => <option key={a.id} value={a.id}>{a.unitKerja.nama} · {a.nama} ({a.kode})</option>)}</Select>
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">Tanggal kalibrasi *<Input name="tanggal" type="date" required className="h-9" /></label>
              <label className="grid gap-1 text-xs text-muted-foreground">Berlaku sampai<Input name="berlakuSampai" type="date" className="h-9" /></label>
              <label className="grid gap-1 text-xs text-muted-foreground">Lembaga kalibrator *<Input name="kalibrator" required maxLength={160} className="h-9" placeholder="mis. BPFK Jakarta / LPFK" /></label>
              <label className="grid gap-1 text-xs text-muted-foreground">Petugas<Input name="petugas" maxLength={120} className="h-9" /></label>
              <label className="grid gap-1 text-xs text-muted-foreground">Metode<Input name="metode" maxLength={160} className="h-9" placeholder="mis. Kalibrasi / Uji kesesuaian" /></label>
              <label className="grid gap-1 text-xs text-muted-foreground">Nomor sertifikat<Input name="nomorSertifikat" maxLength={120} className="h-9" /></label>
              <label className="grid gap-1 text-xs text-muted-foreground sm:col-span-2">Keterangan<Input name="keterangan" maxLength={1000} className="h-9" /></label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="laik" defaultChecked /> Hasil: <strong>LAIK</strong> pakai</label>
              <div className="flex items-center justify-end gap-3 sm:col-span-3"><Pesan status={st} /><Button type="submit" variant="teal" disabled={pend}>{pend ? <Loader2 className="animate-spin" /> : <Plus />} Simpan</Button></div>
            </form>
          </details>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Riwayat kalibrasi ({data.length})</CardTitle></CardHeader>
        <CardContent className="px-0 pb-0">
          {data.length === 0 ? <p className="px-4 py-6 text-center text-sm text-muted-foreground">Belum ada catatan kalibrasi.</p> : (
            <Table>
              <TableHeader><TableRow className="hover:bg-transparent"><TableHead>Tanggal</TableHead><TableHead>Alat</TableHead><TableHead className="hidden md:table-cell">Kalibrator</TableHead><TableHead className="hidden md:table-cell">Sertifikat</TableHead><TableHead>Berlaku s/d</TableHead><TableHead>Status</TableHead>{bolehKelola && <TableHead />}</TableRow></TableHeader>
              <TableBody>
                {data.map((k) => { const m = masaBerlaku(k); return (
                  <TableRow key={k.id}>
                    <TableCell className="whitespace-nowrap text-xs">{tgl(k.tanggal)}</TableCell>
                    <TableCell><div className="font-medium text-navy-800">{k.alat.nama}</div><div className="font-mono text-xs text-muted-foreground">{k.alat.kode} · {k.alat.unitKerja.nama}</div></TableCell>
                    <TableCell className="hidden text-xs md:table-cell">{k.kalibrator}{k.metode ? <div className="text-muted-foreground">{k.metode}</div> : null}</TableCell>
                    <TableCell className="hidden font-mono text-xs md:table-cell">{k.nomorSertifikat ?? "—"}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs">{tgl(k.berlakuSampai)}</TableCell>
                    <TableCell><Badge variant={m.variant}>{m.label}</Badge></TableCell>
                    {bolehKelola && <TableCell className="text-right"><Hapus id={k.id} /></TableCell>}
                  </TableRow>
                ); })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
