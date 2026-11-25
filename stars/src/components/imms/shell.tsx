"use client";
import { LogoEmas } from "./logo";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity, BarChart3, Boxes, CalendarClock, CheckCircle2, ClipboardCheck, FileClock, Gauge, Home, LogOut, Menu, Moon, PackageSearch, Stethoscope, Sun, Wrench, DatabaseZap, ScanBarcode, ShieldCheck, ArrowUpRight,
} from "lucide-react";
import { keluar } from "@/app/login/actions";
import { KUNCI_TAMPILAN } from "@/lib/tampilan-skrip";

const MENU: { judul: string; item: { href: string; label: string; ikon: typeof Home; min?: number }[] }[] = [
  { judul: "Ringkasan", item: [{ href: "/imms", label: "Beranda", ikon: Home }] },
  { judul: "Inventaris", item: [
    { href: "/imms/inventaris", label: "Inventaris Alat", ikon: Boxes },
    { href: "/imms/data-alat", label: "Kelola Data Alat", ikon: DatabaseZap, min: 1 },
    { href: "/imms/nilai-em", label: "Nilai EM", ikon: Gauge },
    { href: "/imms/kalibrasi", label: "Kalibrasi", ikon: ShieldCheck, min: 1 },
  ] },
  { judul: "Pemeliharaan", item: [
    { href: "/imms/jadwal", label: "Jadwal", ikon: CalendarClock },
    { href: "/imms/terencana", label: "Pemeliharaan Terencana", ikon: ClipboardCheck, min: 1 },
    { href: "/imms/inspeksi", label: "Inspeksi", ikon: Stethoscope, min: 1 },
  ] },
  { judul: "Perbaikan", item: [
    { href: "/imms/keluhan", label: "Laporan Keluhan", ikon: Activity },
    { href: "/imms/perbaikan", label: "Perintah Kerja", ikon: Wrench, min: 1 },
    { href: "/imms/persetujuan", label: "Persetujuan Usulan", ikon: CheckCircle2, min: 1 },
  ] },
  { judul: "Logistik", item: [{ href: "/imms/suku-cadang", label: "Suku Cadang & BHP", ikon: PackageSearch, min: 1 }] },
  { judul: "Laporan", item: [
    { href: "/imms/laporan", label: "Laporan & Indikator", ikon: BarChart3, min: 1 },
    { href: "/imms/audit", label: "Jejak Audit", ikon: FileClock, min: 2 },
  ] },
];

export function judulHalaman(path: string) {
  for (const g of MENU) for (const i of g.item) if (i.href === path) return i.label;
  if (path.startsWith("/imms/pindai")) return "Pindai Barcode";
  return "EMASCARE";
}

export function ImmsShell({ nama, peran, tingkat, menunggu, children }: { nama: string; peran: string; tingkat: number; menunggu: number; children: React.ReactNode }) {
  const path = usePathname() ?? "/imms";
  const [buka, setBuka] = useState(false);
  const [gelap, setGelap] = useState(false);
  const [jam, setJam] = useState("");
  useEffect(() => setBuka(false), [path]);
  useEffect(() => {
    setGelap(document.documentElement.classList.contains("dark"));
    const f = () => setJam(new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(new Date()));
    f(); const t = setInterval(f, 30_000); return () => clearInterval(t);
  }, []);
  const ganti = () => {
    const g = !gelap; setGelap(g); document.documentElement.classList.toggle("dark", g);
    try { const s = JSON.parse(localStorage.getItem(KUNCI_TAMPILAN) || "{}"); s.gelap = g; localStorage.setItem(KUNCI_TAMPILAN, JSON.stringify(s)); } catch {}
  };
  const aktif = (href: string) => (href === "/imms" ? path === "/imms" : path === href || path.startsWith(href + "/"));
  return (
    <>
      <div className="imms-menubar">
        <Link href="/imms" className="flex items-center gap-2" aria-label="EMASCARE — kembali ke Beranda"><LogoEmas ukuran={20} />
        <span className="emas-teks font-bold tracking-[.08em]">EMASCARE</span></Link>
        <span className="sembunyi-hp redup">Electromedical Asset Management &amp; Service Care</span>
        <span className="ml-auto flex items-center gap-3">
          <button type="button" onClick={ganti} aria-label={gelap ? "Mode terang" : "Mode gelap"}>{gelap ? <Sun size={14} /> : <Moon size={14} />}</button>
          <span className="sembunyi-hp tabular-nums">{jam}</span>
        </span>
      </div>
      <div className="imms-jendela kaca">
        <aside className="imms-samping kaca" data-buka={buka ? "1" : "0"} aria-label="Navigasi EMASCARE">
          <div className="flex items-center gap-2 px-2 pb-2"><div className="lampu" aria-hidden><i /><i /><i /></div></div>
          <Link href="/imms" aria-label="Kembali ke Beranda" className="flex items-center gap-2.5 rounded-xl px-2 pb-1 pt-1"><LogoEmas ukuran={36} /><div><div className="emas-teks text-[15px] font-bold tracking-[.08em]">EMASCARE</div><div className="redup2 whitespace-nowrap text-[9px] font-semibold tracking-[.06em]">KENALI. RAWAT. KENDALIKAN.</div></div></Link>
          {MENU.map((g) => ({ ...g, item: g.item.filter((i) => (i.min ?? 0) <= tingkat) })).filter((g) => g.item.length).map((g) => (
            <nav key={g.judul} aria-label={g.judul}>
              <h6>{g.judul}</h6>
              {g.item.map(({ href, label, ikon: Ikon }) => (
                <Link key={href} href={href} className="imms-nav" aria-current={aktif(href) ? "page" : undefined}>
                  <Ikon aria-hidden /> <span className="flex-1">{label}</span>
                  {href === "/imms/persetujuan" && menunggu > 0 && <span className="lencana merah">{menunggu}</span>}
                </Link>
              ))}
            </nav>
          ))}
          <div className="mt-auto space-y-1 border-t pt-3" style={{ borderColor: "var(--garis)" }}>
            <div className="px-2 text-[12px]"><div className="font-semibold">{nama}</div><div className="redup2">{peran}</div></div>
            <a href="/admin" className="imms-nav"><ArrowUpRight aria-hidden /> Buka STARS</a>
            <form action={keluar}><button className="imms-nav w-full" type="submit"><LogOut aria-hidden /> Keluar</button></form>
          </div>
        </aside>
        <div className="imms-isi" onClick={() => buka && setBuka(false)}>
          <div className="imms-alat">
            <button type="button" className="kapsul tombol-menu-hp" style={{ padding: "0 10px" }} onClick={(e) => { e.stopPropagation(); setBuka(true); }} aria-label="Buka menu"><Menu /></button>
            <h1>{judulHalaman(path)}</h1>
            <form action="/imms/pindai" role="search" className="relative ml-auto w-full max-w-[280px]">
              <ScanBarcode size={15} className="redup2 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden />
              <input name="k" className="isian cari" placeholder="Pindai / ketik barcode alat…" aria-label="Barcode alat" autoComplete="off" />
            </form>
          </div>
          <div className="imms-gulir">{children}</div>
        </div>
      </div>
    </>
  );
}
