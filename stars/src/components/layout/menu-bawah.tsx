"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, History, Home, ScanQrCode, UserRound, type LucideIcon } from "lucide-react";
import { bukaScan } from "@/lib/lokal";
import { cn } from "@/lib/utils";
import { NAV_EN, useBahasa } from "@/lib/bahasa";
import { useNotifikasi } from "./use-notifikasi";

type Menu = { label: string; href: string; ikon: LucideIcon; warna: string };
const KIRI: Menu[] = [
  { label: "Beranda", href: "/", ikon: Home, warna: "from-sky-400 to-blue-600" },
  { label: "Riwayat", href: "/riwayat", ikon: History, warna: "from-amber-400 to-orange-500" },
];
const KANAN: Menu[] = [
  { label: "Notifikasi", href: "/notifikasi", ikon: Bell, warna: "from-rose-400 to-red-600" },
  { label: "Akun Saya", href: "/akun", ikon: UserRound, warna: "from-slate-400 to-slate-600" },
];

const WADAH = "group/dock relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl text-[10px] font-medium text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-teal-600 md:w-[3.4rem] md:flex-none short:md:w-11";
const UBIN = "relative flex size-10 origin-bottom items-center justify-center rounded-[0.8rem] bg-gradient-to-b text-white shadow-[0_3px_8px_rgba(15,23,42,.28),inset_0_1px_0_rgba(255,255,255,.45)] transition-transform duration-200 ease-out active:scale-90 motion-reduce:transition-none md:size-12 md:rounded-[0.95rem] md:group-hover/dock:-translate-y-1.5 md:group-hover/dock:scale-125 md:group-focus-visible/dock:-translate-y-1.5 md:group-focus-visible/dock:scale-125 short:md:size-9";
const LABEL = "max-w-full truncate text-center leading-tight md:pointer-events-none md:invisible md:absolute md:-top-11 md:left-1/2 md:z-10 md:max-w-none md:-translate-x-1/2 md:whitespace-nowrap md:rounded-lg md:bg-slate-900/85 md:px-2.5 md:py-1 md:text-xs md:text-white md:opacity-0 md:shadow-lg md:backdrop-blur md:transition-opacity md:group-hover/dock:visible md:group-hover/dock:opacity-100 md:group-focus-visible/dock:visible md:group-focus-visible/dock:opacity-100";

/** Dock kaca di semua ukuran layar: Beranda, Riwayat, Scan QR, Notifikasi, dan Akun. */
export function MenuBawah() {
  const pathname = usePathname();
  const { belum } = useNotifikasi();
  const { bhs } = useBahasa();
  const aktif = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));

  const Tautan = ({ label, href, ikon: Ikon, warna }: Menu) => {
    const a = aktif(href);
    const lencana = href === "/notifikasi" && belum > 0;
    const teks = bhs === "en" && NAV_EN[href] ? NAV_EN[href][0] : label;
    return (
      <Link href={href} aria-current={a ? "page" : undefined} aria-label={lencana ? `${teks}, ${belum} belum dibaca` : teks} className={cn(WADAH, a && "font-semibold text-navy-900")}>
        <span className={cn(UBIN, warna)}>
          <Ikon className="size-5 md:size-6 short:size-5" strokeWidth={a ? 2.3 : 1.9} aria-hidden />
          {lencana && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white" aria-hidden>{belum > 99 ? "99+" : belum}</span>}
        </span>
        <span className={LABEL}>{teks}</span>
        {a && <span className="absolute -bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-slate-800 md:-bottom-1.5" aria-hidden />}
      </Link>
    );
  };

  return (
    <nav id="bilah-cepat" aria-label="Menu cepat"
      className="fixed bottom-[calc(0.5rem+env(safe-area-inset-bottom))] left-1/2 z-40 w-[calc(100%-1.25rem)] max-w-sm -translate-x-1/2 rounded-[1.65rem] border border-white/60 bg-white/55 shadow-[0_18px_50px_rgba(15,23,42,.28),inset_0_1px_0_rgba(255,255,255,.75)] ring-1 ring-slate-900/10 backdrop-blur-2xl backdrop-saturate-150 print:hidden md:bottom-3 md:w-auto md:max-w-none">
      <div className="flex items-start px-1.5 py-1.5 md:items-end md:gap-1 md:px-2.5 md:py-2">
        {KIRI.map((m) => <Tautan key={m.href} {...m} />)}
        <button type="button" onClick={bukaScan} aria-label="Scan QR alat" className={cn(WADAH, "font-semibold text-navy-900")}>
          <span className={cn(UBIN, "from-teal-500 to-navy-700")}><ScanQrCode className="size-5 md:size-6 short:size-5" aria-hidden /></span>
          <span className={LABEL}>Scan QR</span>
        </button>
        {KANAN.map((m) => <Tautan key={m.href} {...m} />)}
      </div>
    </nav>
  );
}
