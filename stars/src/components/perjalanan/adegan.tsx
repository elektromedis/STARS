"use client";

/**
 * Adegan gulir isometrik "Perjalanan Alat Kesehatan" (halaman publik /perjalanan).
 * Teknik: bagian setinggi N layar + panggung `sticky`; posisi gulir → tahap (pecahan) → kamera (translate/scale SVG),
 * garis jalur digambar bertahap (stroke-dashoffset), dan penanda alat bergerak di sepanjang jalur.
 * Semua bentuk digambar sendiri (SVG primitif) — ringan, tajam di semua layar, ikut mode gelap.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type Tahap = {
  kode: string; label: string; kicker: string; judul: string; sorot: string; teks: string;
  kartu: { judul: string; baris: { k: string; v: string; nada?: "baik" | "waspada" }[]; catatan?: string };
  href: string; tautan: string;
};

const S = 30; // satuan grid → px
const O = { x: 640, y: 150 };
const P = (x: number, y: number, z = 0): [number, number] => [O.x + (x - y) * S * 0.866, O.y + (x + y) * S * 0.5 - z * S];
const pts = (a: [number, number][]) => a.map((p) => p.map((n) => n.toFixed(1)).join(",")).join(" ");

/** Balok isometrik: tiga sisi tampak (atas, depan-kiri +y, depan-kanan +x). */
function Balok({ x, y, z = 0, w, d, h, c = "perabot" }: { x: number; y: number; z?: number; w: number; d: number; h: number; c?: string }) {
  return (
    <g className={`pj-${c}`}>
      <polygon className="pj-kiri" points={pts([P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h)])} />
      <polygon className="pj-kanan" points={pts([P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h)])} />
      <polygon className="pj-atas" points={pts([P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)])} />
    </g>
  );
}

/** Orang sederhana (badan + kepala) berdiri di titik grid. */
function Orang({ x, y, baju = "teal" }: { x: number; y: number; baju?: "teal" | "navy" | "putih" | "amber" }) {
  const [sx, sy] = P(x, y);
  return (
    <g className={`pj-orang pj-baju-${baju}`}>
      <ellipse cx={sx} cy={sy} rx={8} ry={4} className="pj-bayang" />
      <rect x={sx - 6} y={sy - 30} width={12} height={28} rx={6} className="pj-badan" />
      <circle cx={sx} cy={sy - 37} r={6} className="pj-kepala" />
    </g>
  );
}

/** Layar/monitor kecil di atas meja (sisi depan-kanan bercahaya). */
function Layar({ x, y, z, alarm }: { x: number; y: number; z: number; alarm?: boolean }) {
  return (
    <g>
      <Balok x={x} y={y} z={z} w={0.9} d={0.25} h={0.7} c="alat" />
      <polygon className={alarm ? "pj-layar-alarm" : "pj-layar"} points={pts([P(x + 0.1, y + 0.25, z + 0.12), P(x + 0.8, y + 0.25, z + 0.12), P(x + 0.8, y + 0.25, z + 0.6), P(x + 0.1, y + 0.25, z + 0.6)])} />
    </g>
  );
}

