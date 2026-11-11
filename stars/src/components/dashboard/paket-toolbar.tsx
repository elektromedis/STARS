"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

/** Pencarian teks + filter serapan untuk halaman Paket (ditulis ke ?q=&status=). */
export function PaketToolbar({ q, status }: { q: string; status: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [teks, setTeks] = useState(q);
  const [pending, start] = useTransition();

  function apply(patch: { q?: string; status?: string }) {
    const p = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    p.delete("page");
    start(() => router.push(`${pathname}?${p.toString()}`, { scroll: false }));
  }

  return (
    <form
      className="flex flex-col gap-3 border-b p-4 sm:flex-row"
      onSubmit={(e) => { e.preventDefault(); apply({ q: teks.trim() }); }}
      aria-busy={pending}
    >
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input value={teks} onChange={(e) => setTeks(e.target.value)} placeholder="Cari nama paket, uraian, rekening, atau kode…" className="pl-9" aria-label="Cari paket" />
      </div>
      <div className="sm:w-48">
        <Select value={status} onChange={(e) => apply({ status: e.target.value })} aria-label="Status serapan">
          <option value="">Semua serapan</option>
          <option value="terserap">Terserap</option>
          <option value="direncanakan">Direncanakan</option>
        </Select>
      </div>
      <Button type="submit" variant="default" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <Search />} Cari
      </Button>
    </form>
  );
}
