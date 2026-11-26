"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Boxes, History, Home, LogIn, ScanQrCode, UserRound, Wrench, type LucideIcon } from "lucide-react";
import { useNotifikasi } from "@/components/layout/use-notifikasi";
import { BUKA_PINDAI } from "./pindai-kamera";

const MENU: { label: string; href: string; ikon: LucideIcon; warna: string }[] = [
  { label: "Beranda", href: "/imms", ikon: Home, warna: "linear-gradient(#38bdf8,#2563eb)" },
  { label: "Inventaris", href: "/imms/inventaris", ikon: Boxes, warna: "linear-gradient(#a78bfa,#6d28d9)" },
  { label: "Notifikasi", href: "/imms/notifikasi", ikon: Bell, warna: "linear-gradient(#fb7185,#dc2626)" },
  { label: "Akun Saya", href: "/imms/akun", ikon: UserRound, warna: "linear-gradient(#94a3b8,#475569)" },
];

/** Dock bawah EMASCARE (padanan menu bawah STARS): Beranda, Inventaris, Pindai QR, Notifikasi, Akun. */
const MENU_PUBLIK: typeof MENU = [
  { label: "Beranda", href: "/imms", ikon: Home, warna: "linear-gradient(#38bdf8,#2563eb)" },
  { label: "Lapor", href: "/imms/lapor", ikon: Wrench, warna: "linear-gradient(#fb923c,#ea580c)" },
  { label: "Lacak", href: "/imms/riwayat", ikon: History, warna: "linear-gradient(#fbbf24,#d97706)" },
  { label: "Masuk", href: "/imms/login", ikon: LogIn, warna: "linear-gradient(#94a3b8,#475569)" },
];

export function DockEmas({ publik = false }: { publik?: boolean }) {
  const path = usePathname() ?? "/imms";
  const { belum } = useNotifikasi();
  const aktif = (h: string) => (h === "/imms" ? path === "/imms" : path === h || path.startsWith(h + "/"));
  const Ubin = ({ label, href, ikon: Ikon, warna }: (typeof MENU)[number]) => (
    <Link href={href} className="emas-dock-item" aria-current={aktif(href) ? "page" : undefined} aria-label={href.endsWith("notifikasi") && belum ? `${label}, ${belum} belum dibaca` : label}>
      <span className="emas-dock-ubin" style={{ background: warna }}><Ikon aria-hidden />
        {href.endsWith("notifikasi") && belum > 0 && <span className="emas-titik" aria-hidden>{belum > 9 ? "9+" : belum}</span>}</span>
      <span className="emas-dock-label">{label}</span>
    </Link>
  );
  if (publik) return <nav className="emas-dock kaca" aria-label="Menu cepat EMASCARE">{MENU_PUBLIK.map((m) => <Ubin key={m.href} {...m} />)}</nav>;
  return (
    <nav className="emas-dock kaca" aria-label="Menu cepat EMASCARE">
      {MENU.slice(0, 2).map((m) => <Ubin key={m.href} {...m} />)}
      <button type="button" className="emas-dock-item" onClick={() => window.dispatchEvent(new Event(BUKA_PINDAI))} aria-label="Pindai QR alat">
        <span className="emas-dock-ubin" style={{ background: "linear-gradient(#22d3ee,#7c3aed)" }}><ScanQrCode aria-hidden /></span>
        <span className="emas-dock-label">Pindai QR</span>
      </button>
      {MENU.slice(2).map((m) => <Ubin key={m.href} {...m} />)}
    </nav>
  );
}
