"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CameraOff, ExternalLink, ImageUp, Loader2, ScanQrCode, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Hasil = { jenis: "luar"; url: string } | { jenis: "teks"; teks: string };
type Detektor = { detect: (s: CanvasImageSource) => Promise<{ rawValue: string }[]> };

/** Pembaca QR: BarcodeDetector bawaan browser bila tersedia, jsQR (dimuat saat dibutuhkan) bila tidak. */
async function bacaDari(sumber: HTMLVideoElement | HTMLImageElement, kanvas: HTMLCanvasElement, detektor: Detektor | null): Promise<string | null> {
  if (detektor) {
    try { const r = await detektor.detect(sumber); if (r[0]?.rawValue) return r[0].rawValue; } catch { /* lanjut ke jsQR */ }
  }
  const w0 = sumber instanceof HTMLVideoElement ? sumber.videoWidth : sumber.naturalWidth;
  const h0 = sumber instanceof HTMLVideoElement ? sumber.videoHeight : sumber.naturalHeight;
  if (!w0 || !h0) return null;
  const skala = Math.min(1, 720 / Math.max(w0, h0));
  const w = Math.round(w0 * skala), h = Math.round(h0 * skala);
  kanvas.width = w; kanvas.height = h;
  const ctx = kanvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(sumber, 0, 0, w, h);
  const { default: jsQR } = await import("jsqr");
  return jsQR(ctx.getImageData(0, 0, w, h).data, w, h)?.data || null;
}

/**
 * Tombol mengambang "Scan QR" di pojok kanan bawah setiap halaman.
 * Isi QR → tautan STARS dibuka; QR lama Trilux (JSON "codenom") & teks/kode alat → formulir Lapor Kerusakan terisi otomatis;
 * tautan situs lain hanya ditampilkan (tidak dibuka otomatis).
 */
