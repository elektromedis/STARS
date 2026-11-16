"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { menuAktif, SIALKES_TABS } from "@/lib/nav";
import { cn } from "@/lib/utils";

/** Tab menu gabungan SI-ALKES: Perencanaan-Pengadaan | HTA. */
export function SialkesTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Menu SI-ALKES" className="mb-4 flex gap-1 overflow-x-auto rounded-xl border bg-card p-1 shadow-card print:hidden">
      {SIALKES_TABS.map((t) => {
        const active = menuAktif(t, pathname);
        const Icon = t.icon;
        return (
          <Link key={t.href} href={t.href} aria-current={active ? "page" : undefined} title={t.description}
            className={cn("inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200 sm:flex-none",
              active ? "bg-navy-800 text-white shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
            <Icon className="size-4" aria-hidden /> {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
