import Link from "next/link";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Battery, BatteryLow, BatteryMedium, BatteryFull, Building2, CheckCircle2, CircleSlash, Refrigerator, Siren, Snowflake, Thermometer, TriangleAlert, WifiOff, type LucideIcon } from "lucide-react";
import { durasi, fAngka, fNilai, LABEL_ALARM, relatif, SATUAN, type JenisAlarm, type KunciStatusPantau, type Parameter, type Zona } from "@/lib/monitoring";
import type { KartuLokasi } from "@/lib/monitoring-data";
import { WARNA_STATUS, WARNA_ZONA } from "@/lib/monitoring-warna";
import { cn } from "@/lib/utils";

/**
 * Kartu titik pantau bergaya panel logger: ikon jenis + nama + pil status, nilai besar dengan satuan kecil & panah tren,
 * penggeser rentang (pita hijau = batas aman, titik = nilai sekarang), "x mnt lalu", serta indikator sinyal & baterai.
 * Kelembapan (bila ada) tampil sebagai gauge setengah lingkaran.
 */

const IKON_JENIS: Record<string, LucideIcon> = { Kulkas: Refrigerator, "Kulkas darah": Refrigerator, Freezer: Snowflake, Ruangan: Building2, "Ruang operasi": Building2 };
const PIL: Record<KunciStatusPantau, { label: string; ikon: LucideIcon }> = {
  normal: { label: "Dalam batas", ikon: CheckCircle2 },
  luar: { label: "Di luar batas", ikon: TriangleAlert },
  alarm: { label: "Alarm", ikon: Siren },
  putus: { label: "Terputus", ikon: WifiOff },
  belum: { label: "Belum ada data", ikon: CircleSlash },
  nonaktif: { label: "Nonaktif", ikon: CircleSlash },
};

export function PilStatus({ kunci }: { kunci: KunciStatusPantau }) {
  const p = PIL[kunci], w = WARNA_STATUS[kunci], Ikon = p.ikon;
  return (
    <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium text-navy-800" style={{ background: `${w}1f`, boxShadow: `inset 0 0 0 1px ${w}55` }}>
      <Ikon className="size-3.5" style={{ color: w }} aria-hidden /> {p.label}
    </span>
  );
}

/** Rentang tampilan penggeser: batas aman di tengah, sisi kiri/kanan untuk nilai di luar batas. */
function domain(v: number | null, min: number | null, maks: number | null): [number, number] {
  let lo = min ?? (maks != null ? maks - 10 : (v ?? 0) - 5), hi = maks ?? (min != null ? min + 10 : (v ?? 0) + 5);
  const pad = Math.max((hi - lo) * 0.45, 1);
  lo -= pad; hi += pad;
  if (v != null) { lo = Math.min(lo, v - pad * 0.2); hi = Math.max(hi, v + pad * 0.2); }
  return [lo, hi];
}

export function Penggeser({ v, min, maks, zona, label }: { v: number | null; min: number | null; maks: number | null; zona: Zona | null; label: string }) {
  const [lo, hi] = domain(v, min, maks);
  const pos = (x: number) => `${((x - lo) / (hi - lo)) * 100}%`;
  const a = min ?? lo, b = maks ?? hi;
  return (
    <div className="relative mt-3 h-4" role="img" aria-label={label}>
      <span className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-slate-200" />
      <span className="absolute top-1/2 h-1.5 -translate-y-1/2 bg-green-200" style={{ left: pos(a), width: `calc(${pos(b)} - ${pos(a)})` }} />
      {min != null && <span className="absolute top-1/2 h-4 w-0.5 -translate-y-1/2 rounded bg-slate-400" style={{ left: pos(min) }} />}
      {maks != null && <span className="absolute top-1/2 h-4 w-0.5 -translate-y-1/2 rounded bg-slate-400" style={{ left: pos(maks) }} />}
      {v != null && (
        <span className="logger-titik absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white"
          style={{ left: pos(v), background: WARNA_ZONA[zona ?? "normal"] }} />
      )}
    </div>
  );
}

