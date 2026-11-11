import { ExternalLink, Wrench } from "lucide-react";
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
            Ada alat kesehatan rusak atau bermasalah? Formulir permintaan kerja akan terbuka di aplikasi pemeliharaan Fiix (tab baru), tanpa perlu akun.
          </p>
        </div>
      </div>
      <Button variant="teal" size="lg" className="shrink-0" asChild>
        <a href={url} target="_blank" rel="noopener noreferrer" aria-label="Submit a work request — formulir permintaan kerja Fiix RSUD Cipayung, terbuka di tab baru">
          Submit a work request <ExternalLink aria-hidden />
        </a>
      </Button>
    </section>
  );
}
