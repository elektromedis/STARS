"use client";

import Link from "next/link";
import { Menu, Search, Database, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Logo } from "./logo";

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-card/90 px-4 backdrop-blur md:px-6">
      <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuClick} aria-label="Buka menu">
        <Menu className="size-5" />
      </Button>
      <Logo className="text-navy-800 md:hidden" showText={false} />

      {/* Pencarian global: form GET biasa ke halaman Paket, bekerja tanpa JavaScript. */}
      <form action="/paket" method="get" role="search" className="relative hidden max-w-md flex-1 sm:block">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input type="search" name="q" placeholder="Cari paket, uraian, atau rekening…" className="pl-9" aria-label="Pencarian paket" />
      </form>

      <div className="ml-auto flex items-center gap-2">
        <Badge variant="teal" className="hidden sm:inline-flex"><Database className="mr-1 size-3" /> Data RKPBU BLUD</Badge>
        <Button variant="ghost" size="icon" className="sm:hidden" aria-label="Cari" asChild><a href="/paket"><Search className="size-5" /></a></Button>
        <Button variant="outline" size="sm" asChild title="Masuk ke area administrasi"><Link href="/admin"><LogIn /> Masuk</Link></Button>
      </div>
    </header>
  );
}
