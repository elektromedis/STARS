import Link from "next/link";
import { cn } from "@/lib/utils";

/** Pilihan bagian di dalam satu menu CMS (mis. Akun Pengguna | User System). */
export function SubTab({ item, aktif }: { item: { kode: string; label: string; href: string }[]; aktif: string }) {
  if (item.length < 2) return null;
  return (
    <nav aria-label="Bagian" className="flex w-fit max-w-full flex-wrap gap-1 rounded-xl border bg-card p-1 shadow-card">
      {item.map((i) => (
        <Link key={i.kode} href={i.href} aria-current={i.kode === aktif ? "page" : undefined}
          className={cn("rounded-lg px-3 py-1.5 text-sm font-medium transition-colors", i.kode === aktif ? "bg-teal-600 text-white" : "text-navy-700 hover:bg-muted")}>
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
