import Link from "next/link";
import { ChevronLeft, ChevronRight, CircleDashed, ClipboardCheck, Siren } from "lucide-react";
import { arahAlarm, fNilai, LABEL_ALARM, parameterAlarm, type JenisAlarm } from "@/lib/monitoring";
import type { HariRingkas } from "@/lib/monitoring-data";
import { cn } from "@/lib/utils";

const NAMA_HARI = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const fmtBulan = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "UTC" });
const geserBulan = (b: string, d: number) => { const [t, m] = b.split("-").map(Number); const x = new Date(Date.UTC(t, m - 1 + d, 1)); return x.toISOString().slice(0, 7); };

/** Nilai min/maks harian; nilai yang memicu alarm hari itu ditandai ikon ▲/▼ + tebal (bukan warna saja). */
function MinMaks({ h, p, ringkas }: { h: HariRingkas; p: "suhu" | "lembap"; ringkas?: boolean }) {
  const [mn, mk] = p === "suhu" ? [h.sMin, h.sMaks] : [h.lMin, h.lMaks];
  if (mn == null || mk == null) return null;
  const atas = h.alarm.some((j) => parameterAlarm(j) === p && arahAlarm(j) === "tinggi");
  const bawah = h.alarm.some((j) => parameterAlarm(j) === p && arahAlarm(j) === "rendah");
  const f = (v: number) => (ringkas ? `${v.toLocaleString("id-ID", { maximumFractionDigits: 1 })}${p === "suhu" ? "°" : "%"}` : fNilai(p, v));
  return (
    <span className="block leading-tight tabular-nums">
      <span className={cn(bawah && "font-bold text-navy-900")}>{bawah && <span aria-hidden style={{ color: "#2a78d6" }}>▼</span>}{f(mn)}</span>
      <span className="text-muted-foreground"> / </span>
      <span className={cn(atas && "font-bold text-navy-900")}>{atas && <span aria-hidden style={{ color: "#d03b3b" }}>▲</span>}{f(mk)}</span>
    </span>
  );
}

function TandaInspeksi({ h }: { h: HariRingkas }) {
  return (
    <span className="inline-flex gap-1">
      {(["Pagi", "Sore"] as const).map((s) => {
        const i = h.inspeksi.find((x) => x.sesi === s);
        return (
          <span key={s} title={i ? `Inspeksi ${s.toLowerCase()}${i.oleh ? ` oleh ${i.oleh}` : ""}: ${fNilai("suhu", i.suhu)}` : `Inspeksi ${s.toLowerCase()} belum`}
            className={cn("inline-flex items-center gap-0.5 rounded px-1 text-[10px] font-semibold", i ? "bg-emerald-50 text-emerald-800" : "bg-muted text-muted-foreground")}>
            {i ? <ClipboardCheck className="size-3" aria-hidden /> : <CircleDashed className="size-3" aria-hidden />}{s[0]}
            <span className="sr-only">{i ? ` ${s} tercatat` : ` ${s} belum`}</span>
          </span>
        );
      })}
    </span>
  );
}

