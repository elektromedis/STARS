"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, ClipboardCheck, Loader2, ScanLine, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buatAudit, catatAuditItem, cariKodeAudit, selesaikanAudit, type StatusAksi } from "@/app/admin/audit/actions";
import { cn } from "@/lib/utils";

export type RingkasAudit = { id: number; tahun: number; nama: string; status: string; diperiksa: number; ditemukan: number; total: number };
export type BarisAudit = { id: number; kode: string; nama: string; merek: string | null; unit: string; ruangan: string | null; hasil: { ditemukan: boolean; kondisiSesuai: boolean; lokasiSesuai: boolean; catatan: string | null } | null };

export function DaftarAudit({ data, boleh }: { data: RingkasAudit[]; boleh: boolean }) {
  const [st, aksi, jalan] = useActionState<StatusAksi, FormData>(buatAudit, undefined);
  const router = useRouter();
  useEffect(() => { if (st?.auditId) router.push(`/admin/audit?id=${st.auditId}`); }, [st, router]);
  return (
    <div className="grid gap-4">
      {boleh && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ClipboardCheck className="size-5 text-teal-700" /> Mulai audit inventaris</CardTitle><CardDescription>WHO: setiap tahun tim mendatangi setiap ruangan dan memeriksa setiap alat — keberadaan, kondisi, dan lokasi.</CardDescription></CardHeader>
          <CardContent>
            <form action={aksi} className="flex flex-wrap items-end gap-2">
              <label className="grid gap-1 text-xs text-muted-foreground">Tahun<Input name="tahun" type="number" defaultValue={new Date().getFullYear()} className="h-9 w-28" /></label>
              <label className="grid flex-1 gap-1 text-xs text-muted-foreground">Nama audit<Input name="nama" maxLength={160} placeholder="Audit inventaris alat kesehatan" className="h-9" /></label>
              <Button type="submit" variant="teal" disabled={jalan}>{jalan && <Loader2 className="animate-spin" />} Mulai</Button>
              {st?.error && <p className="text-sm text-red-700" role="alert">{st.error}</p>}
            </form>
          </CardContent>
        </Card>
      )}
      <Card className="overflow-hidden">
        {data.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">Belum ada audit.</p> : (
          <ul className="divide-y">{data.map((a) => (
            <li key={a.id}><Link href={`/admin/audit?id=${a.id}`} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-muted/40">
              <span className="font-medium text-navy-800">{a.nama}</span><Badge variant={a.status === "Selesai" ? "success" : "warning"}>{a.status}</Badge>
              <span className="ml-auto text-sm text-muted-foreground">{a.diperiksa}/{a.total} diperiksa · {a.ditemukan} ditemukan</span>
            </Link></li>
          ))}</ul>
        )}
      </Card>
    </div>
  );
}

