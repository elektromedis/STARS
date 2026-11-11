import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number) {
  return new Intl.NumberFormat("id-ID").format(n);
}

export function formatIDRCompact(n: number) {
  if (n >= 1e12) return `Rp ${(n / 1e12).toFixed(2).replace(".", ",")} T`;
  if (n >= 1e9) return `Rp ${(n / 1e9).toFixed(1).replace(".", ",")} M`;
  if (n >= 1e6) return `Rp ${(n / 1e6).toFixed(0)} jt`;
  return `Rp ${formatNumber(n)}`;
}

/** Label sumbu grafik ringkas: 1,2 M / 350 jt */
export function formatAxis(n: number) {
  if (n >= 1e12) return `${(n / 1e12).toFixed(1).replace(".", ",")} T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(0)} M`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(0)} jt`;
  return String(n);
}
