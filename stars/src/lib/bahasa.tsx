"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Bahasa = "id" | "en";
type Ctx = { bhs: Bahasa; setBhs: (b: Bahasa) => void; t: (id: string, en?: string) => string };
const BahasaCtx = createContext<Ctx>({ bhs: "id", setBhs: () => {}, t: (id) => id });

/** Terjemahan menu (per href) untuk bilah navigasi. */
export const NAV_EN: Record<string, [string, string]> = {
  "/": ["Dashboard", "Summary of all menus: planning-procurement, equipment maintenance and fault reports"],
  "/allies": ["ALLIES", "Medical equipment management agent: device life cycle from needs analysis to disposal"],
  "/nilai": ["SI-ALKES", "Planning-procurement (value, packages, data, RKBU print) and HTA"],
  "/pemeliharaan": ["SI-FARMALKES", "Equipment maintenance & inventory, testing and calibration, fault reports"],
  "/jdih": ["JDIH", "Legal Documentation & Information Network: regulations on medical devices, procurement, assets, staffing, e-signature"],
  "/monitoring": ["SI-LOGGER", "Live Medical Device Environmental Monitoring: real-time temperature & humidity"],
  "/tracking": ["SI-TRACKING", "Live tracking of work progress in every menu"],
  "/avicenna": ["AVICENNA", "Virtual reality for medical device training and simulation"],
  "/admin": ["ADMIN", "Excel import/export, maintenance, equipment list, users and logs (login required)"],
  "/about": ["ABOUT", "Help, guide, data sources and how STARS works"],
  "/kalibrasi": ["Testing & Calibration", "Equipment testing & calibration records"],
  "/lapor": ["Report Fault", "Report a broken medical device — no account needed"],
  "/kalender": ["Calendar", "Maintenance & repair calendar, linkable to Google Calendar"],
  "/peminjaman": ["Equipment Loan", "Inter-unit equipment loans with e-signature approval"],
  "/hta": ["HTA", "Health Technology Assessment: compare device brands & types"],
  "/paket": ["Packages", "RKPBU/RKBU package list"], "/data": ["Data", "Download datasets"], "/rkbu": ["Print RKBU", "Compose and print RKBU documents"],
  "/riwayat": ["History", ""], "/notifikasi": ["Notifications", ""], "/akun": ["My Account", ""],
};

export function BahasaProvider({ children }: { children: React.ReactNode }) {
  const [bhs, setState] = useState<Bahasa>("id");
  useEffect(() => { try { if (localStorage.getItem("stars-bahasa") === "en") setState("en"); } catch {} }, []);
  useEffect(() => { document.documentElement.lang = bhs; }, [bhs]);
  const setBhs = useCallback((b: Bahasa) => { setState(b); try { localStorage.setItem("stars-bahasa", b); } catch {} document.cookie = `stars-bahasa=${b}; path=/; max-age=31536000; samesite=lax`; }, []);
  const t = useCallback((id: string, en?: string) => (bhs === "en" && en ? en : id), [bhs]);
  return <BahasaCtx.Provider value={{ bhs, setBhs, t }}>{children}</BahasaCtx.Provider>;
}
export const useBahasa = () => useContext(BahasaCtx);

/** Tombol ID | EN. */
export function PilihBahasa({ className = "" }: { className?: string }) {
  const { bhs, setBhs } = useBahasa();
  return (
    <div role="group" aria-label="Bahasa / Language" className={`inline-flex overflow-hidden rounded-md border border-current/30 text-xs font-semibold ${className}`}>
      {(["id", "en"] as Bahasa[]).map((b) => (
        <button key={b} type="button" onClick={() => setBhs(b)} aria-pressed={bhs === b} lang={b}
          className={`px-2 py-0.5 ${bhs === b ? "bg-white text-teal-800" : "opacity-80 hover:opacity-100"}`}>{b === "id" ? "ID" : "EN"}</button>
      ))}
    </div>
  );
}
