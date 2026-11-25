import type { Metadata } from "next";
import "./imms.css";
import { FaviconEmas } from "@/components/imms/favicon-emas";

export const metadata: Metadata = {
  title: { absolute: "EMASCARE — Electromedical Asset Management & Service Care System", template: "%s · EMASCARE" },
  description: "KENALI. RAWAT. KENDALIKAN. Sistem informasi manajemen inventaris dan pemeliharaan peralatan elektromedik berbasis nilai EM (Permenkes 65/2016, WHO IMMIS 2025).",
  applicationName: "EMASCARE",
  icons: { icon: "/emascare.svg", apple: "/emascare.svg" },
  appleWebApp: { capable: true, title: "EMASCARE" },
};

export default function ImmsLayout({ children }: { children: React.ReactNode }) {
  return <div className="imms"><FaviconEmas />{children}</div>;
}
