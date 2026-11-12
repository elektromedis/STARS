"use client";

import { useCallback, useState } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { MobileNav } from "./mobile-nav";
import { Footer } from "./footer";
import { QrScan } from "./qr-scan";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:p-2">
        Lewati ke konten
      </a>
      <Sidebar />
      <MobileNav open={open} onClose={close} />
      <div className="flex min-h-screen flex-col md:pl-[72px] lg:pl-64">
        <Header onMenuClick={() => setOpen(true)} />
        <main id="main" className="mx-auto w-full max-w-[1360px] flex-1 px-4 pb-24 pt-6 md:px-6 md:pb-24 md:pt-8">
          {children}
        </main>
        <Footer />
      </div>
      <QrScan />
    </div>
  );
}
