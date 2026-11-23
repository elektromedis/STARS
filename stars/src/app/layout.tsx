import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: { default: "STARS — Sistem Terintegrasi Alat Kesehatan Rumah Sakit", template: "%s | STARS" },
  description: "Sistem Terintegrasi Alat Kesehatan Rumah Sakit - RSUD Cipayung: perencanaan-pengadaan dan pemeliharaan alat kesehatan.",
  applicationName: "STARS",
  appleWebApp: { capable: true, title: "STARS", statusBarStyle: "default" },
  icons: { apple: "/apple-touch-icon.png?v=2" },
  formatDetection: { telephone: false },
};

/** viewport-fit=cover: menu bawah & layar Scan QR memakai area aman (safe-area) ponsel berponi. */
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#0b2545" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={inter.variable}>
      <body className="font-sans">
        <div className="langit" aria-hidden>
          <div className="adegan biru" /><div className="adegan ungu" /><div className="adegan emas" /><div className="adegan rasi" /><div className="adegan perak" />
        </div>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
