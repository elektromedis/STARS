"use client";

import { useActionState } from "react";
import { CheckCircle2, ChevronDown, DoorOpen, Loader2, Plus, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { badgeKondisi, JENIS_ALAT, KONDISI_ALAT, RISIKO_ALAT } from "@/lib/pemeliharaan";
import { buatAlat, buatRuangan, ubahAlat, type StatusAksi } from "@/app/admin/alat/actions";

type Unit = { id: number; nama: string };
export type RuanganRingkas = { id: number; nama: string; gedung: string | null; unitKerjaId: number; unitKerja: { nama: string } };
export type Alat = {
  id: number; kode: string; nama: string; merek: string | null; model: string | null; nomorSeri: string | null;
  unitKerjaId: number; unitKerja: { nama: string }; ruanganId: number | null; ruangan: { nama: string } | null;
  lokasi: string | null; kategori: string | null; jenis: string; risiko: string | null; tahunPerolehan: number | null;
  hargaPerolehan: number | null; usiaTeknis: number | null; garansiSampai: string | Date | null;
  kondisi: string; catatan: string | null; _count: { permintaan: number; perintah: number };
};

const tglInput = (d: string | Date | null | undefined) => (d ? new Date(d).toISOString().slice(0, 10) : "");

function Pesan({ status }: { status: StatusAksi }) {
  if (!status) return null;
  return status.error
    ? <p role="alert" className="flex items-center gap-1.5 text-xs text-red-700"><XCircle className="size-3.5" /> {status.error}</p>
    : <p className="flex items-center gap-1.5 text-xs text-emerald-700"><CheckCircle2 className="size-3.5" /> {status.ok}</p>;
}

function Medan({ a, units, ruangan }: { a?: Alat; units: Unit[]; ruangan: RuanganRingkas[] }) {
  const L = "grid gap-1 text-xs text-muted-foreground";
  return (
    <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
      <label className={L}>Kode inventaris *<Input name="kode" defaultValue={a?.kode ?? ""} required maxLength={60} className="h-9" /></label>
      <label className={`${L} sm:col-span-2`}>Nama alat *<Input name="nama" defaultValue={a?.nama ?? ""} required maxLength={200} className="h-9" /></label>
      <label className={L}>Jenis
        <Select name="jenis" defaultValue={a?.jenis ?? "Medik"} className="h-9">{JENIS_ALAT.map((j) => <option key={j} value={j}>{j}</option>)}</Select>
      </label>
      <label className={L}>Merek<Input name="merek" defaultValue={a?.merek ?? ""} maxLength={120} className="h-9" /></label>
      <label className={L}>Model<Input name="model" defaultValue={a?.model ?? ""} maxLength={120} className="h-9" /></label>
      <label className={L}>Nomor seri<Input name="nomorSeri" defaultValue={a?.nomorSeri ?? ""} maxLength={120} className="h-9" /></label>
      <label className={L}>Kategori<Input name="kategori" defaultValue={a?.kategori ?? ""} maxLength={120} className="h-9" placeholder="mis. Life support" /></label>
      <label className={L}>Unit kerja *
        <Select name="unitKerjaId" defaultValue={a?.unitKerjaId ?? ""} required className="h-9">
          <option value="" disabled>— pilih —</option>
          {units.map((u) => <option key={u.id} value={u.id}>{u.nama}</option>)}
        </Select>
      </label>
      <label className={L}>Ruangan
        <Select name="ruanganId" defaultValue={a?.ruanganId ?? ""} className="h-9">
          <option value="">— tidak ditentukan —</option>
          {ruangan.map((r) => <option key={r.id} value={r.id}>{r.unitKerja.nama} · {r.nama}{r.gedung ? ` (${r.gedung})` : ""}</option>)}
        </Select>
      </label>
      <label className={L}>Rincian lokasi<Input name="lokasi" defaultValue={a?.lokasi ?? ""} maxLength={200} className="h-9" /></label>
      <label className={L}>Risiko (EM)
        <Select name="risiko" defaultValue={a?.risiko ?? ""} className="h-9"><option value="">— belum —</option>{RISIKO_ALAT.map((r) => <option key={r} value={r}>{r}</option>)}</Select>
      </label>
      <label className={L}>Tahun perolehan<Input name="tahunPerolehan" type="number" min={1950} max={2100} defaultValue={a?.tahunPerolehan ?? ""} className="h-9" /></label>
      <label className={L}>Harga perolehan (Rp)<Input name="hargaPerolehan" type="number" min={0} step={1000} defaultValue={a?.hargaPerolehan ?? ""} className="h-9" /></label>
      <label className={L}>Usia teknis (tahun)<Input name="usiaTeknis" type="number" min={0} max={100} defaultValue={a?.usiaTeknis ?? ""} className="h-9" /></label>
      <label className={L}>Garansi sampai<Input name="garansiSampai" type="date" defaultValue={tglInput(a?.garansiSampai)} className="h-9" /></label>
      <label className={L}>Kondisi
        <Select name="kondisi" defaultValue={a?.kondisi ?? "Baik"} className="h-9">{KONDISI_ALAT.map((k) => <option key={k} value={k}>{k}</option>)}</Select>
      </label>
      <label className={`${L} sm:col-span-3 lg:col-span-3`}>Catatan<Input name="catatan" defaultValue={a?.catatan ?? ""} maxLength={1000} className="h-9" /></label>
    </div>
  );
}

function BarisAlat({ a, units, ruangan, bolehKelola }: { a: Alat; units: Unit[]; ruangan: RuanganRingkas[]; bolehKelola: boolean }) {
  const [st, aksi, pend] = useActionState<StatusAksi, FormData>(ubahAlat, undefined);
  return (
    <details className="group border-b last:border-b-0">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-muted/40">
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
        <span className="font-mono text-xs text-muted-foreground">{a.kode}</span>
        <span className="min-w-0 flex-1 truncate font-medium text-navy-800">{a.nama}{a.merek ? <span className="font-normal text-muted-foreground"> · {a.merek}{a.model ? ` ${a.model}` : ""}</span> : null}</span>
        <span className="hidden text-xs text-muted-foreground md:block">{a.unitKerja.nama}{a.ruangan ? ` · ${a.ruangan.nama}` : ""}</span>
        <Badge variant={a.jenis === "Medik" ? "teal" : "outline"}>{a.jenis}</Badge>
        <Badge variant={badgeKondisi[a.kondisi] ?? "outline"}>{a.kondisi}</Badge>
      </summary>
      {bolehKelola ? (
        <form action={aksi} className="grid gap-2 bg-muted/20 px-4 py-4">
          <input type="hidden" name="id" value={a.id} />
          <Medan a={a} units={units} ruangan={ruangan} />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">{a._count.permintaan} laporan · {a._count.perintah} perintah kerja</span>
            <div className="flex items-center gap-3"><Pesan status={st} /><Button type="submit" size="sm" variant="teal" disabled={pend}>{pend ? <Loader2 className="animate-spin" /> : null} Simpan perubahan</Button></div>
          </div>
        </form>
      ) : (
        <div className="grid gap-1 bg-muted/20 px-4 py-3 text-sm sm:grid-cols-2">
          <p><span className="text-muted-foreground">Nomor seri:</span> {a.nomorSeri ?? "—"}</p>
          <p><span className="text-muted-foreground">Kategori:</span> {a.kategori ?? "—"} · <span className="text-muted-foreground">Risiko:</span> {a.risiko ?? "—"}</p>
          <p><span className="text-muted-foreground">Perolehan:</span> {a.tahunPerolehan ?? "—"} · <span className="text-muted-foreground">Usia teknis:</span> {a.usiaTeknis ?? "—"} th</p>
          <p><span className="text-muted-foreground">Garansi sampai:</span> {a.garansiSampai ? new Date(a.garansiSampai).toLocaleDateString("id-ID") : "—"}</p>
        </div>
      )}
    </details>
  );
}

function FormRuangan({ units }: { units: Unit[] }) {
  const [st, aksi, pend] = useActionState<StatusAksi, FormData>(buatRuangan, undefined);
  return (
    <form action={aksi} className="grid gap-2 border-t px-5 py-4 sm:grid-cols-5 sm:items-end">
      <label className="grid gap-1 text-xs text-muted-foreground">Unit kerja *
        <Select name="unitKerjaId" defaultValue="" required className="h-9"><option value="" disabled>— pilih —</option>{units.map((u) => <option key={u.id} value={u.id}>{u.nama}</option>)}</Select>
      </label>
      <label className="grid gap-1 text-xs text-muted-foreground">Nama ruangan *<Input name="nama" required maxLength={120} className="h-9" placeholder="mis. Ruang NICU" /></label>
      <label className="grid gap-1 text-xs text-muted-foreground">Gedung / lantai<Input name="gedung" maxLength={120} className="h-9" placeholder="mis. Gedung A Lt. 2" /></label>
      <label className="grid gap-1 text-xs text-muted-foreground">Kepala ruangan<Input name="kepala" maxLength={120} className="h-9" /></label>
      <div className="flex items-center justify-between gap-2"><Pesan status={st} /><Button type="submit" size="sm" variant="teal" disabled={pend}>{pend ? <Loader2 className="animate-spin" /> : <Plus />} Tambah</Button></div>
    </form>
  );
}

export function AlatManager({ data, units, ruangan, bolehKelola }: { data: Alat[]; units: Unit[]; ruangan: RuanganRingkas[]; bolehKelola: boolean }) {
  const [st, aksi, pend] = useActionState<StatusAksi, FormData>(buatAlat, undefined);
  return (
    <div className="grid gap-4">
      <Card>
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center gap-2 p-5 text-sm font-semibold text-navy-800">
            <DoorOpen className="size-4 text-teal-700" aria-hidden /> Ruangan ({ruangan.length})
            <span className="ml-auto text-xs font-normal text-muted-foreground">klik untuk buka</span>
          </summary>
          {ruangan.length > 0 && (
            <ul className="flex flex-wrap gap-1.5 border-t px-5 py-3 text-xs">
              {ruangan.map((r) => <li key={r.id} className="rounded-full border bg-muted/40 px-2.5 py-1"><span className="text-muted-foreground">{r.unitKerja.nama} ·</span> {r.nama}{r.gedung ? <span className="text-muted-foreground"> ({r.gedung})</span> : null}</li>)}
            </ul>
          )}
          {bolehKelola && <FormRuangan units={units} />}
        </details>
      </Card>

      {bolehKelola && (
        <Card>
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center gap-2 p-5 text-sm font-semibold text-navy-800">
              <Plus className="size-4 text-teal-700 transition-transform group-open:rotate-45" aria-hidden /> Tambah alat baru
            </summary>
            <form action={aksi} className="grid gap-3 border-t px-5 py-4">
              <Medan units={units} ruangan={ruangan} />
              <div className="flex items-center justify-between gap-2"><Pesan status={st} /><Button type="submit" variant="teal" disabled={pend}>{pend ? <Loader2 className="animate-spin" /> : <Plus />} Tambah</Button></div>
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
            <div className="overflow-hidden rounded-lg border">{data.map((a) => <BarisAlat key={a.id} a={a} units={units} ruangan={ruangan} bolehKelola={bolehKelola} />)}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
