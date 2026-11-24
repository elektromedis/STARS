"use client";

import { useCallback, useState } from "react";
import { usePathname } from "next/navigation";
import { Header } from "./header";
import { MobileNav } from "./mobile-nav";
import { Footer } from "./footer";
import { QrScan } from "./qr-scan";
import { MenuBawah } from "./menu-bawah";
import { FaviconAnimasi } from "./favicon-animasi";
import { BahasaProvider, useBahasa } from "@/lib/bahasa";
import { BilahAtas, EtalaseSitus, KembaliKeAtas, KontakSitus, PopupPengumuman } from "./bilah-situs";
import { AksiSamar } from "./aksi-samar";
import { Aksesibilitas } from "./aksesibilitas";
import { LatarGalaksi, LatarGerbang } from "./tampilan";
import { Sidebar } from "./sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  // EMASCARE (STARS IMMS) (/imms, domain terpisah) memakai kerangka jendelanya sendiri.
  if (usePathname()?.startsWith("/imms")) return <BahasaProvider>{children}</BahasaProvider>;
  return <BahasaProvider><Shell>{children}</Shell></BahasaProvider>;
}

function Shell({ children }: { children: React.ReactNode }) {
  const { t } = useBahasa();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <div className="min-h-screen">
      <LatarGalaksi />
      <LatarGerbang />
      <div className="sidebar-t4 print:hidden"><Sidebar /></div>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:p-2">
        {t("Lewati ke konten", "Skip to content")}
      </a>
      <MobileNav open={open} onClose={close} />
      <div className="kolom-utama flex min-h-screen flex-col">
        <BilahAtas />
        <div className="contents print:hidden"><Header onMenuClick={() => setOpen(true)} /></div>
        <main id="main" className="mx-auto w-full max-w-[1360px] flex-1 px-4 pb-10 pt-6 md:pl-6 md:pr-6 md:pb-10 md:pt-8 min-[1600px]:pr-6 print:max-w-none print:p-0">
          {children}
        </main>
        <EtalaseSitus />
        <KontakSitus />
        <div className="contents print:hidden"><Footer /></div>
      </div>
      <div className="contents print:hidden"><MenuBawah /></div>
      <QrScan />
      <FaviconAnimasi />
      <AksiSamar />
      <KembaliKeAtas />
      <Aksesibilitas />
      <PopupPengumuman />
    </div>
  );
}
