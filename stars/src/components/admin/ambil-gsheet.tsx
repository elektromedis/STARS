"use client";

import { useEffect, useState } from "react";
import { Loader2, Sheet } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Ambil isi Google Sheets (dibagikan via link) sebagai berkas .xlsx untuk formulir impor. Tautan diingat per peramban. */
export function AmbilGsheet({ kunci, nama, onFile }: { kunci: string; nama: string; onFile: (f: File) => void }) {
  const [url, setUrl] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);
  useEffect(() => { try { setUrl(localStorage.getItem(`gsheet-${kunci}`) ?? ""); } catch {} }, [kunci]);
  async function ambil() {
    setSibuk(true); setPesan(null);
    try {
      const r = await fetch(`/api/admin/gsheet?url=${encodeURIComponent(url.trim())}`);
      if (!r.ok) { setPesan(((await r.json().catch(() => ({}))) as { error?: string }).error ?? `Gagal (${r.status})`); return; }
      try { localStorage.setItem(`gsheet-${kunci}`, url.trim()); } catch {}
      onFile(new File([await r.blob()], `${nama}.xlsx`, { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
      setPesan("Diambil dari Google Sheets — lanjutkan dengan Periksa.");
    } catch (e) { setPesan(e instanceof Error ? e.message : String(e)); } finally { setSibuk(false); }
  }
  return (
    <div className="grid gap-1 rounded-lg border border-dashed p-3 text-sm">
      <p className="flex items-center gap-1.5 font-medium"><Sheet className="size-4 text-emerald-700" /> Atau ambil langsung dari Google Sheets</p>
      <div className="flex flex-wrap gap-2">
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/…" className="h-9 min-w-0 flex-1 rounded-md border px-2 text-sm" aria-label="Tautan Google Sheets" />
        <Button type="button" variant="outline" onClick={ambil} disabled={sibuk || !url.trim()}>{sibuk ? <Loader2 className="animate-spin" /> : <Sheet />} Ambil</Button>
      </div>
      <p className="text-xs text-muted-foreground">Spreadsheet harus dibagikan “Siapa saja yang memiliki link: Pelihat”. Tautan diingat di peramban ini.</p>
      {pesan && <p className="text-xs text-teal-800" role="status">{pesan}</p>}
    </div>
  );
}
