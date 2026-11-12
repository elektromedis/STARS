import Link from "next/link";
import { Send, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Ajakan lapor kerusakan alat lewat formulir publik STARS (/lapor), tanpa akun. */
export function LaporCta() {
  return (
    <section
      aria-label="Lapor kerusakan alat kesehatan"
      className="mb-6 flex flex-col gap-4 rounded-2xl border border-teal-200 bg-teal-50/60 p-5 shadow-card sm:flex-row sm:items-center sm:justify-between md:p-6"
    >
      <div className="flex items-start gap-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white">
          <Wrench className="size-5" aria-hidden />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">RSUD Cipayung</p>
          <h2 className="text-lg font-bold text-navy-800">Punya masalah tentang Alat Kesehatan?</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Ada alat kesehatan rusak/bermasalah? Laporkan lewat STARS (tanpa akun)</p>
        </div>
      </div>
      <Button variant="teal" size="lg" className="shrink-0" asChild>
        <Link href="/lapor"><Send aria-hidden /> Lapor Kerusakan</Link>
      </Button>
    </section>
  );
}
