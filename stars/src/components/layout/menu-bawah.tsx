"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Accessibility, Bell, History, Home, MessageCircle, ScanQrCode, UserRound, type LucideIcon } from "lucide-react";
import { bukaScan } from "@/lib/lokal";
import { cn } from "@/lib/utils";
import { NAV_EN, useBahasa } from "@/lib/bahasa";
import { useNotifikasi } from "./use-notifikasi";
import { useSitus } from "./use-situs";

type Menu = { label: string; href: string; ikon: LucideIcon; warna: string };
const KIRI: Menu[] = [
  { label: "Beranda", href: "/", ikon: Home, warna: "md:from-sky-400 md:to-blue-600" },
  { label: "Riwayat", href: "/riwayat", ikon: History, warna: "md:from-amber-400 md:to-orange-500" },
  { label: "Notifikasi", href: "/notifikasi", ikon: Bell, warna: "md:from-rose-400 md:to-red-600" },
];
const AKUN: Menu = { label: "Akun Saya", href: "/akun", ikon: UserRound, warna: "md:from-slate-400 md:to-slate-600" };

const WADAH = "group/dock relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[10px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-teal-600 min-[400px]:text-[11px] md:w-[3.4rem] md:flex-none md:overflow-visible md:p-0 short:md:w-11";
const UBIN = "relative flex items-center justify-center transition-transform duration-200 ease-out motion-reduce:transition-none md:size-12 md:origin-bottom md:rounded-[0.95rem] md:bg-gradient-to-b md:text-white md:shadow-[0_3px_8px_rgba(15,23,42,.28),inset_0_1px_0_rgba(255,255,255,.45)] md:group-hover/dock:-translate-y-1.5 md:group-hover/dock:scale-125 md:group-focus-visible/dock:-translate-y-1.5 md:group-focus-visible/dock:scale-125 short:md:size-9";
const LABEL = "max-w-full truncate text-center leading-tight md:pointer-events-none md:absolute md:-top-11 md:left-1/2 md:z-10 md:max-w-none md:-translate-x-1/2 md:whitespace-nowrap md:rounded-lg md:bg-slate-900/85 md:px-2.5 md:py-1 md:text-xs md:invisible md:text-white md:opacity-0 md:shadow-lg md:backdrop-blur md:transition-opacity md:group-hover/dock:visible md:group-focus-visible/dock:visible md:group-hover/dock:opacity-100 md:group-focus-visible/dock:opacity-100";
const IKON = "size-6 md:size-6 short:size-5";

/**
 * Bilah cepat: Beranda, Riwayat, Notifikasi, Scan QR, Akun, Aksesibilitas, dan Bantuan.
 * Ponsel: bilah penuh di dasar layar. Tablet/desktop: dock kaca mengambang di tengah bawah dengan ubin ikon.
 */
