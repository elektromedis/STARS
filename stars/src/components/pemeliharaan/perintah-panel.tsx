"use client";

import { useActionState } from "react";
import { CheckCircle2, ChevronDown, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { badgePrioritas, badgeStatusPerintah, JENIS_PERINTAH, PRIORITAS, STATUS_PERINTAH } from "@/lib/pemeliharaan";
import { ubahPerintah, type StatusAksi } from "@/app/admin/pemeliharaan/actions";
import { formatIDRCompact } from "@/lib/utils";

type Teknisi = { id: number; nama: string };
export type Perintah = {
  id: number; nomor: string; jenis: string; deskripsi: string; prioritas: string; status: string;
  teknisiId: number | null; teknisi: { nama: string } | null; tindakan: string | null; sukuCadang: string | null;
  biaya: number; tanggalMulai: string | Date | null; tanggalSelesai: string | Date | null;
  permintaan: { nomor: string } | null; alat: { kode: string; nama: string } | null; createdAt: string | Date;
};

const tgl = (d: string | Date | null) => (d ? new Date(d).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");

function Baris({ wo, teknisi, bolehKelola }: { wo: Perintah; teknisi: Teknisi[]; bolehKelola: boolean }) {
  const [st, aksi, pend] = useActionState<StatusAksi, FormData>(ubahPerintah, undefined);
  return (
    <details className="group border-b last:border-b-0">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-muted/40">
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
        <span className="font-mono text-xs text-muted-foreground">{wo.nomor}</span>
        <span className="min-w-0 flex-1 truncate font-medium text-navy-800">{wo.alat ? `${wo.alat.nama}` : wo.deskripsi}</span>
        <span className="hidden text-xs text-muted-foreground sm:block">{wo.teknisi?.nama ?? "—"}</span>
        <Badge variant={badgePrioritas[wo.prioritas] ?? "outline"}>{wo.prioritas}</Badge>
        <Badge variant={badgeStatusPerintah[wo.status] ?? "default"}>{wo.status}</Badge>
      </summary>

      <div className="grid gap-4 bg-muted/20 px-4 py-4 md:grid-cols-2">
        <div className="space-y-1.5 text-sm">
          <p className="whitespace-pre-wrap"><span className="text-muted-foreground">Uraian:</span> {wo.deskripsi}</p>
          <p><span className="text-muted-foreground">Jenis:</span> {wo.jenis}{wo.permintaan ? ` · dari ${wo.permintaan.nomor}` : ""}</p>
          {wo.alat && <p><span className="text-muted-foreground">Alat:</span> <span className="font-mono text-xs">{wo.alat.kode}</span> {wo.alat.nama}</p>}
          {wo.tindakan && <p className="whitespace-pre-wrap"><span className="text-muted-foreground">Tindakan:</span> {wo.tindakan}</p>}
          {wo.sukuCadang && <p><span className="text-muted-foreground">Suku cadang:</span> {wo.sukuCadang}</p>}
          {wo.biaya > 0 && <p><span className="text-muted-foreground">Biaya:</span> {formatIDRCompact(wo.biaya)}</p>}
          <p className="text-xs text-muted-foreground">Mulai {tgl(wo.tanggalMulai)} · Selesai {tgl(wo.tanggalSelesai)}</p>
        </div>

        {bolehKelola ? (
          <form action={aksi} className="grid gap-2 rounded-lg border bg-card p-3">
            <input type="hidden" name="id" value={wo.id} />
            <div className="grid grid-cols-2 gap-2">
              <label className="grid gap-1 text-xs text-muted-foreground">Status
                <Select name="status" defaultValue={wo.status} className="h-9">{STATUS_PERINTAH.map((s) => <option key={s} value={s}>{s}</option>)}</Select>
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">Jenis
                <Select name="jenis" defaultValue={wo.jenis} className="h-9">{JENIS_PERINTAH.map((j) => <option key={j} value={j}>{j}</option>)}</Select>
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">Teknisi
                <Select name="teknisiId" defaultValue={wo.teknisiId ?? ""} className="h-9"><option value="">— belum —</option>{teknisi.map((t) => <option key={t.id} value={t.id}>{t.nama}</option>)}</Select>
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">Prioritas
                <Select name="prioritas" defaultValue={wo.prioritas} className="h-9">{PRIORITAS.map((p) => <option key={p} value={p}>{p}</option>)}</Select>
              </label>
            </div>
            <textarea name="tindakan" defaultValue={wo.tindakan ?? ""} rows={2} maxLength={2000} placeholder="Tindakan yang dilakukan" className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <Input name="sukuCadang" defaultValue={wo.sukuCadang ?? ""} placeholder="Suku cadang" className="h-9" maxLength={1000} />
              <Input name="biaya" type="number" min={0} step={1000} defaultValue={wo.biaya || ""} placeholder="Biaya (Rp)" className="h-9" />
            </div>
            <div className="flex items-center justify-between gap-2">
              {st ? (st.error ? <p role="alert" className="flex items-center gap-1.5 text-xs text-red-700"><XCircle className="size-3.5" /> {st.error}</p> : <p className="flex items-center gap-1.5 text-xs text-emerald-700"><CheckCircle2 className="size-3.5" /> {st.ok}</p>) : <span />}
              <Button type="submit" size="sm" variant="teal" disabled={pend}>{pend ? <Loader2 className="animate-spin" /> : null} Simpan</Button>
            </div>
          </form>
        ) : null}
      </div>
    </details>
  );
}

export function PerintahPanel({ data, teknisi, bolehKelola }: { data: Perintah[]; teknisi: Teknisi[]; bolehKelola: boolean }) {
  return (
    <Card>
      <CardHeader><CardTitle>Perintah kerja / work order ({data.length})</CardTitle></CardHeader>
      <CardContent className="px-0">
        {data.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">Belum ada perintah kerja. Buat dari laporan masuk di atas.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border">{data.map((wo) => <Baris key={wo.id} wo={wo} teknisi={teknisi} bolehKelola={bolehKelola} />)}</div>
        )}
      </CardContent>
    </Card>
  );
}
