"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ArrowLeft, CameraOff, ExternalLink, FileSearch, Flashlight, FlashlightOff, ImageUp, Keyboard, Loader2, RotateCcw, ScanQrCode, Search, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import { BarisSaranAlat, cariAlat, FotoKecilAlat, useSaranAlat, type AlatSaran } from "@/components/pemeliharaan/cari-alat";
import { badgeKondisi } from "@/lib/pemeliharaan";
import { urlDetailAlat } from "@/lib/dokumen-alat";
import { catatScan, PERISTIWA_SCAN } from "@/lib/lokal";
import { cn } from "@/lib/utils";

type Detektor = { detect: (s: CanvasImageSource) => Promise<{ rawValue: string }[]> };
type Hasil =
  | { jenis: "alat"; daftar: AlatSaran[] }
  | { jenis: "tidak-ada"; isi: string }
  | { jenis: "luar"; url: string }
  | { jenis: "mencari" };

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

const detektorBawaan = () => {
  const B = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detektor }).BarcodeDetector;
  return B ? new B({ formats: ["qr_code"] }) : null;
};

/** Isi QR → apa yang dicari: kode alat (label STARS / teks), kode ASPAK (QR lama Trilux), tautan STARS lain, atau tautan luar. */
function urai(isi: string): { kode: string } | { aspak: string } | { buka: string } | { luar: string } | null {
  const teks = isi.trim();
  if (/^https?:\/\//i.test(teks)) {
    try {
      const url = new URL(teks);
      const kode = (url.pathname === "/alat" && url.searchParams.get("kode")) || (url.pathname === "/lapor" && url.searchParams.get("alat"));
      if (kode) return { kode };
      const aspak = url.pathname === "/lapor" && url.searchParams.get("aspak");
      if (aspak) return { aspak };
      if (url.origin === window.location.origin) return { buka: `${url.pathname}${url.search}${url.hash}` };
      return { luar: url.toString() };
    } catch { /* bukan URL valid */ }
  }
  if (teks.startsWith("{")) {
    try {
      const d = JSON.parse(teks) as { codenom?: unknown };
      if (d.codenom && String(d.codenom) !== "-") return { aspak: String(d.codenom) };
    } catch { /* bukan JSON */ }
  }
  if (teks && teks.length <= 120) return { kode: teks };
  return null;
}

/**
 * Layar Scan QR layar penuh (gaya aplikasi bank: bingkai sudut, garis pindai, Galeri & Senter, tab "Scan QR | Ketik Kode").
 * Dibuka lewat tombol tengah menu bawah (peristiwa "stars:scan"). Hasil: kartu alat dengan tombol
 * "Detail Inventaris" dan "Lapor Kerusakan"; alat yang dipindai tercatat di Riwayat.
 */
