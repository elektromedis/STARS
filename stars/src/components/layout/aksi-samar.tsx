"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronRight, MessageCircle, PersonStanding } from "lucide-react";
import { useBahasa } from "@/lib/bahasa";
import { cn } from "@/lib/utils";
import { useSitus } from "./use-situs";

const TOMBOL = "flex h-11 items-center gap-2 whitespace-nowrap rounded-full border border-white/60 bg-white/70 pl-1.5 pr-3.5 text-sm font-semibold text-navy-800 shadow-lg ring-1 ring-slate-900/10 backdrop-blur-xl transition duration-200 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-600 motion-reduce:transition-none";

/** Pegangan samar di tepi kiri; Bantuan dan Aksesibilitas hanya muncul saat dibuka. */
export function AksiSamar() {
  const { info } = useSitus();
  const { t } = useBahasa();
  const [buka, setBuka] = useState(false);
  const wadah = useRef<HTMLDivElement>(null);
  const teksBantuan = info.bantuanTeks === "Bantuan?" ? t("Bantuan", "Help") : info.bantuanTeks;

  useEffect(() => {
    if (!buka) return;
    const luar = (e: PointerEvent) => { if (!wadah.current?.contains(e.target as Node)) setBuka(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setBuka(false); };
    const waktu = setTimeout(() => setBuka(false), 7000);
    document.addEventListener("pointerdown", luar);
    document.addEventListener("keydown", esc);
    return () => { clearTimeout(waktu); document.removeEventListener("pointerdown", luar); document.removeEventListener("keydown", esc); };
  }, [buka]);

  return (
    <div ref={wadah} id="aksi-samar" className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] left-0 z-40 flex items-end print:hidden md:bottom-24">
      <button type="button" onClick={() => setBuka((b) => !b)} aria-expanded={buka} aria-controls="aksi-samar-isi" aria-label={t("Buka Bantuan dan Aksesibilitas", "Open Help and Accessibility")}
        className="group flex h-14 w-5 items-center justify-start outline-none">
        <span className={cn("flex h-11 w-3.5 items-center justify-center rounded-r-lg bg-slate-600/25 text-white backdrop-blur transition-all duration-200 group-hover:w-4 group-hover:bg-teal-700/80 group-focus-visible:w-4 group-focus-visible:bg-teal-700", buka && "bg-teal-700/80")}>
          <ChevronRight className={cn("size-3 transition-transform duration-200", buka && "rotate-180")} aria-hidden />
        </span>
      </button>
      <div id="aksi-samar-isi" inert={!buka} className={cn("ml-1 grid origin-bottom-left gap-2 transition-all duration-200 ease-out motion-reduce:transition-none", buka ? "translate-x-0 scale-100 opacity-100" : "pointer-events-none -translate-x-3 scale-95 opacity-0")}>
        {info.whatsapp && (
          <a href={`https://wa.me/${info.whatsapp}?text=${encodeURIComponent(t("Halo, saya butuh bantuan terkait STARS.", "Hello, I need help with STARS."))}`} target="_blank" rel="noopener noreferrer" onClick={() => setBuka(false)} className={TOMBOL}>
            <span className="grid size-8 place-items-center rounded-full bg-teal-600 text-white"><MessageCircle className="size-4" aria-hidden /></span>{teksBantuan}
          </a>
        )}
        <button type="button" onClick={() => { setBuka(false); window.dispatchEvent(new Event("stars:a11y-buka")); }} className={TOMBOL}>
          <span className="grid size-8 place-items-center rounded-full bg-[#1e3a8a] text-white"><PersonStanding className="size-5" strokeWidth={2.5} aria-hidden /></span>{t("Aksesibilitas", "Accessibility")}
        </button>
      </div>
    </div>
  );
}
