"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatAxis, formatIDRCompact } from "@/lib/utils";
import { CHART_COLORS } from "./category-donut";

/** Perbandingan total nilai antar tahun anggaran, satu batang per tahap. */
export function TahunChart({ data, tahapKeys }: { data: Record<string, number | string>[]; tahapKeys: string[] }) {
  return (
    <div className="h-64 w-full md:h-72" role="img" aria-label="Grafik nilai anggaran per tahun dan tahap">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
          <XAxis dataKey="tahun" tickLine={false} axisLine={false} fontSize={12} stroke="#64748B" />
          <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="#64748B" width={52} tickFormatter={(v) => formatAxis(Number(v))} />
          <Tooltip formatter={(v, name) => [formatIDRCompact(Number(v)), String(name)]} contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0" }} cursor={{ fill: "#F1F5F9" }} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
          {tahapKeys.map((k, i) => (
            <Bar key={k} dataKey={k} name={k} fill={CHART_COLORS[i % CHART_COLORS.length]} radius={[4, 4, 0, 0]} maxBarSize={36} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
