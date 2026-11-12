import Image from "next/image";
import { cn } from "@/lib/utils";
import { LogoIkon } from "./logo-animasi";

/** Ikon STARS vektor beranimasi (tanpa latar putih) + nama sistem. */
export function Logo({ className, showText = true }: { className?: string; showText?: boolean }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <LogoIkon className="size-11" />
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
