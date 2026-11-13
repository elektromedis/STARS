import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: { default: "STARS — Sistem Terintegrasi Alat Kesehatan Rumah Sakit", template: "%s | STARS" },
  description: "Sistem Terintegrasi Alat Kesehatan Rumah Sakit - RSUD Cipayung: perencanaan-pengadaan dan pemeliharaan alat kesehatan.",
};

/** viewport-fit=cover: menu bawah & layar Scan QR memakai area aman (safe-area) ponsel berponi. */
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={inter.variable}>
      <body className="font-sans">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