export function MenuBawah() {
  const pathname = usePathname();
  const { belum } = useNotifikasi();
  const { bhs, t } = useBahasa();
  const { info } = useSitus();
  const [a11yBuka, setA11yBuka] = useState(false);
  const aktif = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));

  useEffect(() => {
    const f = (e: Event) => setA11yBuka(Boolean((e as CustomEvent<boolean>).detail));
    window.addEventListener("stars:a11y-status", f);
    return () => window.removeEventListener("stars:a11y-status", f);
  }, []);

  const Titik = ({ nyala }: { nyala: boolean }) => nyala ? (
    <>
      <span className="absolute inset-x-4 -top-px h-0.5 rounded-full bg-teal-600 md:hidden" aria-hidden />
      <span className="absolute -bottom-1.5 left-1/2 hidden size-1 -translate-x-1/2 rounded-full bg-slate-800 md:block" aria-hidden />
    </>
  ) : null;

  const Tautan = ({ label, href, ikon: Ikon, warna }: Menu) => {
    const a = aktif(href);
    const lencana = href === "/notifikasi" && belum > 0;
    const teks = bhs === "en" && NAV_EN[href] ? NAV_EN[href][0] : label;
    return (
      <Link href={href} aria-current={a ? "page" : undefined} aria-label={lencana ? `${teks}, ${belum} belum dibaca` : teks}
        className={cn(WADAH, a ? "text-teal-700" : "text-slate-500 hover:text-navy-800")}>
        <span className={cn(UBIN, warna)}>
          <Ikon className={cn(IKON, a && "fill-teal-100 md:fill-white/25")} strokeWidth={a ? 2.2 : 1.8} aria-hidden />
          {lencana && <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white md:-right-1 md:-top-1" aria-hidden>{belum > 99 ? "99+" : belum}</span>}
        </span>
        <span className={LABEL}>{teks}</span>
        <Titik nyala={a} />
      </Link>
    );
  };

  const bantuan = info.bantuanTeks === "Bantuan?" ? t("Bantuan", "Help") : info.bantuanTeks;

  return (
    <nav id="bilah-cepat" aria-label="Menu cepat"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(15,23,42,0.08)] backdrop-blur print:hidden",
        "md:inset-x-auto md:bottom-3 md:left-1/2 md:-translate-x-1/2 md:rounded-[1.65rem] md:border md:border-white/60 md:bg-white/45 md:pb-0 md:shadow-[0_18px_50px_rgba(15,23,42,.28),inset_0_1px_0_rgba(255,255,255,.75)] md:ring-1 md:ring-slate-900/10 md:backdrop-blur-2xl md:backdrop-saturate-150",
      )}>
      <div className="mx-auto flex h-16 max-w-xl items-stretch px-0.5 md:h-auto md:max-w-none md:items-end md:gap-1 md:px-2.5 md:py-2">
        {KIRI.map((m) => <Tautan key={m.href} {...m} />)}
        <div className="flex flex-1 justify-center md:w-[3.4rem] md:flex-none short:md:w-11">
          <button type="button" onClick={bukaScan} aria-label="Scan QR alat"
            className="group/dock relative -mt-5 flex flex-col items-center gap-0.5 rounded-xl text-[10px] font-semibold text-navy-800 outline-none focus-visible:ring-2 focus-visible:ring-teal-600 min-[400px]:text-[11px] md:mt-0">
            <span className="flex size-[3.25rem] origin-bottom items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-navy-700 text-white shadow-lg shadow-teal-900/30 ring-4 ring-white transition-transform duration-200 ease-out motion-reduce:transition-none md:size-12 md:rounded-[0.95rem] md:shadow-[0_3px_8px_rgba(15,23,42,.28),inset_0_1px_0_rgba(255,255,255,.45)] md:ring-0 md:group-hover/dock:-translate-y-1.5 md:group-hover/dock:scale-125 md:group-focus-visible/dock:-translate-y-1.5 md:group-focus-visible/dock:scale-125 short:md:size-9">
              <ScanQrCode className="size-6" aria-hidden />
            </span>
            <span className={LABEL}>Scan QR</span>
          </button>
        </div>
        <Tautan {...AKUN} />
        <span className="mx-1 hidden h-10 w-px self-center bg-slate-500/30 md:block" aria-hidden />
        <button type="button" onClick={() => window.dispatchEvent(new Event("stars:a11y-buka"))} aria-expanded={a11yBuka}
          aria-label={t("Aksesibilitas (Alt+A)", "Accessibility (Alt+A)")} className={cn(WADAH, a11yBuka ? "text-blue-700" : "text-slate-500 hover:text-navy-800")}>
          <span className={cn(UBIN, "md:from-blue-500 md:to-indigo-700")}><Accessibility className={IKON} strokeWidth={1.9} aria-hidden /></span>
          <span className={LABEL}><span className="md:hidden">{t("Akses", "Access")}</span><span className="hidden md:inline">{t("Aksesibilitas", "Accessibility")}</span></span>
          <Titik nyala={a11yBuka} />
        </button>
        {info.whatsapp && (
          <a href={`https://wa.me/${info.whatsapp}?text=${encodeURIComponent(t("Halo, saya butuh bantuan terkait STARS.", "Hello, I need help with STARS."))}`} target="_blank" rel="noopener noreferrer"
            aria-label={`${bantuan} WhatsApp`} className={cn(WADAH, "text-slate-500 hover:text-navy-800")}>
            <span className={cn(UBIN, "md:from-emerald-400 md:to-green-600")}><MessageCircle className={IKON} strokeWidth={1.9} aria-hidden /></span>
            <span className={LABEL}>{bantuan}</span>
          </a>
        )}
      </div>
    </nav>
  );
}