export function QrScan() {
  const router = useRouter();
  const [buka, setBuka] = useState(false);
  const [mode, setMode] = useState<"scan" | "ketik">("scan");
  const [status, setStatus] = useState<"siap" | "kamera" | "tanpa-kamera" | "proses">("siap");
  const [pesan, setPesan] = useState<string | null>(null);
  const [hasil, setHasil] = useState<Hasil | null>(null);
  const [senter, setSenter] = useState<{ ada: boolean; nyala: boolean }>({ ada: false, nyala: false });
  const [ketik, setKetik] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const kanvasRef = useRef<HTMLCanvasElement>(null);
  const kembaliRef = useRef<HTMLButtonElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const loopRef = useRef<number | null>(null);
  const pindaiAktif = useRef(false);
  const { saran, memuat } = useSaranAlat(mode === "ketik" ? ketik : "");

  /** Hentikan putaran pindai saja; gambar kamera dibekukan (seperti aplikasi bank) sampai layar ditutup. */
  const jedaPindai = useCallback(() => {
    if (loopRef.current) { window.clearTimeout(loopRef.current); loopRef.current = null; }
    pindaiAktif.current = false;
    videoRef.current?.pause();
  }, []);

  const hentikan = useCallback(() => {
    jedaPindai();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setSenter({ ada: false, nyala: false });
  }, [jedaPindai]);

  const tutup = useCallback(() => { hentikan(); setBuka(false); setHasil(null); setPesan(null); setStatus("siap"); setMode("scan"); setKetik(""); }, [hentikan]);

  const tampilkanAlat = useCallback((daftar: AlatSaran[]) => {
    setHasil({ jenis: "alat", daftar });
    if (daftar.length === 1) catatScan({ kode: daftar[0].kode, nama: daftar[0].nama, keterangan: [daftar[0].unit, daftar[0].ruangan].filter(Boolean).join(" · ") });
  }, []);

  const tangani = useCallback(async (isi: string) => {
    jedaPindai();
    if ("vibrate" in navigator) try { navigator.vibrate(60); } catch { /* opsional */ }
    const u = urai(isi);
    if (!u) { setHasil({ jenis: "tidak-ada", isi }); return; }
    if ("buka" in u) { tutup(); router.push(u.buka); return; }
    if ("luar" in u) { setHasil({ jenis: "luar", url: u.luar }); return; }
    setHasil({ jenis: "mencari" });
    const daftar = await cariAlat("kode" in u ? { kode: u.kode } : { aspak: u.aspak }).catch(() => []);
    if (daftar.length) tampilkanAlat(daftar);
    else setHasil({ jenis: "tidak-ada", isi: "kode" in u ? u.kode : `kode alat ASPAK ${u.aspak}` });
  }, [jedaPindai, router, tutup, tampilkanAlat]);

  const mulaiKamera = useCallback(async () => {
    hentikan();
    setHasil(null); setPesan(null); setStatus("siap");
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setStatus("tanpa-kamera");
      setPesan("Kamera hanya bisa dipakai lewat alamat HTTPS STARS. Gunakan Galeri untuk memilih foto QR, atau Ketik Kode.");
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
      const track = stream.getVideoTracks()[0];
      const kemampuan = (track?.getCapabilities?.() ?? {}) as { torch?: boolean };
      setSenter({ ada: Boolean(kemampuan.torch), nyala: false });
      const detektor = detektorBawaan();
      pindaiAktif.current = true;
      const putaran = async () => {
        if (!pindaiAktif.current || !streamRef.current || !videoRef.current || !kanvasRef.current) return;
        const isi = await bacaDari(videoRef.current, kanvasRef.current, detektor).catch(() => null);
        if (!pindaiAktif.current) return;
        if (isi) { tangani(isi); return; }
        loopRef.current = window.setTimeout(putaran, 250);
      };
      putaran();
    } catch (err) {
      setStatus("tanpa-kamera");
      setPesan(err instanceof DOMException && err.name === "NotAllowedError" ? "Izin kamera ditolak. Izinkan kamera di pengaturan browser, atau pilih foto QR dari Galeri." : "Kamera tidak dapat dibuka. Pilih foto QR dari Galeri, atau Ketik Kode.");
    }
  }, [hentikan, tangani]);

  async function alihSenter() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const nyala = !senter.nyala;
    try { await track.applyConstraints({ advanced: [{ torch: nyala } as MediaTrackConstraintSet] }); setSenter({ ada: true, nyala }); } catch { setSenter({ ada: false, nyala: false }); }
  }

  async function dariGaleri(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !kanvasRef.current) return;
    hentikan(); setStatus("proses"); setPesan(null); setHasil(null); setMode("scan");
    const url = URL.createObjectURL(f);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      const isi = await bacaDari(img, kanvasRef.current, detektorBawaan());
      if (isi) { setStatus("tanpa-kamera"); tangani(isi); }
      else { setStatus("tanpa-kamera"); setPesan("QR tidak terbaca pada foto. Pastikan QR tampak jelas, tidak buram, dan memenuhi bingkai."); }
    } catch {
      setStatus("tanpa-kamera"); setPesan("Foto tidak dapat dibaca.");
    } finally { URL.revokeObjectURL(url); }
  }

  function gantiMode(m: "scan" | "ketik") {
    if (m === mode) return;
    setMode(m); setHasil(null);
    if (m === "ketik") { hentikan(); setStatus("siap"); } else mulaiKamera();
  }

  function pergi(href: string) { tutup(); router.push(href); }

  // buka dari mana saja
  useEffect(() => {
    const bukaScan = () => setBuka(true);
    window.addEventListener(PERISTIWA_SCAN, bukaScan);
    return () => window.removeEventListener(PERISTIWA_SCAN, bukaScan);
  }, []);

  useEffect(() => {
    if (!buka) return;
    kembaliRef.current?.focus();
    mulaiKamera();
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") tutup(); };
    document.addEventListener("keydown", esc);
    const asli = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", esc); document.body.style.overflow = asli; hentikan(); };
  }, [buka, mulaiKamera, tutup, hentikan]);

  if (!buka) return null;
  const pindai = mode === "scan" && status === "kamera" && !hasil;

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Scan QR alat" className="fixed inset-0 z-[80] flex flex-col bg-navy-950 text-white">
      {/* kamera / latar */}
      <video ref={videoRef} muted playsInline className={cn("absolute inset-0 size-full object-cover", (mode !== "scan" || status !== "kamera") && "invisible")} />
      <div className="absolute inset-0 bg-gradient-to-b from-navy-950/70 via-transparent to-navy-950/90" aria-hidden />

      {/* bilah atas */}
      <header className="relative z-20 flex items-center gap-2 px-3 pt-[max(env(safe-area-inset-top),0.75rem)] pb-2">
        <button ref={kembaliRef} type="button" onClick={tutup} aria-label="Kembali" className="flex size-10 items-center justify-center rounded-full hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"><ArrowLeft className="size-6" /></button>
        <h2 className="flex-1 text-center text-lg font-semibold">{mode === "scan" ? "Scan QR" : "Ketik Kode Alat"}</h2>
        <span className="size-10" aria-hidden />
      </header>

      {/* area tengah */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6">
        {mode === "scan" ? (
          <>
            <div className="relative aspect-square w-[min(72vw,300px)]">
              {status === "kamera" && <div className="absolute inset-0 rounded-3xl shadow-[0_0_0_200vmax_rgba(4,16,31,0.55)]" aria-hidden />}
              {/* sudut bingkai */}
              {["left-0 top-0 border-l-4 border-t-4 rounded-tl-3xl", "right-0 top-0 border-r-4 border-t-4 rounded-tr-3xl", "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-3xl", "bottom-0 right-0 border-b-4 border-r-4 rounded-br-3xl"].map((c) => (
                <span key={c} className={cn("absolute size-12 border-white", c)} aria-hidden />
              ))}
              {pindai && <div className="qr-garis absolute inset-x-5 h-0.5 rounded-full bg-teal-300 shadow-[0_0_14px_3px_rgba(94,234,212,0.75)]" aria-hidden />}
              {status !== "kamera" && !hasil && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-5 text-center text-sm text-navy-100">
                  {status === "proses" || status === "siap" ? <Loader2 className="size-8 animate-spin" /> : <CameraOff className="size-10 opacity-80" />}
                  {pesan && <p>{pesan}</p>}
                </div>
              )}
            </div>
            <p className="mt-6 text-center text-sm text-white/85" aria-live="polite">{pindai ? "Arahkan kamera ke QR code pada alat" : status === "proses" ? "Membaca foto…" : " "}</p>
            <div className="mt-6 flex items-start gap-10">
              <label className="group flex cursor-pointer flex-col items-center gap-1.5 text-xs">
                <span className="flex size-12 items-center justify-center rounded-full bg-white/15 transition group-hover:bg-white/25 group-focus-within:ring-2 group-focus-within:ring-teal-300"><ImageUp className="size-5" /></span>
                Galeri
                <input type="file" accept="image/*" className="sr-only" onChange={dariGaleri} />
              </label>
              {status === "kamera" ? (
                <button type="button" onClick={alihSenter} disabled={!senter.ada} aria-pressed={senter.nyala} className="group flex flex-col items-center gap-1.5 text-xs disabled:opacity-40" title={senter.ada ? "Nyalakan/matikan senter" : "Senter tidak didukung perangkat ini"}>
                  <span className={cn("flex size-12 items-center justify-center rounded-full transition", senter.nyala ? "bg-amber-300 text-navy-950" : "bg-white/15 group-hover:bg-white/25")}>{senter.nyala ? <Flashlight className="size-5" /> : <FlashlightOff className="size-5" />}</span>
                  Senter
                </button>
              ) : (
                <button type="button" onClick={mulaiKamera} className="group flex flex-col items-center gap-1.5 text-xs">
                  <span className="flex size-12 items-center justify-center rounded-full bg-white/15 transition group-hover:bg-white/25"><RotateCcw className="size-5" /></span>
                  Coba kamera
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="w-full max-w-md self-start pt-6">
            <p className="mb-3 text-sm text-white/80">Ketik nomor seri (SN), kode inventaris, atau nama alat yang tertera pada label.</p>
            <Combobox
              gelap autoFocus value={ketik} onValueChange={setKetik} ikon={<Search className="size-4" />} placeholder="mis. 2017608HG0071N atau Bed patient"
              saran={saran} kunciSaran={(a) => a.id} memuat={memuat} onPilih={(a) => { setKetik(""); tampilkanAlat([a]); }}
              renderSaran={(a) => <BarisSaranAlat a={a} kunci={ketik} />} kosong="Tidak ada alat yang cocok." inputClassName="h-12 text-base"
            />
          </div>
        )}
      </div>

      {/* tab bawah */}
      <nav aria-label="Cara memindai" className="relative z-20 mx-auto mb-[max(env(safe-area-inset-bottom),1rem)] mt-2 flex rounded-full bg-white/10 p-1 text-sm backdrop-blur">
        {([["scan", "Scan QR", ScanQrCode], ["ketik", "Ketik Kode", Keyboard]] as const).map(([m, label, Ikon]) => (
          <button key={m} type="button" onClick={() => gantiMode(m)} aria-pressed={mode === m}
            className={cn("flex items-center gap-1.5 rounded-full px-4 py-2 font-medium transition", mode === m ? "bg-white text-navy-900 shadow" : "text-white/80 hover:text-white")}>
            <Ikon className="size-4" /> {label}
          </button>
        ))}
      </nav>

      {/* lembar hasil */}
      {hasil && (
        <div className="absolute inset-x-0 bottom-0 z-30 max-h-[80vh] overflow-y-auto rounded-t-3xl bg-card p-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] text-foreground shadow-2xl animate-in slide-in-from-bottom duration-200 sm:mx-auto sm:max-w-md">
          <span className="mx-auto mb-4 block h-1.5 w-12 rounded-full bg-muted" aria-hidden />
          {hasil.jenis === "mencari" && <p className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground"><Loader2 className="size-5 animate-spin" /> Mencari alat…</p>}
          {hasil.jenis === "alat" && hasil.daftar.length === 1 && (() => {
            const a = hasil.daftar[0];
            return (
              <div className="grid gap-4">
                <div className="flex items-start gap-3">
                  <FotoKecilAlat foto={a.foto} nama={a.nama} ukuran={72} className="rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Alat ditemukan</p>
                    <h3 className="text-lg font-bold leading-snug text-navy-800">{a.nama}</h3>
                    <p className="text-sm text-muted-foreground">{[a.merek, a.model].filter(Boolean).join(" ")}</p>
                    {a.nomorSeri && <p className="text-xs text-muted-foreground">SN <span className="font-mono">{a.nomorSeri}</span></p>}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-muted-foreground">{a.unit}{a.ruangan ? ` · ${a.ruangan}` : ""}</span>
                  <Badge variant={badgeKondisi[a.kondisi] ?? "outline"}>{a.kondisi}</Badge>
                  <Badge variant={a.kalibrasi.variant}>Kalibrasi: {a.kalibrasi.label}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => pergi(urlDetailAlat(a.kode))} className="flex flex-col items-center gap-1.5 rounded-2xl bg-navy-800 px-3 py-3.5 text-sm font-semibold text-white transition hover:bg-navy-700">
                    <FileSearch className="size-6" /> Detail Inventaris
                  </button>
                  <button type="button" onClick={() => pergi(`/lapor?alat=${encodeURIComponent(a.kode)}`)} className="flex flex-col items-center gap-1.5 rounded-2xl bg-teal-600 px-3 py-3.5 text-sm font-semibold text-white transition hover:bg-teal-500">
                    <Send className="size-6" /> Lapor Kerusakan
                  </button>
                </div>
                <button type="button" onClick={mode === "scan" ? mulaiKamera : () => setHasil(null)} className="text-sm font-medium text-teal-700 hover:underline">{mode === "scan" ? "Scan QR lain" : "Cari alat lain"}</button>
              </div>
            );
          })()}
          {hasil.jenis === "alat" && hasil.daftar.length > 1 && (
            <div className="grid gap-3">
              <h3 className="font-semibold text-navy-800">QR Trilux: {hasil.daftar.length} alat sejenis — pilih unit yang dimaksud</h3>
              <ul className="grid max-h-[45vh] gap-1 overflow-y-auto">
                {hasil.daftar.map((a) => (
                  <li key={a.id}><button type="button" onClick={() => tampilkanAlat([a])} className="w-full rounded-lg border p-2 text-left text-sm hover:bg-muted/60"><BarisSaranAlat a={a} kunci="" /></button></li>
                ))}
              </ul>
              <button type="button" onClick={mulaiKamera} className="text-sm font-medium text-teal-700 hover:underline">Scan ulang</button>
            </div>
          )}
          {hasil.jenis === "tidak-ada" && (
            <div className="grid gap-3 text-center">
              <h3 className="font-semibold text-navy-800">Alat belum terdaftar</h3>
              <p className="break-all text-sm text-muted-foreground">QR/kode <span className="font-mono">{hasil.isi.slice(0, 120)}</span> tidak cocok dengan Inventaris STARS.</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => pergi("/lapor")} className="rounded-xl bg-teal-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-teal-500">Lapor manual</button>
                <button type="button" onClick={() => (mode === "scan" ? mulaiKamera() : setHasil(null))} className="rounded-xl border px-3 py-2.5 text-sm font-semibold text-navy-800 hover:bg-muted/60">Coba lagi</button>
              </div>
            </div>
          )}
          {hasil.jenis === "luar" && (
            <div className="grid gap-3">
              <h3 className="font-semibold text-navy-800">QR berisi tautan ke situs lain</h3>
              <p className="break-all text-sm text-muted-foreground">{hasil.url}</p>
              <div className="grid grid-cols-2 gap-2">
                <a href={hasil.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-semibold text-navy-800 hover:bg-muted/60"><ExternalLink className="size-4" /> Buka di tab baru</a>
                <button type="button" onClick={mulaiKamera} className="rounded-xl bg-teal-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-teal-500">Scan lagi</button>
              </div>
            </div>
          )}
        </div>
      )}
      <canvas ref={kanvasRef} className="hidden" />
    </div>,
    document.body,
  );
}
