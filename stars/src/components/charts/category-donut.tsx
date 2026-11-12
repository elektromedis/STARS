"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatRupiah } from "@/lib/utils";

export const CHART_COLORS = ["#0B2545", "#14A0A8", "#25507F", "#5CD0D5", "#6F95C2", "#A9C0DD"];

export function CategoryDonut({ data }: { data: { name: string; value: number }[] }) {
  if (data.length === 0) return <p className="flex h-48 items-center justify-center text-sm text-muted-foreground">Tidak ada data untuk filter ini.</p>;
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row lg:flex-col xl:flex-row">
      <div className="h-48 w-48 shrink-0" role="img" aria-label="Distribusi nilai per kategori alat">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={52} outerRadius={84} paddingAngle={2} stroke="none">
              {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v) => formatRupiah(Number(v))} contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0" }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="w-full space-y-2 text-sm">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2"><span className="size-2.5 shrink-0 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />{d.name}</span>
            <span className="whitespace-nowrap tabular-nums text-muted-foreground">{formatRupiah(d.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