/** Gauge setengah lingkaran (kelembapan). */
function Gauge({ v, min, maks, zona }: { v: number | null; min: number | null; maks: number | null; zona: Zona | null }) {
  const R = 30, cx = 36, cy = 36;
  const titik = (f: number) => { const sud = Math.PI * (1 - Math.min(1, Math.max(0, f))); return [cx + R * Math.cos(sud), cy - R * Math.sin(sud)]; };
  const busur = (f0: number, f1: number) => { const [x0, y0] = titik(f0), [x1, y1] = titik(f1); return `M${x0} ${y0} A${R} ${R} 0 0 1 ${x1} ${y1}`; };
  const f = (x: number) => x / 100;
  const [nx, ny] = titik(f(v ?? 0));
  return (
    <svg viewBox="0 0 72 42" className="h-12 w-[4.5rem] shrink-0" aria-hidden>
      <path d={busur(0, 1)} stroke="#e2e8f0" strokeWidth="7" fill="none" strokeLinecap="round" />
      <path d={busur(f(min ?? 0), f(maks ?? 100))} stroke="#bbf7d0" strokeWidth="7" fill="none" />
      {v != null && <>
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#1e293b" strokeWidth="2" strokeLinecap="round" className="logger-jarum" style={{ transformOrigin: `${cx}px ${cy}px` }} />
        <circle cx={cx} cy={cy} r="3" fill={WARNA_ZONA[zona ?? "normal"]} />
      </>}
    </svg>
  );
}

function Tren({ arah }: { arah: "naik" | "turun" | "datar" | null }) {
  if (!arah) return null;
  const Ikon = arah === "naik" ? ArrowUpRight : arah === "turun" ? ArrowDownRight : ArrowRight;
  return <Ikon className="size-6 text-navy-800" aria-label={arah === "naik" ? "naik" : arah === "turun" ? "turun" : "stabil"} />;
}

function Sinyal({ rssi }: { rssi: number | null }) {
  const n = rssi == null ? 0 : rssi >= -60 ? 4 : rssi >= -70 ? 3 : rssi >= -80 ? 2 : 1;
  return (
    <span className="inline-flex items-end gap-px" title={rssi != null ? `Sinyal ${rssi} dBm` : "Sinyal tidak diketahui"} aria-label={`Sinyal ${n} dari 4`}>
      {[1, 2, 3, 4].map((i) => <span key={i} className={cn("w-[3px] rounded-sm", i <= n ? (n <= 1 ? "bg-red-500" : "bg-green-600") : "bg-slate-300")} style={{ height: 3 + i * 2.5 }} />)}
    </span>
  );
}

function Baterai({ persen }: { persen: number | null }) {
  if (persen == null) return <Battery className="size-4 text-slate-300" aria-label="Baterai tidak diketahui" />;
  const Ikon = persen < 20 ? BatteryLow : persen < 60 ? BatteryMedium : BatteryFull;
  return <span title={`Baterai ${Math.round(persen)}%`} className="inline-flex"><Ikon className={cn("size-4", persen < 20 ? "text-red-600" : "text-green-600")} aria-label={`Baterai ${Math.round(persen)}%`} /></span>;
}

function arahTren(k: KartuLokasi, p: Parameter, kini: number) {
  const v = p === "suhu" ? k.suhu : k.lembap;
  if (v == null) return null;
  const lalu = [...k.tren].reverse().find((t) => t.t <= kini - 30 * 60_000 && (p === "suhu" ? t.s : t.l) != null);
  if (!lalu) return "datar" as const;
  const d = v - (p === "suhu" ? lalu.s! : lalu.l!);
  const ambang = p === "suhu" ? 0.3 : 2;
  return d > ambang ? ("naik" as const) : d < -ambang ? ("turun" as const) : ("datar" as const);
}

