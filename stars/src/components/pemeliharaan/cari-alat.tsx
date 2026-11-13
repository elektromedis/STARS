"use client";

import { useEffect, useRef, useState } from "react";
import { ImageOff } from "lucide-react";
import { Sorot } from "@/components/ui/combobox";
import { urlFotoAlat } from "@/lib/dokumen-alat";
import { cn } from "@/lib/utils";

/** Satu alat dari /api/alat/cari (data publik Inventaris). */
export type AlatSaran = {
  id: number; kode: string; nama: string; merek: string | null; model: string | null; nomorSeri: string | null; kondisi: string; foto: string | null;
  unitKerjaId: number; unit: string; ruangan: string | null; kalibrasi: { label: string; variant: "danger" | "warning" | "success" | "outline" };
};

export async function cariAlat(param: Record<string, string>, signal?: AbortSignal): Promise<AlatSaran[]> {
  const r = await fetch(`/api/alat/cari?${new URLSearchParams(param).toString()}`, { signal, cache: "no-store" });
  if (!r.ok) return [];
  return ((await r.json()) as { alat: AlatSaran[] }).alat ?? [];
}

/** Saran alat sambil mengetik (jeda 250 ms; minimal 2 huruf). `lewati` = teks yang baru saja dipilih (tidak dicari ulang). */
export function useSaranAlat(teks: string, opsi: { unitId?: string | number | null; lewati?: string | null } = {}) {
  const [saran, setSaran] = useState<AlatSaran[]>([]);
  const [memuat, setMemuat] = useState(false);
  const urut = useRef(0);
  const q = teks.trim();
  useEffect(() => {
    if (q.length < 2 || q === opsi.lewati) { setSaran([]); setMemuat(false); return; }
    const ini = ++urut.current;
    const ac = new AbortController();
    setMemuat(true);
    const t = window.setTimeout(async () => {
      try {
        const hasil = await cariAlat({ q, ...(opsi.unitId ? { unit: String(opsi.unitId) } : {}) }, ac.signal);
        if (ini === urut.current) setSaran(hasil);
      } catch { /* dibatalkan */ } finally { if (ini === urut.current) setMemuat(false); }
    }, 250);
    return () => { window.clearTimeout(t); ac.abort(); };
  }, [q, opsi.unitId, opsi.lewati]);
  return { saran, memuat };
}

export function FotoKecilAlat({ foto, nama, ukuran = 40, className }: { foto: string | null; nama: string; ukuran?: number; className?: string }) {
  const src = urlFotoAlat(foto, true);
  return (
    <span className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/50 text-muted-foreground", className)} style={{ width: ukuran, height: ukuran }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- gambar kecil dari API sendiri */}
      {src ? <img src={src} alt={`Foto ${nama}`} width={ukuran} height={ukuran} loading="lazy" decoding="async" className="size-full object-cover" /> : <ImageOff className="size-1/2 opacity-60" aria-hidden />}
    </span>
  );
}

/** Tampilan satu saran alat: foto kecil, nama (sorot kata kunci), merek/tipe, SN, unit · ruangan. */
export function BarisSaranAlat({ a, kunci }: { a: AlatSaran; kunci: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <FotoKecilAlat foto={a.foto} nama={a.nama} ukuran={36} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-navy-800"><Sorot teks={a.nama} kunci={kunci} />{a.merek && <span className="font-normal text-muted-foreground"> · <Sorot teks={[a.merek, a.model].filter(Boolean).join(" ")} kunci={kunci} /></span>}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {a.nomorSeri ? <>SN <span className="font-mono"><Sorot teks={a.nomorSeri} kunci={kunci} /></span> · </> : null}{a.unit}{a.ruangan ? ` · ${a.ruangan}` : ""}
        </span>
      </span>
    </span>
  );
}