export function LembarAudit({ audit, baris, boleh }: { audit: RingkasAudit; baris: BarisAudit[]; boleh: boolean }) {
  const router = useRouter();
  const [jalan, mulai] = useTransition();
  const [unit, setUnit] = useState(""); const [cari, setCari] = useState(""); const [filter, setFilter] = useState("belum");
  const [kode, setKode] = useState(""); const [pesan, setPesan] = useState<string | null>(null);
  const [stS, selesai] = useActionState<StatusAksi, FormData>(selesaikanAudit, undefined);
  const aktif = boleh && audit.status === "Berjalan";
  const units = useMemo(() => [...new Set(baris.map((b) => b.unit))], [baris]);
  const perUnit = useMemo(() => units.map((u) => { const r = baris.filter((b) => b.unit === u); return { u, total: r.length, cek: r.filter((b) => b.hasil).length, temu: r.filter((b) => b.hasil?.ditemukan).length }; }), [units, baris]);
  const tampil = baris.filter((b) => (!unit || b.unit === unit) && (!cari || `${b.kode} ${b.nama} ${b.merek ?? ""} ${b.ruangan ?? ""}`.toLowerCase().includes(cari.toLowerCase()))
    && (filter === "semua" || (filter === "belum" ? !b.hasil : filter === "hilang" ? b.hasil && !b.hasil.ditemukan : b.hasil && (!b.hasil.kondisiSesuai || !b.hasil.lokasiSesuai))));
  const simpan = (alatId: number, d: NonNullable<BarisAudit["hasil"]>) => mulai(async () => { const r = await catatAuditItem(audit.id, alatId, d); setPesan(r?.error ?? null); router.refresh(); });
  const pindai = () => mulai(async () => {
    const a = await cariKodeAudit(kode);
    if (!a) { setPesan(`Kode "${kode}" tidak ditemukan di inventaris aktif.`); return; }
    const r = await catatAuditItem(audit.id, a.id, { ditemukan: true, kondisiSesuai: true, lokasiSesuai: true, catatan: null });
    setPesan(r?.error ?? `✓ ${a.nama} (${a.kode}) ditandai ditemukan.`); setKode(""); router.refresh();
  });
  const pct = audit.total ? Math.round((audit.diperiksa / audit.total) * 100) : 0;
  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
          <div><CardTitle>{audit.nama}</CardTitle><CardDescription>{audit.diperiksa} dari {audit.total} alat diperiksa ({pct}%) · {audit.ditemukan} ditemukan · {audit.diperiksa - audit.ditemukan} tidak ditemukan</CardDescription></div>
          <div className="flex items-center gap-2"><Badge variant={audit.status === "Selesai" ? "success" : "warning"}>{audit.status}</Badge>
            {aktif && <form action={selesai}><input type="hidden" name="id" value={audit.id} /><Button size="sm" variant="outline" type="submit">Tandai selesai</Button></form>}
            <Button size="sm" variant="ghost" asChild><Link href="/admin/audit">Semua audit</Link></Button></div>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-teal-500" style={{ width: `${pct}%` }} /></div>
          <div className="flex flex-wrap gap-2">{perUnit.map((p) => (
            <button key={p.u} type="button" onClick={() => setUnit(unit === p.u ? "" : p.u)} className={cn("rounded-full border px-3 py-1 text-xs", unit === p.u ? "border-teal-500 bg-teal-50 text-navy-900" : "bg-white text-muted-foreground")}>
              {p.u} <b className={p.cek === p.total ? "text-emerald-700" : "text-navy-800"}>{p.cek}/{p.total}</b>
            </button>
          ))}</div>
          {stS?.ok && <p className="text-sm text-emerald-700">{stS.ok}</p>}
        </CardContent>
      </Card>
      {aktif && (
        <form onSubmit={(e) => { e.preventDefault(); if (kode.trim()) pindai(); }} className="flex flex-wrap items-center gap-2 rounded-xl border border-teal-200 bg-teal-50/60 p-3">
          <ScanLine className="size-5 text-teal-700" aria-hidden />
          <Input value={kode} onChange={(e) => setKode(e.target.value)} placeholder="Scan / ketik kode alat, nomor seri, atau tautan QR lalu Enter" className="h-10 max-w-md flex-1 bg-white" autoFocus aria-label="Kode alat" />
          <Button type="submit" variant="teal" disabled={jalan}>{jalan ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} Tandai ditemukan</Button>
          {pesan && <span className="text-sm text-navy-800" role="status">{pesan}</span>}
        </form>
      )}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-end gap-2 border-b p-3">
          <Input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari alat / ruangan…" className="h-9 max-w-xs" aria-label="Cari" />
          <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="h-9 w-56" aria-label="Saring">
            <option value="belum">Belum diperiksa</option><option value="semua">Semua</option><option value="hilang">Tidak ditemukan</option><option value="beda">Kondisi/lokasi tidak sesuai</option>
          </Select>
          <span className="ml-auto text-xs text-muted-foreground">{tampil.length} alat{unit ? ` · ${unit}` : ""}</span>
        </div>
        <ul className="divide-y">{tampil.slice(0, 300).map((b) => <BarisItem key={b.id} b={b} aktif={aktif} simpan={simpan} />)}</ul>
        {tampil.length > 300 && <p className="border-t p-3 text-center text-xs text-muted-foreground">Menampilkan 300 pertama — saring per unit atau cari.</p>}
      </Card>
    </div>
  );
}

function BarisItem({ b, aktif, simpan }: { b: BarisAudit; aktif: boolean; simpan: (id: number, d: NonNullable<BarisAudit["hasil"]>) => void }) {
  const [kondisi, setKondisi] = useState(b.hasil?.kondisiSesuai ?? true);
  const [lokasi, setLokasi] = useState(b.hasil?.lokasiSesuai ?? true);
  const [catatan, setCatatan] = useState(b.hasil?.catatan ?? "");
  return (
    <li className="grid gap-2 px-4 py-3 md:grid-cols-[minmax(0,1.6fr)_auto] md:items-center">
      <div className="min-w-0">
        <p className="truncate font-medium text-navy-800">{b.nama}{b.merek ? <span className="font-normal text-muted-foreground"> · {b.merek}</span> : null}</p>
        <p className="truncate text-xs text-muted-foreground"><span className="font-mono">{b.kode}</span> · {b.unit}{b.ruangan ? ` · ${b.ruangan}` : ""}</p>
        {b.hasil && <p className="mt-0.5 text-xs">{b.hasil.ditemukan ? <Badge variant="success">Ditemukan</Badge> : <Badge variant="danger">Tidak ditemukan</Badge>} {!b.hasil.kondisiSesuai && <Badge variant="warning">Kondisi berbeda</Badge>} {!b.hasil.lokasiSesuai && <Badge variant="warning">Lokasi berbeda</Badge>}</p>}
      </div>
      {aktif && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-1 text-xs"><input type="checkbox" checked={kondisi} onChange={(e) => setKondisi(e.target.checked)} className="size-4 accent-teal-600" /> Kondisi sesuai</label>
          <label className="inline-flex items-center gap-1 text-xs"><input type="checkbox" checked={lokasi} onChange={(e) => setLokasi(e.target.checked)} className="size-4 accent-teal-600" /> Lokasi sesuai</label>
          <Input value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Catatan" className="h-8 w-40" aria-label={`Catatan ${b.nama}`} />
          <Button size="sm" variant="teal" onClick={() => simpan(b.id, { ditemukan: true, kondisiSesuai: kondisi, lokasiSesuai: lokasi, catatan })}><CheckCircle2 /> Ditemukan</Button>
          <Button size="sm" variant="outline" onClick={() => simpan(b.id, { ditemukan: false, kondisiSesuai: false, lokasiSesuai: false, catatan })}><XCircle /> Tidak ada</Button>
        </div>
      )}
    </li>
  );
}
