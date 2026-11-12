"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { PERENCANAAN_TABS } from "@/lib/nav";
import { cn } from "@/lib/utils";

const KUNCI_FILTER = ["tahun", "tahap", "unit", "kategori"] as const;

/** Tab Nilai | Paket | Data. Pilihan filter (tahun, tahap, unit, kategori) ikut terbawa saat berpindah tab. */
export function PerencanaanTabs() {
  const pathname = usePathname();
  const sp = useSearchParams();
  const q = new URLSearchParams();
  for (const k of KUNCI_FILTER) { const v = sp.get(k); if (v) q.set(k, v); }
  const qs = q.size ? `?${q.toString()}` : "";
  return (
    <nav aria-label="Menu Perencanaan-Pengadaan" className="mb-6 flex gap-1 overflow-x-auto rounded-xl border bg-card p-1 shadow-card">
      {PERENCANAAN_TABS.map((t) => {
        const active = pathname === t.href || pathname.startsWith(`${t.href}/`);
        const Icon = t.icon;
        return (
          <Link key={t.href} href={`${t.href}${qs}`} aria-current={active ? "page" : undefined} title={t.description}
            className={cn("inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200 sm:flex-none",
              active ? "bg-navy-800 text-white shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
            <Icon className="size-4" aria-hidden /> {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
