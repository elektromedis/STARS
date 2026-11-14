"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, History, Home, ScanQrCode, UserRound, type LucideIcon } from "lucide-react";
import { bukaScan } from "@/lib/lokal";
import { cn } from "@/lib/utils";
import { useNotifikasi } from "./use-notifikasi";

const KIRI: { label: string; href: string; ikon: LucideIcon }[] = [
  { label: "Beranda", href: "/", ikon: Home },
  { label: "Riwayat", href: "/riwayat", ikon: History },
];
const KANAN: { label: string; href: string; ikon: LucideIcon }[] = [
  { label: "Notifikasi", href: "/notifikasi", ikon: Bell },
  { label: "Akun Saya", href: "/akun", ikon: UserRound },
];

/**
 * Menu cepat gaya aplikasi bank: Beranda · Riwayat · [Scan QR] · Notifikasi · Akun Saya.
 * Ponsel (< 768 px): bilah penuh di dasar layar dengan tombol QR menonjol di tengah.
 * Tablet/desktop: dok vertikal mengambang di tepi KANAN, di tengah tinggi layar, agar tidak menutupi grafik/tabel.
 * Layar pendek (mis. ponsel/tablet mendatar, tinggi ≤ 560 px): ikon & jarak diperkecil supaya tetap muat.
 */
export function MenuBawah() {
  const pathname = usePathname();
  const { belum } = useNotifikasi();
  const aktif = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));

  const Tautan = ({ label, href, ikon: Ikon }: { label: string; href: string; ikon: LucideIcon }) => {
    const a = aktif(href);
    const lencana = href === "/notifikasi" && belum > 0;
    return (
      <Link href={href} aria-current={a ? "page" : undefined}
        aria-label={lencana ? `${label}, ${belum} belum dibaca` : undefined}
        className={cn("group relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[11px] font-medium transition-colors md:w-[4.5rem] md:flex-none md:px-1 md:py-2 md:text-[10.5px] short:py-1",
          a ? "text-teal-700 md:bg-teal-50" : "text-slate-500 hover:text-navy-800 md:hover:bg-slate-50")}>
        <span className="relative">
          <Ikon className={cn("size-6 transition-transform group-hover:-translate-y-0.5 group-active:scale-90 motion-reduce:transition-none short:size-5", a && "fill-teal-100")} strokeWidth={a ? 2.2 : 1.8} aria-hidden />
          {lencana && <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white" aria-hidden>{belum > 99 ? "99+" : belum}</span>}
        </span>
        <span className="max-w-full truncate text-center leading-tight">{label}</span>
        {a && <span className="absolute inset-x-5 -top-px h-0.5 rounded-full bg-teal-600 md:inset-x-auto md:inset-y-3 md:-right-px md:top-auto md:h-auto md:w-0.5" aria-hidden />}
      </Link>
    );
  };

  return (
    <nav aria-label="Menu cepat"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(15,23,42,0.08)] backdrop-blur print:hidden",
        "md:inset-x-auto md:bottom-auto md:right-3 md:top-1/2 md:-translate-y-1/2 md:rounded-2xl md:border md:pb-0 md:shadow-xl",
        "animate-in fade-in slide-in-from-bottom-4 duration-500 md:slide-in-from-bottom-0 md:slide-in-from-right-6 motion-reduce:animate-none",
      )}>
      <div className="mx-auto flex h-16 max-w-lg items-stretch px-1 md:h-auto md:flex-col md:items-center md:gap-1 md:px-1.5 md:py-2 short:md:gap-0 short:md:py-1">
        {KIRI.map((m) => <Tautan key={m.href} {...m} />)}
        <div className="flex flex-1 justify-center md:my-1 md:flex-none short:md:my-0">
          <button type="button" onClick={bukaScan} aria-label="Scan QR alat"
            className="group -mt-6 flex flex-col items-center gap-0.5 text-[11px] font-semibold text-navy-800 focus-visible:outline-none md:mt-0 md:text-[10.5px]">
            <span className="flex size-14 items-center short:size-11 justify-center rounded-full bg-gradient-to-br from-teal-500 to-navy-700 text-white shadow-lg shadow-teal-900/30 ring-4 ring-white transition-transform group-hover:scale-105 group-active:scale-95 group-focus-visible:ring-teal-300 motion-reduce:transition-none">
              <ScanQrCode className="size-7 short:size-6" aria-hidden />
            </span>
            Scan QR
          </button>
        </div>
        {KANAN.map((m) => <Tautan key={m.href} {...m} />)}
      </div>
    </nav>
  );
}
