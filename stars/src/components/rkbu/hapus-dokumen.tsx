"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HapusDokumenRkbu({ id, judul }: { id: number; judul: string }) {
  const router = useRouter();
  const [proses, setProses] = useState(false);
  async function hapus() {
    if (!window.confirm(`Hapus dokumen "${judul}"? Data Paket tidak ikut terhapus.`)) return;
    setProses(true);
    const r = await fetch(`/api/admin/rkbu/${id}`, { method: "DELETE" }).catch(() => null);
    setProses(false);
    if (r?.ok) router.refresh(); else window.alert("Gagal menghapus dokumen.");
  }
  return <Button type="button" variant="ghost" size="sm" onClick={hapus} disabled={proses} aria-label={`Hapus ${judul}`} className="text-red-700">{proses ? <Loader2 className="animate-spin" /> : <Trash2 />}</Button>;
}
