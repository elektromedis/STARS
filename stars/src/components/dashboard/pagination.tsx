import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Navigasi halaman sederhana berbasis tautan (?page=n), tanpa JavaScript. */
export function Pagination({ page, pages, total, pageSize, query }: { page: number; pages: number; total: number; pageSize: number; query: URLSearchParams }) {
  const href = (p: number) => { const q = new URLSearchParams(query); q.set("page", String(p)); return `?${q.toString()}`; };
  const dari = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const sampai = Math.min(total, page * pageSize);
  const btn = "inline-flex h-9 items-center gap-1 rounded-md border px-3 text-sm font-medium transition-colors hover:bg-muted";
  return (
    <nav aria-label="Navigasi halaman" className="flex flex-col items-center justify-between gap-3 border-t p-4 text-sm text-muted-foreground sm:flex-row">
      <p>Menampilkan {dari}–{sampai} dari {total.toLocaleString("id-ID")} paket</p>
      <div className="flex items-center gap-2">
        <Link href={href(Math.max(1, page - 1))} aria-disabled={page <= 1} className={cn(btn, page <= 1 && "pointer-events-none opacity-40")}><ChevronLeft className="size-4" /> Sebelumnya</Link>
        <span className="px-2 tabular-nums">Hal. {page} / {pages}</span>
        <Link href={href(Math.min(pages, page + 1))} aria-disabled={page >= pages} className={cn(btn, page >= pages && "pointer-events-none opacity-40")}>Berikutnya <ChevronRight className="size-4" /></Link>
      </div>
    </nav>
  );
}
