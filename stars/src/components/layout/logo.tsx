import Image from "next/image";
import { cn } from "@/lib/utils";

/** Ikon STARS pada tile putih (terbaca di atas sidebar navy) + nama sistem. */
export function Logo({ className, showText = true }: { className?: string; showText?: boolean }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white p-1 shadow-sm ring-1 ring-black/5">
        <Image src="/stars-icon.png" alt="Logo STARS" width={32} height={32} priority />
      </div>
      {showText && (
        <div className="leading-tight">
          <div className="text-lg font-bold tracking-tight">STARS</div>
          <div className="max-w-[10.5rem] text-[10px] leading-snug opacity-70">Sistem Terintegrasi Alat Kesehatan Rumah Sakit</div>
        </div>
      )}
    </div>
  );
}

/** Logo horizontal penuh (latar putih). */
export function LogoFull({ className, width = 360 }: { className?: string; width?: number }) {
  return (
    <Image
      src="/stars-logo.png"
      alt="STARS — Sistem Terintegrasi Alat Kesehatan Rumah Sakit"
      width={width}
      height={Math.round((width * 422) / 1208)}
      className={cn("h-auto", className)}
      priority
    />
  );
}
