import { sesiImms } from "@/lib/imms-sesi";
import Link from "next/link";
import { DaftarWo } from "@/components/imms/daftar-wo";

export default async function Perbaikan({ searchParams }: { searchParams: Promise<{ s?: string; j?: string }> }) {
  await sesiImms("Operator");
  const { s = "buka", j = "Korektif" } = await searchParams;
  const tab = (k: string, v: string, l: string, kini: string) => <Link key={v} href={`/imms/perbaikan?${k === "s" ? `s=${v}&j=${j}` : `s=${s}&j=${v}`}`} className={`kapsul ${kini === v ? "utama" : ""}`}>{l}</Link>;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {tab("j", "Korektif", "Perbaikan", j)}{tab("j", "Preventif", "Terencana", j)}{tab("j", "Inspeksi", "Inspeksi", j)}{tab("j", "semua", "Semua jenis", j)}
        <span className="w-4" />
        {tab("s", "buka", "Berjalan", s)}{tab("s", "Selesai", "Selesai", s)}{tab("s", "Batal", "Batal", s)}
      </div>
      <DaftarWo where={{ ...(j === "semua" ? {} : { jenis: j }), status: s === "buka" ? { in: ["Terbuka", "Dikerjakan"] } : s }} kosong="Tidak ada perintah kerja." />
    </div>
  );
}
