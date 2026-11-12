"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { menuAktif, NAV_ITEMS, type NavItem } from "@/lib/nav";
import { cn } from "@/lib/utils";

type Tip = { label: string; description: string; top: number; left: number };

/**
 * `compact` = sidebar desktop/tablet (hanya ikon di md, label penuh di lg) dengan pop-up keterangan menu.
 * Drawer mobile memakai versi non-compact tanpa pop-up (perangkat sentuh).
 */
export function SidebarNav({ compact = false, onNavigate }: { compact?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const idDasar = useId();
  const [tip, setTip] = useState<Tip | null>(null);
  const [tampil, setTampil] = useState(false);
  const [geser, setGeser] = useState(false);
  const [siap, setSiap] = useState(false);
  const tampilRef = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => { setSiap(true); return () => clearTimeout(timer.current); }, []);

  const atur = (v: boolean) => { tampilRef.current = v; setTampil(v); };

  function buka(el: HTMLElement, item: NavItem) {
    if (!compact) return;
    const r = el.getBoundingClientRect();
    clearTimeout(timer.current);
    // Saat pop-up sudah terlihat, berpindah menu = geser halus; saat belum, muncul di tempat tanpa meluncur dari posisi lama.
    const sudahTampil = tampilRef.current;
    setGeser(sudahTampil);
    setTip({ label: item.label, description: item.description, top: r.top + r.height / 2, left: r.right + 12 });
    if (!sudahTampil) timer.current = setTimeout(() => atur(true), 150);
  }

  function tutup() {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => atur(false), 100);
  }

  useEffect(() => {
    if (!tampil) return;
    const sembunyi = () => { clearTimeout(timer.current); atur(false); };
    document.addEventListener("scroll", sembunyi, true);
    return () => document.removeEventListener("scroll", sembunyi, true);
  }, [tampil]);

  return (
    <nav aria-label="Navigasi utama" className="flex flex-col gap-1">
      {NAV_ITEMS.map((item, i) => {
        const active = menuAktif(item, pathname);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            aria-describedby={`${idDasar}-ket-${i}`}
            onPointerEnter={(e) => { if (e.pointerType !== "touch") buka(e.currentTarget, item); }}
            onPointerLeave={tutup}
            onFocus={(e) => { if (e.currentTarget.matches(":focus-visible")) buka(e.currentTarget, item); }}
            onBlur={tutup}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200",
              compact && "justify-center lg:justify-start",
              active ? "bg-teal-500/15 text-white ring-1 ring-teal-400/40" : "text-navy-200 hover:bg-white/5 hover:text-white"
            )}
          >
            <Icon className={cn("size-5 shrink-0 transition-colors duration-200", active ? "text-teal-300" : "text-navy-300 group-hover:text-teal-300")} aria-hidden />
            <span className={cn("leading-tight", compact && "hidden lg:inline")}>{item.label}</span>
            <span id={`${idDasar}-ket-${i}`} className="sr-only">{item.description}</span>
          </Link>
        );
      })}

      {compact && siap && tip && createPortal(
        <div
          aria-hidden
          style={{ top: tip.top, left: tip.left }}
          className={cn(
            "pointer-events-none fixed z-[60] w-64 -translate-y-1/2 rounded-lg bg-navy-950 px-3.5 py-2.5 text-white shadow-xl ring-1 ring-white/10",
            "origin-left transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none",
            geser && "transition-[opacity,transform,top]",
            tampil ? "translate-x-0 scale-100 opacity-100" : "-translate-x-1 scale-95 opacity-0"
          )}
        >
          <span className="absolute -left-1 top-1/2 size-2.5 -translate-y-1/2 rotate-45 bg-navy-950" />
          <p className="relative text-sm font-semibold">{tip.label}</p>
          <p className="relative mt-0.5 text-xs leading-snug text-navy-200">{tip.description}</p>
        </div>,
        document.body
      )}
    </nav>
  );
}
