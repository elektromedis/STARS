/**
 * Grafik ringan (HTML/CSS, tanpa pustaka) untuk menu Pengujian dan Kalibrasi.
 * Mengikuti spesifikasi dataviz: batang ≤ 24 px, ujung data membulat 4 px & rata di garis dasar, celah 2 px antarsegmen,
 * teks memakai tinta teks (bukan warna data), tooltip saat diarahkan / difokus, status selalu dengan ikon + label.
 * Warna: status tetap (baik/peringatan/kritis + abu netral); satu seri = teal; dua seri = teal + ungu (lolos uji CVD).
 */
import { AlertTriangle, CheckCircle2, CircleDashed, MinusCircle, XCircle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KunciStatus } from "@/lib/kalibrasi-data";

export const WARNA_SERI = { satu: "#14A0A8", Kalibrasi: "#14A0A8", Pengujian: "#6250d6" } as const;
export const STATUS_VIS: Record<KunciStatus, { label: string; warna: string; teks: string; ikon: LucideIcon }> = {
  bermasalah: { label: "Kedaluwarsa / tidak laik", warna: "#d03b3b", teks: "#ffffff", ikon: XCircle },
  segera: { label: "Habis ≤ 30 hari", warna: "#fab219", teks: "#0b0b0b", ikon: AlertTriangle },
  berlaku: { label: "Berlaku", warna: "#0ca30c", teks: "#ffffff", ikon: CheckCircle2 },
  "tanpa-batas": { label: "Tanpa masa berlaku", warna: "#898781", teks: "#ffffff", ikon: MinusCircle },
  belum: { label: "Belum pernah", warna: "#e1e0d9", teks: "#0b0b0b", ikon: CircleDashed },
};
const URUT_STATUS: KunciStatus[] = ["bermasalah", "segera", "berlaku", "tanpa-batas", "belum"];
const angka = (n: number) => n.toLocaleString("id-ID");
const persen = (n: number, total: number) => `${total ? ((n / total) * 100).toFixed(n / total < 0.1 ? 1 : 0).replace(".", ",") : 0}%`;

/**
 * Tooltip CSS: muncul saat induk `group` diarahkan atau difokus keyboard.
 * display:none saat tersembunyi (bukan opacity 0) agar tooltip di tepi kanan tidak melebarkan halaman di ponsel.
 */
function Tip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span role="tooltip" className={cn("pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-max max-w-[14rem] -translate-x-1/2 rounded-md bg-navy-950 px-2.5 py-1.5 text-xs font-medium leading-snug text-white shadow-lg group-hover:block group-focus-visible:block", className)}>
      {children}
    </span>
  );
}

/** Lencana status (ikon + label + warna). */
export function LencanaStatus({ kunci, label }: { kunci: KunciStatus; label?: string }) {
  const s = STATUS_VIS[kunci];
  const Ikon = s.ikon;
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-navy-800">
      <Ikon className="size-3.5 shrink-0" style={{ color: kunci === "belum" ? "#898781" : s.warna }} aria-hidden /> {label ?? s.label}
    </span>
  );
}

