"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Bot, Upload, Download, History, Users, Settings, Wrench, Box, CalendarClock, BadgeCheck, FileText, ShieldX, Thermometer, Package, ClipboardCheck, BarChart3, Tag, ClipboardList, Scale, Weight, Cpu, PanelTop, Landmark, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const IKON: Record<string, LucideIcon> = { upload: Upload, download: Download, history: History, users: Users, settings: Settings, wrench: Wrench, box: Box, calendar: CalendarClock, badge: BadgeCheck, file: FileText, thermometer: Thermometer, package: Package, audit: ClipboardCheck, chart: BarChart3, tag: Tag, kir: ClipboardList, scale: Scale, bobot: Weight, htm: Cpu, situs: PanelTop, jdih: Landmark, bot: Bot };
export type TabAdmin = { href: string; label: string; icon: keyof typeof IKON; match?: string[] };
export type SubMenuAdmin = { href: string; label: string; seksi?: string; cek?: string; tampil?: boolean };

const cocok = (href: string, pathname: string, bagian: string | null) => {
  const [p, q] = href.split("?");
  if (!(pathname === p || pathname.startsWith(p + "/"))) return false;
  const b = new URLSearchParams(q ?? "").get("bagian");
  return !b || !bagian || b === bagian;
};

/** Sub-menu di dalam CMS gabungan (mis. CMS Pemeliharaan → Inventarisasi → Alat Kesehatan). */
export function AdminSubMenu({ grup }: { grup: { label: string; item: SubMenuAdmin[] }[] }) {
  const pathname = usePathname();
  const bagian = useSearchParams().get("bagian");
  const g = grup.find((x) => x.item.some((i) => cocok(i.href, pathname, null)));
  if (!g) return null;
  const seksi: { nama?: string; item: SubMenuAdmin[] }[] = [];
  for (const i of g.item) { const akhir = seksi[seksi.length - 1]; if (akhir && i.seksi && akhir.nama === i.seksi) akhir.item.push(i); else seksi.push({ nama: i.seksi, item: [i] }); }
  return (
    <nav aria-label={`Sub-menu ${g.label}`} className="-mt-3 mb-6 flex flex-wrap print:hidden items-center gap-1.5 rounded-xl border border-dashed bg-card/60 p-1.5">
      {seksi.map((s, k) => {
        const isi = s.item.map((i) => {
          const aktif = i === g.item.find((x) => cocok(x.href, pathname, bagian));
          return <Link key={i.href} href={i.href} aria-current={aktif ? "page" : undefined} className={cn("whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors", aktif ? "bg-teal-600 text-white" : "text-navy-700 hover:bg-muted")}>{i.label}</Link>;
        });
        return s.nama
          ? <span key={k} className="inline-flex flex-wrap items-center gap-1 rounded-lg bg-muted/70 px-1.5 py-1"><span className="px-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{s.nama}</span>{isi}</span>
          : isi;
      })}
    </nav>
  );
}

export function AdminTabs({ tabs }: { tabs: TabAdmin[] }) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const ditolak = sp.get("ditolak");
  return (
    <>
      {ditolak && (
        <p role="alert" className="mb-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <ShieldX className="size-4" /> Halaman itu memerlukan peran <strong>{ditolak}</strong> atau lebih tinggi.
        </p>
      )}
      <nav aria-label="Menu admin" className="mb-6 flex gap-1 overflow-x-auto print:hidden rounded-xl border bg-card p-1 shadow-card">
        {tabs.map((t) => {
          const active = (t.match ?? [t.href.split("?")[0]]).some((m) => pathname === m || pathname.startsWith(m + "/"));
          const Icon = IKON[t.icon];
          return (
            <Link key={t.href} href={t.href} aria-current={active ? "page" : undefined}
              className={cn("inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors", active ? "bg-navy-800 text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
              <Icon className="size-4" aria-hidden /> {t.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
