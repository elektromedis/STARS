"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, X } from "lucide-react";

type Detektor = { detect: (s: CanvasImageSource) => Promise<{ rawValue: string }[]> };

/** Pindai QR/barcode alat lewat kamera: BarcodeDetector bawaan (QR + barcode 1D), cadangan jsQR (QR saja). Hasil → /imms/pindai. */
export function PindaiKamera() {
  const [buka, setBuka] = useState(false);
  const [pesan, setPesan] = useState("Arahkan kamera ke QR / barcode alat");
  const video = useRef<HTMLVideoElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!buka) return;
    let aliran: MediaStream | null = null, henti = false, t = 0;
    const kanvas = document.createElement("canvas");
    const B = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detektor }).BarcodeDetector;
    let det: Detektor | null = null;
    try { det = B ? new B({ formats: ["qr_code", "code_128", "code_39", "ean_13", "ean_8", "data_matrix", "itf", "upc_a"] }) : null; } catch { det = null; }
    const selesai = (isi: string) => { henti = true; setBuka(false); router.push(`/imms/pindai?k=${encodeURIComponent(isi.trim())}`); };
    const baca = async () => {
      const v = video.current;
      if (henti || !v) return;
      if (v.readyState >= 2 && v.videoWidth) {
        try {
          if (det) { const r = await det.detect(v); if (r[0]?.rawValue) return selesai(r[0].rawValue); }
          else {
            const sk = Math.min(1, 720 / Math.max(v.videoWidth, v.videoHeight)), w = Math.round(v.videoWidth * sk), h = Math.round(v.videoHeight * sk);
            kanvas.width = w; kanvas.height = h;
            const ctx = kanvas.getContext("2d", { willReadFrequently: true })!; ctx.drawImage(v, 0, 0, w, h);
            const { default: jsQR } = await import("jsqr");
            const r = jsQR(ctx.getImageData(0, 0, w, h).data, w, h); if (r?.data) return selesai(r.data);
          }
        } catch { /* bingkai berikutnya */ }
      }
      t = window.setTimeout(baca, 250);
    };
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) { setPesan("Kamera tidak tersedia. Buka lewat alamat https, atau ketik kodenya."); return; }
      try {
        aliran = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        if (henti) { aliran.getTracks().forEach((x) => x.stop()); return; }
        if (video.current) { video.current.srcObject = aliran; await video.current.play().catch(() => {}); }
        if (!det) setPesan("Arahkan kamera ke QR alat (barcode garis butuh Chrome/Edge terbaru)");
        baca();
      } catch { setPesan("Izin kamera ditolak. Izinkan kamera di pengaturan browser, atau ketik kodenya."); }
    })();
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setBuka(false); };
    window.addEventListener("keydown", esc);
    return () => { henti = true; clearTimeout(t); aliran?.getTracks().forEach((x) => x.stop()); window.removeEventListener("keydown", esc); };
  }, [buka, router]);

  return (
    <>
      <button type="button" className="kapsul" style={{ padding: "0 10px" }} onClick={() => { setPesan("Arahkan kamera ke QR / barcode alat"); setBuka(true); }} aria-label="Pindai QR dengan kamera" title="Pindai QR dengan kamera">
        <Camera />
      </button>
      {buka && (
        <div className="emas-pindai" role="dialog" aria-modal="true" aria-label="Pindai QR alat">
          <div className="kaca emas-pindai-kotak">
            <div className="mb-2 flex items-center"><b className="text-[14px]">Pindai QR / barcode</b>
              <button type="button" className="kapsul ml-auto" style={{ padding: "0 8px", height: 28 }} onClick={() => setBuka(false)} aria-label="Tutup"><X /></button></div>
            <div className="emas-pindai-video"><video ref={video} playsInline muted /><span aria-hidden /></div>
            <p className="redup mt-2 text-center text-[12px]" aria-live="polite">{pesan}</p>
          </div>
        </div>
      )}
    </>
  );
}
