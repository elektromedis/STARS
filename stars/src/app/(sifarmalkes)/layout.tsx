import { Activity } from "lucide-react";
import { SifarmalkesTabs } from "@/components/dashboard/sifarmalkes-tabs";

/** Menu gabungan SI-FARMALKES: Pemeliharaan, Pengujian dan Kalibrasi, Lapor Kerusakan (URL tetap /pemeliharaan, /kalibrasi, /lapor). */
export default function SifarmalkesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-teal-700 print:hidden">
        <Activity className="size-4" aria-hidden /> SI-FARMALKES
      </p>
      <SifarmalkesTabs />
      {children}
    </>
  );
}
