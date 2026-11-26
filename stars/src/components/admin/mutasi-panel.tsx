"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Loader2, Printer, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ajukanMutasi, batalkanMutasi, putuskanMutasi, terimaMutasi, type StatusMutasi } from "@/app/admin/mutasi/actions";
import { cn } from "@/lib/utils";

type Baris = {
  id: number; nomor: string; jenis: string; status: string; alasan: string; kondisi: string | null; alat: string; dari: string; ke: string;
  diajukanOleh: string | null; dibuat: string; diputuskanOleh: string | null; diputuskanPada: string | null; catatan: string | null; diterimaOleh: string | null; diterimaPada: string | null;
};
const tgl = (s: string | null) => (s ? new Date(s).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }) : "-");
const WARNA: Record<string, string> = { Diajukan: "bg-amber-100 text-amber-900", Disetujui: "bg-sky-100 text-sky-900", Selesai: "bg-emerald-100 text-emerald-900", Ditolak: "bg-red-100 text-red-900", Dibatalkan: "bg-slate-200 text-slate-700" };
const K = "h-9 rounded-md border border-input bg-background px-2 text-sm";

function Pesan({ st }: { st: StatusMutasi }) {
  if (st?.ok) return <span role="status" className="text-sm text-emerald-700">{st.ok}</span>;
  if (st?.error) return <span role="alert" className="text-sm text-red-700">{st.error}</span>;
  return null;
}

function CariAlat({ awal, onPilih }: { awal: { id: number; label: string } | null; onPilih: (v: { id: number; label: string } | null) => void }) {
  const [q, setQ] = useState(awal?.label ?? "");
  const [hasil, setHasil] = useState<{ id: number; label: string }[]>([]);
  useEffect(() => {
    if (q.length < 2 || q === awal?.label) { setHasil([]); return; }
    const t = setTimeout(async () => {
      const r = await fetch(`/api/alat/cari?q=${encodeURIComponent(q)}`).then((x) => x.json()).catch(() => ({ alat: [] }));
      setHasil((r.alat ?? []).map((a: { id: number; kode: string; nama: string; nomorSeri: string | null; unitKerja: { nama: string }; ruangan: { nama: string } | null }) => ({ id: a.id, label: `${a.kode} · ${a.nama}${a.nomorSeri ? ` · SN ${a.nomorSeri}` : ""} · ${a.unitKerja.nama}${a.ruangan ? ` / ${a.ruangan.nama}` : ""}` })));
    }, 250);
    return () => clearTimeout(t);
  }, [q, awal?.label]);
  return (
    <div className="relative grid gap-1 text-sm">
      <span>Alat *</span>
      <input value={q} onChange={(e) => { setQ(e.target.value); onPilih(null); }} placeholder="Ketik kode, nama, nomor seri…" aria-label="Cari alat" className={cn(K, "w-full")} />
      {hasil.length > 0 && (
        <ul role="listbox" className="absolute top-full z-30 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-popover p-1 shadow-lg">
          {hasil.map((h) => <li key={h.id}><button type="button" role="option" aria-selected={false} className="w-full rounded px-2 py-1.5 text-left hover:bg-muted" onClick={() => { setQ(h.label); setHasil([]); onPilih(h); }}>{h.label}</button></li>)}
        </ul>
      )}
    </div>
  );
}

function FormAju({ units, ruangan, pilih }: { units: { id: number; nama: string }[]; ruangan: { id: number; nama: string; unitKerjaId: number }[]; pilih: { id: number; label: string } | null }) {
  const [st, aksi, jalan] = useActionState<StatusMutasi, FormData>(ajukanMutasi, undefined);
  const [alat, setAlat] = useState(pilih);
  const [unit, setUnit] = useState("");
  return (
    <form action={aksi} className="grid gap-3 md:grid-cols-2">
      <input type="hidden" name="alatId" value={alat?.id ?? ""} />
      <div className="md:col-span-2"><CariAlat awal={pilih} onPilih={setAlat} /></div>
      <label className="grid gap-1 text-sm">Unit tujuan *
        <select name="keUnitId" required value={unit} onChange={(e) => setUnit(e.target.value)} className={K}><option value="">— pilih —</option>{units.map((u) => <option key={u.id} value={u.id}>{u.nama}</option>)}</select>
      </label>
      <label className="grid gap-1 text-sm">Ruangan tujuan
        <select name="keRuanganId" className={K} disabled={!unit}><option value="">— tanpa ruangan —</option>{ruangan.filter((r) => String(r.unitKerjaId) === unit).map((r) => <option key={r.id} value={r.id}>{r.nama}</option>)}</select>
      </label>
      <label className="grid gap-1 text-sm md:col-span-2">Alasan *
        <textarea name="alasan" required minLength={5} maxLength={500} rows={2} placeholder="mis. kebutuhan pelayanan ICU, pemerataan alat, ruangan direnovasi" className="rounded-md border border-input bg-background px-2 py-1.5 text-sm" />
      </label>
      <div className="flex flex-wrap items-center gap-3 md:col-span-2">
        <Button type="submit" variant="teal" disabled={jalan || !alat}>{jalan ? <Loader2 className="animate-spin" /> : <Send />} Ajukan</Button>
        <span className="text-xs text-muted-foreground">Unit sama = <b>Relokasi</b> (pindah ruangan); unit berbeda = <b>Mutasi</b>.</span>
        <Pesan st={st} />
      </div>
    </form>
  );
}