export function KartuLokasiPantau({ k }: { k: KartuLokasi }) {
  const adaLembap = k.lembapMin != null || k.lembapMaks != null || k.lembap != null;
  const adaSuhu = k.suhuMin != null || k.suhuMaks != null || k.suhu != null || !adaLembap;
  const utama: Parameter = adaSuhu ? "suhu" : "lembap";
  const kini = Date.now();
  const v = utama === "suhu" ? k.suhu : k.lembap;
  const [min, maks] = utama === "suhu" ? [k.suhuMin, k.suhuMaks] : [k.lembapMin, k.lembapMaks];
  const z = utama === "suhu" ? k.status.zonaSuhu : k.status.zonaLembap;
  const Ikon = IKON_JENIS[k.jenis] ?? Thermometer;
  const peringatan = k.status.kunci === "alarm" || k.status.kunci === "luar";
  return (
    <Link href={`/monitoring/${k.kode}`}
      className={cn("logger-kartu group flex min-w-0 flex-col rounded-2xl border bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
        peringatan ? "border-red-300 ring-1 ring-red-200" : "border-slate-200")}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-slate-200 text-navy-700"><Ikon className="size-4" aria-hidden /></span>
          <div className="min-w-0">
            <p className="line-clamp-2 font-medium leading-tight text-navy-900 group-hover:text-teal-700">{k.nama}</p>
            <p className="truncate text-[11px] text-muted-foreground">{k.kode}{k.unit ? ` · ${k.unit}` : ""}</p>
          </div>
        </div>
        <PilStatus kunci={k.status.kunci} />
      </div>

      <div className="mt-3 flex items-end justify-between gap-2">
        <p className="flex items-start gap-1 leading-none text-navy-900">
          <span className="text-[2.75rem] font-medium tabular-nums tracking-tight [font-variant-numeric:normal]">{v == null ? "–" : fAngka(v, utama === "suhu" ? 1 : 0).replace("-", "−")}</span>
          <span className="mt-auto pb-1 text-lg text-navy-700">{SATUAN[utama]}</span>
          <span className="ml-1 self-center"><Tren arah={arahTren(k, utama, kini)} /></span>
        </p>
        {adaSuhu && adaLembap && (
          <div className="flex flex-col items-center">
            <Gauge v={k.lembap} min={k.lembapMin} maks={k.lembapMaks} zona={k.status.zonaLembap} />
            <span className="text-xs font-medium tabular-nums text-navy-800">{fNilai("lembap", k.lembap)}</span>
          </div>
        )}
      </div>
      <Penggeser v={v} min={min} maks={maks} zona={z} label={`${utama === "suhu" ? "Suhu" : "Kelembapan"} ${fNilai(utama, v)}, batas ${min ?? "–"} sampai ${maks ?? "–"} ${SATUAN[utama]}`} />

      {k.alarmTerbuka.length > 0 && (
        <ul className="mt-3 grid gap-1">
          {k.alarmTerbuka.slice(0, 2).map((a) => (
            <li key={a.id} className="flex items-start gap-1.5 rounded-md bg-red-50 px-2 py-1 text-xs text-red-900">
              <Siren className="mt-px size-3.5 shrink-0 text-red-600" aria-hidden />
              <span><strong>{LABEL_ALARM[a.jenis as JenisAlarm] ?? a.jenis}</strong> · {durasi(kini - Date.parse(a.mulai))}{a.diakui ? " · diakui" : ""}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 pt-3 text-xs text-muted-foreground">
        <span>{relatif(k.status.menitSejak)}</span>
        {k.sensor ? <span className="flex items-center gap-1.5"><Sinyal rssi={k.sensor.sinyal} /><Baterai persen={k.sensor.baterai} /></span> : <span>tanpa sensor</span>}
      </div>
    </Link>
  );
}
