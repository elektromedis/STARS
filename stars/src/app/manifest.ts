import type { MetadataRoute } from "next";

/** Manifest PWA: STARS bisa dipasang di layar utama HP/komputer dan berjalan seperti aplikasi (tanpa bilah browser). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "STARS — Sistem Terintegrasi Alat Kesehatan Rumah Sakit",
    short_name: "STARS",
    description: "Perencanaan-pengadaan, pemeliharaan, kalibrasi, monitoring, dan pelacakan alat kesehatan RSUD Cipayung.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    lang: "id",
    background_color: "#ffffff",
    theme_color: "#0b2545",
    categories: ["medical", "productivity", "business"],
    icons: [
      { src: "/ikon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/ikon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/ikon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Lapor Kerusakan", url: "/lapor", icons: [{ src: "/ikon-192.png", sizes: "192x192" }] },
      { name: "SI-LOGGER", url: "/monitoring", icons: [{ src: "/ikon-192.png", sizes: "192x192" }] },
      { name: "SI-TRACKING", url: "/tracking", icons: [{ src: "/ikon-192.png", sizes: "192x192" }] },
    ],
  };
}
