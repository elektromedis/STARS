"use client";
import { TombolHapus } from "./tombol-hapus";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronDown, Loader2, PenLine, Printer, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { badgePrioritas, badgeStatusPerintah, JENIS_PERINTAH, PRIORITAS, STATUS_PERINTAH, urai } from "@/lib/pemeliharaan";
import { ubahPerintah, type StatusAksi } from "@/app/admin/pemeliharaan/actions";
import { formatRupiah } from "@/lib/utils";

type Teknisi = { id: number; nama: string };
export type Perintah = {
  id: number; nomor: string; jenis: string; deskripsi: string; prioritas: string; status: string; checklist: string | null;
  teknisiId: number | null; teknisi: { nama: string } | null; tindakan: string | null; sukuCadang: string | null;
  biaya: number; tanggalMulai: string | Date | null; tanggalSelesai: string | Date | null;
  permintaan: { nomor: string } | null; alat: { kode: string; nama: string } | null; createdAt: string | Date;
  tte?: { teknisi: { nama: string; waktu: string } | null; pelapor: { nama: string; waktu: string } | null };
};

/** TTE serah terima laporan kerusakan: teknisi menandatangani penyelesaian; status persetujuan pelapor. */
function KotakTte({ wo, bolehKelola }: { wo: Perintah; bolehKelola: boolean }) {
  const router = useRouter();
  const [pesan, setPesan] = useState<{ ok?: string; error?: string } | null>(null);
  const [jalan, mulai] = useTransition();
  if (!wo.permintaan) return null;
  const t = wo.tte;
  const tandatangani = () => mulai(async () => {
    const r = await fetch("/api/admin/tte", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ woId: wo.id }) });
    setPesan(await r.json().catch(() => ({ error: "Gagal." })));
    router.refresh();
  });
  return (
    <div className="grid gap-1.5 rounded-lg border border-teal-200 bg-teal-50/50 p-3 text-xs">
      <p className="flex items-center gap-1.5 font-semibold text-navy-800"><PenLine className="size-3.5" /> Tanda tangan elektronik {wo.permintaan.nomor}</p>
      <p>Teknisi: {t?.teknisi ? <span className="text-emerald-700">✓ {t.teknisi.nama} · {tgl(t.teknisi.waktu)}</span> : <span className="text-muted-foreground">belum</span>}</p>
      <p>Pelapor (serah terima): {t?.pelapor ? <span className="text-emerald-700">✓ {t.pelapor.nama} · {tgl(t.pelapor.waktu)}</span> : <span className="text-muted-foreground">{t?.teknisi ? "menunggu persetujuan pelapor (lewat menu Riwayat)" : "setelah teknisi menandatangani"}</span>}</p>
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {bolehKelola && !t?.teknisi && <Button size="sm" variant="teal" onClick={tandatangani} disabled={jalan || wo.status !== "Selesai"} title={wo.status !== "Selesai" ? "Tandai Selesai dan isi tindakan dulu" : undefined}>{jalan ? <Loader2 className="animate-spin" /> : <PenLine />} Tandatangani penyelesaian (TTE)</Button>}
        <a href={`/api/lapor/${encodeURIComponent(wo.permintaan.nomor)}/pdf`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-teal-700 hover:underline"><Printer className="size-3.5" /> PDF laporan + TTE</a>
      </div>
      {pesan?.ok && <p className="text-emerald-700" role="status">{pesan.ok}</p>}
      {pesan?.error && <p className="text-red-700" role="alert">{pesan.error}</p>}
    </div>
  );
}

const tgl = (d: string | Date | null) => (d ? new Date(d).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");

function Baris({ wo, teknisi, bolehKelola, bolehHapus }: { wo: Perintah; teknisi: Teknisi[]; bolehKelola: boolean; bolehHapus: boolean }) {
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
        {wo.permintaan && wo.status === "Selesai" && <Badge variant={wo.tte?.pelapor ? "success" : wo.tte?.teknisi ? "warning" : "outline"} className="hidden md:inline-flex">{wo.tte?.pelapor ? "TTE lengkap" : wo.tte?.teknisi ? "Menunggu pelapor" : "Belum TTE"}</Badge>}
      </summary>

      <div className="grid gap-4 bg-muted/20 px-4 py-4 md:grid-cols-2">
        <div className="space-y-1.5 text-sm">
          <p className="whitespace-pre-wrap"><span className="text-muted-foreground">Uraian:</span> {wo.deskripsi}</p>
          <p><span className="text-muted-foreground">Jenis:</span> {wo.jenis}{wo.permintaan ? ` · dari ${wo.permintaan.nomor}` : ""}</p>
          {wo.alat && <p><span className="text-muted-foreground">Alat:</span> <span className="font-mono text-xs">{wo.alat.kode}</span> {wo.alat.nama}</p>}
          {(() => { const t = urai(wo.checklist); return t.length ? <p className="text-xs"><span className="text-muted-foreground">Checklist:</span> {t.filter((x) => x.selesai).length}/{t.length} selesai</p> : null; })()}
          {wo.tindakan && <p className="whitespace-pre-wrap"><span className="text-muted-foreground">Tindakan:</span> {wo.tindakan}</p>}
          {wo.sukuCadang && <p><span className="text-muted-foreground">Suku cadang:</span> {wo.sukuCadang}</p>}
          {wo.biaya > 0 && <p><span className="text-muted-foreground">Biaya:</span> {formatRupiah(wo.biaya)}</p>}
          <p className="text-xs text-muted-foreground">Mulai {tgl(wo.tanggalMulai)} · Selesai {tgl(wo.tanggalSelesai)}</p>
          <a href={`/api/pemeliharaan/wo/${wo.id}/pdf`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 pt-1 text-xs font-medium text-teal-700 hover:underline"><Printer className="size-3.5" /> Cetak lembar kerja (PDF)</a>
          <KotakTte wo={wo} bolehKelola={bolehKelola} />
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
            <label className="grid gap-1 text-xs text-muted-foreground">Checklist tugas — satu per baris, awali <code>[x]</code> bila selesai
              <textarea name="checklist" defaultValue={wo.checklist ?? ""} rows={3} maxLength={4000} className="w-full rounded-md border border-input bg-card px-3 py-2 font-mono text-xs" placeholder={"[x] Periksa fisik\n[ ] Uji fungsi alarm"} />
            </label>
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
        {bolehHapus && wo.status !== "Selesai" && <div className="md:col-start-2"><TombolHapus id={wo.id} jenis="wo" nomor={wo.nomor} catatan={wo.permintaan ? `Laporan ${wo.permintaan.nomor} tetap ada dan kembali berstatus Baru.` : undefined} /></div>}
      </div>
    </details>
  );
}

export function PerintahPanel({ data, teknisi, bolehKelola, bolehHapus = false }: { data: Perintah[]; teknisi: Teknisi[]; bolehKelola: boolean; bolehHapus?: boolean }) {
  return (
    <Card>
      <CardHeader><CardTitle>Perintah kerja / work order ({data.length})</CardTitle></CardHeader>
      <CardContent className="px-0">
        {data.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">Belum ada perintah kerja. Buat dari laporan masuk di atas.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border">{data.map((wo) => <Baris key={wo.id} wo={wo} teknisi={teknisi} bolehKelola={bolehKelola} bolehHapus={bolehHapus} />)}</div>
        )}
      </CardContent>
    </Card>
  );
}