export function QrScan() {
  const router = useRouter();
  const [buka, setBuka] = useState(false);
  const [status, setStatus] = useState<"siap" | "kamera" | "tanpa-kamera" | "proses">("siap");
  const [pesan, setPesan] = useState<string | null>(null);
  const [hasil, setHasil] = useState<Hasil | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const kanvasRef = useRef<HTMLCanvasElement>(null);
  const tutupRef = useRef<HTMLButtonElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const loopRef = useRef<number | null>(null);

  const hentikan = useCallback(() => {
    if (loopRef.current) { window.clearTimeout(loopRef.current); loopRef.current = null; }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const tutup = useCallback(() => { hentikan(); setBuka(false); setHasil(null); setPesan(null); setStatus("siap"); }, [hentikan]);

  const tangani = useCallback((isi: string) => {
    hentikan();
    const teks = isi.trim();
    // 1) Tautan
    if (/^https?:\/\//i.test(teks)) {
      try {
        const url = new URL(teks);
        if (url.origin === window.location.origin) { tutup(); router.push(`${url.pathname}${url.search}${url.hash}`); return; }
        setHasil({ jenis: "luar", url: url.toString() }); return;
      } catch { /* bukan URL valid → perlakukan sebagai teks */ }
    }
    // 2) QR lama Trilux: {"id":..,"coders":..,"codenom":"<kode ASPAK>"}
    if (teks.startsWith("{")) {
      try {
        const data = JSON.parse(teks) as { codenom?: unknown };
        if (data.codenom && String(data.codenom) !== "-") { tutup(); router.push(`/lapor?aspak=${encodeURIComponent(String(data.codenom))}`); return; }
      } catch { /* bukan JSON */ }
    }
    // 3) Teks/kode alat (kode inventaris, no seri, no urut aset)
    if (teks && teks.length <= 120) { tutup(); router.push(`/lapor?alat=${encodeURIComponent(teks)}`); return; }
    setHasil({ jenis: "teks", teks });
  }, [hentikan, router, tutup]);

  const mulaiKamera = useCallback(async () => {
    setHasil(null); setPesan(null);
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setStatus("tanpa-kamera");
      setPesan("Kamera hanya bisa dipakai lewat HTTPS. Gunakan alamat https STARS, atau ambil foto QR di bawah.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) { hentikan(); return; }
      video.srcObject = stream;
      await video.play();
      setStatus("kamera");
      const Bawaan = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detektor }).BarcodeDetector;
      const detektor = Bawaan ? new Bawaan({ formats: ["qr_code"] }) : null;
      const putaran = async () => {
        if (!streamRef.current || !videoRef.current || !kanvasRef.current) return;
        const isi = await bacaDari(videoRef.current, kanvasRef.current, detektor).catch(() => null);
        if (isi) { tangani(isi); return; }
        loopRef.current = window.setTimeout(putaran, 250);
      };
      putaran();
    } catch (err) {
      setStatus("tanpa-kamera");
      setPesan(err instanceof DOMException && err.name === "NotAllowedError" ? "Izin kamera ditolak. Izinkan kamera di pengaturan browser, atau ambil foto QR di bawah." : "Kamera tidak dapat dibuka. Ambil foto QR di bawah sebagai gantinya.");
    }
  }, [hentikan, tangani]);

  async function dariFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !kanvasRef.current) return;
    hentikan(); setStatus("proses"); setPesan(null); setHasil(null);
    const url = URL.createObjectURL(f);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      const Bawaan = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detektor }).BarcodeDetector;
      const isi = await bacaDari(img, kanvasRef.current, Bawaan ? new Bawaan({ formats: ["qr_code"] }) : null);
      if (isi) tangani(isi);
      else { setStatus("tanpa-kamera"); setPesan("QR tidak terbaca pada foto. Pastikan QR tampak jelas, tidak buram, dan memenuhi bingkai."); }
    } catch {
      setStatus("tanpa-kamera"); setPesan("Foto tidak dapat dibaca.");
    } finally { URL.revokeObjectURL(url); }
  }

  useEffect(() => {
    if (!buka) return;
    tutupRef.current?.focus();
    mulaiKamera();
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") tutup(); };
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("keydown", esc); hentikan(); };
  }, [buka, mulaiKamera, tutup, hentikan]);

  return (
    <>
      <button
        type="button"
        onClick={() => setBuka(true)}
        aria-label="Scan QR code alat"
        title="Scan QR code alat"
        className="group fixed bottom-5 right-5 z-40 flex size-14 items-center justify-center rounded-full bg-teal-600 text-white shadow-lg shadow-teal-900/25 ring-4 ring-white/70 transition-all duration-200 ease-out hover:scale-105 hover:bg-teal-500 hover:shadow-xl focus-visible:outline-none focus-visible:ring-teal-300 active:scale-95 motion-reduce:transition-none sm:bottom-6 sm:right-6"
      >
        <ScanQrCode className="size-7 transition-transform duration-200 group-hover:scale-110 motion-reduce:transition-none" aria-hidden />
      </button>

      {buka && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-navy-950/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={tutup}>
          <div role="dialog" aria-modal="true" aria-label="Scan QR code" onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md overflow-hidden rounded-t-2xl bg-card shadow-2xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="flex items-center gap-2 font-semibold text-navy-800"><ScanQrCode className="size-5 text-teal-700" /> Scan QR code alat</h2>
              <Button ref={tutupRef} variant="ghost" size="icon" onClick={tutup} aria-label="Tutup"><X className="size-5" /></Button>
            </div>

            <div className="relative aspect-square w-full bg-navy-950">
              <video ref={videoRef} muted playsInline className={status === "kamera" ? "size-full object-cover" : "hidden"} />
              {status === "kamera" && (
                <div className="pointer-events-none absolute inset-[14%] rounded-2xl border-2 border-teal-300/90 shadow-[0_0_0_9999px_rgba(4,16,31,0.45)]">
                  <div className="qr-garis absolute inset-x-3 h-0.5 rounded-full bg-teal-300 shadow-[0_0_12px_2px_rgba(94,234,212,0.7)]" />
                </div>
              )}
              {status !== "kamera" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-navy-100">
                  {status === "proses" || status === "siap" ? <Loader2 className="size-8 animate-spin" /> : <CameraOff className="size-10 opacity-70" />}
                  {pesan && <p className="text-sm">{pesan}</p>}
                </div>
              )}
            </div>

            <div className="grid gap-3 p-4">
              {status === "kamera" && <p className="text-center text-sm text-muted-foreground">Arahkan kamera ke QR code pada alat.</p>}
              {hasil?.jenis === "luar" && (
                <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                  <p className="font-medium text-navy-800">QR berisi tautan ke situs lain:</p>
                  <p className="mt-1 break-all text-muted-foreground">{hasil.url}</p>
                  <Button asChild size="sm" variant="outline" className="mt-2"><a href={hasil.url} target="_blank" rel="noopener noreferrer"><ExternalLink /> Buka di tab baru</a></Button>
                </div>
              )}
              {hasil?.jenis === "teks" && (
                <div className="rounded-lg border bg-muted/40 p-3 text-sm"><p className="font-medium text-navy-800">Isi QR:</p><p className="mt-1 break-all text-muted-foreground">{hasil.teks}</p></div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" className="flex-1">
                  <label className="cursor-pointer"><ImageUp /> Ambil / pilih foto QR
                    <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={dariFoto} />
                  </label>
                </Button>
                {status !== "kamera" && <Button variant="teal" className="flex-1" onClick={mulaiKamera}>Coba kamera lagi</Button>}
              </div>
            </div>
            <canvas ref={kanvasRef} className="hidden" />
          </div>
        </div>
      )}
    </>
  );
}
