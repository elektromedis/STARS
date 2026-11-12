"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Upload, Download, History, Users, Settings, Wrench, Box, CalendarClock, BadgeCheck, FileText, ShieldX, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const IKON: Record<string, LucideIcon> = { upload: Upload, download: Download, history: History, users: Users, settings: Settings, wrench: Wrench, box: Box, calendar: CalendarClock, badge: BadgeCheck, file: FileText };
export type TabAdmin = { href: string; label: string; icon: keyof typeof IKON };

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
      <nav aria-label="Menu admin" className="mb-6 flex gap-1 overflow-x-auto rounded-xl border bg-card p-1 shadow-card">
        {tabs.map((t) => {
          const active = pathname.startsWith(t.href);
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
