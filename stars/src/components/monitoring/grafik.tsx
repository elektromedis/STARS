"use client";
/**
 * Grafik monitoring lingkungan (SVG, tanpa pustaka).
 * Mengikuti spesifikasi dataviz: garis 2 px, titik ujung ≥ 8 px bercincin permukaan 2 px, wash area ~10 %, grid hairline padat,
 * satu sumbu per grafik (suhu & kelembapan dipisah), teks memakai tinta teks (bukan warna data), garis bidik + tooltip
 * saat diarahkan / difokus (panah kiri-kanan), status selalu ikon + label. Pita latar mengikuti LogTag:
 * biru = di bawah batas, hijau = dalam batas, merah = di atas batas.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, CircleDashed, MinusCircle, Siren, WifiOff, type LucideIcon } from "lucide-react";
import { fNilai, jamWib, LABEL_STATUS, OFFSET_WIB_MS, SATUAN, tglJamWib, type KunciStatusPantau, type Parameter } from "@/lib/monitoring";
import { WARNA_SERI, WARNA_STATUS, WARNA_ZONA } from "@/lib/monitoring-warna";
import { cn } from "@/lib/utils";

const TINTA = { utama: "#0b0b0b", kedua: "#52514e", redup: "#898781", grid: "#e1e0d9", dasar: "#c3c2b7", permukaan: "#ffffff" };

const IKON_STATUS: Record<KunciStatusPantau, LucideIcon> = { alarm: Siren, luar: AlertTriangle, putus: WifiOff, normal: CheckCircle2, belum: CircleDashed, nonaktif: MinusCircle };

export function LencanaStatus({ kunci, label, besar = false }: { kunci: KunciStatusPantau; label?: string; besar?: boolean }) {
  const s = { warna: WARNA_STATUS[kunci], ikon: IKON_STATUS[kunci] };
  const Ikon = s.ikon;
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full border bg-card font-semibold text-navy-800", besar ? "px-2.5 py-1 text-sm" : "px-2 py-0.5 text-xs")}
      style={{ borderColor: `${s.warna}66` }}>
      <Ikon className={besar ? "size-4" : "size-3.5"} style={{ color: s.warna }} aria-hidden /> {label ?? LABEL_STATUS[kunci]}
    </span>
  );
}

function useLebar<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [lebar, setLebar] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setLebar(Math.round(e.contentRect.width)));
    ro.observe(el);
    setLebar(Math.round(el.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, []);
  return [ref, lebar] as const;
}

// ---------------------------------------------------------------- meter rentang
/** Meter tipis: posisi nilai terkini terhadap batas aman (lintasan = tiga zona, penanda = nilai). */
export function MeterRentang({ nilai, min, maks, parameter }: { nilai: number | null; min: number | null; maks: number | null; parameter: Parameter }) {
  if (min == null && maks == null) return null;
  const a = min ?? maks! - 10, b = maks ?? min! + 10;
  const pad = Math.max(parameter === "suhu" ? 1.5 : 5, (b - a) * 0.35);
  let lo = a - pad, hi = b + pad;
  if (nilai != null) { lo = Math.min(lo, nilai - pad * 0.2); hi = Math.max(hi, nilai + pad * 0.2); }
  const x = (v: number) => ((v - lo) / (hi - lo)) * 100;
  const pMin = min != null ? x(min) : 0, pMaks = maks != null ? x(maks) : 100;
  const satuan = SATUAN[parameter];
  const lbl = (v: number) => `${v.toLocaleString("id-ID")}${parameter === "suhu" ? "°" : "%"}`;
  return (
    <div className="relative mt-2 h-7" role="img" aria-label={`${fNilai(parameter, nilai)} terhadap batas ${min != null ? `bawah ${min} ${satuan}` : ""}${min != null && maks != null ? " dan " : ""}${maks != null ? `atas ${maks} ${satuan}` : ""}`}>
      <div className="absolute inset-x-0 top-1 flex h-2 gap-0.5">
        {min != null && <span className="h-full rounded-l-full" style={{ width: `${pMin}%`, background: "#cde2fb" }} />}
        <span className={cn("h-full", min == null && "rounded-l-full", maks == null && "rounded-r-full")} style={{ width: `${pMaks - pMin}%`, background: "#c7ebc7" }} />
        {maks != null && <span className="h-full flex-1 rounded-r-full" style={{ background: "#f6cdcd" }} />}
      </div>
      {nilai != null && (
        <span className="absolute top-0 h-4 w-1 -translate-x-1/2 rounded-full bg-navy-900 ring-2 ring-white" style={{ left: `${Math.min(100, Math.max(0, x(nilai)))}%` }} aria-hidden />
      )}
      {min != null && <span className="absolute top-3.5 -translate-x-1/2 text-[10px] tabular-nums text-muted-foreground" style={{ left: `${pMin}%` }}>{lbl(min)}</span>}
      {maks != null && <span className="absolute top-3.5 -translate-x-1/2 text-[10px] tabular-nums text-muted-foreground" style={{ left: `${pMaks}%` }}>{lbl(maks)}</span>}
    </div>
  );
}

