"use client";

import { useActionState } from "react";
import { Loader2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { kategorikanOtomatis, type StatusAksi } from "@/app/admin/alat/actions";

/** Isi kategori inventaris (Elektromedik Radiasi/Non Radiasi/Non Elektromedik) untuk alat yang belum berkategori. */
export function TombolKategori({ belum }: { belum: number }) {
  const [st, aksi, jalan] = useActionState<StatusAksi>(async () => kategorikanOtomatis(), undefined);
  if (!belum && !st) return null;
  return (
    <form action={aksi} className="flex flex-wrap items-center gap-3 rounded-xl border border-teal-200 bg-teal-50/60 p-3 text-sm">
      <span className="text-navy-800"><b>Kategori inventaris:</b> {belum} alat belum dikategorikan.</span>
      {belum > 0 && <Button type="submit" size="sm" variant="teal" disabled={jalan}>{jalan ? <Loader2 className="animate-spin" /> : <Wand2 />} Kategorikan otomatis ({belum})</Button>}
      {st?.ok && <span className="text-emerald-700" role="status">{st.ok}</span>}
      {st?.error && <span className="text-red-700" role="alert">{st.error}</span>}
    </form>
  );
}
