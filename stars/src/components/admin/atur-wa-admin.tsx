"use client";

import { useActionState } from "react";
import { MessageCircle, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { simpanWaAdmin, type StatusAksi } from "@/app/admin/sistem/actions";

export function AturWaAdmin({ awal }: { awal: string | null }) {
  const [st, aksi, jalan] = useActionState<StatusAksi, FormData>(simpanWaAdmin, undefined);
  return (
    <form action={aksi} className="grid gap-3">
      <label className="grid gap-1 text-sm font-medium text-navy-800">
        Nomor WhatsApp admin elektromedis
        <div className="flex max-w-md gap-2">
          <Input name="wa" defaultValue={awal ? `+${awal}` : ""} placeholder="mis. 0812xxxxxxx" inputMode="tel" autoComplete="off" maxLength={20} />
          <Button type="submit" disabled={jalan}><Save /> Simpan</Button>
        </div>
      </label>
      {st?.ok && <p className="text-sm text-emerald-700" role="status">{st.ok}</p>}
      {st?.error && <p className="text-sm text-red-700" role="alert">{st.error}</p>}
      <p className="flex items-start gap-1.5 text-xs text-muted-foreground"><MessageCircle className="mt-px size-3.5 shrink-0" aria-hidden />Setelah pelapor mengirim laporan, tombol <strong>Kirim ke WA admin</strong> membuka WhatsApp ke nomor ini berisi ringkasan laporan dan tautan PDF. Kosongkan lalu Simpan untuk menonaktifkan.</p>
    </form>
  );
}
