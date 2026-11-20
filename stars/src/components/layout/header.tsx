"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Menu, Search, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "./logo";
import { MenuAplikasi } from "./menu-aplikasi";
import { useSitus } from "./use-situs";
import { urlLogoRsud } from "@/lib/situs";
import { StatusSinkron } from "./status-sinkron";
import { PasangAplikasi } from "./pasang-aplikasi";

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const { info } = useSitus();
  const cari = useRef<HTMLInputElement>(null);
  // Pintasan "/" untuk langsung mengetik di kotak pencarian (seperti GitHub/YouTube).
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key === "/" && !e.ctrlKey && !e.metaKey && !/INPUT|TEXTAREA|SELECT/.test(el.tagName) && !el.isContentEditable) { e.preventDefault(); cari.current?.focus(); }
    };
    window.addEventListener("keydown", f); return () => window.removeEventListener("keydown", f);
  }, []);
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b bg-white/95 px-3 shadow-[0_1px_0_rgba(15,23,42,0.04),0_4px_16px_-8px_rgba(15,23,42,0.12)] backdrop-blur md:gap-4 md:px-6">
      {/* Kiri: menu + identitas STARS */}
      <div className="flex shrink-0 items-center gap-1 md:gap-2">
        <Button variant="ghost" size="icon" onClick={onMenuClick} aria-label="Buka menu" aria-haspopup="dialog" title="Menu" className="size-10 rounded-full [&_svg]:size-6">
          <Menu />
        </Button>
        <Link href="/" aria-label="STARS — ke Beranda" title="Ke Beranda" className="shrink-0 rounded-md text-navy-800 transition-opacity hover:opacity-80">
          <Logo subClassName="hidden 2xl:block" />
        </Link>
      </div>

      {/* Tengah: pencarian global — form GET ke halaman Paket, bekerja tanpa JavaScript. */}
      <form action="/paket" method="get" role="search" className="group relative mx-auto hidden w-full max-w-xl flex-1 sm:block">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-500 group-focus-within:text-teal-700" aria-hidden />
        <Input ref={cari} type="search" name="q" placeholder="Cari paket, uraian, atau rekening…" aria-label="Pencarian paket" aria-keyshortcuts="/"
          className="h-10 rounded-full border-slate-200 bg-slate-100 pl-10 pr-10 transition focus-visible:border-teal-600 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-teal-600/25" />
        <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-slate-300 bg-white px-1.5 text-[11px] font-semibold text-slate-500 group-focus-within:hidden lg:block" aria-hidden>/</kbd>
      </form>

      {/* Kanan: aksi + identitas rumah sakit */}
      <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:ml-0 md:gap-2">
        <Button variant="ghost" size="icon" className="hidden size-10 rounded-full min-[420px]:inline-flex sm:hidden" aria-label="Cari" asChild><a href="/paket"><Search className="size-5" /></a></Button>
        <MenuAplikasi />
        <StatusSinkron className="hidden 2xl:inline-flex" />
        <PasangAplikasi />
        <Button size="sm" asChild title="Masuk ke area administrasi" className="h-10 rounded-full bg-navy-800 px-3 text-white hover:bg-navy-900 sm:px-4">
          <Link href="/admin" aria-label="Masuk"><LogIn /><span className="hidden sm:inline">Masuk</span></Link>
        </Button>
        <span className="mx-1 hidden h-8 w-px bg-slate-200 sm:block" aria-hidden />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={urlLogoRsud(info)} alt="RSUD Cipayung" className="h-7 w-auto min-w-0 max-w-[5.5rem] object-contain sm:h-9 sm:max-w-[9.5rem] lg:h-10 lg:max-w-[12rem]" />
      </div>
    </header>
  );
}