/** Batang tersegmen tinggi: satu keseluruhan (semua alat) dibagi per status. */
export function BatangStatus({ hitung, total }: { hitung: Record<KunciStatus, number>; total: number }) {
  const bagian = URUT_STATUS.map((k) => ({ k, n: hitung[k] })).filter((b) => b.n > 0);
  if (total === 0) return <p className="py-6 text-center text-sm text-muted-foreground">Belum ada alat.</p>;
  return (
    <div className="grid gap-3">
      <div className="flex h-7 gap-0.5" role="img" aria-label={`Status ${angka(total)} alat: ${bagian.map((b) => `${STATUS_VIS[b.k].label} ${angka(b.n)} (${persen(b.n, total)})`).join(", ")}`}>
        {bagian.map((b) => {
          const s = STATUS_VIS[b.k];
          const lebar = (b.n / total) * 100;
          return (
            <span key={b.k} tabIndex={0} aria-label={`${s.label}: ${angka(b.n)} alat (${persen(b.n, total)})`}
              className="group relative flex min-w-[3px] items-center rounded px-1.5 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-800"
              style={{ width: `${lebar}%`, background: s.warna, color: s.teks }}>
              {lebar >= 9 && <span className="truncate">{persen(b.n, total)}</span>}
              <Tip>{s.label}: {angka(b.n)} alat · {persen(b.n, total)}</Tip>
            </span>
          );
        })}
      </div>
      <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground" aria-label="Keterangan">
        {URUT_STATUS.map((k) => {
          const s = STATUS_VIS[k];
          const Ikon = s.ikon;
          return (
            <li key={k} className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm" style={{ background: s.warna }} aria-hidden />
              <Ikon className="size-3.5" aria-hidden /> {s.label} <strong className="tabular-nums text-navy-800">{angka(hitung[k])}</strong>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Kolom satu seri (mis. jumlah alat jatuh tempo per bulan). Nilai terbesar diberi label; sisanya lewat tooltip. */
export function KolomSatuSeri({ data, satuan, tinggi = 160 }: { data: { kunci: string; label: string; jumlah: number }[]; satuan: string; tinggi?: number }) {
  const maks = Math.max(0, ...data.map((d) => d.jumlah));
  if (maks === 0) return <p className="py-10 text-center text-sm text-muted-foreground">Tidak ada {satuan} dalam rentang ini.</p>;
  const iMaks = data.findIndex((d) => d.jumlah === maks);
  return (
    <div className="grid gap-1">
      <div className="relative flex items-end gap-1 border-b border-[#c3c2b7] px-1" style={{ height: tinggi }}>
        <span className="pointer-events-none absolute inset-x-0 top-0 border-t border-[#e1e0d9]" aria-hidden />
        <span className="pointer-events-none absolute -top-2 right-0 bg-card pl-1 text-[10px] tabular-nums text-muted-foreground" aria-hidden>{angka(maks)}</span>
        {data.map((d, i) => (
          <div key={d.kunci} tabIndex={0} aria-label={`${d.label}: ${angka(d.jumlah)} ${satuan}`}
            className="group relative flex h-full min-w-0 flex-1 items-end justify-center rounded-sm hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400">
            {d.jumlah > 0 && (
              <span className="relative w-full max-w-6 rounded-t" style={{ height: `${(d.jumlah / maks) * 100}%`, minHeight: 3, background: WARNA_SERI.satu }}>
                {i === iMaks && <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-semibold tabular-nums text-navy-800">{angka(d.jumlah)}</span>}
              </span>
            )}
            <Tip>{d.label}: {angka(d.jumlah)} {satuan}</Tip>
          </div>
        ))}
      </div>
      <div className="flex gap-1 px-1">
        {/* label bulan: di ponsel hanya huruf bulan (Jan, Feb, …) agar 12 kolom muat */}
        {data.map((d) => <span key={d.kunci} className="min-w-0 flex-1 truncate text-center text-[10px] text-muted-foreground"><span className="sm:hidden">{d.label.split(" ")[0]}</span><span className="hidden sm:inline">{d.label}</span></span>)}
      </div>
    </div>
  );
}

/** Batang mendatar berperingkat (satu seri), nilai di ujung batang. */
export function BatangPeringkat({ data, satuan }: { data: { nama: string; jumlah: number }[]; satuan: string }) {
  const maks = Math.max(1, ...data.map((d) => d.jumlah));
  if (data.length === 0) return <p className="py-10 text-center text-sm text-muted-foreground">Belum ada data.</p>;
  return (
    <ul className="grid gap-2.5">
      {data.map((d) => (
        <li key={d.nama} tabIndex={0} aria-label={`${d.nama}: ${angka(d.jumlah)} ${satuan}`} className="group relative grid gap-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400">
          <span className="truncate text-sm text-navy-800" title={d.nama}>{d.nama}</span>
          <span className="flex items-center gap-2">
            <span className="h-3.5 rounded-r" style={{ width: `${Math.max(1, (d.jumlah / maks) * 88)}%`, background: WARNA_SERI.satu }} />
            <span className="text-xs font-semibold tabular-nums text-navy-800">{angka(d.jumlah)}</span>
          </span>
          <Tip className="left-1/3">{d.nama}: {angka(d.jumlah)} {satuan}</Tip>
        </li>
      ))}
    </ul>
  );
}

/** Kolom bertumpuk dua seri (Kalibrasi / Pengujian) per tahun, dengan keterangan & total di puncak. */
export function KolomTahun({ data }: { data: { tahun: number; Kalibrasi: number; Pengujian: number }[] }) {
  const maks = Math.max(1, ...data.map((d) => d.Kalibrasi + d.Pengujian));
  if (data.length === 0) return <p className="py-10 text-center text-sm text-muted-foreground">Belum ada catatan.</p>;
  const seri = ["Kalibrasi", "Pengujian"] as const;
  return (
    <div className="grid gap-2">
      <ul className="flex gap-4 text-xs text-muted-foreground" aria-label="Keterangan">
        {seri.map((s) => <li key={s} className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: WARNA_SERI[s] }} aria-hidden /> {s}</li>)}
      </ul>
      <div className="flex items-end gap-3 border-b border-[#c3c2b7] px-2 pt-6" style={{ height: 180 }}>
        {data.map((d) => {
          const jumlah = d.Kalibrasi + d.Pengujian;
          return (
            <div key={d.tahun} tabIndex={0} aria-label={`${d.tahun}: ${angka(d.Kalibrasi)} kalibrasi, ${angka(d.Pengujian)} pengujian`}
              className="group relative flex h-full flex-1 flex-col items-center justify-end rounded-sm hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400">
              <span className="mb-1 text-xs font-semibold tabular-nums text-navy-800">{angka(jumlah)}</span>
              <span className="flex w-full max-w-6 flex-col-reverse gap-0.5" style={{ height: `${(jumlah / maks) * 100}%` }}>
                {seri.map((s, i) => d[s] > 0 && (
                  <span key={s} className={cn(i === seri.length - 1 || !d[seri[1]] ? "rounded-t" : "")} style={{ flexGrow: d[s], minHeight: 2, background: WARNA_SERI[s] }} />
                ))}
              </span>
              <Tip>{d.tahun}: {angka(d.Kalibrasi)} kalibrasi · {angka(d.Pengujian)} pengujian</Tip>
            </div>
          );
        })}
      </div>
      <div className="flex gap-3 px-2">{data.map((d) => <span key={d.tahun} className="flex-1 text-center text-xs text-muted-foreground">{d.tahun}</span>)}</div>
    </div>
  );
}

/** Batang tipis 8 px per baris (komposisi status satu unit). */
export function BatangTipis({ hitung, total }: { hitung: Record<KunciStatus, number>; total: number }) {
  return (
    <span className="flex h-2 w-full gap-0.5" role="img" aria-label={URUT_STATUS.filter((k) => hitung[k]).map((k) => `${STATUS_VIS[k].label} ${hitung[k]}`).join(", ")}>
      {URUT_STATUS.filter((k) => hitung[k] > 0).map((k) => (
        <span key={k} className="rounded-full" style={{ width: `${(hitung[k] / Math.max(1, total)) * 100}%`, background: STATUS_VIS[k].warna, minWidth: 3 }} />
      ))}
    </span>
  );
}
