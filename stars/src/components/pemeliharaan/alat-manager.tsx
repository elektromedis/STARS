"use client";

import { useActionState } from "react";
import { CheckCircle2, ChevronDown, Loader2, Plus, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { badgeKondisi, KONDISI_ALAT } from "@/lib/pemeliharaan";
import { buatAlat, ubahAlat, type StatusAksi } from "@/app/admin/alat/actions";

type Unit = { id: number; nama: string };
export type Alat = {
  id: number; kode: string; nama: string; merek: string | null; model: string | null; nomorSeri: string | null;
  unitKerjaId: number; unitKerja: { nama: string }; lokasi: string | null; kategori: string | null;
  tahunPerolehan: number | null; kondisi: string; catatan: string | null; _count: { permintaan: number; perintah: number };
};

function Pesan({ status }: { status: StatusAksi }) {
  if (!status) return null;
  return status.error
    ? <p role="alert" className="flex items-center gap-1.5 text-xs text-red-700"><XCircle className="size-3.5" /> {status.error}</p>
    : <p className="flex items-center gap-1.5 text-xs text-emerald-700"><CheckCircle2 className="size-3.5" /> {status.ok}</p>;
}

function Medan({ a, units }: { a?: Alat; units: Unit[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <label className="grid gap-1 text-xs text-muted-foreground">Kode inventaris *<Input name="kode" defaultValue={a?.kode ?? ""} required maxLength={60} className="h-9" /></label>
      <label className="grid gap-1 text-xs text-muted-foreground sm:col-span-2">Nama alat *<Input name="nama" defaultValue={a?.nama ?? ""} required maxLength={200} className="h-9" /></label>
      <label className="grid gap-1 text-xs text-muted-foreground">Merek<Input name="merek" defaultValue={a?.merek ?? ""} maxLength={120} className="h-9" /></label>
      <label className="grid gap-1 text-xs text-muted-foreground">Model<Input name="model" defaultValue={a?.model ?? ""} maxLength={120} className="h-9" /></label>
      <label className="grid gap-1 text-xs text-muted-foreground">Nomor seri<Input name="nomorSeri" defaultValue={a?.nomorSeri ?? ""} maxLength={120} className="h-9" /></label>
      <label className="grid gap-1 text-xs text-muted-foreground">Unit kerja *
        <Select name="unitKerjaId" defaultValue={a?.unitKerjaId ?? ""} required className="h-9">
          <option value="" disabled>— pilih —</option>
          {units.map((u) => <option key={u.id} value={u.id}>{u.nama}</option>)}
        </Select>
      </label>
      <label className="grid gap-1 text-xs text-muted-foreground">Lokasi<Input name="lokasi" defaultValue={a?.lokasi ?? ""} maxLength={200} className="h-9" /></label>
      <label className="grid gap-1 text-xs text-muted-foreground">Kategori<Input name="kategori" defaultValue={a?.kategori ?? ""} maxLength={120} className="h-9" /></label>
      <label className="grid gap-1 text-xs text-muted-foreground">Tahun perolehan<Input name="tahunPerolehan" type="number" min={1950} max={2100} defaultValue={a?.tahunPerolehan ?? ""} className="h-9" /></label>
      <label className="grid gap-1 text-xs text-muted-foreground">Kondisi
        <Select name="kondisi" defaultValue={a?.kondisi ?? "Baik"} className="h-9">{KONDISI_ALAT.map((k) => <option key={k} value={k}>{k}</option>)}</Select>
      </label>
      <label className="grid gap-1 text-xs text-muted-foreground sm:col-span-2">Catatan<Input name="catatan" defaultValue={a?.catatan ?? ""} maxLength={1000} className="h-9" /></label>
    </div>
  );
}

function BarisAlat({ a, units }: { a: Alat; units: Unit[] }) {
  const [st, aksi, pend] = useActionState<StatusAksi, FormData>(ubahAlat, undefined);
  return (
    <details className="group border-b last:border-b-0">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-muted/40">
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
        <span className="font-mono text-xs text-muted-foreground">{a.kode}</span>
        <span className="min-w-0 flex-1 truncate font-medium text-navy-800">{a.nama}</span>
        <span className="hidden text-xs text-muted-foreground sm:block">{a.unitKerja.nama}</span>
        <Badge variant={badgeKondisi[a.kondisi] ?? "outline"}>{a.kondisi}</Badge>
      </summary>
      <form action={aksi} className="grid gap-2 bg-muted/20 px-4 py-4">
        <input type="hidden" name="id" value={a.id} />
        <Medan a={a} units={units} />
        <div className="flex items-center justify-between gap-2">
          <Pesan status={st} />
          <Button type="submit" size="sm" variant="teal" disabled={pend}>{pend ? <Loader2 className="animate-spin" /> : null} Simpan perubahan</Button>
        </div>
      </form>
    </details>
  );
}

export function AlatManager({ data, units, bolehKelola }: { data: Alat[]; units: Unit[]; bolehKelola: boolean }) {
  const [st, aksi, pend] = useActionState<StatusAksi, FormData>(buatAlat, undefined);
  return (
    <div className="grid gap-4">
      {bolehKelola && (
        <Card>
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center gap-2 p-5 text-sm font-semibold text-navy-800">
              <Plus className="size-4 text-teal-700 transition-transform group-open:rotate-45" aria-hidden /> Tambah alat baru
            </summary>
            <form action={aksi} className="grid gap-3 border-t px-5 py-4">
              <Medan units={units} />
              <div className="flex items-center justify-between gap-2">
                <Pesan status={st} />
                <Button type="submit" variant="teal" disabled={pend}>{pend ? <Loader2 className="animate-spin" /> : <Plus />} Tambah</Button>
              </div>
            </form>
          </details>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Daftar alat ({data.length})</CardTitle></CardHeader>
        <CardContent className="px-0">
          {data.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">Belum ada alat terdaftar.</p>
          ) : (
            <div className="overflow-hidden rounded-lg border">{data.map((a) => <BarisAlat key={a.id} a={a} units={units} />)}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
