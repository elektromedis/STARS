"use client";

import { useActionState, useState } from "react";
import { CalendarClock, CheckCircle2, ChevronDown, Loader2, Plus, PlayCircle, XCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { INTERVAL_PRESET, urai } from "@/lib/pemeliharaan";
import { buatJadwal, buatSemuaJatuhTempo, buatWoDariJadwal, ubahJadwal, type StatusAksi } from "@/app/admin/jadwal/actions";

type AlatRingkas = { id: number; kode: string; nama: string; unitKerja: { nama: string } };
export type Jadwal = {
  id: number; nama: string; intervalHari: number; checklist: string | null; terakhir: string | Date | null; berikutnya: string | Date | null; aktif: boolean;
  alat: { kode: string; nama: string; unitKerja: { nama: string } }; perintah: { nomor: string }[];
};

const HARI = 86_400_000;
const tgl = (d: string | Date | null) => (d ? new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "—");
const tglInput = (d: string | Date | null) => (d ? new Date(d).toISOString().slice(0, 10) : "");

function keadaan(j: Jadwal): { label: string; variant: "danger" | "warning" | "success" | "outline" | "teal" } {
  if (!j.aktif) return { label: "Nonaktif", variant: "outline" };
  if (j.perintah.length > 0) return { label: `WO aktif ${j.perintah[0].nomor}`, variant: "teal" };
  if (!j.berikutnya) return { label: "Belum dijadwalkan", variant: "outline" };
  const sisa = Math.ceil((new Date(j.berikutnya).getTime() - Date.now()) / HARI);
  if (sisa < 0) return { label: `Terlambat ${-sisa} hari`, variant: "danger" };
  if (sisa === 0) return { label: "Jatuh tempo hari ini", variant: "danger" };
  if (sisa <= 7) return { label: `${sisa} hari lagi`, variant: "warning" };
  return { label: `${sisa} hari lagi`, variant: "success" };
}

function Pesan({ status }: { status: StatusAksi }) {
  if (!status) return null;
  return status.error
    ? <p role="alert" className="flex items-center gap-1.5 text-xs text-red-700"><XCircle className="size-3.5" /> {status.error}</p>
    : <p className="flex items-center gap-1.5 text-xs text-emerald-700"><CheckCircle2 className="size-3.5" /> {status.ok}</p>;
}

function PilihInterval({ nilai }: { nilai?: number }) {
  const [v, setV] = useState<number>(nilai ?? 30);
  return (
    <div className="grid grid-cols-2 gap-2">
      <Select value={INTERVAL_PRESET.some((p) => p.hari === v) ? v : "lain"} onChange={(e) => { if (e.target.value !== "lain") setV(Number(e.target.value)); }} className="h-9">
        {INTERVAL_PRESET.map((p) => <option key={p.hari} value={p.hari}>{p.label}</option>)}
        <option value="lain">Lainnya…</option>
      </Select>
      <Input name="intervalHari" type="number" min={1} max={3650} value={v} onChange={(e) => setV(Number(e.target.value) || 1)} className="h-9" required />
    </div>
  );
}

function Baris({ j, bolehKelola }: { j: Jadwal; bolehKelola: boolean }) {
  const [stU, aksiU, pendU] = useActionState<StatusAksi, FormData>(ubahJadwal, undefined);
  const [stW, aksiW, pendW] = useActionState<StatusAksi, FormData>(buatWoDariJadwal, undefined);
  const k = keadaan(j);
  const tugas = urai(j.checklist);
  return (
    <details className="group border-b last:border-b-0">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-muted/40">
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
        <span className="min-w-0 flex-1 truncate"><span className="font-medium text-navy-800">{j.nama}</span> <span className="text-xs text-muted-foreground">· {j.alat.nama} ({j.alat.kode})</span></span>
        <span className="hidden text-xs text-muted-foreground md:block">tiap {j.intervalHari} hr · berikut {tgl(j.berikutnya)}</span>
        <Badge variant={k.variant}>{k.label}</Badge>
      </summary>
      <div className="grid gap-4 bg-muted/20 px-4 py-4 md:grid-cols-2">
        <div className="space-y-1.5 text-sm">
          <p><span className="text-muted-foreground">Unit:</span> {j.alat.unitKerja.nama} · <span className="text-muted-foreground">Terakhir:</span> {tgl(j.terakhir)} · <span className="text-muted-foreground">Berikutnya:</span> {tgl(j.berikutnya)}</p>
          {tugas.length > 0 ? <ul className="list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">{tugas.map((t, i) => <li key={i}>{t.tugas}</li>)}</ul> : <p className="text-xs text-muted-foreground">Belum ada checklist tugas.</p>}
          {bolehKelola && (
            <form action={aksiW} className="flex items-center gap-3 pt-2">
              <input type="hidden" name="id" value={j.id} />
              <Button type="submit" size="sm" variant="teal" disabled={pendW || !j.aktif || j.perintah.length > 0}>{pendW ? <Loader2 className="animate-spin" /> : <PlayCircle />} Buat WO sekarang</Button>
              <Pesan status={stW} />
            </form>
          )}
        </div>
        {bolehKelola && (
          <form action={aksiU} className="grid gap-2 rounded-lg border bg-card p-3">
            <input type="hidden" name="id" value={j.id} />
            <label className="grid gap-1 text-xs text-muted-foreground">Nama pemeliharaan<Input name="nama" defaultValue={j.nama} required maxLength={160} className="h-9" /></label>
            <label className="grid gap-1 text-xs text-muted-foreground">Interval (hari)<PilihInterval nilai={j.intervalHari} /></label>
            <label className="grid gap-1 text-xs text-muted-foreground">Tanggal berikutnya<Input name="berikutnya" type="date" defaultValue={tglInput(j.berikutnya)} className="h-9" /></label>
            <label className="grid gap-1 text-xs text-muted-foreground">Checklist (satu tugas per baris)<textarea name="checklist" defaultValue={j.checklist ?? ""} rows={4} maxLength={4000} className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm" /></label>
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="aktif" defaultChecked={j.aktif} /> Jadwal aktif</label>
            <div className="flex items-center justify-between gap-2"><Pesan status={stU} /><Button type="submit" size="sm" variant="outline" disabled={pendU}>{pendU ? <Loader2 className="animate-spin" /> : null} Simpan</Button></div>
          </form>
        )}
      </div>
    </details>
  );
}

export function JadwalManager({ data, alat, bolehKelola }: { data: Jadwal[]; alat: AlatRingkas[]; bolehKelola: boolean }) {
  const [stB, aksiB, pendB] = useActionState<StatusAksi, FormData>(buatJadwal, undefined);
  const [stS, aksiS, pendS] = useActionState<StatusAksi, FormData>(buatSemuaJatuhTempo, undefined);
  const tempo = data.filter((j) => j.aktif && j.berikutnya && new Date(j.berikutnya).getTime() <= Date.now() && j.perintah.length === 0).length;
  return (
    <div className="grid gap-4">
      {bolehKelola && (
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div><CardTitle className="flex items-center gap-2"><CalendarClock className="size-4 text-teal-700" /> Jatuh tempo</CardTitle><CardDescription>{tempo} jadwal aktif sudah/lewat waktu dan belum punya WO.</CardDescription></div>
            <form action={aksiS} className="flex items-center gap-3"><Pesan status={stS} /><Button type="submit" variant="teal" disabled={pendS || tempo === 0}>{pendS ? <Loader2 className="animate-spin" /> : <Zap />} Buat WO semua jatuh tempo</Button></form>
          </CardHeader>
        </Card>
      )}
      {bolehKelola && (
        <Card>
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center gap-2 p-5 text-sm font-semibold text-navy-800"><Plus className="size-4 text-teal-700 transition-transform group-open:rotate-45" aria-hidden /> Tambah jadwal preventif</summary>
            <form action={aksiB} className="grid gap-3 border-t px-5 py-4 sm:grid-cols-2">
              <label className="grid gap-1 text-xs text-muted-foreground sm:col-span-2">Alat *
                <Select name="alatId" defaultValue="" required className="h-9"><option value="" disabled>— pilih alat —</option>{alat.map((a) => <option key={a.id} value={a.id}>{a.unitKerja.nama} · {a.nama} ({a.kode})</option>)}</Select>
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">Nama pemeliharaan *<Input name="nama" required maxLength={160} className="h-9" placeholder="mis. Pemeliharaan bulanan / Inspeksi fungsi" /></label>
              <label className="grid gap-1 text-xs text-muted-foreground">Interval (hari) *<PilihInterval /></label>
              <label className="grid gap-1 text-xs text-muted-foreground">Mulai (jatuh tempo pertama) *<Input name="mulai" type="date" required defaultValue={tglInput(new Date())} className="h-9" /></label>
              <label className="grid gap-1 text-xs text-muted-foreground sm:col-span-2">Checklist tugas (satu per baris)<textarea name="checklist" rows={4} maxLength={4000} className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm" placeholder={"Periksa fisik & kebersihan\nUji fungsi alarm\nUkur kebocoran arus\nCek aksesori & kabel"} /></label>
              <div className="flex items-center justify-between gap-2 sm:col-span-2"><Pesan status={stB} /><Button type="submit" variant="teal" disabled={pendB}>{pendB ? <Loader2 className="animate-spin" /> : <Plus />} Simpan jadwal</Button></div>
            </form>
          </details>
        </Card>
      )}
      <Card>
        <CardHeader><CardTitle>Jadwal preventif ({data.length})</CardTitle></CardHeader>
        <CardContent className="px-0">
          {data.length === 0 ? <p className="px-4 py-6 text-center text-sm text-muted-foreground">Belum ada jadwal.</p> : <div className="overflow-hidden rounded-lg border">{data.map((j) => <Baris key={j.id} j={j} bolehKelola={bolehKelola} />)}</div>}
        </CardContent>
      </Card>
    </div>
  );
}
