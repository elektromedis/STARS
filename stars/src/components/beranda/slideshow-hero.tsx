"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

export type SlideHero = { label: string; gelap?: boolean; isi: React.ReactNode };
const DURASI = 7000;

/** Slideshow pembuka beranda: putar otomatis, jeda, panah, titik, geser di HP, dan keyboard. */
export function SlideshowHero({ slide }: { slide: SlideHero[] }) {
  const n = slide.length;
  const [aktif, setAktif] = useState(0);
  const [putar, setPutar] = useState(true);
  const [tahan, setTahan] = useState(false);
  const awalX = useRef<number | null>(null);
  const trek = useRef<HTMLDivElement>(null);
  const ke = useCallback((i: number) => setAktif((i + n) % n), [n]);
  const gelap = Boolean(slide[aktif].gelap);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setPutar(false);
  }, []);

  useEffect(() => {
    if (!putar || tahan) return;
    const t = setTimeout(() => setAktif((a) => (a + 1) % n), DURASI);
    return () => clearTimeout(t);
  }, [aktif, putar, tahan, n]);

  useEffect(() => {
    [...(trek.current?.children ?? [])].forEach((el, i) => { (el as HTMLElement).inert = i !== aktif; });
  }, [aktif]);

  const tombol = cn("flex size-10 items-center justify-center rounded-full shadow-sm backdrop-blur transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-300", gelap ? "bg-white/15 text-white hover:bg-white/30" : "bg-white/90 text-navy-800 ring-1 ring-slate-200 hover:bg-white");

  return (
    <section
      id="slideshow-beranda"
      aria-roledescription="carousel"
      aria-label="Sorotan STARS"
      className="relative overflow-hidden rounded-3xl ring-1 ring-slate-200"
      onMouseEnter={() => setTahan(true)}
      onMouseLeave={() => setTahan(false)}
      onFocusCapture={() => setTahan(true)}
      onBlurCapture={() => setTahan(false)}
      onKeyDown={(e) => { if (e.key === "ArrowRight") ke(aktif + 1); if (e.key === "ArrowLeft") ke(aktif - 1); }}
      onTouchStart={(e) => { awalX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (awalX.current == null) return;
        const d = e.changedTouches[0].clientX - awalX.current;
        awalX.current = null;
        if (Math.abs(d) > 45) ke(aktif + (d < 0 ? 1 : -1));
      }}
    >
      <div ref={trek} className="flex transition-transform duration-700 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none" style={{ transform: `translateX(-${aktif * 100}%)` }}>
        {slide.map((s, i) => (
          <div key={s.label} role="group" aria-roledescription="slide" aria-label={`${i + 1} dari ${n}: ${s.label}`} aria-hidden={i !== aktif} className="slide-hero flex w-full shrink-0 items-stretch">
            <div className="w-full">{s.isi}</div>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => ke(aktif - 1)} aria-label="Slide sebelumnya" className={cn(tombol, "absolute left-3 top-1/2 hidden -translate-y-1/2 md:flex")}><ChevronLeft className="size-5" /></button>
      <button type="button" onClick={() => ke(aktif + 1)} aria-label="Slide berikutnya" className={cn(tombol, "absolute right-3 top-1/2 hidden -translate-y-1/2 md:flex")}><ChevronRight className="size-5" /></button>
      <div className={cn("absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full px-2 py-1 backdrop-blur", gelap ? "bg-white/15" : "bg-white/85 ring-1 ring-slate-200")}>
        {slide.map((s, i) => (
          <button key={s.label} type="button" onClick={() => ke(i)} aria-label={`Buka slide ${i + 1}: ${s.label}`} aria-current={i === aktif ? "true" : undefined} className="flex h-6 items-center px-1">
            <span className={cn("block h-2 rounded-full transition-all", i === aktif ? "w-7" : "w-2", gelap ? (i === aktif ? "bg-white" : "bg-white/50") : (i === aktif ? "bg-teal-600" : "bg-slate-400"))} />
          </button>
        ))}
        <button type="button" onClick={() => setPutar((p) => !p)} aria-label={putar ? "Jeda slideshow" : "Putar slideshow"} className={cn("flex size-6 items-center justify-center rounded-full", gelap ? "text-white" : "text-navy-800")}>
          {putar ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
        </button>
      </div>
    </section>
  );
}
