import Link from "next/link";
import { ExternalLink, Send, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Ajakan lapor kerusakan alat: membuka formulir permintaan kerja PUBLIK Fiix CMMS
 * RSUD Cipayung di tab baru. Tidak ada login/data Fiix yang disentuh dari STARS;
 * URL bisa diganti tanpa build ulang lewat env FIIX_WORK_REQUEST_URL.
 */
const URL_BAWAAN =
  "https://rsudcipayung.fiix.software/guest-mr/login?tenantId=0aeb773c-5ceb-3cb9-8042-13b978490cdf&returnUrl=https%3A%2F%2Frsudcipayung.fiix.software";

export function FiixCta() {
  const url = process.env.FIIX_WORK_REQUEST_URL || URL_BAWAAN;
  return (
    <section
      aria-label="Permintaan kerja pemeliharaan (Fiix)"
      className="mb-6 flex flex-col gap-4 rounded-2xl border border-teal-200 bg-teal-50/60 p-5 shadow-card sm:flex-row sm:items-center sm:justify-between md:p-6"
    >
      <div className="flex items-start gap-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white">
          <Wrench className="size-5" aria-hidden />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">RSUD Cipayung</p>
          <h2 className="text-lg font-bold text-navy-800">Have an issue to report?</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Ada alat kesehatan atau sarana yang rusak/bermasalah? Laporkan lewat STARS (tanpa akun), atau kirim permintaan kerja ke aplikasi pemeliharaan Fiix.
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
        <Button variant="teal" size="lg" asChild>
          <Link href="/lapor" aria-label="Lapor kerusakan alat lewat STARS"><Send aria-hidden /> Lapor Kerusakan</Link>
        </Button>
        <Button variant="outline" size="lg" asChild>
          <a href={url} target="_blank" rel="noopener noreferrer" aria-label="Submit a work request — formulir permintaan kerja Fiix RSUD Cipayung, terbuka di tab baru">
            Submit a work request <ExternalLink aria-hidden />
          </a>
        </Button>
      </div>
    </section>
  );
}
