"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Download, Printer, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * QR satu alat (gambar kecil). Klik → QR besar + tombol Lapor Kerusakan / Unduh / Cetak label.
 * Isi QR = <alamat STARS>/lapor?alat=<kode>, sama dengan label cetak. Bisa dilihat publik.
 */
export function QrAlat({ kode, nama, keterangan, alamat, labelHref, ukuran = 40 }: {
  kode: string; nama: string; keterangan?: string; alamat?: string; labelHref?: string; ukuran?: number;
}) {
  const [buka, setBuka] = useState(false);
  const tutupRef = useRef<HTMLButtonElement>(null);
  const q = new URLSearchParams({ kode });
  if (alamat) q.set("alamat", alamat);
  const src = `/api/qr/alat?${q.toString()}`;

  useEffect(() => {
    if (!buka) return;
    tutupRef.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setBuka(false); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [buka]);

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setBuka(true); }}
        className="shrink-0 rounded-md border bg-white p-0.5 shadow-sm transition hover:border-teal-400 hover:ring-2 hover:ring-teal-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
        title={`QR ${kode} — klik untuk memperbesar`}
        aria-label={`Tampilkan QR code alat ${nama} (${kode})`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- SVG kecil dari API sendiri, tidak perlu optimasi gambar */}
        <img src={src} alt="" width={ukuran} height={ukuran} loading="lazy" decoding="async" className="block" style={{ width: ukuran, height: ukuran }} />
      </button>
      {buka && createPortal(
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-navy-950/70 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setBuka(false)}>
          <div role="dialog" aria-modal="true" aria-label={`QR code ${nama}`} onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm overflow-hidden rounded-t-2xl bg-card shadow-2xl sm:rounded-2xl">
            <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
              <div className="min-w-0">
                <h2 className="font-semibold leading-snug text-navy-800">{nama}</h2>
                <p className="font-mono text-xs text-muted-foreground">{kode}</p>
                {keterangan && <p className="text-xs text-muted-foreground">{keterangan}</p>}
              </div>
              <Button ref={tutupRef} variant="ghost" size="icon" onClick={() => setBuka(false)} aria-label="Tutup"><X className="size-5" /></Button>
            </div>
            <div className="flex justify-center bg-white p-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`QR code alat ${kode}`} width={240} height={240} className="block size-60" />
            </div>
            <p className="px-4 text-center text-xs text-muted-foreground">Scan dengan kamera HP untuk membuka formulir Lapor Kerusakan alat ini.</p>
            <div className="flex flex-wrap gap-2 p-4">
              <Button asChild variant="teal" size="sm" className="flex-1"><Link href={`/lapor?alat=${encodeURIComponent(kode)}`}><Send /> Lapor kerusakan</Link></Button>
              <Button asChild variant="outline" size="sm"><a href={src} download={`QR-${kode.replace(/[^\w.-]+/g, "_")}.svg`}><Download /> Unduh</a></Button>
              {labelHref && <Button asChild variant="outline" size="sm"><a href={labelHref} target="_blank" rel="noopener noreferrer"><Printer /> Cetak label</a></Button>}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
