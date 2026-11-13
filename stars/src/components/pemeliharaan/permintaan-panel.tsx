"use client";

import { useActionState } from "react";
import { CheckCircle2, ChevronDown, ClipboardList, ImageIcon, Loader2, Video, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { badgePrioritas, badgeStatusPermintaan, STATUS_PERMINTAAN } from "@/lib/pemeliharaan";
import { buatPerintahDariPermintaan, ubahStatusPermintaan, type StatusAksi } from "@/app/admin/pemeliharaan/actions";

type Teknisi = { id: number; nama: string };
export type Permintaan = {
  id: number; nomor: string; namaAlat: string; unitKerja: { nama: string } | null; lokasi: string | null;
  pelapor: string; kontak: string | null; keluhan: string; prioritas: string; foto: string | null; video?: string | null;
  status: string; catatanPetugas: string | null; createdAt: string | Date; perintah: { nomor: string } | null;
};

const tgl = (d: string | Date) => new Date(d).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

function Pesan({ status }: { status: StatusAksi }) {
  if (!status) return null;
  return status.error
    ? <p role="alert" className="flex items-center gap-1.5 text-xs text-red-700"><XCircle className="size-3.5" /> {status.error}</p>
    : <p className="flex items-center gap-1.5 text-xs text-emerald-700"><CheckCircle2 className="size-3.5" /> {status.ok}</p>;
}

function Baris({ p, teknisi, bolehKelola }: { p: Permintaan; teknisi: Teknisi[]; bolehKelola: boolean }) {
  const [stStatus, aksiStatus, pendStatus] = useActionState<StatusAksi, FormData>(ubahStatusPermintaan, undefined);
  const [stWO, aksiWO, pendWO] = useActionState<StatusAksi, FormData>(buatPerintahDariPermintaan, undefined);

  return (
    <details className="group border-b last:border-b-0">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-muted/40">
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
        <span className="font-mono text-xs text-muted-foreground">{p.nomor}</span>
        <span className="min-w-0 flex-1 truncate font-medium text-navy-800">{p.namaAlat}</span>
        <span className="hidden text-xs text-muted-foreground sm:block">{p.unitKerja?.nama ?? "—"}</span>
        <Badge variant={badgePrioritas[p.prioritas] ?? "outline"}>{p.prioritas}</Badge>
        <Badge variant={badgeStatusPermintaan[p.status] ?? "default"}>{p.status}</Badge>
      </summary>

      <div className="grid gap-4 bg-muted/20 px-4 py-4 md:grid-cols-2">
        <div className="space-y-1.5 text-sm">
          <p className="whitespace-pre-wrap"><span className="text-muted-foreground">Keluhan:</span> {p.keluhan}</p>
          <p><span className="text-muted-foreground">Pelapor:</span> {p.pelapor}{p.kontak ? ` · ${p.kontak}` : ""}</p>
          {p.lokasi && <p><span className="text-muted-foreground">Lokasi:</span> {p.lokasi}</p>}
          <p className="text-xs text-muted-foreground">Masuk {tgl(p.createdAt)}</p>
          {(p.foto || p.video) && (
            <div className="flex flex-wrap items-start gap-3 pt-1">
              {p.foto && (
                <a href={`/api/pemeliharaan/foto/${p.foto}`} target="_blank" rel="noopener noreferrer" className="group grid gap-1 text-xs font-medium text-teal-700">
                  {/* eslint-disable-next-line @next/next/no-img-element -- foto laporan (terproteksi login) */}
                  <img src={`/api/pemeliharaan/foto/${p.foto}`} alt={`Foto laporan ${p.nomor}`} loading="lazy" className="h-24 w-32 rounded-md border object-cover transition group-hover:ring-2 group-hover:ring-teal-300" />
                  <span className="inline-flex items-center gap-1 group-hover:underline"><ImageIcon className="size-3.5" /> Buka foto</span>
                </a>
              )}
              {p.video && (
                <div className="grid gap-1 text-xs">
                  <video src={`/api/pemeliharaan/foto/${p.video}`} controls playsInline preload="metadata" className="h-24 w-40 rounded-md border bg-black object-contain" aria-label={`Video laporan ${p.nomor}`} />
                  <a href={`/api/pemeliharaan/foto/${p.video}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-teal-700 hover:underline"><Video className="size-3.5" /> Buka / unduh video</a>
                </div>
              )}
            </div>
          )}
          {p.catatanPetugas && <p className="rounded bg-amber-50 p-2 text-xs text-amber-900"><span className="font-medium">Catatan petugas:</span> {p.catatanPetugas}</p>}
          {p.perintah && <p className="text-xs">Perintah kerja: <span className="font-mono font-medium text-navy-800">{p.perintah.nomor}</span></p>}
        </div>

        {bolehKelola && (
          <div className="space-y-4 rounded-lg border bg-card p-3">
            <form action={aksiStatus} className="grid gap-2">
              <input type="hidden" name="id" value={p.id} />
              <p className="text-xs font-semibold text-navy-800">Ubah status</p>
              <Select name="status" defaultValue={p.status} className="h-9">
                {STATUS_PERMINTAAN.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
              <Input name="catatanPetugas" defaultValue={p.catatanPetugas ?? ""} placeholder="Catatan petugas (opsional)" className="h-9" maxLength={1000} />
              <div className="flex items-center justify-between gap-2">
                <Pesan status={stStatus} />
                <Button type="submit" size="sm" variant="outline" disabled={pendStatus}>{pendStatus ? <Loader2 className="animate-spin" /> : null} Simpan</Button>
              </div>
            </form>

            {!p.perintah && (
              <form action={aksiWO} className="grid gap-2 border-t pt-3">
                <input type="hidden" name="permintaanId" value={p.id} />
                <p className="flex items-center gap-1.5 text-xs font-semibold text-navy-800"><ClipboardList className="size-3.5" /> Jadikan perintah kerja</p>
                <Select name="teknisiId" defaultValue="" className="h-9">
                  <option value="">Teknisi: belum ditentukan</option>
                  {teknisi.map((t) => <option key={t.id} value={t.id}>{t.nama}</option>)}
                </Select>
                <div className="flex items-center justify-between gap-2">
                  <Pesan status={stWO} />
                  <Button type="submit" size="sm" variant="teal" disabled={pendWO}>{pendWO ? <Loader2 className="animate-spin" /> : null} Buat WO</Button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </details>
  );
}

export function PermintaanPanel({ data, teknisi, bolehKelola }: { data: Permintaan[]; teknisi: Teknisi[]; bolehKelola: boolean }) {
  return (
    <Card>
      <CardHeader><CardTitle>Laporan / permintaan kerja masuk ({data.length})</CardTitle></CardHeader>
      <CardContent className="px-0">
        {data.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">Belum ada laporan kerusakan.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border">{data.map((p) => <Baris key={p.id} p={p} teknisi={teknisi} bolehKelola={bolehKelola} />)}</div>
        )}
      </CardContent>
    </Card>
  );
}