function Tindakan({ m, admin, email, lapor }: { m: Baris; admin: boolean; email: string; lapor: (st: StatusMutasi) => void }) {
  const [stP, putus, jP] = useActionState<StatusMutasi, FormData>(async (a, f) => { const r = await putuskanMutasi(a, f); lapor(r); return r; }, undefined);
  const [stT, terima, jT] = useActionState<StatusMutasi, FormData>(async (a, f) => { const r = await terimaMutasi(a, f); lapor(r); return r; }, undefined);
  const [stB, batal, jB] = useActionState<StatusMutasi, FormData>(async (a, f) => { const r = await batalkanMutasi(a, f); lapor(r); return r; }, undefined);
  const kep = useRef<HTMLInputElement>(null);
  // Hasil aksi juga dilaporkan ke panel (langsung dari aksi): kartu bisa hilang dari daftar tersaring setelah statusnya berubah.
  return (
    <div className="grid gap-2">
      {m.status === "Diajukan" && (
        <form action={putus} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="id" value={m.id} />
          <input type="hidden" name="keputusan" ref={kep} defaultValue="setujui" />
          <input name="catatan" placeholder="Catatan (wajib bila menolak)" aria-label={`Catatan keputusan ${m.nomor}`} className={cn(K, "min-w-48 flex-1")} />
          <Button type="submit" size="sm" variant="teal" disabled={jP} onClick={() => { if (kep.current) kep.current.value = "setujui"; }}><Check /> Setujui</Button>
          <Button type="submit" size="sm" variant="outline" disabled={jP} onClick={() => { if (kep.current) kep.current.value = "tolak"; }}><X /> Tolak</Button>
          <Pesan st={stP} />
        </form>
      )}
      {m.status === "Disetujui" && (
        <form action={terima} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="id" value={m.id} />
          <label className="flex items-center gap-1 text-sm">Kondisi saat diterima
            <select name="kondisi" aria-label={`Kondisi ${m.nomor}`} className={K}>{["Baik", "Rusak Ringan", "Rusak Berat"].map((k) => <option key={k}>{k}</option>)}</select>
          </label>
          <Button type="submit" size="sm" variant="teal" disabled={jT}><Check /> Serah terima selesai</Button>
          <Pesan st={stT} />
        </form>
      )}
      {["Diajukan", "Disetujui"].includes(m.status) && (admin || m.diajukanOleh === email) && (
        <form action={batal} className="flex items-center gap-2"><input type="hidden" name="id" value={m.id} /><Button type="submit" size="sm" variant="ghost" disabled={jB}>Batalkan pengajuan</Button><Pesan st={stB} /></form>
      )}
    </div>
  );
}

export function MutasiPanel({ bolehKelola, admin, email, status, units, ruangan, pilih, daftar }: {
  bolehKelola: boolean; admin: boolean; email: string; status: string; units: { id: number; nama: string }[];
  ruangan: { id: number; nama: string; unitKerjaId: number }[]; pilih: { id: number; label: string } | null; daftar: Baris[];
}) {
  const [hasil, setHasil] = useState<StatusMutasi>(undefined);
  return (
    <div className="grid gap-4">
      {hasil && <p className={cn("rounded-lg border p-3 text-sm", hasil.ok ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50")}><Pesan st={hasil} /></p>}
      {bolehKelola && (
        <Card>
          <CardHeader>
            <CardTitle>Ajukan relokasi / mutasi alat</CardTitle>
            <CardDescription>Alur: <b>Ajukan</b> → <b>Setujui</b> (petugas lain/Admin) → <b>Serah terima</b> di unit tujuan → lokasi alat otomatis diperbarui dan tercatat di riwayat. KIR ruangan asal & tujuan perlu disahkan ulang.</CardDescription>
          </CardHeader>
          <CardContent><FormAju units={units} ruangan={ruangan} pilih={pilih} /></CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Daftar relokasi & mutasi ({daftar.length})</CardTitle>
          <nav aria-label="Saring status" className="flex flex-wrap gap-1.5 pt-1">
            {["", "Diajukan", "Disetujui", "Selesai", "Ditolak", "Dibatalkan"].map((s) => (
              <Link key={s} href={s ? `/admin/mutasi?status=${s}` : "/admin/mutasi"} aria-current={status === s ? "page" : undefined}
                className={cn("rounded-full border px-3 py-1 text-xs font-medium", status === s ? "border-teal-600 bg-teal-600 text-white" : "hover:bg-muted")}>{s || "Semua"}</Link>
            ))}
          </nav>
        </CardHeader>
        <CardContent className="grid gap-3">
          {!daftar.length && <p className="text-sm text-muted-foreground">Belum ada pengajuan.</p>}
          {daftar.map((m) => (
            <article key={m.id} className="grid gap-2 rounded-xl border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-semibold text-navy-800">{m.nomor}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{m.jenis}</span>
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", WARNA[m.status])}>{m.status}</span>
                <a href={`/admin/mutasi/${m.nomor}`} target="_blank" className="ml-auto inline-flex items-center gap-1 text-xs text-teal-700 hover:underline"><Printer className="size-3.5" /> Berita acara</a>
              </div>
              <p className="text-sm font-medium">{m.alat}</p>
              <p className="flex flex-wrap items-center gap-2 text-sm"><span>{m.dari}</span><ArrowRight className="size-4 text-teal-600" aria-label="ke" /><span className="font-medium">{m.ke}</span></p>
              <p className="text-xs text-muted-foreground">Alasan: {m.alasan} · diajukan {m.diajukanOleh ?? "-"} {tgl(m.dibuat)}{m.diputuskanOleh ? ` · diputuskan ${m.diputuskanOleh} ${tgl(m.diputuskanPada)}` : ""}{m.catatan ? ` · catatan: ${m.catatan}` : ""}{m.diterimaOleh ? ` · diterima ${m.diterimaOleh} ${tgl(m.diterimaPada)} (kondisi ${m.kondisi})` : ""}</p>
              {bolehKelola && <Tindakan m={m} admin={admin} email={email} lapor={setHasil} />}
            </article>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
