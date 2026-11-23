"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Grid3x3, Maximize, Minimize, Pause, Play, Printer, X } from "lucide-react";
import { LogoIkon } from "@/components/layout/logo-animasi";
import { useSitus } from "@/components/layout/use-situs";
import { urlLogoRsud } from "@/lib/situs";

type Slide = { bagian: string; judul: string; isi: HTMLElement | null };
const LEBAR = 1200; // lebar desain isi slide (px), lalu diskalakan agar pas

/**
 * Susun slide dari isi Dashboard: tiap bagian (judul JudulBagian) → slide kartu indikator,
 * lalu satu slide per grafik/kartu. Isi disalin (clone) dari halaman sehingga angka & grafik
 * selalu sama dengan yang tampil.
 */
function susunSlide(bagian: { id: string; label: string }[]): Slide[] {
  const kepala = bagian.map((b) => document.getElementById(b.id)).filter((x): x is HTMLElement => Boolean(x));
  const target = [...document.querySelectorAll<HTMLElement>("[data-slide]")].filter((x) => x.offsetHeight > 0);
  // Urutkan dalam urutan dokumen: judul bagian → slide pembatas; elemen data-slide → slide isi.
  const semua = [...kepala, ...target].sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
  const slides: Slide[] = [];
  let judulBagian = "Dashboard";
  for (const el of semua) {
    if (kepala.includes(el)) {
      judulBagian = el.querySelector("h2")?.textContent?.trim() || judulBagian;
      slides.push({ bagian: judulBagian, judul: el.querySelector("p")?.textContent?.trim() ?? "", isi: null });
    } else slides.push({ bagian: judulBagian, judul: el.dataset.slide || judulBagian, isi: el });
  }
  return slides;
}

function salin(el: HTMLElement) {
  const c = el.cloneNode(true) as HTMLElement;
  for (const x of [c, ...c.querySelectorAll<HTMLElement>("*")]) {
    x.removeAttribute("id"); x.classList.remove("muncul");
    if (x.classList.contains("col-span-full") || [...x.classList].some((k) => /:col-span-/.test(k))) x.style.gridColumn = "auto";
  }
  // Grid di slide: satu baris rata sesuai jumlah kartu (maks 4 kolom), bukan breakpoint layar.
  if (getComputedStyle(el).display === "grid") {
    const n = [...el.children].filter((k) => (k as HTMLElement).offsetHeight > 0).length;
    c.style.gridTemplateColumns = `repeat(${Math.min(Math.max(n, 1), 4)}, minmax(0, 1fr))`;
  }
  c.querySelectorAll("a, button, input, select, textarea").forEach((x) => x.setAttribute("tabindex", "-1"));
  c.style.margin = "0"; c.style.width = "100%";
  return c;
}

/** Satu slide 16:9 berukuran tetap 1280×720 (diskalakan pemanggil). */
function KanvasSlide({ s, i, n, judulLaporan, tanggal, logoRsud }: { s: Slide | "sampul" | "penutup"; i: number; n: number; judulLaporan: string; tanggal: string; logoRsud: string }) {
  const wadah = useRef<HTMLDivElement>(null);
  const [skala, setSkala] = useState(1);
  useLayoutEffect(() => {
    const w = wadah.current; if (!w || typeof s !== "object") return;
    w.replaceChildren();
    if (s.isi) w.appendChild(salin(s.isi));
    const ruangTinggi = 720 - 150;
    const h = w.scrollHeight;
    setSkala(Math.min(1.35, ruangTinggi / Math.max(h, 1), 1180 / LEBAR));
  }, [s]);
  const logo = (
    <div className="flex items-center gap-3">
      <LogoIkon className="h-10 w-auto" />
      <span className="h-8 w-px bg-slate-300" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logoRsud} alt="RSUD Cipayung" className="h-9 w-auto" />
    </div>
  );
  if (s === "sampul" || s === "penutup") {
    return (
      <div className="relative flex h-[720px] w-[1280px] flex-col justify-between overflow-hidden bg-gradient-to-br from-teal-700 via-teal-800 to-navy-900 p-16 text-white">
        <div className="absolute -right-32 -top-32 size-[30rem] rounded-full bg-white/5" /><div className="absolute -bottom-40 right-40 size-[24rem] rounded-full bg-emerald-300/10" />
        <div className="flex items-center gap-4 rounded-2xl bg-white px-5 py-3 self-start">{logo}</div>
        {s === "sampul" ? (
          <div className="relative">
            <p className="text-xl font-semibold uppercase tracking-[0.3em] text-emerald-200">Laporan Dashboard</p>
            <h1 className="mt-3 text-7xl font-extrabold leading-tight">{judulLaporan}</h1>
            <p className="mt-4 text-2xl opacity-90">Sistem Terintegrasi Alat Kesehatan Rumah Sakit · RSUD Cipayung</p>
          </div>
        ) : (
          <div className="relative">
            <h1 className="text-7xl font-extrabold">Terima kasih</h1>
            <p className="mt-4 text-2xl opacity-90">Data bersumber dari STARS — diperbarui langsung dari setiap menu.</p>
          </div>
        )}
        <p className="relative text-lg opacity-80">{tanggal}</p>
      </div>
    );
  }
  const pembatas = s.isi === null;
  return (
    <div className="relative flex h-[720px] w-[1280px] flex-col overflow-hidden bg-white text-navy-900">
      <div className="flex h-24 shrink-0 items-center justify-between border-b-4 border-teal-600 px-12">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">{s.bagian}</p>
          {!pembatas && <h2 className="truncate text-3xl font-bold">{s.judul}</h2>}
        </div>
        {logo}
      </div>
      {pembatas ? (
        <div className="flex flex-1 flex-col justify-center bg-gradient-to-br from-teal-50 to-white px-16">
          <p className="text-2xl font-semibold text-teal-700">Bagian</p>
          <h2 className="mt-2 text-6xl font-extrabold">{s.bagian}</h2>
          <p className="mt-5 max-w-4xl text-2xl text-slate-600">{s.judul}</p>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center overflow-hidden px-10 py-6">
          <div style={{ width: LEBAR, transform: `scale(${skala})`, transformOrigin: "center" }}><div ref={wadah} className="slide-isi" /></div>
        </div>
      )}
      <div className="absolute inset-x-12 bottom-3 flex justify-between text-xs text-slate-400"><span>STARS · RSUD Cipayung · {tanggal}</span><span>{i + 1} / {n}</span></div>
    </div>
  );
}

