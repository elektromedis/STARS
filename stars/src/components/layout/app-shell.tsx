"use client";

import { useCallback, useState } from "react";
import { Header } from "./header";
import { MobileNav } from "./mobile-nav";
import { Footer } from "./footer";
import { QrScan } from "./qr-scan";
import { MenuBawah } from "./menu-bawah";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:p-2">
        Lewati ke konten
      </a>
      <MobileNav open={open} onClose={close} />
      <div className="flex min-h-screen flex-col">
        <div className="contents print:hidden"><Header onMenuClick={() => setOpen(true)} /></div>
        <main id="main" className="mx-auto w-full max-w-[1360px] flex-1 px-4 pb-10 pt-6 md:pl-6 md:pr-[clamp(4.5rem,5.5vw,6rem)] md:pb-10 md:pt-8 min-[1600px]:pr-6 print:max-w-none print:p-0">
          {children}
        </main>
        <div className="contents print:hidden"><Footer /></div>
      </div>
      <div className="contents print:hidden"><MenuBawah /></div>
      <QrScan />
    </div>
  );
}