// ---------------------------------------------------------------- grafik garis
export type TitikSeri = { t: number; v: number | null; vMin?: number | null; vMaks?: number | null };

function langkahRapi(rentang: number, target: number) {
  const kasar = rentang / Math.max(1, target);
  const p = 10 ** Math.floor(Math.log10(kasar));
  const k = kasar / p;
  return (k <= 1 ? 1 : k <= 2 ? 2 : k <= 2.5 ? 2.5 : k <= 5 ? 5 : 10) * p;
}
const JAM = 3_600_000, HARI = 86_400_000;
const LANGKAH_WAKTU = [JAM, 2 * JAM, 3 * JAM, 6 * JAM, 12 * JAM, HARI, 2 * HARI, 7 * HARI, 14 * HARI, 30 * HARI, 61 * HARI];
const fmtTgl = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "Asia/Jakarta" });
function tickWaktu(dari: number, sampai: number, maks: number) {
  const langkah = LANGKAH_WAKTU.find((l) => (sampai - dari) / l <= maks) ?? 61 * HARI;
  const hasil: number[] = [];
  let t = Math.ceil((dari + OFFSET_WIB_MS) / langkah) * langkah - OFFSET_WIB_MS;
  if (langkah >= 30 * HARI) { // awal bulan WIB
    const d = new Date(dari + OFFSET_WIB_MS);
    let th = d.getUTCFullYear(), bl = d.getUTCMonth() + 1;
    const lompat = langkah >= 61 * HARI ? 2 : 1;
    for (;;) { const ms = Date.UTC(th, bl, 1) - OFFSET_WIB_MS; if (ms > sampai) break; if (ms >= dari) hasil.push(ms); bl += lompat; if (bl > 11) { th += 1; bl -= 12; } }
    return { langkah, hasil };
  }
  for (; t <= sampai; t += langkah) hasil.push(t);
  return { langkah, hasil };
}
const labelWaktu = (t: number, langkah: number) => (langkah < HARI ? jamWib(t) : fmtTgl.format(new Date(t)));

/**
 * Grafik garis satu parameter. `mini` = sparkline kartu (tanpa sumbu). Pita latar = zona batas; pita seri = min–maks per ember
 * (bila data diringkas). Garis diputus bila celah antar-titik > `celahMs`.
 */
