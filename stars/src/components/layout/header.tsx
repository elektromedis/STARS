"use client";

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
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-2 sm:gap-3 border-b bg-card/90 px-4 backdrop-blur md:px-6">
      <Button variant="ghost" size="icon" onClick={onMenuClick} aria-label="Buka menu" aria-haspopup="dialog" title="Menu" className="size-11 [&_svg]:size-7">
        <Menu className="size-6" />
      </Button>
      <Link href="/" aria-label="STARS — ke Beranda" title="Ke Beranda" className="shrink-0 rounded-md text-navy-800 transition-opacity hover:opacity-80">
        <Logo subClassName="hidden lg:block" />
      </Link>
      <span className="hidden h-9 w-px shrink-0 bg-border min-[400px]:block" aria-hidden />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={urlLogoRsud(info)} alt="RSUD Cipayung" className="h-8 w-auto min-w-0 shrink object-contain sm:h-11 sm:max-w-[13rem]" />

      {/* Pencarian global: form GET biasa ke halaman Paket, bekerja tanpa JavaScript. */}
      <form action="/paket" method="get" role="search" className="relative hidden max-w-md flex-1 sm:block">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input type="search" name="q" placeholder="Cari paket, uraian, atau rekening…" className="pl-9" aria-label="Pencarian paket" />
      </form>

      <div className="ml-auto flex items-center gap-2">
        <MenuAplikasi />
        <StatusSinkron className="hidden sm:inline-flex" />
        <PasangAplikasi />
        <Button variant="ghost" size="icon" className="sm:hidden" aria-label="Cari" asChild><a href="/paket"><Search className="size-5" /></a></Button>
        <Button variant="outline" size="sm" asChild title="Masuk ke area administrasi"><Link href="/admin" aria-label="Masuk"><LogIn /><span className="hidden sm:inline">Masuk</span></Link></Button>
      </div>
    </header>
  );
}
