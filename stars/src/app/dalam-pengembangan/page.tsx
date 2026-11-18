import type { Metadata } from "next";
import Link from "next/link";
import { Construction } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Dalam Pengembangan" };

const FITUR: Record<string, { nama: string; ket: string }> = {
  telemedicine: { nama: "TELEMEDICINE", ket: "Konsultasi & pemantauan pasien jarak jauh antara tenaga kesehatan dan pasien." },
  telefarma: { nama: "TELEFARMA", ket: "Layanan kefarmasian jarak jauh: resep elektronik, konsultasi obat, dan pengantaran." },
  lis: { nama: "LIS", ket: "Laboratory Information System: alur pemeriksaan, hasil, dan integrasi alat laboratorium." },
};

export default async function DalamPengembanganPage({ searchParams }: { searchParams: Promise<{ fitur?: string }> }) {
  const f = FITUR[String((await searchParams).fitur ?? "")];
  return (
    <section className="mx-auto grid max-w-xl place-items-center gap-4 rounded-3xl bg-white/85 px-6 py-16 text-center shadow-card ring-1 ring-slate-200 backdrop-blur-sm">
      <span className="grid size-16 place-items-center rounded-2xl bg-amber-100 text-amber-700"><Construction className="size-8" aria-hidden /></span>
      {f && <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">{f.nama}</p>}
      <h1 className="text-3xl font-bold tracking-tight text-navy-900 md:text-4xl">DALAM PENGEMBANGAN</h1>
      <p className="max-w-md text-muted-foreground">{f ? `${f.ket} ` : ""}Modul ini sedang disiapkan dan akan segera tersedia di STARS.</p>
      <Button variant="teal" asChild><Link href="/">Kembali ke beranda</Link></Button>
    </section>
  );
}