type Ruang = { x: number; y: number; w: number; d: number; isi: React.ReactNode };
const W = 6, D = 5;
const RUANG: Ruang[] = [
  { x: 0, y: 0, w: W, d: D, isi: <>{/* Penerimaan: tumpukan kardus, meja, petugas */}
    <Balok x={0.6} y={0.6} w={1.2} d={1} h={0.8} c="kardus" /><Balok x={0.7} y={0.7} z={0.8} w={1} d={0.8} h={0.6} c="kardus" /><Balok x={2.1} y={0.6} w={0.9} d={0.9} h={0.7} c="kardus" />
    <Balok x={3.2} y={2.4} w={2.2} d={0.9} h={0.75} /><Layar x={3.6} y={2.45} z={0.75} /><Orang x={4.2} y={3.9} baju="navy" /><Orang x={1.8} y={3.2} baju="amber" /></> },
  { x: 8, y: 0, w: W, d: D, isi: <>{/* Inventarisasi: rak, alat berlabel QR, pemindai */}
    <Balok x={8.4} y={0.4} w={3.2} d={0.7} h={1.9} c="rak" /><Balok x={8.5} y={0.5} z={0.65} w={3} d={0.6} h={0.05} /><Balok x={8.5} y={0.5} z={1.3} w={3} d={0.6} h={0.05} />
    <Balok x={11.6} y={2.2} w={1.1} d={1.1} h={1} c="alat" /><Balok x={11.75} y={3.31} z={0.55} w={0.35} d={0.02} h={0.35} c="qr" /><Orang x={10.4} y={3.6} baju="teal" /></> },
  { x: 8, y: 7, w: W, d: D, isi: <>{/* Preventif: tempat tidur pasien, monitor, teknisi */}
    <Balok x={8.6} y={7.6} w={1.6} d={3} h={0.55} c="kasur" /><Balok x={8.6} y={7.6} w={1.6} d={0.35} h={0.95} c="kasur" />
    <Balok x={10.6} y={7.7} w={0.7} d={0.7} h={1.1} c="alat" /><Layar x={10.5} y={7.75} z={1.1} /><Orang x={11.6} y={9.6} baju="teal" /></> },
  { x: 0, y: 7, w: W, d: D, isi: <>{/* Kalibrasi: meja uji, analyzer, alat yang diuji */}
    <Balok x={0.7} y={7.6} w={3.4} d={1.1} h={0.8} /><Layar x={1} y={7.7} z={0.8} /><Balok x={2.4} y={7.75} z={0.8} w={0.8} d={0.7} h={0.45} c="alat" />
    <Balok x={3.5} y={7.8} z={0.8} w={0.45} d={0.45} h={0.3} c="lampu" /><Orang x={2.2} y={10} baju="putih" /><Orang x={4.4} y={10.2} baju="teal" /></> },
  { x: 0, y: 14, w: W, d: D, isi: <>{/* Lapor & perbaikan: alat beralarm, pelapor dengan ponsel, teknisi */}
    <Balok x={0.8} y={14.6} w={1.4} d={1} h={1.1} c="alat" /><Layar x={0.95} y={14.65} z={1.1} alarm />
    <Balok x={3.4} y={14.6} w={2} d={0.9} h={0.75} /><Orang x={2.4} y={17.3} baju="amber" /><Orang x={4.2} y={16.6} baju="teal" /></> },
  { x: 8, y: 14, w: W, d: D, isi: <>{/* Perencanaan: meja rapat, papan grafik */}
    <Balok x={8.5} y={14.4} w={2.6} d={0.15} h={1.7} c="papan" /><Balok x={9.6} y={16} w={2.8} d={1.4} h={0.7} />
    <Orang x={9.2} y={18} baju="navy" /><Orang x={11.4} y={18.2} baju="putih" /><Orang x={13} y={16.6} baju="teal" /></> },
];
const pusat = (r: Ruang): [number, number] => [r.x + r.w / 2, r.y + r.d / 2 + 0.8];

/** Titik jalur (grid) — masuk dari jalan, lalu menyusuri koridor antar-ruang. Indeks titik tiap tahap dicatat. */
function bangunJalur() {
  const g: [number, number][] = [[-5, 2.5], [-1, 2.5]];
  const henti: number[] = [0];
  const c = RUANG.map(pusat);
  g.push(c[0]); henti.push(g.length - 1);
  for (let i = 1; i < c.length; i++) {
    const a = c[i - 1], b = c[i];
    if (a[0] !== b[0] && a[1] !== b[1]) g.push([b[0], a[1]]);
    else if (a[0] !== b[0]) { g.push([a[0], 6]); g.push([b[0], 6]); } // lewat koridor tengah
    else { g.push([a[0] + (a[0] < 7 ? 3.4 : -3.4), a[1]]); g.push([b[0] + (b[0] < 7 ? 3.4 : -3.4), b[1]]); }
    g.push(b); henti.push(g.length - 1);
  }
  const layar = g.map(([x, y]) => P(x, y));
  const kum = [0];
  for (let i = 1; i < layar.length; i++) kum.push(kum[i - 1] + Math.hypot(layar[i][0] - layar[i - 1][0], layar[i][1] - layar[i - 1][1]));
  return { layar, kum, henti: henti.map((i) => kum[i]), total: kum[kum.length - 1] };
}

