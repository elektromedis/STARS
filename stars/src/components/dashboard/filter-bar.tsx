"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, RotateCcw } from "lucide-react";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { Filter, FilterOptions } from "@/lib/filter";

/**
 * Filter global: tahun anggaran, tahap, unit kerja, kategori.
 * Pilihan ditulis ke query string (?tahun=&tahap=&unit=&kategori=) sehingga tautan bisa dibagikan,
 * lalu halaman (Server Component) membaca ulang data dari basis data.
 */
export function FilterBar({ filter, options }: { filter: Filter; options: FilterOptions }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();

  const tahapList = options.tahunTahap.find((t) => t.tahun === filter.tahun)?.tahap ?? [];
  const adaFilter = Boolean(sp.get("unit") || sp.get("kategori") || sp.get("tahap") || sp.get("tahun"));

  function update(patch: Partial<Record<"tahun" | "tahap" | "unit" | "kategori", string>>) {
    const p = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    if ("tahun" in patch) p.delete("tahap"); // tahap mengikuti tahun yang baru
    p.delete("page");
    start(() => router.push(`${pathname}?${p.toString()}`, { scroll: false }));
  }

  return (
    <div aria-busy={pending} className="mb-6 rounded-xl border bg-card p-4 shadow-card">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
          Tahun anggaran
          <Select value={filter.tahun} onChange={(e) => update({ tahun: e.target.value })} aria-label="Tahun anggaran">
            {options.tahunTahap.map((t) => <option key={t.tahun} value={t.tahun}>{t.tahun}</option>)}
          </Select>
        </label>
        <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
          Tahap anggaran
          <Select value={filter.tahap} onChange={(e) => update({ tahap: e.target.value })} aria-label="Tahap anggaran">
            {tahapList.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        </label>
        <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
          Nama Unit Kerja
          <Select value={filter.unit ?? ""} onChange={(e) => update({ unit: e.target.value })} aria-label="Nama Unit Kerja">
            <option value="">Semua unit kerja</option>
            {options.units.map((u) => <option key={u} value={u}>{u}</option>)}
          </Select>
        </label>
        <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
          Kategori pemeliharaan / pengadaan
          <Select value={filter.kategori ?? ""} onChange={(e) => update({ kategori: e.target.value })} aria-label="Kategori">
            <option value="">Semua kategori</option>
            {options.kategori.map((k) => <option key={k} value={k}>{k}</option>)}
          </Select>
        </label>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          {pending && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
          Menampilkan <strong className="text-foreground">{filter.tahap} {filter.tahun}</strong>
          {filter.unit && <> • Unit <strong className="text-foreground">{filter.unit}</strong></>}
          {filter.kategori && <> • <strong className="text-foreground">{filter.kategori}</strong></>}
        </span>
        {adaFilter && (
          <Button variant="ghost" size="sm" onClick={() => start(() => router.push(pathname, { scroll: false }))}>
            <RotateCcw /> Atur ulang
          </Button>
        )}
      </div>
    </div>
  );
}
