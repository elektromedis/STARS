"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ClipboardCheck, Loader2, Printer, ShieldCheck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

async function kirim(url: string, body: unknown, metode = "POST") {
  try {
    const r = await fetch(url, { method: metode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = (await r.json().catch(() => ({}))) as { ok?: string; error?: string; token?: string };
    return r.ok ? { ok: d.ok ?? "Tersimpan.", data: d } : { error: d.error ?? `Gagal (${r.status}).` };
  } catch { return { error: "Koneksi terputus. Coba lagi." }; }
}

export function Pesan({ ok, error }: { ok?: string | null; error?: string | null }) {
  if (error) return <p role="alert" className="flex items-start gap-1.5 text-xs text-red-700"><XCircle className="mt-px size-3.5 shrink-0" /> {error}</p>;
  if (ok) return <p role="status" className="flex items-start gap-1.5 text-xs text-emerald-700"><CheckCircle2 className="mt-px size-3.5 shrink-0" /> {ok}</p>;
  return null;
}

export function TombolCetak() {
  return <Button type="button" variant="outline" onClick={() => window.print()}><Printer /> Cetak laporan</Button>;
}

/** Catat inspeksi harian (Pagi/Sore) memakai bacaan sensor terbaru. */
export function TombolInspeksi({ lokasiId, sesi, sudahOleh }: { lokasiId: number; sesi: string; sudahOleh: string | null }) {
  const router = useRouter();
  const [proses, mulai] = useTransition();
  const [hasil, setHasil] = useState<{ ok?: string; error?: string } | null>(null);
  if (sudahOleh) return <p className="flex items-center gap-1.5 text-sm text-emerald-800"><ClipboardCheck className="size-4" /> Inspeksi {sesi.toLowerCase()} hari ini sudah dicatat oleh {sudahOleh}.</p>;
  return (
    <div className="grid gap-1">
      <Button type="button" variant="teal" size="sm" disabled={proses} className="justify-self-start"
        onClick={() => mulai(async () => { const h = await kirim("/api/admin/monitoring/inspeksi", { lokasiId }); setHasil(h); if (h.ok) router.refresh(); })}>
        {proses ? <Loader2 className="animate-spin" /> : <ClipboardCheck />} Catat inspeksi {sesi.toLowerCase()} (bacaan terkini)
      </Button>
      <Pesan ok={hasil?.ok} error={hasil?.error} />
    </div>
  );
}

export type AlarmUntukAkui = { id: number; diakui: boolean; tindakan: string | null; dampak: string | null; pencegahan: string | null };

/** Akui alarm + catatan insiden (Troubleshooting Record ala LogTag). */
export function AkuiAlarm({ a }: { a: AlarmUntukAkui }) {
  const router = useRouter();
  const [buka, setBuka] = useState(false);
  const [proses, mulai] = useTransition();
  const [hasil, setHasil] = useState<{ ok?: string; error?: string } | null>(null);
  const [isi, setIsi] = useState({ tindakan: a.tindakan ?? "", dampak: a.dampak ?? "", pencegahan: a.pencegahan ?? "" });
  if (!buka) {
    return (
      <Button type="button" size="sm" variant={a.diakui ? "outline" : "teal"} onClick={() => setBuka(true)}>
        <ShieldCheck /> {a.diakui ? "Ubah catatan" : "Akui"}
      </Button>
    );
  }
  const kolom = [
    { k: "tindakan", l: "Tindakan yang dilakukan *", c: "mis. pintu kulkas tertutup rapat, termostat diperiksa, vaksin dipindah ke kulkas cadangan pukul 10.20" },
    { k: "dampak", l: "Produk / alat terdampak & keputusannya", c: "mis. 20 vial vaksin MR — masih layak (≤ 8 °C selama < 30 menit), dikonsultasikan ke apoteker" },
    { k: "pencegahan", l: "Pencegahan agar tidak terulang", c: "mis. jadwal servis kulkas, label 'jangan dicabut' pada stopkontak" },
  ] as const;
  return (
    <form className="grid min-w-[16rem] gap-2 rounded-lg border bg-muted/40 p-3"
      onSubmit={(e) => { e.preventDefault(); mulai(async () => { const h = await kirim(`/api/admin/monitoring/alarm/${a.id}`, isi); setHasil(h); if (h.ok) { setBuka(false); router.refresh(); } }); }}>
      {kolom.map((x) => (
        <label key={x.k} className="grid gap-1 text-xs font-medium text-navy-800">{x.l}
          <textarea value={isi[x.k]} required={x.k === "tindakan"} minLength={x.k === "tindakan" ? 3 : undefined} maxLength={4000} rows={2} placeholder={x.c}
            onChange={(e) => setIsi((v) => ({ ...v, [x.k]: e.target.value }))}
            className="rounded-md border border-input bg-card px-2 py-1.5 text-sm font-normal text-foreground" />
        </label>
      ))}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" variant="teal" disabled={proses}>{proses ? <Loader2 className="animate-spin" /> : <ShieldCheck />} {a.diakui ? "Simpan catatan" : "Akui & simpan"}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setBuka(false)}>Batal</Button>
      </div>
      <Pesan ok={hasil?.ok} error={hasil?.error} />
    </form>
  );
}

export { kirim };