function titikPada(j: ReturnType<typeof bangunJalur>, len: number): [number, number] {
  const L = Math.max(0, Math.min(j.total, len));
  let i = 1; while (i < j.kum.length - 1 && j.kum[i] < L) i++;
  const f = (L - j.kum[i - 1]) / (j.kum[i] - j.kum[i - 1] || 1);
  return [j.layar[i - 1][0] + (j.layar[i][0] - j.layar[i - 1][0]) * f, j.layar[i - 1][1] + (j.layar[i][1] - j.layar[i - 1][1]) * f];
}

const halus = (t: number) => t * t * (3 - 2 * t);
const klem = (t: number) => Math.max(0, Math.min(1, t));

export function AdeganPerjalanan({ tahap }: { tahap: Tahap[] }) {
  const ref = useRef<HTMLElement>(null);
  const [t, setT] = useState(0); // 0 … tahap.length-1 (pecahan)
  const [hemat, setHemat] = useState(false);
  const [lebar, setLebar] = useState(true); // layar ≥ 768 px: teks di kiri, kamera digeser ke kanan
  const jalur = useMemo(bangunJalur, []);
  const N = tahap.length;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setHemat(mq.matches);
    let raf = 0;
    const ukur = () => {
      raf = 0;
      const el = ref.current; if (!el) return;
      setLebar(window.innerWidth >= 768);
      const r = el.getBoundingClientRect();
      const p = klem(-r.top / Math.max(1, r.height - window.innerHeight));
      setT(p * (N - 1));
    };
    const jadwal = () => { if (!raf) raf = requestAnimationFrame(ukur); };
    ukur();
    window.addEventListener("scroll", jadwal, { passive: true }); window.addEventListener("resize", jadwal);
    return () => { window.removeEventListener("scroll", jadwal); window.removeEventListener("resize", jadwal); if (raf) cancelAnimationFrame(raf); };
  }, [N]);

  // Diam sejenak di tiap tahap, lalu bergerak ke tahap berikutnya.
  const i = Math.min(N - 1, Math.floor(t)), f = t - i;
  const gerak = hemat ? (f > 0.5 ? 1 : 0) : halus(klem((f - 0.3) / 0.55));
  const aktif = Math.min(N - 1, f > 0.62 ? i + 1 : i);

  // Kamera: tahap 0 = gedung utuh; tahap k = ruang k-1.
  const kamera = (k: number): [number, number, number] => {
    if (k <= 0) return [640, 430, 0.62];
    const [x, y] = P(...pusat(RUANG[k - 1]));
    return [x, y - 20, 1.3];
  };
  const a = kamera(i), b = kamera(Math.min(N - 1, i + 1));
  const [cx, cy, sk] = a.map((v, n) => v + (b[n] - v) * gerak) as [number, number, number];
  const panjang = jalur.henti[i] + (jalur.henti[Math.min(N - 1, i + 1)] - jalur.henti[i]) * gerak;
  const [ax, ay] = titikPada(jalur, panjang);
  const atap = klem(1 - t * 1.4); // gedung "terbuka" saat mulai digulir

  const keTahap = useCallback((k: number) => {
    const el = ref.current; if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top + ((el.offsetHeight - window.innerHeight) * k) / (N - 1) + 2, behavior: hemat ? "auto" : "smooth" });
  }, [N, hemat]);

  return (
    <section ref={ref} aria-label="Perjalanan alat kesehatan" className="pj relative" style={{ height: `${N * 110}svh` }}>
      <div className="sticky top-0 flex h-svh flex-col overflow-hidden md:block">
        {/* Panggung SVG */}
        <svg viewBox="0 0 1280 800" preserveAspectRatio="xMidYMid slice" className="mt-14 h-[52%] w-full shrink-0 md:absolute md:mt-0 md:inset-0 md:h-full" role="img" aria-label={`Ilustrasi isometrik: ${tahap[aktif].label}`}>
          <g transform={`translate(${lebar ? 800 : 640} 400) scale(${sk}) translate(${-cx} ${-cy})`}>
            <polygon className="pj-tanah" points={pts([P(-9, -4), P(20, -4), P(20, 24), P(-9, 24)])} />
            <polygon className="pj-jalan" points={pts([P(-9, 1.6), P(-0.6, 1.6), P(-0.6, 3.4), P(-9, 3.4)])} />
            <polygon className="pj-lantai-gedung" points={pts([P(-0.6, -0.6), P(14.6, -0.6), P(14.6, 19.6), P(-0.6, 19.6)])} />
            {RUANG.map((r, k) => (
              <g key={k} className={cn("pj-ruang", aktif === k + 1 && "pj-ruang-aktif")}>
                <polygon className="pj-lantai" points={pts([P(r.x, r.y), P(r.x + r.w, r.y), P(r.x + r.w, r.y + r.d), P(r.x, r.y + r.d)])} />
                <Balok x={r.x} y={r.y} w={r.w} d={0.18} h={2.1} c="dinding" />
                <Balok x={r.x} y={r.y} w={0.18} d={r.d} h={2.1} c="dinding" />
                <Balok x={r.x + 0.18} y={r.y + 0.18} z={1.9} w={r.w - 0.18} d={0.04} h={0.2} c="lis" />
              </g>
            ))}
            {/* Jalur: dasar putus-putus + jalur yang sudah dilalui */}
            <polyline className="pj-jalur-dasar" points={pts(jalur.layar)} />
            <polyline className="pj-jalur" points={pts(jalur.layar)} strokeDasharray={jalur.total} strokeDashoffset={jalur.total - panjang} />
            {RUANG.map((r, k) => <g key={k}>{r.isi}</g>)}
            {jalur.henti.slice(1).map((h, k) => { const [x, y] = titikPada(jalur, h); return <circle key={k} cx={x} cy={y} r={7} className={cn("pj-henti", panjang >= h - 1 && "pj-henti-lewat")} />; })}
            {/* Penanda alat yang sedang "berjalan" */}
            <g transform={`translate(${ax} ${ay})`} className="pj-penanda" style={{ opacity: klem(1 - atap * 2) }}>
              <circle r={16} className="pj-penanda-cincin" /><circle r={9} className="pj-penanda-inti" />
            </g>
            {/* Atap & fasad gedung (memudar & terangkat saat mulai digulir) */}
            {atap > 0.01 && (
              <g style={{ opacity: atap, transform: `translateY(${(1 - atap) * -140}px)` }} aria-hidden>
                <polygon className="pj-fasad-kiri" points={pts([P(-0.6, 19.6), P(14.6, 19.6), P(14.6, 19.6, 3), P(-0.6, 19.6, 3)])} />
                <polygon className="pj-fasad-kanan" points={pts([P(14.6, -0.6), P(14.6, 19.6), P(14.6, 19.6, 3), P(14.6, -0.6, 3)])} />
                <polygon className="pj-atap" points={pts([P(-0.6, -0.6, 3), P(14.6, -0.6, 3), P(14.6, 19.6, 3), P(-0.6, 19.6, 3)])} />
                {Array.from({ length: 9 }, (_, n) => <polygon key={n} className="pj-jendela" points={pts([P(1 + n * 1.6, 19.6, 0.9), P(2 + n * 1.6, 19.6, 0.9), P(2 + n * 1.6, 19.6, 2.2), P(1 + n * 1.6, 19.6, 2.2)])} />)}
                <polygon className="pj-papan-nama" points={pts([P(3, 19.6, 3), P(11, 19.6, 3), P(11, 19.6, 4.3), P(3, 19.6, 4.3)])} />
                <text className="pj-nama-gedung" x={P(7, 19.6, 3.5)[0]} y={P(7, 19.6, 3.5)[1]} textAnchor="middle" transform={`rotate(-30 ${P(7, 19.6, 3.5).join(" ")}) skewX(30)`}>RSUD CIPAYUNG</text>
              </g>
            )}
          </g>
        </svg>

        {/* Kabut kiri agar teks tetap terbaca di atas ilustrasi (desktop) */}
        <div aria-hidden className="pj-kabut pointer-events-none absolute inset-y-0 left-0 hidden w-[58%] md:block" />
        {/* Teks per tahap */}
        <div className="relative flex-1 pb-14 md:absolute md:inset-y-0 md:left-0 md:flex md:w-[44%] md:items-center md:pl-[max(1.5rem,calc((100vw-80rem)/2+1.5rem))]">
          {tahap.map((h, k) => (
            <article key={h.kode} aria-hidden={k !== aktif} inert={k !== aktif}
              className={cn("pj-teks absolute inset-x-4 top-3 md:inset-x-auto md:left-[max(1.5rem,calc((100vw-80rem)/2+1.5rem))] md:right-4 md:top-1/2 md:max-w-md", k === aktif ? "pj-teks-aktif" : "pointer-events-none")}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{h.kicker}</p>
              <h2 className="mt-1 text-[clamp(1.6rem,4.2vw,3.4rem)] font-extrabold leading-[1.02] tracking-tight text-navy-800 dark:text-white">{h.judul}<br /><span className="text-teal-600 dark:text-teal-400">{h.sorot}</span></h2>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground md:mt-3">{h.teks}</p>
              <div className="pj-kartu mt-3 max-w-sm rounded-2xl border bg-card/95 p-3 shadow-card backdrop-blur md:mt-5 md:p-4">
                <p className="text-xs font-semibold text-navy-800 dark:text-white">{h.kartu.judul}</p>
                <dl className="mt-2 grid grid-cols-3 gap-2">
                  {h.kartu.baris.map((b) => (
                    <div key={b.k} className="min-w-0">
                      <dt className="truncate text-[11px] text-muted-foreground">{b.k}</dt>
                      <dd className={cn("text-lg font-bold tabular-nums text-navy-800 dark:text-white", b.nada === "waspada" && "text-amber-700 dark:text-amber-400", b.nada === "baik" && "text-teal-700 dark:text-teal-400")}>{b.v}</dd>
                    </div>
                  ))}
                </dl>
                {h.kartu.catatan && <p className="mt-1.5 text-[11px] text-muted-foreground">{h.kartu.catatan}</p>}
                <Link href={h.href} className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-navy-800 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 dark:bg-teal-600">{h.tautan} <ArrowRight className="size-3.5" /></Link>
              </div>
              {k === 0 && <p className="mt-4 hidden items-center gap-1.5 text-xs text-muted-foreground md:flex"><ArrowDown className="size-3.5 animate-bounce" /> Gulir untuk mengikuti perjalanan alat</p>}
            </article>
          ))}
        </div>

        {/* Navigasi tahap */}
        <nav aria-label="Tahap perjalanan" className="absolute inset-x-0 bottom-0 z-10 border-t bg-card/85 backdrop-blur">
          <ol className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3 py-2 [scrollbar-width:none]">
            {tahap.map((h, k) => (
              <li key={h.kode} className="shrink-0">
                <button type="button" onClick={() => keTahap(k)} aria-current={k === aktif ? "step" : undefined}
                  className={cn("rounded-full px-3 py-1.5 text-xs font-medium transition", k === aktif ? "bg-navy-800 text-white dark:bg-teal-600" : "text-muted-foreground hover:bg-muted")}>
                  <span className="mr-1 tabular-nums opacity-60">{String(k).padStart(2, "0")}</span>{h.label}
                </button>
              </li>
            ))}
          </ol>
        </nav>
      </div>
    </section>
  );
}