export function GrafikGaris({ titik, parameter, min, maks, dari, sampai, tinggi = 260, mini = false, celahMs, judul }: {
  titik: TitikSeri[]; parameter: Parameter; min: number | null; maks: number | null; dari: number; sampai: number;
  tinggi?: number; mini?: boolean; celahMs: number; judul: string;
}) {
  const [ref, lebar] = useLebar<HTMLDivElement>();
  const [aktif, setAktif] = useState<number | null>(null);
  const data = useMemo(() => titik.filter((p) => p.v != null && Number.isFinite(p.v)), [titik]);
  const warna = WARNA_SERI[parameter];
  const m = mini ? { k: 2, ka: 6, a: 6, b: 6 } : { k: 46, ka: 14, a: 12, b: 28 };
  const W = Math.max(0, lebar), H = tinggi;
  const lp = W - m.k - m.ka, tp = H - m.a - m.b;

  const skala = useMemo(() => {
    let lo = Infinity, hi = -Infinity;
    for (const p of data) { lo = Math.min(lo, p.vMin ?? p.v!, p.v!); hi = Math.max(hi, p.vMaks ?? p.v!, p.v!); }
    if (min != null) { lo = Math.min(lo, min); hi = Math.max(hi, min); }
    if (maks != null) { lo = Math.min(lo, maks); hi = Math.max(hi, maks); }
    if (!Number.isFinite(lo)) { lo = 0; hi = parameter === "suhu" ? 10 : 100; }
    if (hi - lo < (parameter === "suhu" ? 2 : 5)) { const c = (hi + lo) / 2; lo = c - (parameter === "suhu" ? 1 : 2.5); hi = c + (parameter === "suhu" ? 1 : 2.5); }
    const pad = (hi - lo) * 0.1;
    lo -= pad; hi += pad;
    const langkah = langkahRapi(hi - lo, mini ? 2 : 5);
    if (!mini) { lo = Math.floor(lo / langkah) * langkah; hi = Math.ceil(hi / langkah) * langkah; }
    if (parameter === "lembap") { lo = Math.max(0, lo); hi = Math.min(100, hi); }
    const ticks: number[] = [];
    for (let v = Math.ceil(lo / langkah) * langkah; v <= hi + 1e-9; v += langkah) ticks.push(Math.round(v * 1000) / 1000);
    return { lo, hi, ticks };
  }, [data, min, maks, parameter, mini]);

  const x = (t: number) => m.k + ((t - dari) / Math.max(1, sampai - dari)) * lp;
  const y = (v: number) => m.a + (1 - (v - skala.lo) / (skala.hi - skala.lo)) * tp;
  const yJ = (v: number) => Math.min(m.a + tp, Math.max(m.a, y(v)));

  const jalur = useMemo(() => {
    if (!W) return { garis: "", pita: "" };
    let garis = "", pita = "";
    let seg: TitikSeri[] = [];
    const tutupSeg = () => {
      if (seg.length && seg.some((p) => p.vMin != null && p.vMaks != null && p.vMin !== p.vMaks)) {
        pita += `M${seg.map((p) => `${x(p.t).toFixed(1)},${y(p.vMaks ?? p.v!).toFixed(1)}`).join("L")}L${[...seg].reverse().map((p) => `${x(p.t).toFixed(1)},${y(p.vMin ?? p.v!).toFixed(1)}`).join("L")}Z`;
      }
      seg = [];
    };
    data.forEach((p, i) => {
      const putus = i > 0 && p.t - data[i - 1].t > celahMs;
      if (putus) tutupSeg();
      garis += `${i === 0 || putus ? "M" : "L"}${x(p.t).toFixed(1)},${y(p.v!).toFixed(1)}`;
      seg.push(p);
    });
    tutupSeg();
    return { garis, pita };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, W, skala, dari, sampai, celahMs]);

  const xt = useMemo(() => (mini || !W ? null : tickWaktu(dari, sampai, Math.max(2, Math.floor(lp / 90)))), [mini, W, dari, sampai, lp]);

  function cariIndeks(px: number) {
    if (!data.length) return null;
    const t = dari + ((px - m.k) / lp) * (sampai - dari);
    let lo = 0, hi = data.length - 1;
    while (lo < hi) { const md = (lo + hi) >> 1; if (data[md].t < t) lo = md + 1; else hi = md; }
    if (lo > 0 && Math.abs(data[lo - 1].t - t) < Math.abs(data[lo].t - t)) lo -= 1;
    return lo;
  }
  const p = aktif != null ? data[aktif] : null;
  const akhir = data[data.length - 1];
  const ringkasan = data.length ? `${judul}: ${data.length} titik, nilai terakhir ${fNilai(parameter, akhir?.v)} pada ${tglJamWib(akhir.t)}.` : `${judul}: belum ada data.`;
  const agregat = data.some((d) => d.vMin != null && d.vMaks != null && d.vMin !== d.vMaks);

  return (
    <div ref={ref} className="relative w-full select-none" style={{ height: H }}>
      {W > 0 && (
        <svg width={W} height={H} role="img" aria-label={ringkasan} tabIndex={mini ? -1 : 0}
          className="block touch-pan-y outline-none focus-visible:ring-2 focus-visible:ring-navy-800 focus-visible:ring-offset-2"
          onPointerMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setAktif(cariIndeks(e.clientX - r.left)); }}
          onPointerLeave={() => setAktif(null)}
          onBlur={() => setAktif(null)}
          onKeyDown={(e) => {
            if (!data.length) return;
            if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); setAktif((a) => Math.min(data.length - 1, Math.max(0, (a ?? data.length - 1) + (e.key === "ArrowLeft" ? -1 : 1)))); }
            if (e.key === "Home") setAktif(0);
            if (e.key === "End") setAktif(data.length - 1);
          }}>
          {/* pita zona batas */}
          {maks != null && <rect x={m.k} y={m.a} width={lp} height={Math.max(0, yJ(maks) - m.a)} fill={WARNA_ZONA.tinggi} opacity={mini ? 0.06 : 0.08} />}
          <rect x={m.k} y={maks != null ? yJ(maks) : m.a} width={lp} height={Math.max(0, (min != null ? yJ(min) : m.a + tp) - (maks != null ? yJ(maks) : m.a))} fill={WARNA_ZONA.normal} opacity={min == null && maks == null ? 0 : mini ? 0.07 : 0.07} />
          {min != null && <rect x={m.k} y={yJ(min)} width={lp} height={Math.max(0, m.a + tp - yJ(min))} fill={WARNA_ZONA.rendah} opacity={mini ? 0.06 : 0.08} />}
          {!mini && skala.ticks.map((v) => (
            <g key={v}>
              <line x1={m.k} x2={m.k + lp} y1={y(v)} y2={y(v)} stroke={TINTA.grid} strokeWidth={1} shapeRendering="crispEdges" />
              <text x={m.k - 6} y={y(v)} dy="0.32em" textAnchor="end" fontSize={11} fill={TINTA.redup} className="tabular-nums">{v.toLocaleString("id-ID")}</text>
            </g>
          ))}
          {!mini && xt?.hasil.map((t) => (
            <text key={t} x={x(t)} y={H - 8} textAnchor="middle" fontSize={11} fill={TINTA.redup} className="tabular-nums">{labelWaktu(t, xt.langkah)}</text>
          ))}
          {!mini && <line x1={m.k} x2={m.k + lp} y1={m.a + tp} y2={m.a + tp} stroke={TINTA.dasar} strokeWidth={1} shapeRendering="crispEdges" />}
          {/* garis batas */}
          {[["maks", maks, WARNA_ZONA.tinggi], ["min", min, WARNA_ZONA.rendah]].map(([k, v, w]) => v != null && (
            <g key={k as string}>
              <line x1={m.k} x2={m.k + lp} y1={yJ(v as number)} y2={yJ(v as number)} stroke={w as string} strokeOpacity={0.55} strokeWidth={1} shapeRendering="crispEdges" />
              {!mini && <text x={m.k + lp - 4} y={yJ(v as number)} dy={k === "maks" ? "-0.4em" : "1.1em"} textAnchor="end" fontSize={10.5} fill={TINTA.kedua}>{k === "maks" ? "batas atas" : "batas bawah"} {(v as number).toLocaleString("id-ID")} {SATUAN[parameter]}</text>}
            </g>
          ))}
          {jalur.pita && <path d={jalur.pita} fill={warna} opacity={0.14} />}
          <path d={jalur.garis} fill="none" stroke={warna} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {akhir && !p && <circle cx={x(akhir.t)} cy={y(akhir.v!)} r={4} fill={warna} stroke={TINTA.permukaan} strokeWidth={2} />}
          {p && (
            <g pointerEvents="none">
              <line x1={x(p.t)} x2={x(p.t)} y1={m.a} y2={m.a + tp} stroke={TINTA.kedua} strokeWidth={1} shapeRendering="crispEdges" />
              <circle cx={x(p.t)} cy={y(p.v!)} r={4.5} fill={warna} stroke={TINTA.permukaan} strokeWidth={2} />
            </g>
          )}
          {!data.length && !mini && <text x={m.k + lp / 2} y={m.a + tp / 2} textAnchor="middle" fontSize={13} fill={TINTA.redup}>Belum ada data pada rentang ini</text>}
        </svg>
      )}
      {p && (
        <div role="status" className={cn("pointer-events-none absolute z-20 w-max max-w-[15rem] rounded-md bg-navy-950 px-2.5 py-1.5 text-xs leading-snug text-white shadow-lg", mini ? "top-full mt-1" : "top-1")}
          style={{ left: Math.min(Math.max(0, x(p.t) - 70), Math.max(0, W - 150)) }}>
          <div className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-3 rounded" style={{ background: warna }} aria-hidden /><strong className="text-sm tabular-nums">{fNilai(parameter, p.v)}</strong>{agregat && p.vMin != null && p.vMaks != null && <span className="tabular-nums text-navy-200">({p.vMin.toLocaleString("id-ID")}–{p.vMaks.toLocaleString("id-ID")})</span>}</div>
          <div className="text-navy-200">{agregat && !mini ? "rata-rata · " : ""}{tglJamWib(p.t)} WIB</div>
        </div>
      )}
    </div>
  );
}

/** Keterangan pita zona (dipakai di bawah grafik detail). */
export function KeteranganZona({ parameter, adaPita }: { parameter: Parameter; adaPita: boolean }) {
  const item = [
    { w: WARNA_ZONA.rendah, l: "Di bawah batas" }, { w: WARNA_ZONA.normal, l: "Dalam batas aman" }, { w: WARNA_ZONA.tinggi, l: "Di atas batas" },
  ];
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Keterangan grafik">
      <li className="inline-flex items-center gap-1.5"><span className="inline-block h-0.5 w-4 rounded" style={{ background: WARNA_SERI[parameter] }} aria-hidden /> {parameter === "suhu" ? "Suhu" : "Kelembapan"}{adaPita ? " (rata-rata)" : ""}</li>
      {adaPita && <li className="inline-flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-sm" style={{ background: WARNA_SERI[parameter], opacity: 0.25 }} aria-hidden /> Rentang min–maks</li>}
      {item.map((i) => <li key={i.l} className="inline-flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-sm" style={{ background: i.w, opacity: 0.3 }} aria-hidden /> {i.l}</li>)}
    </ul>
  );
}
