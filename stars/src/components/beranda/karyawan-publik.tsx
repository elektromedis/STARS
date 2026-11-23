import { Bot, ClipboardList, Gauge, LineChart, Wrench, type LucideIcon } from "lucide-react";
import { KARYAWAN, type IdKaryawan } from "@/lib/allies-karyawan";

const IKON: Record<IdKaryawan, { ikon: LucideIcon; warna: string }> = {
  umum: { ikon: Bot, warna: "from-sky-400 to-blue-600" },
  inventaris: { ikon: ClipboardList, warna: "from-amber-400 to-orange-500" },
  pemeliharaan: { ikon: Wrench, warna: "from-emerald-400 to-green-600" },
  kalibrasi: { ikon: Gauge, warna: "from-violet-400 to-purple-600" },
  perencanaan: { ikon: LineChart, warna: "from-rose-400 to-pink-600" },
};

/** Etalase publik: hanya nama dan bidang. Tidak memuat data alat, tugas, atau percakapan. */
export function KaryawanPublik() {
  return (
    <ul className="mx-auto grid min-h-0 w-full max-w-[34rem] flex-1 auto-rows-fr grid-cols-2 gap-2 md:gap-3 lg:h-[24rem] lg:flex-none" aria-label="Tim Karyawan AI">
      {KARYAWAN.map((k, i) => {
        const { ikon: Ikon, warna } = IKON[k.id];
        return (
          <li key={k.id} className={`flex min-h-0 items-center gap-2 rounded-xl border bg-card p-2 md:gap-3 md:p-3 ${i === 0 ? "col-span-2" : ""}`}>
            <span className={`karyawan-ikon grid size-7 shrink-0 place-items-center rounded-lg md:rounded-xl bg-gradient-to-b text-white shadow-sm md:size-11 ${warna}`} style={{ animationDelay: `${i * 0.35}s` }}>
              <Ikon className="size-4 md:size-5" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] font-semibold leading-tight text-navy-900 md:text-sm">{k.nama}</span>
              <span className="block text-[10px] leading-tight text-muted-foreground md:text-xs">{k.bidang}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
