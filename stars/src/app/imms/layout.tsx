import type { Metadata } from "next";
import "./imms.css";

export const metadata: Metadata = {
  title: { default: "STARS IMMS — Inventaris & Pemeliharaan Alat Elektromedik", template: "%s · STARS IMMS" },
  description: "Sistem informasi manajemen inventaris dan pemeliharaan peralatan elektromedik berbasis nilai EM (Permenkes 65/2016, WHO IMMIS 2025).",
  applicationName: "STARS IMMS",
};

export default function ImmsLayout({ children }: { children: React.ReactNode }) {
  return <div className="imms">{children}</div>;
}