/** Skala kanvas 1280×720 agar pas di kotak induk. */
function Skala({ children, lebar, tinggi }: { children: React.ReactNode; lebar: number; tinggi: number }) {
  const k = Math.min(lebar / 1280, tinggi / 720);
  return <div style={{ width: 1280 * k, height: 720 * k }} className="relative shrink-0 overflow-hidden rounded-md shadow-2xl"><div style={{ transform: `scale(${k})`, transformOrigin: "top left" }} className="absolute left-0 top-0">{children}</div></div>;
}

export function TombolPresentasi({ bagian, judul = "Dashboard STARS" }: { bagian: { id: string; label: string }[]; judul?: string }) {
  const { info } = useSitus();
  const [slides, setSlides] = useState<(Slide | "sampul" | "penutup")[] | null>(null);
  const [i, setI] = useState(0);
  const [ikhtisar, setIkhtisar] = useState(false);
  const [putar, setPutar] = useState(false);
  const [cetak, setCetak] = useState(false);
  const [penuh, setPenuh] = useState(false);
  const [ukuran, setUkuran] = useState({ w: 1280, h: 720 });
  const akar = useRef<HTMLDivElement>(null);
  const sentuh = useRef<number | null>(null);
  const tanggal = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" });
  const n = slides?.length ?? 0;
  const pergi = useCallback((k: number) => setI((x) => Math.max(0, Math.min(n - 1, typeof k === "number" ? k : x))), [n]);
  const tutup = useCallback(() => { setSlides(null); setPutar(false); setIkhtisar(false); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); }, []);

  function mulai() {
    setSlides(["sampul", ...susunSlide(bagian), "penutup"]); setI(0);
    requestAnimationFrame(() => akar.current?.requestFullscreen?.().catch(() => {}));
  }
  const bukaPresentasi = useRef(mulai);
  bukaPresentasi.current = mulai;
  useEffect(() => {
    const f = () => bukaPresentasi.current();
    window.addEventListener("stars:presentasi", f);
    return () => window.removeEventListener("stars:presentasi", f);
  }, []);
  useEffect(() => {
    if (!slides) return;
    const uk = () => setUkuran({ w: window.innerWidth, h: window.innerHeight });
    const fs = () => setPenuh(Boolean(document.fullscreenElement));
    const key = (e: KeyboardEvent) => {
      if (["ArrowRight", "PageDown", " ", "Enter"].includes(e.key)) { e.preventDefault(); setI((x) => Math.min(n - 1, x + 1)); }
      else if (["ArrowLeft", "PageUp", "Backspace"].includes(e.key)) { e.preventDefault(); setI((x) => Math.max(0, x - 1)); }
      else if (e.key === "Home") setI(0); else if (e.key === "End") setI(n - 1);
      else if (e.key === "Escape" && !document.fullscreenElement) tutup();
      else if (e.key.toLowerCase() === "g") setIkhtisar((v) => !v);
      else if (e.key.toLowerCase() === "f") (document.fullscreenElement ? document.exitFullscreen() : akar.current?.requestFullscreen())?.catch(() => {});
    };
    uk(); window.addEventListener("resize", uk); window.addEventListener("keydown", key); document.addEventListener("fullscreenchange", fs);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("resize", uk); window.removeEventListener("keydown", key); document.removeEventListener("fullscreenchange", fs); document.body.style.overflow = ""; };
  }, [slides, n, tutup]);
  useEffect(() => {
    if (!putar) return;
    const t = setInterval(() => setI((x) => (x + 1 < n ? x + 1 : (setPutar(false), x))), 8000);
    return () => clearInterval(t);
  }, [putar, n]);
  useEffect(() => {
    if (!cetak) return;
    document.body.classList.add("mencetak-slide");
    const selesai = () => { document.body.classList.remove("mencetak-slide"); setCetak(false); };
    const t = setTimeout(() => { window.print(); }, 400);
    window.addEventListener("afterprint", selesai);
    return () => { clearTimeout(t); window.removeEventListener("afterprint", selesai); document.body.classList.remove("mencetak-slide"); };
  }, [cetak]);

  const tbl = "grid size-10 place-items-center rounded-full text-white/90 hover:bg-white/15 disabled:opacity-30";
  const props = { n, judulLaporan: judul, tanggal, logoRsud: urlLogoRsud(info) };
  return (
    <>
      {slides && createPortal(
        <div ref={akar} id="presentasi-root" role="dialog" aria-modal="true" aria-label="Presentasi laporan dashboard" aria-roledescription="presentasi" className="fixed inset-0 z-[90] flex flex-col bg-slate-950 text-white">
          {cetak && <div className="slide-cetak">{slides.map((s, k) => <div key={k} className="slide-halaman"><KanvasSlide s={s} i={k} {...props} /></div>)}</div>}
          {ikhtisar ? (
            <div className="grid flex-1 grid-cols-2 content-start gap-4 overflow-y-auto p-6 sm:grid-cols-3 lg:grid-cols-4 print:hidden">
              {slides.map((s, k) => (
                <button key={k} type="button" onClick={() => { setI(k); setIkhtisar(false); }} aria-label={`Slide ${k + 1}`} className={`grid justify-items-center gap-1 rounded-lg p-1 text-xs ${k === i ? "ring-2 ring-emerald-400" : "hover:bg-white/10"}`}>
                  <Skala lebar={280} tinggi={158}><KanvasSlide s={s} i={k} {...props} /></Skala>{k + 1}
                </button>))}
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center overflow-hidden print:hidden" aria-live="polite"
              onTouchStart={(e) => { sentuh.current = e.touches[0].clientX; }}
              onTouchEnd={(e) => { if (sentuh.current === null) return; const d = e.changedTouches[0].clientX - sentuh.current; if (Math.abs(d) > 50) setI((x) => Math.max(0, Math.min(n - 1, x + (d < 0 ? 1 : -1)))); sentuh.current = null; }}
              onClick={(e) => { if ((e.target as HTMLElement).closest("button")) return; const x = e.clientX / window.innerWidth; setI((v) => Math.max(0, Math.min(n - 1, v + (x > 0.35 ? 1 : -1)))); }}>
              <div key={i} className="animate-[slide-masuk_.35s_ease-out]"><Skala lebar={ukuran.w - (penuh ? 0 : 32)} tinggi={ukuran.h - (penuh ? 56 : 88)}><KanvasSlide s={slides[i]} i={i} {...props} /></Skala></div>
            </div>
          )}
          <div className="relative flex h-14 shrink-0 items-center gap-1 bg-black/60 px-3 print:hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-white/10"><div className="h-full bg-emerald-400 transition-all" style={{ width: `${((i + 1) / n) * 100}%` }} /></div>
            <button type="button" className={tbl} onClick={() => pergi(i - 1)} disabled={i === 0} aria-label="Slide sebelumnya" title="Sebelumnya (←)"><ChevronLeft /></button>
            <span className="min-w-16 text-center text-sm tabular-nums" aria-live="polite">{i + 1} / {n}</span>
            <button type="button" className={tbl} onClick={() => pergi(i + 1)} disabled={i === n - 1} aria-label="Slide berikutnya" title="Berikutnya (→ / Spasi)"><ChevronRight /></button>
            <p className="ml-2 hidden min-w-0 flex-1 truncate text-sm text-white/70 sm:block">{typeof slides[i] === "object" ? `${(slides[i] as Slide).bagian} — ${(slides[i] as Slide).judul}` : judul}</p>
            <span className="flex-1 sm:hidden" />
            <button type="button" className={tbl} onClick={() => setPutar((v) => !v)} aria-pressed={putar} aria-label={putar ? "Jeda putar otomatis" : "Putar otomatis (8 detik/slide)"} title={putar ? "Jeda" : "Putar otomatis"}>{putar ? <Pause /> : <Play />}</button>
            <button type="button" className={tbl} onClick={() => setIkhtisar((v) => !v)} aria-pressed={ikhtisar} aria-label="Ikhtisar semua slide" title="Ikhtisar (G)"><Grid3x3 /></button>
            <button type="button" className={tbl} onClick={() => setCetak(true)} aria-label="Cetak / simpan PDF" title="Cetak / simpan PDF (lanskap)"><Printer /></button>
            <button type="button" className={`${tbl} hidden sm:grid`} onClick={() => (penuh ? document.exitFullscreen() : akar.current?.requestFullscreen())?.catch(() => {})} aria-label={penuh ? "Keluar layar penuh" : "Layar penuh"} title="Layar penuh (F)">{penuh ? <Minimize /> : <Maximize />}</button>
            <button type="button" className={tbl} onClick={tutup} aria-label="Tutup presentasi" title="Tutup (Esc)"><X /></button>
          </div>
        </div>, document.body)}
    </>
  );
}
