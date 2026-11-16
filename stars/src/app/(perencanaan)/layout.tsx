import { Boxes } from "lucide-react";
import { PerencanaanTabs } from "@/components/dashboard/perencanaan-tabs";
import { SialkesTabs } from "@/components/dashboard/sialkes-tabs";

/** Menu SI-ALKES › Perencanaan-Pengadaan: Nilai, Paket, Data, Cetak RKBU (URL tetap /nilai, /paket, /data, /rkbu). */
export default function PerencanaanLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-teal-700 print:hidden">
        <Boxes className="size-4" aria-hidden /> SI-ALKES
      </p>
      <SialkesTabs />
      <PerencanaanTabs />
      {children}
    </>
  );
}
