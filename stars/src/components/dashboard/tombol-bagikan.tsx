"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, FileSpreadsheet, FileText, Link2, Presentation, Printer, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const FORMAT = [
  { f: "pdf", label: "PDF (.pdf)", ket: "Laporan siap cetak", Icon: FileText },
  { f: "xlsx", label: "Excel (.xlsx)", ket: "Bisa diedit & diimpor ulang", Icon: FileSpreadsheet },
  { f: "docx", label: "Word (.docx)", ket: "Dokumen tabel yang bisa diedit", Icon: FileText },
  { f: "pptx", label: "PowerPoint (.pptx)", ket: "Slide tabel yang bisa diedit", Icon: Presentation },
] as const;

/** Tombol "Bagikan / Unduh": unduh .pdf/.xlsx/.docx/.pptx, salin tautan pratinjau, bagikan (HP), atau cetak. */
export function TombolBagikan({ sumber, judul }: { sumber: string; judul: string }) {
  const [buka, setBuka] = useState(false);
  const [tersalin, setTersalin] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!buka) return;
    const luar = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setBuka(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setBuka(false); };
    document.addEventListener("pointerdown", luar); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", luar); document.removeEventListener("keydown", esc); };
  }, [buka]);
  const url = (f: string) => `${sumber}${sumber.includes("?") ? "&" : "?"}format=${f}`;
  async function bagikan() {
    const link = window.location.href;
    if (navigator.share) { try { await navigator.share({ title: judul, url: link }); return; } catch { /* dibatalkan */ } }
    await navigator.clipboard?.writeText(link).catch(() => {});
    setTersalin(true); setTimeout(() => setTersalin(false), 2000);
  }
  return (
    <div ref={ref} className="relative flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={() => window.print()}><Printer /> Cetak</Button>
      <Button variant="outline" size="sm" onClick={bagikan}>{tersalin ? <Check /> : <Link2 />} {tersalin ? "Tautan disalin" : "Salin tautan"}</Button>
      <Button size="sm" variant="teal" aria-expanded={buka} aria-haspopup="menu" onClick={() => setBuka((b) => !b)}><Share2 /> Bagikan / Unduh <ChevronDown /></Button>
      {buka && (
        <div role="menu" className="absolute right-0 top-full z-40 mt-2 w-72 rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-xl">
          {FORMAT.map(({ f, label, ket, Icon }) => (
            <a key={f} role="menuitem" href={url(f)} onClick={() => setBuka(false)} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted">
              <Icon className="size-5 text-teal-700" aria-hidden />
              <span><span className="block text-sm font-medium">{label}</span><span className="block text-xs text-muted-foreground">{ket}</span></span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
