import Link from "next/link";
import { BatteryLow, BatteryMedium, ChevronRight, Radio, Siren } from "lucide-react";
import { Card } from "@/components/ui/card";
import { durasi, fNilai, fRentang, jamWib, LABEL_ALARM, relatif, type JenisAlarm, type Parameter, type Zona } from "@/lib/monitoring";
import type { KartuLokasi } from "@/lib/monitoring-data";
import { GrafikGaris, LencanaStatus, MeterRentang } from "./grafik";
import { WARNA_STATUS } from "@/lib/monitoring-warna";
import { cn } from "@/lib/utils";

const TEKS_ZONA: Record<Exclude<Zona, "normal">, string> = { tinggi: "di atas batas", rendah: "di bawah batas" };

function Nilai({ k, p }: { k: KartuLokasi; p: Parameter }) {
  const v = p === "suhu" ? k.suhu : k.lembap;
  const z = p === "suhu" ? k.status.zonaSuhu : k.status.zonaLembap;
  const [min, maks] = p === "suhu" ? [k.suhuMin, k.suhuMaks] : [k.lembapMin, k.lembapMaks];
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-muted-foreground">{p === "suhu" ? "Suhu" : "Kelembapan"} <span className="font-normal">· batas {fRentang(min, maks, p)}</span></p>
      <p className={cn("mt-0.5 font-bold leading-tight text-navy-800", p === "suhu" ? "text-3xl" : "text-2xl")}>{fNilai(p, v)}</p>
      {z && z !== "normal" && <p className="text-xs font-semibold text-navy-800"><span aria-hidden style={{ color: z === "tinggi" ? "#d03b3b" : "#2a78d6" }}>{z === "tinggi" ? "▲" : "▼"}</span> {TEKS_ZONA[z]}</p>}
      <MeterRentang nilai={v} min={min} maks={maks} parameter={p} />
    </div>
  );
}

export function KartuLokasiPantau({ k }: { k: KartuLokasi }) {
  const adaLembap = k.lembapMin != null || k.lembapMaks != null || k.lembap != null;
  const adaSuhu = k.suhuMin != null || k.suhuMaks != null || k.suhu != null || !adaLembap;
  const pTren: Parameter = adaSuhu ? "suhu" : "lembap";
  const kini = Date.now();
  return (
    <Card className="flex min-w-0 flex-col overflow-hidden border-l-4" style={{ borderLeftColor: WARNA_STATUS[k.status.kunci] }}>
      <div className="flex items-start justify-between gap-2 px-4 pt-4">
        <div className="min-w-0">
          <Link href={`/monitoring/${k.kode}`} className="group inline-flex items-center gap-1 font-semibold leading-snug text-navy-800 hover:text-teal-700">
            <span className="break-words">{k.nama}</span><ChevronRight className="size-4 shrink-0 text-muted-foreground group-hover:text-teal-700" aria-hidden />
          </Link>
          <p className="truncate text-xs text-muted-foreground">{k.kode} · {k.jenis}{k.unit ? ` · ${k.unit}` : ""}</p>
        </div>
        <LencanaStatus kunci={k.status.kunci} />
      </div>
      <div className={cn("grid gap-4 px-4 pt-3", adaSuhu && adaLembap && "grid-cols-2")}>
        {adaSuhu && <Nilai k={k} p="suhu" />}
        {adaLembap && <Nilai k={k} p="lembap" />}
      </div>
      <div className="px-4 pt-3">
        <p className="text-[11px] text-muted-foreground">{pTren === "suhu" ? "Suhu" : "Kelembapan"} 24 jam terakhir</p>
        <GrafikGaris mini tinggi={52} parameter={pTren} judul={`${pTren === "suhu" ? "Suhu" : "Kelembapan"} 24 jam ${k.nama}`}
          titik={k.tren.map((t) => ({ t: t.t, v: pTren === "suhu" ? t.s : t.l }))} min={pTren === "suhu" ? k.suhuMin : k.lembapMin} maks={pTren === "suhu" ? k.suhuMaks : k.lembapMaks}
          dari={kini - 86_400_000} sampai={kini} celahMs={Math.max(45 * 60_000, k.batasPutusMenit * 60_000)} />
      </div>
      {k.alarmTerbuka.length > 0 && (
        <ul className="mx-4 mt-2 grid gap-1">
          {k.alarmTerbuka.map((a) => (
            <li key={a.id} className="flex items-start gap-1.5 rounded-md bg-red-50 px-2 py-1 text-xs text-red-900">
              <Siren className="mt-px size-3.5 shrink-0 text-red-600" aria-hidden />
              <span><strong>{LABEL_ALARM[a.jenis as JenisAlarm] ?? a.jenis}</strong> sejak {jamWib(a.mulai)} ({durasi(kini - Date.parse(a.mulai))}){a.puncak != null ? ` · puncak ${fNilai(a.jenis.startsWith("suhu") ? "suhu" : "lembap", a.puncak)}` : ""}{a.diakui ? " · sudah diakui" : ""}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 border-t px-4 py-2.5 text-xs text-muted-foreground">
        <span>Diperbarui {relatif(k.status.menitSejak)}</span>
        {k.sensor ? (
          <>
            <span className="inline-flex items-center gap-1"><Radio className="size-3.5" aria-hidden /> {k.sensor.serial}</span>
            {k.sensor.baterai != null && (
              <span className={cn("inline-flex items-center gap-1", k.sensor.baterai < 20 && "font-semibold text-red-700")}>
                {k.sensor.baterai < 20 ? <BatteryLow className="size-3.5" aria-hidden /> : <BatteryMedium className="size-3.5" aria-hidden />} {Math.round(k.sensor.baterai)}%{k.sensor.baterai < 20 ? " (lemah)" : ""}
              </span>
            )}
          </>
        ) : <span>Belum ada sensor terpasang</span>}
      </div>
    </Card>
  );
}
