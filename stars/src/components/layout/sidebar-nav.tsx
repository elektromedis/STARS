"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, ExternalLink } from "lucide-react";
import { menuAktif, NAV_SAMPING, type NavItem } from "@/lib/nav";
import { NAV_EN, useBahasa } from "@/lib/bahasa";
import { cn } from "@/lib/utils";
import { menuTertutup, useMenuTertutup } from "./use-akses";

type Tip = { label: string; description: string; top: number; left: number };
type Panel = { item: NavItem; top: number; left: number };

/**
 * `compact` = sidebar desktop/tablet (ikon di md, label di lg) dengan pop-up keterangan menu.
 * Menu bersub-menu (IMMIS, CMMS, ESP, …) membuka panel mengambang saat diklik; di drawer mobile sub-menu terbuka di bawahnya.
 */
export function SidebarNav({ compact = false, onNavigate }: { compact?: boolean; onNavigate?: () => void }) {
  const { bhs } = useBahasa();
  const lbl = (it: NavItem) => (bhs === "en" ? it.en ?? it.label : it.label);
  const ket = (it: NavItem) => (bhs === "en" && !it.children && NAV_EN[it.href]?.[1] ? NAV_EN[it.href][1] : it.description);
  const pathname = usePathname() ?? "/";
  const menuMati = useMenuTertutup();
  const idDasar = useId();
  const [tip, setTip] = useState<Tip | null>(null);
  const [tampil, setTampil] = useState(false);
  const [geser, setGeser] = useState(false);
  const [siap, setSiap] = useState(false);
  const [panel, setPanel] = useState<Panel | null>(null);
  const [terbuka, setTerbuka] = useState<string | null>(null);
  const tampilRef = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => { setSiap(true); return () => clearTimeout(timer.current); }, []);
  useEffect(() => { setPanel(null); }, [pathname]);

  const atur = (v: boolean) => { tampilRef.current = v; setTampil(v); };
  const terlihat = (it: NavItem) => !menuTertutup(menuMati, it.href);
  const anak = (it: NavItem) => (it.children ?? []).filter(terlihat);
  const daftar = NAV_SAMPING.filter((it) => (it.children ? anak(it).length > 0 : terlihat(it)));

  function buka(el: HTMLElement, item: NavItem) {
    if (!compact || panel) return;
    const r = el.getBoundingClientRect();
    clearTimeout(timer.current);
    const sudahTampil = tampilRef.current;
    setGeser(sudahTampil);
    setTip({ label: lbl(item), description: ket(item), top: r.top + r.height / 2, left: r.right + 12 });
    if (!sudahTampil) timer.current = setTimeout(() => atur(true), 150);
  }
  function tutup() { clearTimeout(timer.current); timer.current = setTimeout(() => atur(false), 100); }

  // Panel mengambang: tutup saat klik di luar, Esc, atau gulir.
  useEffect(() => {
    if (!panel) return;
    const luar = (e: PointerEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || (t instanceof Element && t.closest(`[data-grup="${panel.item.label}"]`))) return;
      setPanel(null);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setPanel(null); };
    document.addEventListener("pointerdown", luar, true);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", luar, true); document.removeEventListener("keydown", esc); };
  }, [panel]);

  useEffect(() => {
    if (!tampil) return;
    const sembunyi = () => { clearTimeout(timer.current); atur(false); };
    document.addEventListener("scroll", sembunyi, true);
    return () => document.removeEventListener("scroll", sembunyi, true);
  }, [tampil]);

  const kelas = (active: boolean) => cn(
    "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors duration-200",
    compact && "justify-center lg:justify-start",
    active ? "bg-teal-500/15 text-white ring-1 ring-teal-400/40" : "text-navy-200 hover:bg-white/5 hover:text-white"
  );
  const ikon = (active: boolean) => cn("size-5 shrink-0 transition-colors duration-200", active ? "text-teal-300" : "text-navy-300 group-hover:text-teal-300");

  function Tautan({ item, i, sub = false }: { item: NavItem; i: string; sub?: boolean }) {
    const active = menuAktif(item, pathname);
    const Icon = item.icon;
    const isi = (
      <>
        <Icon className={ikon(active)} aria-hidden />
        <span className={cn("leading-tight", compact && !sub && "hidden lg:inline")}>{lbl(item)}</span>
        {item.external && <ExternalLink className={cn("ml-auto size-3.5 opacity-60", compact && !sub && "hidden lg:block")} aria-hidden />}
        <span id={`${idDasar}-ket-${i}`} className="sr-only">{ket(item)}</span>
      </>
    );
    const umum = {
      "aria-describedby": `${idDasar}-ket-${i}`,
      onPointerEnter: (e: React.PointerEvent<HTMLElement>) => { if (!sub && e.pointerType !== "touch") buka(e.currentTarget, item); },
      onPointerLeave: tutup,
      onFocus: (e: React.FocusEvent<HTMLElement>) => { if (!sub && e.currentTarget.matches(":focus-visible")) buka(e.currentTarget, item); },
      onBlur: tutup,
      className: cn(kelas(active), sub && "pl-4"),
    };
    if (item.external) return <a href={item.href} target="_blank" rel="noopener noreferrer" onClick={() => { setPanel(null); onNavigate?.(); }} {...umum}>{isi}</a>;
    return <Link href={item.href} onClick={() => { setPanel(null); onNavigate?.(); }} aria-current={active ? "page" : undefined} {...umum}>{isi}</Link>;
  }

  return (
    <nav aria-label="Navigasi utama" className="flex flex-col gap-1">
      {daftar.map((item, i) => {
        if (!item.children) return <Tautan key={item.label} item={item} i={String(i)} />;
        const active = menuAktif(item, pathname);
        const Icon = item.icon;
        const buka2 = compact ? panel?.item.label === item.label : terbuka === item.label;
        return (
          <div key={item.label} className="contents">
            <button
              type="button"
              data-grup={item.label}
              aria-expanded={buka2}
              aria-haspopup={compact ? "menu" : undefined}
              aria-describedby={`${idDasar}-ket-${i}`}
              data-aktif={active || undefined}
              onPointerEnter={(e) => { if (e.pointerType !== "touch") buka(e.currentTarget, item); }}
              onPointerLeave={tutup}
              onBlur={tutup}
              onClick={(e) => {
                clearTimeout(timer.current); atur(false);
                if (!compact) { setTerbuka((t) => (t === item.label ? null : item.label)); return; }
                const r = e.currentTarget.getBoundingClientRect();
                setPanel((p) => (p?.item.label === item.label ? null : { item, top: r.top, left: r.right + 12 }));
              }}
              className={kelas(active)}
            >
              <Icon className={ikon(active)} aria-hidden />
              <span className={cn("leading-tight", compact && "hidden lg:inline")}>{lbl(item)}</span>
              <ChevronRight className={cn("ml-auto size-4 opacity-60 transition-transform", compact && "hidden lg:block", buka2 && !compact && "rotate-90")} aria-hidden />
              <span id={`${idDasar}-ket-${i}`} className="sr-only">{ket(item)}</span>
            </button>
            {!compact && buka2 && (
              <div className="ml-4 flex flex-col gap-1 border-l border-white/10 pl-2">
                {anak(item).map((c, j) => <Tautan key={c.label} item={c} i={`${i}-${j}`} sub />)}
              </div>
            )}
          </div>
        );
      })}

      {compact && siap && panel && createPortal(
        <div
          ref={panelRef}
          role="menu"
          aria-label={panel.item.label}
          style={{ top: Math.max(8, Math.min(panel.top - 8, window.innerHeight - 80 - anak(panel.item).length * 56)), left: panel.left }}
          className="menu-mengambang fixed z-[70] w-72 rounded-2xl bg-navy-900/95 p-2 text-white shadow-2xl ring-1 ring-white/10 backdrop-blur-xl"
        >
          <p className="px-3 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-navy-300">{lbl(panel.item)} <span className="font-normal normal-case tracking-normal">· {ket(panel.item)}</span></p>
          <div className="flex flex-col gap-0.5">
            {anak(panel.item).map((c) => {
              const active = menuAktif(c, pathname);
              const Icon = c.icon;
              const isi = (
                <>
                  <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", active ? "bg-teal-500/25 text-teal-200" : "bg-white/10 text-teal-300")}><Icon className="size-5" aria-hidden /></span>
                  <span className="min-w-0"><span className="block text-sm font-semibold">{lbl(c)}</span><span className="block text-xs leading-snug text-navy-200">{ket(c)}</span></span>
                </>
              );
              const k = cn("flex items-center gap-3 rounded-xl px-2.5 py-2 hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none", active && "bg-white/10");
              return c.external
                ? <a key={c.label} role="menuitem" href={c.href} target="_blank" rel="noopener noreferrer" className={k} onClick={() => setPanel(null)}>{isi}</a>
                : <Link key={c.label} role="menuitem" href={c.href} className={k} aria-current={active ? "page" : undefined} onClick={() => { setPanel(null); onNavigate?.(); }}>{isi}</Link>;
            })}
          </div>
        </div>,
        document.body
      )}

      {compact && siap && tip && !panel && createPortal(
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
