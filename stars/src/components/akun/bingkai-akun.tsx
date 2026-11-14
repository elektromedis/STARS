import Link from "next/link";
import { LogoAnimasi } from "@/components/layout/logo-animasi";

/** Bingkai halaman Masuk / Daftar / Lupa sandi: logo STARS beranimasi + kartu yang muncul lembut. */
export function BingkaiAkun({ children, catatan }: { children: React.ReactNode; catatan?: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md py-6 md:py-8">
      <Link href="/" aria-label="Kembali ke Dashboard STARS" className="mx-auto mb-6 block w-[280px] animate-in fade-in zoom-in-95 duration-700 motion-reduce:animate-none">
        <LogoAnimasi terang className="w-full" />
      </Link>
      <div className="animate-in fade-in slide-in-from-bottom-4 fill-mode-both delay-150 duration-700 motion-reduce:animate-none">{children}</div>
      {catatan && <div className="mt-4 text-center text-xs text-muted-foreground animate-in fade-in fill-mode-both delay-300 duration-700 motion-reduce:animate-none">{catatan}</div>}
    </div>
  );
}

export function PesanAkun({ status }: { status?: { ok?: string; error?: string } }) {
  if (!status?.ok && !status?.error) return null;
  return status.error
    ? <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{status.error}</p>
    : <p role="status" className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{status.ok}</p>;
}