export function KalenderHarian({ hari, bulan, hariIni, adaSuhu, adaLembap, href }: {
  hari: HariRingkas[]; bulan: string; hariIni: string; adaSuhu: boolean; adaLembap: boolean; href: (bulan: string) => string;
}) {
  const [t, m] = bulan.split("-").map(Number);
  const jumlahHari = new Date(Date.UTC(t, m, 0)).getUTCDate();
  const awal = (new Date(Date.UTC(t, m - 1, 1)).getUTCDay() + 6) % 7; // Senin = 0
  const peta = new Map(hari.map((h) => [h.tgl, h]));
  const sel: (string | null)[] = [...Array(awal).fill(null), ...Array.from({ length: jumlahHari }, (_, i) => `${bulan}-${String(i + 1).padStart(2, "0")}`)];
  const berikut = geserBulan(bulan, 1);
  const bolehMaju = berikut <= hariIni.slice(0, 7);
  const kosong = (h: HariRingkas | undefined) => !h || (h.jumlah === 0 && h.alarm.length === 0 && h.inspeksi.length === 0);
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2 print:hidden">
        <Link href={href(geserBulan(bulan, -1))} scroll={false} className="inline-flex h-9 items-center gap-1 rounded-md border px-3 text-sm font-medium hover:bg-muted"><ChevronLeft className="size-4" /> Sebelumnya</Link>
        <p className="font-semibold capitalize text-navy-800">{fmtBulan.format(new Date(Date.UTC(t, m - 1, 1)))}</p>
        <Link href={href(berikut)} scroll={false} aria-disabled={!bolehMaju} className={cn("inline-flex h-9 items-center gap-1 rounded-md border px-3 text-sm font-medium hover:bg-muted", !bolehMaju && "pointer-events-none opacity-40")}>Berikutnya <ChevronRight className="size-4" /></Link>
      </div>
      <p className="mb-2 hidden font-semibold capitalize text-navy-800 print:block">{fmtBulan.format(new Date(Date.UTC(t, m - 1, 1)))}</p>

      {/* kisi kalender (layar ≥ sm & cetak) */}
      <div className="hidden sm:block print:block">
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted-foreground">{NAMA_HARI.map((d) => <span key={d}>{d}</span>)}</div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {sel.map((tgl, i) => {
            if (!tgl) return <span key={`k${i}`} />;
            const h = peta.get(tgl);
            const alarm = (h?.alarm.length ?? 0) > 0;
            return (
              <div key={tgl} className={cn("min-h-[4.75rem] rounded-md border p-1.5 text-[11px]", alarm ? "border-2 border-red-500 bg-red-50/40" : "bg-card", tgl === hariIni && "ring-2 ring-teal-500", tgl > hariIni && "opacity-40")}
                aria-label={`${tgl}${alarm ? `, alarm: ${h!.alarm.map((j) => LABEL_ALARM[j as JenisAlarm] ?? j).join(", ")}` : ""}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-navy-800">{Number(tgl.slice(8))}</span>
                  {alarm && <Siren className="size-3.5 text-red-600" aria-hidden />}
                </div>
                {h && !kosong(h) && (
                  <div className="mt-0.5 grid gap-0.5">
                    {adaSuhu && <MinMaks h={h} p="suhu" ringkas />}
                    {adaLembap && <MinMaks h={h} p="lembap" ringkas />}
                    <TandaInspeksi h={h} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* daftar (ponsel) */}
      <ul className="grid gap-1.5 sm:hidden print:hidden">
        {sel.filter((x): x is string => !!x && !kosong(peta.get(x))).reverse().map((tgl) => {
          const h = peta.get(tgl)!;
          const alarm = h.alarm.length > 0;
          return (
            <li key={tgl} className={cn("grid grid-cols-[3.5rem_1fr_auto] items-center gap-2 rounded-md border p-2 text-xs", alarm && "border-2 border-red-500")}>
              <span className="font-semibold text-navy-800">{Number(tgl.slice(8))} {fmtBulan.format(new Date(`${tgl}T00:00:00Z`)).split(" ")[0].slice(0, 3)}</span>
              <span className="min-w-0">
                {adaSuhu && <MinMaks h={h} p="suhu" />}
                {adaLembap && <MinMaks h={h} p="lembap" />}
                {alarm && <span className="flex items-center gap-1 text-red-800"><Siren className="size-3" aria-hidden /> {h.alarm.map((j) => LABEL_ALARM[j as JenisAlarm] ?? j).join(", ")}</span>}
              </span>
              <TandaInspeksi h={h} />
            </li>
          );
        })}
        {sel.every((x) => !x || kosong(peta.get(x))) && <li className="py-4 text-center text-sm text-muted-foreground">Belum ada data bulan ini.</li>}
      </ul>
      <p className="mt-2 text-xs text-muted-foreground">Setiap hari: suhu min / maks{adaLembap ? " dan kelembapan min / maks" : ""}. Garis merah = ada alarm; ▲/▼ = nilai yang melewati batas atas/bawah. P/S = inspeksi pagi/sore.</p>
    </div>
  );
}
