"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ExternalLink, LayoutGrid } from "lucide-react";
import { useBahasa } from "@/lib/bahasa";
import { useSitus } from "./use-situs";

/** Dropdown "Aplikasi" (tautan aplikasi RS lain; diatur di CMS Situs). */
export function MenuAplikasi() {
  const { info } = useSitus();
  const { bhs, t } = useBahasa();
  const [buka, setBuka] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!buka) return;
    const klik = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setBuka(false); };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setBuka(false);
    document.addEventListener("mousedown", klik); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", klik); document.removeEventListener("keydown", esc); };
  }, [buka]);
  const daftar = info.aplikasi ?? [];
  if (!daftar.length) return null;
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setBuka(!buka)} aria-expanded={buka} aria-haspopup="true" title={t("Aplikasi", "Apps")}
        className={`flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-navy-800 hover:bg-slate-100 ${buka ? "bg-slate-100" : ""}`}>
        <LayoutGrid className="size-4" aria-hidden /><span className="hidden lg:inline">{t("Aplikasi", "Apps")}</span><ChevronDown className={`hidden size-3.5 transition-transform lg:block ${buka ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {buka && (
        <ul className="absolute right-0 top-11 z-50 grid min-w-56 gap-0.5 rounded-xl border bg-white p-2 shadow-xl sm:left-0 sm:right-auto">
          {daftar.map((a) => (
            <li key={a.label + a.href}>
              <a href={a.href} target={a.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" onClick={() => setBuka(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-navy-800 hover:bg-slate-100">
                <span className="flex-1">{bhs === "en" && a.labelEn ? a.labelEn : a.label}</span>
                {a.href.startsWith("http") && <ExternalLink className="size-3.5 opacity-50" aria-hidden />}
              </a>
            </li>))}
        </ul>
      )}
    </div>
  );
}
