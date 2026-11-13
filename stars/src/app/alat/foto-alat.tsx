"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Camera, ImageOff, Loader2, Trash2, X, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FOTO_ALAT, urlFotoAlat } from "@/lib/dokumen-alat";
import { perkecilGambar, unggahDenganKemajuan } from "@/lib/gambar";

/** Foto alat (publik). Operator+ dapat memasang/mengganti/menghapus; foto diperkecil di browser sebelum diunggah. */
export function FotoAlat({ id, foto, nama, bolehKelola }: { id: number; foto: string | null; nama: string; bolehKelola: boolean }) {
  const router = useRouter();
  const [proses, setProses] = useState<string | null>(null);
  const [pesan, setPesan] = useState<{ ok?: string; error?: string } | null>(null);
  const [besar, setBesar] = useState(false);
  const src = urlFotoAlat(foto);

  useEffect(() => {
    if (!besar) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setBesar(false); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [besar]);

  async function pilih(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setPesan(null);
    if (!f.type.startsWith("image/")) { setPesan({ error: "Pilih berkas gambar (JPG/PNG)." }); return; }
    if (f.size > FOTO_ALAT.maksAsli) { setPesan({ error: "Gambar terlalu besar (maks 25 MB)." }); return; }
    try {
      setProses("Memperkecil foto…");
      const [utama, kecil] = await Promise.all([perkecilGambar(f, FOTO_ALAT.sisiBesar, FOTO_ALAT.kualitas), perkecilGambar(f, FOTO_ALAT.sisiKecil, 0.8, true)]);
      const fd = new FormData();
      fd.set("foto", new File([utama], "foto.jpg", { type: "image/jpeg" }));
      fd.set("kecil", new File([kecil], "kecil.jpg", { type: "image/jpeg" }));
      const r = await unggahDenganKemajuan(`/api/admin/alat/${id}/foto`, fd, (p) => setProses(`Mengunggah… ${p}%`));
      if (r.status === 200) { setPesan({ ok: String(r.data.ok ?? "Foto tersimpan.") }); router.refresh(); }
      else setPesan({ error: String(r.data.error ?? `Gagal (kode ${r.status}).`) });
    } catch (err) {
      setPesan({ error: err instanceof Error ? err.message : "Foto tidak dapat diproses." });
    } finally { setProses(null); }
  }

  async function hapus() {
    if (!window.confirm("Hapus foto alat ini?")) return;
    setProses("Menghapus…"); setPesan(null);
    const r = await fetch(`/api/admin/alat/${id}/foto`, { method: "DELETE" }).catch(() => null);
    setProses(null);
    if (r?.ok) { setPesan({ ok: "Foto dihapus." }); router.refresh(); } else setPesan({ error: "Gagal menghapus foto." });
  }

  return (
    <div className="grid content-start gap-2">
      {src ? (
        <button type="button" onClick={() => setBesar(true)} className="group relative overflow-hidden rounded-xl border bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400" aria-label={`Perbesar foto ${nama}`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- foto dari API sendiri */}
          <img src={src} alt={`Foto ${nama}`} className="aspect-[4/3] w-full object-cover transition group-hover:scale-[1.02]" />
          <span className="absolute bottom-2 right-2 flex size-8 items-center justify-center rounded-full bg-navy-950/60 text-white opacity-0 transition group-hover:opacity-100"><ZoomIn className="size-4" /></span>
        </button>
      ) : (
        <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/40 text-sm text-muted-foreground">
          <ImageOff className="size-10 opacity-60" aria-hidden /> Belum ada foto alat
        </div>
      )}
      {bolehKelola && (
        <div className="grid gap-1.5">
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm" className="flex-1">
              <label className="cursor-pointer">{proses ? <Loader2 className="animate-spin" /> : <Camera />} {foto ? "Ganti foto" : "Pasang foto"}
                <input type="file" accept="image/*" className="sr-only" onChange={pilih} disabled={Boolean(proses)} />
              </label>
            </Button>
            {foto && <Button type="button" variant="outline" size="sm" onClick={hapus} disabled={Boolean(proses)} aria-label="Hapus foto"><Trash2 /></Button>}
          </div>
          <p className="text-xs text-muted-foreground">{proses ?? "Foto alat tampil publik — pastikan tidak ada pasien/wajah/data pasien di foto."}</p>
          {pesan?.error && <p role="alert" className="text-xs text-red-700">{pesan.error}</p>}
          {pesan?.ok && <p className="text-xs text-emerald-700">{pesan.ok}</p>}
        </div>
      )}
      {besar && src && createPortal(
        <div role="dialog" aria-modal="true" aria-label={`Foto ${nama}`} className="fixed inset-0 z-[90] flex items-center justify-center bg-navy-950/85 p-4" onClick={() => setBesar(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={`Foto ${nama}`} className="max-h-full max-w-full rounded-lg shadow-2xl" />
          <button type="button" onClick={() => setBesar(false)} aria-label="Tutup" className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"><X className="size-5" /></button>
        </div>,
        document.body,
      )}
    </div>
  );
}
