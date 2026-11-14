import { formatNumber } from "@/lib/utils";

/** Daftar batang mendatar sederhana (tanpa JS) untuk hitungan per kategori; batang tumbuh saat tampil. */
export function BatangHitung({ data, warna = "bg-teal-500" }: { data: { label: string; nilai: number }[]; warna?: string }) {
  const maks = Math.max(1, ...data.map((d) => d.nilai));
  if (data.every((d) => d.nilai === 0)) return <p className="py-6 text-center text-sm text-muted-foreground">Belum ada data.</p>;
  return (
    <ul className="space-y-2">
      {data.map((d) => (
        <li key={d.label} className="grid grid-cols-[7rem_1fr_2.5rem] items-center gap-2 text-sm">
          <span className="truncate text-muted-foreground">{d.label}</span>
          <span className="h-3 overflow-hidden rounded-full bg-muted"><span className={`selisih-isi block h-full rounded-full ${warna}`} style={{ width: `${(d.nilai / maks) * 100}%` }} /></span>
          <span className="text-right font-medium tabular-nums text-navy-800">{formatNumber(d.nilai)}</span>
        </li>
      ))}
    </ul>
  );
}
