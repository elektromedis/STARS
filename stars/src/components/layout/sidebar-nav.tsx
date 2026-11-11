"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav";
import { cn } from "@/lib/utils";

/** `compact` = hanya ikon (tablet). Label tampil penuh di lg ke atas dan di drawer mobile. */
export function SidebarNav({ compact = false, onNavigate }: { compact?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Navigasi utama" className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={item.label}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              compact && "justify-center lg:justify-start",
              active ? "bg-teal-500/15 text-white ring-1 ring-teal-400/40" : "text-navy-200 hover:bg-white/5 hover:text-white"
            )}
          >
            <Icon className={cn("size-5 shrink-0", active ? "text-teal-300" : "text-navy-300 group-hover:text-teal-300")} aria-hidden />
            <span className={cn(compact && "hidden lg:inline")}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
