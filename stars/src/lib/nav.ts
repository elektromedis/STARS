import { LayoutDashboard, Wallet, PackageSearch, Database, Wrench, Info, Settings, type LucideIcon } from "lucide-react";

export type NavItem = { label: string; href: string; icon: LucideIcon; description: string };

export const NAV_ITEMS: NavItem[] = [
  { label: "Overview", href: "/", icon: LayoutDashboard, description: "Profil perencanaan, pengadaan, dan pemeliharaan alkes" },
  { label: "Nilai", href: "/nilai", icon: Wallet, description: "Nilai anggaran dan realisasi" },
  { label: "Paket", href: "/paket", icon: PackageSearch, description: "Daftar dan status paket" },
  { label: "Data", href: "/data", icon: Database, description: "Dataset dan unduhan" },
  { label: "Lapor Kerusakan", href: "/lapor", icon: Wrench, description: "Laporkan alat rusak (tanpa akun)" },
  { label: "About STARS", href: "/about", icon: Info, description: "Tentang sistem" },
  { label: "Admin", href: "/admin", icon: Settings, description: "Impor/ekspor Excel, pemeliharaan, pengguna, log (perlu login)" },
];
