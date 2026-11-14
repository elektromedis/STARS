/**
 * Warna grafik & status monitoring (modul biasa, bukan "use client", agar bisa dibaca komponen server maupun klien).
 * Seri: teal + ungu (pasangan yang lolos uji CVD di grafik Kalibrasi). Zona ala LogTag: biru di bawah batas, hijau dalam batas,
 * merah di atas batas. Status memakai palet status tetap (baik / peringatan / serius / kritis) dan selalu disertai ikon + label.
 */
import type { KunciStatusPantau, Parameter } from "@/lib/monitoring";

export const WARNA_SERI: Record<Parameter, string> = { suhu: "#14A0A8", lembap: "#6250d6" };
export const WARNA_ZONA = { rendah: "#2a78d6", normal: "#0ca30c", tinggi: "#d03b3b" } as const;
export const WARNA_STATUS: Record<KunciStatusPantau, string> = {
  alarm: "#d03b3b", luar: "#fab219", putus: "#ec835a", normal: "#0ca30c", belum: "#898781", nonaktif: "#898781",
};
