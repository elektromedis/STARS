"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

const fmt = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });
const teks = (iso: string) => `${fmt.format(new Date(iso))} WIB`;

/**
 * Lencana "Data Tersinkron: 14 Nov 26 02.40 WIB" (gaya Data INAPROC).
 * Memeriksa /api/status-sinkron tiap 60 detik saat tab terlihat; titik hijau berdenyut,
 * dan lencana berkilat sekali bila ada data baru.
 */
export function StatusSinkron({ className }: { className?: string }) {
  const [waktu, setWaktu] = useState<string | null>(null);
  const [kilat, setKilat] = useState(0);
  const [gagal, setGagal] = useState(false);
  const sebelumnya = useRef<string | null>(null);

  useEffect(() => {
    let hidup = true;
    const ambil = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const r = await fetch("/api/status-sinkron", { cache: "no-store" });
        if (!r.ok) throw new Error(String(r.status));
        const j = (await r.json()) as { waktu: string | null };
        if (!hidup) return;
        setGagal(false);
        if (j.waktu && sebelumnya.current && j.waktu !== sebelumnya.current) setKilat((k) => k + 1);
        sebelumnya.current = j.waktu;
        setWaktu(j.waktu);
      } catch { if (hidup) setGagal(true); }
    };
    ambil();
    const t = setInterval(ambil, 60_000);
    const lihat = () => { if (document.visibilityState === "visible") ambil(); };
    document.addEventListener("visibilitychange", lihat);
    return () => { hidup = false; clearInterval(t); document.removeEventListener("visibilitychange", lihat); };
  }, []);

  if (!waktu && !gagal) return null;
  return (
    <span key={kilat} role="status" aria-live="polite"
      title={gagal ? "Tidak dapat memeriksa server; menampilkan waktu terakhir yang diketahui" : "Waktu data STARS terakhir diperbarui (diperiksa tiap menit)"}
      className={cn("inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium shadow-sm",
        gagal ? "border-amber-200 bg-amber-50 text-amber-900" : "border-green-200 bg-green-50 text-green-900", kilat > 0 && "sinkron-kilat", className)}>
      <span className={cn("size-2 shrink-0 rounded-full", gagal ? "bg-amber-500" : "sinkron-denyut bg-green-600")} aria-hidden />
      {kilat > 0 && <RefreshCw className="size-3 animate-spin [animation-iteration-count:1] motion-reduce:animate-none" aria-hidden />}
      <span><span className="hidden xl:inline">Data </span>Tersinkron: <strong className="font-semibold tabular-nums">{waktu ? teks(waktu) : "–"}</strong></span>
    </span>
  );
}
