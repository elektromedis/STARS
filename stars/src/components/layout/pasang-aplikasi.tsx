"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type PromptPasang = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

/**
 * Mendaftarkan service worker dan menampilkan tombol "Pasang aplikasi":
 * - Android/Chrome/Edge: memakai dialog pasang bawaan browser (beforeinstallprompt).
 * - iPhone/iPad (Safari): tidak ada dialog bawaan → tampilkan petunjuk "Bagikan › Tambah ke Layar Utama".
 * Tidak tampil bila STARS sudah dibuka sebagai aplikasi terpasang.
 */
export function PasangAplikasi() {
  const [prompt, setPrompt] = useState<PromptPasang | null>(null);
  const [ios, setIos] = useState(false);
  const [petunjuk, setPetunjuk] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && (location.protocol === "https:" || ["localhost", "127.0.0.1"].includes(location.hostname))) {
      navigator.serviceWorker.register("/sw.js").catch(() => { /* abaikan: situs tetap jalan tanpa SW */ });
    }
    const terpasang = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (terpasang) return;
    const ua = navigator.userAgent;
    setIos(/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1));
    const tangkap = (e: Event) => { e.preventDefault(); setPrompt(e as PromptPasang); };
    const selesai = () => setPrompt(null);
    window.addEventListener("beforeinstallprompt", tangkap);
    window.addEventListener("appinstalled", selesai);
    return () => { window.removeEventListener("beforeinstallprompt", tangkap); window.removeEventListener("appinstalled", selesai); };
  }, []);

  if (!prompt && !ios) return null;

  return (
    <>
      <Button variant="teal" size="sm" title="Pasang STARS di layar utama perangkat ini" aria-label="Pasang aplikasi" className="h-10 rounded-full px-3 xl:px-4"
        onClick={async () => {
          if (prompt) { await prompt.prompt(); await prompt.userChoice.catch(() => null); setPrompt(null); }
          else setPetunjuk(true);
        }}>
        <Download /> <span className="hidden xl:inline">Pasang aplikasi</span>
      </Button>
      {petunjuk && (
        <div className="fixed inset-0 z-[60] grid items-end bg-navy-950/60 p-4 sm:place-items-center" role="dialog" aria-modal="true" aria-label="Cara memasang STARS di iPhone" onClick={() => setPetunjuk(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 text-navy-900 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-lg font-semibold">Pasang STARS di iPhone/iPad</p>
              <button onClick={() => setPetunjuk(false)} aria-label="Tutup" className="rounded-md p-1 hover:bg-slate-100"><X className="size-5" /></button>
            </div>
            <ol className="mt-3 grid list-decimal gap-2 pl-5 text-sm">
              <li>Buka halaman ini di <strong>Safari</strong>.</li>
              <li>Ketuk tombol <strong>Bagikan</strong> <Share className="inline size-4 align-text-bottom" aria-label="(ikon kotak dengan panah ke atas)" /> di bagian bawah/atas layar.</li>
              <li>Pilih <strong>Tambah ke Layar Utama</strong> (Add to Home Screen), lalu ketuk <strong>Tambah</strong>.</li>
            </ol>
            <p className="mt-3 text-xs text-muted-foreground">Ikon STARS akan muncul di layar utama dan terbuka tanpa bilah browser, seperti aplikasi.</p>
          </div>
        </div>
      )}
    </>
  );
}
