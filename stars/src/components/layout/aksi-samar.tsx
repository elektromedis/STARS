"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, PersonStanding } from "lucide-react";
import { useBahasa } from "@/lib/bahasa";
import { cn } from "@/lib/utils";
import { useSitus } from "./use-situs";

const TOMBOL = "flex h-11 flex-row-reverse items-center whitespace-nowrap rounded-full border border-white/60 bg-white/80 p-1.5 text-sm font-semibold text-navy-800 shadow-lg ring-1 ring-slate-900/10 backdrop-blur-xl transition-colors duration-200 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-600 motion-reduce:transition-none";

/** Bantuan dan Aksesibilitas selalu terlihat samar; jelas saat kursor, fokus, atau ketukan pertama. */
export function AksiSamar() {
  const { info } = useSitus();
  const { t } = useBahasa();
  const [aktif, setAktif] = useState(false);
  const wadah = useRef<HTMLDivElement>(null);
  const teksBantuan = info.bantuanTeks === "Bantuan?" ? t("Bantuan", "Help") : info.bantuanTeks;

  useEffect(() => {
    if (!aktif) return;
    const luar = (e: PointerEvent) => { if (!wadah.current?.contains(e.target as Node)) setAktif(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setAktif(false); };
    const waktu = window.matchMedia("(hover: none)").matches ? setTimeout(() => setAktif(false), 7000) : undefined;
    document.addEventListener("pointerdown", luar);
    document.addEventListener("keydown", esc);
    return () => { clearTimeout(waktu); document.removeEventListener("pointerdown", luar); document.removeEventListener("keydown", esc); };
  }, [aktif]);

  /** Di layar sentuh, ketukan pertama hanya memperjelas tombol agar tidak salah tekan. */
  const ketukPertama = useRef(false);
  const label = (teks: string) => <span className={cn("overflow-hidden transition-all duration-200 motion-reduce:transition-none", aktif ? "ml-2 mr-2 max-w-40 opacity-100" : "max-w-0 opacity-0")}>{teks}</span>;

  return (
    <div ref={wadah} id="aksi-samar" data-aktif={aktif}
      onPointerEnter={(e) => { if (e.pointerType === "mouse") setAktif(true); }}
      onPointerMove={(e) => { if (e.pointerType === "mouse" && !aktif) setAktif(true); }}
      onPointerLeave={(e) => { if (e.pointerType === "mouse") setAktif(false); }}
      onPointerDownCapture={(e) => { ketukPertama.current = e.pointerType !== "mouse" && !aktif; if (ketukPertama.current) setAktif(true); }}
      onClickCapture={(e) => { if (ketukPertama.current) { ketukPertama.current = false; e.preventDefault(); e.stopPropagation(); } }}
      onFocusCapture={() => setAktif(true)}
      onBlurCapture={(e) => { if (!wadah.current?.contains(e.relatedTarget as Node)) setAktif(false); }}
      className={cn("fixed right-2 top-[calc(6.25rem+env(safe-area-inset-top))] z-40 grid justify-items-end gap-2 transition-opacity duration-200 motion-reduce:transition-none print:hidden md:right-3", aktif ? "opacity-100" : "opacity-30")}>
      {info.whatsapp && (
        <a href={`https://wa.me/${info.whatsapp}?text=${encodeURIComponent(t("Halo, saya butuh bantuan terkait STARS.", "Hello, I need help with STARS."))}`} target="_blank" rel="noopener noreferrer" aria-label={teksBantuan} className={TOMBOL}>
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-teal-600 text-white"><MessageCircle className="size-4" aria-hidden /></span>{label(teksBantuan)}
        </a>
      )}
      <button type="button" aria-label={t("Aksesibilitas", "Accessibility")} onClick={() => { setAktif(false); window.dispatchEvent(new Event("stars:a11y-buka")); }} className={TOMBOL}>
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#1e3a8a] text-white"><PersonStanding className="size-5" strokeWidth={2.5} aria-hidden /></span>{label(t("Aksesibilitas", "Accessibility"))}
      </button>
    </div>
  );
}
