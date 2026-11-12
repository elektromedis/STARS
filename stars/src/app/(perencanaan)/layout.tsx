import { ClipboardList } from "lucide-react";
import { PerencanaanTabs } from "@/components/dashboard/perencanaan-tabs";

/** Menu gabungan Perencanaan-Pengadaan: Nilai, Paket, dan Data berbagi satu tab bar (URL tetap /nilai, /paket, /data). */
export default function PerencanaanLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-teal-700">
        <ClipboardList className="size-4" aria-hidden /> Perencanaan-Pengadaan
      </p>
      <PerencanaanTabs />
      {children}
    </>
  );
}
