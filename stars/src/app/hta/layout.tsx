import { Boxes } from "lucide-react";
import { SialkesTabs } from "@/components/dashboard/sialkes-tabs";

/** Menu SI-ALKES › HTA. */
export default function HtaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-teal-700 print:hidden">
        <Boxes className="size-4" aria-hidden /> SI-ALKES
      </p>
      <SialkesTabs />
      <div className="mb-2" />
      {children}
    </>
  );
}
