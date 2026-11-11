"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatAxis, formatIDRCompact } from "@/lib/utils";

export function BarListChart({ data, label = "Grafik batang nilai per unit kerja" }: { data: { name: string; value: number }[]; label?: string }) {
  if (data.length === 0) return <p className="flex h-72 items-center justify-center text-sm text-muted-foreground">Tidak ada data untuk filter ini.</p>;
  return (
    <div className="h-72 w-full" role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
          <XAxis type="number" tickLine={false} axisLine={false} fontSize={12} stroke="#64748B" tickFormatter={(v) => formatAxis(Number(v))} />
          <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} fontSize={12} stroke="#334155" width={118} />
          <Tooltip cursor={{ fill: "#F1F5F9" }} formatter={(v) => [formatIDRCompact(Number(v)), "Nilai"]} contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0" }} />
          <Bar dataKey="value" fill="#14A0A8" radius={[0, 6, 6, 0]} barSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
