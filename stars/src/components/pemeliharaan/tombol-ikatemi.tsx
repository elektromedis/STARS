"use client";

import { useActionState } from "react";
import { Loader2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { klasifikasiOtomatis, type StatusAksi } from "@/app/admin/alat/actions";

/** Klasifikasikan semua alat yang belum berklasifikasi IKATEMI berdasarkan namanya. */
export function TombolIkatemi({ belum, total }: { belum: number; total: number }) {
  const [st, aksi, jalan] = useActionState<StatusAksi>(async () => klasifikasiOtomatis(), undefined);
  return (
    <form action={aksi} className="flex flex-wrap items-center gap-3 rounded-xl border border-teal-200 bg-teal-50/60 p-3 text-sm">
      <span className="text-navy-800"><b>Klasifikasi IKATEMI No. 1/2023:</b> {total - belum} dari {total} alat sudah diklasifikasikan.</span>
      {belum > 0 && <Button type="submit" size="sm" variant="teal" disabled={jalan}>{jalan ? <Loader2 className="animate-spin" /> : <Wand2 />} Klasifikasikan otomatis ({belum})</Button>}
      {st?.ok && <span className="text-emerald-700" role="status">{st.ok}</span>}
      {st?.error && <span className="text-red-700" role="alert">{st.error}</span>}
    </form>
  );
}
