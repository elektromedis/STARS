"use client";

import { useActionState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { hapusPemeliharaan, type StatusAksi } from "@/app/admin/pemeliharaan/actions";

/** Tombol hapus WR/WO (Admin) dengan konfirmasi. */
export function TombolHapus({ id, jenis, nomor, catatan }: { id: number; jenis: "wr" | "wo"; nomor: string; catatan?: string }) {
  const [st, aksi, pend] = useActionState<StatusAksi, FormData>(hapusPemeliharaan, undefined);
  return (
    <form action={aksi} className="grid gap-1 border-t pt-3"
      onSubmit={(e) => { if (!window.confirm(`Hapus ${nomor}?${catatan ? `\n\n${catatan}` : ""}\n\nTindakan ini tidak bisa dibatalkan.`)) e.preventDefault(); }}>
      <input type="hidden" name="id" value={id} /><input type="hidden" name="jenis" value={jenis} />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">Salah input / tidak jadi?</span>
        <Button type="submit" size="sm" variant="outline" className="border-red-300 text-red-700 hover:bg-red-50" disabled={pend}>{pend ? <Loader2 className="animate-spin" /> : <Trash2 />} Hapus</Button>
      </div>
      {st?.error && <p role="alert" className="text-xs text-red-700">{st.error}</p>}
    </form>
  );
}
