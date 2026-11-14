"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipProps } from "recharts";
import { formatAxis, formatRupiah } from "@/lib/utils";
import { CHART_COLORS } from "./category-donut";

type Baris = Record<string, number | string>;
const persen = (a: number, b: number) => (b > 0 ? `${((a / b) * 100).toFixed(1).replace(".", ",")}%` : "–");

function Tip({ active, payload, label, tahapKeys }: TooltipProps<number, string> & { tahapKeys: string[] }) {
  if (!active || !payload?.length) return null;
  const r = payload[0].payload as Baris;
  const ada = tahapKeys.filter((t) => r[t] != null);
  return (
    <div className="w-[15rem] max-w-[calc(100vw-5rem)] rounded-lg border bg-white p-3 text-xs shadow-lg">
      <p className="mb-2 text-sm font-semibold text-navy-800">{label}</p>
      <div className="grid gap-2">
        {ada.map((t) => {
          const pagu = Number(r[t]), serap = Number(r[`${t}__serap`] ?? 0), sel = Number(r[`${t}__selisih`] ?? pagu - serap);
          const i = tahapKeys.indexOf(t);
          return (
            <div key={t}>
              <p className="flex items-center gap-1.5 font-medium text-navy-800"><span className="size-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />{t}</p>
              <dl className="mt-0.5 grid grid-cols-[auto_1fr] gap-x-3 pl-3.5 tabular-nums text-slate-600">
                <dt>Pagu</dt><dd className="text-right">{formatRupiah(pagu)}</dd>
                <dt>Serapan</dt><dd className="text-right">{formatRupiah(serap)} ({persen(serap, pagu)})</dd>
                <dt className="font-semibold text-navy-800">Selisih</dt><dd className="text-right font-semibold text-navy-800">{formatRupiah(sel)} ({persen(sel, pagu)})</dd>
              </dl>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Perbandingan nilai antar tahun anggaran, satu batang per tahap.
 * Tiap batang = pagu total, dibelah dua: bagian padat = terserap, bagian berarsir = SELISIH (pagu − serapan, belum terserap).
 * Di bawah grafik: ringkasan selisih tahap terakhir tiap tahun. Animasi tumbuh ringan bawaan Recharts (mati bila "kurangi gerakan").
 */
export function TahunChart({ data, tahapKeys }: { data: Baris[]; tahapKeys: string[] }) {
  const gerak = typeof window === "undefined" || !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const ringkas = data.map((r) => {
    const t = [...tahapKeys].reverse().find((k) => r[k] != null);
    if (!t) return null;
    const pagu = Number(r[t]), serap = Number(r[`${t}__serap`] ?? 0);
    return { tahun: String(r.tahun), tahap: t, pagu, serap, selisih: pagu - serap };
  }).filter((x): x is NonNullable<typeof x> => !!x);

  return (
    <div>
      <div className="h-64 w-full overflow-x-clip md:h-72" role="img" aria-label="Grafik nilai anggaran per tahun dan tahap: pagu, serapan, dan selisih">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={4}>
            <defs>
              {tahapKeys.map((k, i) => (
                <pattern key={k} id={`arsir-selisih-${i}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <rect width="6" height="6" fill={CHART_COLORS[i % CHART_COLORS.length]} opacity="0.18" />
                  <line x1="0" y1="0" x2="0" y2="6" stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth="2" opacity="0.55" />
                </pattern>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis dataKey="tahun" tickLine={false} axisLine={false} fontSize={12} stroke="#64748B" />
            <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="#64748B" width={52} tickFormatter={(v) => formatAxis(Number(v))} />
            <Tooltip content={<Tip tahapKeys={tahapKeys} />} cursor={{ fill: "#F1F5F9" }} />
            {tahapKeys.flatMap((k, i) => [
              <Bar key={`${k}-s`} dataKey={`${k}__serap`} stackId={k} name={`${k} · serapan`} fill={CHART_COLORS[i % CHART_COLORS.length]} maxBarSize={36}
                isAnimationActive={gerak} animationDuration={900} animationEasing="ease-out" />,
              <Bar key={`${k}-x`} dataKey={`${k}__selisih`} stackId={k} name={`${k} · selisih`} fill={`url(#arsir-selisih-${i})`} radius={[4, 4, 0, 0]} maxBarSize={36}
                isAnimationActive={gerak} animationBegin={350} animationDuration={900} animationEasing="ease-out" />,
            ])}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* keterangan: warna = tahap; padat = terserap, arsir = selisih */}
      <ul className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-600">
        {tahapKeys.map((k, i) => (
          <li key={k} className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />{k}</li>
        ))}
        <li className="flex items-center gap-1.5"><span className="h-2.5 w-3 rounded-sm bg-slate-500" /> terserap</li>
        <li className="flex items-center gap-1.5">
          <span className="h-2.5 w-3 rounded-sm border border-slate-400" style={{ background: "repeating-linear-gradient(45deg,#94a3b8 0 1.5px,transparent 1.5px 4px)" }} /> selisih (belum terserap)
        </li>
      </ul>

      {ringkas.length > 0 && (
        <div className="mt-3 grid gap-2 border-t pt-3 sm:grid-cols-2 xl:grid-cols-3">
          {ringkas.slice(-3).map((x, n) => {
            const p = x.pagu > 0 ? Math.min(100, (x.serap / x.pagu) * 100) : 0;
            return (
              <div key={x.tahun} className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both rounded-lg bg-slate-50 px-3 py-2 duration-700 motion-reduce:animate-none" style={{ animationDelay: `${300 + n * 120}ms` }}>
                <p className="text-[11px] text-muted-foreground">Selisih {x.tahun} · {x.tahap}</p>
                <p className="text-sm font-bold tabular-nums text-navy-800">{formatRupiah(x.selisih)}</p>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200" aria-hidden>
                  <div className="selisih-isi h-full rounded-full bg-teal-500" style={{ width: `${p}%` }} />
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">Serapan {persen(x.serap, x.pagu)} dari pagu {formatRupiah(x.pagu)}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
