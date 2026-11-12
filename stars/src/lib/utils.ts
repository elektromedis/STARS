import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number) {
  return new Intl.NumberFormat("id-ID").format(n);
}

/** Rupiah lengkap format RS, mis. "Rp. 247.123.456,-". */
export function formatRupiah(n: number) {
  const bulat = Math.round(n);
  return `${bulat < 0 ? "-" : ""}Rp. ${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(Math.abs(bulat))},-`;
}

/** Label sumbu grafik ringkas: 1,2 M / 350 jt */
export function formatAxis(n: number) {
  if (n >= 1e12) return `${(n / 1e12).toFixed(1).replace(".", ",")} T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(0)} M`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(0)} jt`;
  return String(n);
}
