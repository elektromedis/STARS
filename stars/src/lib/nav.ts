import { Activity, ClipboardList, Database, Gauge, Info, LayoutDashboard, PackageSearch, Settings, Wallet, Wrench, type LucideIcon } from "lucide-react";

export type NavItem = {
  label: string; href: string; icon: LucideIcon; description: string;
  /** Awalan path lain yang membuat menu ini aktif (menu gabungan). */
  match?: string[];
};

/** Sub-menu Perencanaan-Pengadaan; tampil sebagai tab di atas halaman Nilai, Paket, dan Data. */
export const PERENCANAAN_TABS: NavItem[] = [
  { label: "Nilai", href: "/nilai", icon: Wallet, description: "Nilai anggaran dan serapan per tahun, tahap, unit kerja, dan kategori" },
  { label: "Paket", href: "/paket", icon: PackageSearch, description: "Daftar paket RKPBU/RKBU beserta unit, kategori, nilai, dan status serapan" },
  { label: "Data", href: "/data", icon: Database, description: "Unduh dataset per tahun dan tahap dalam format XLSX, CSV, atau PDF" },
];

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, description: "Ringkasan seluruh menu: perencanaan-pengadaan, pemeliharaan alat, dan laporan kerusakan" },
  { label: "Perencanaan-Pengadaan", href: "/nilai", icon: ClipboardList, match: PERENCANAAN_TABS.map((t) => t.href), description: "Nilai anggaran, daftar paket, dan unduhan data RKPBU/RKBU dalam satu menu" },
  { label: "Pemeliharaan", href: "/pemeliharaan", icon: Activity, match: ["/pemeliharaan", "/alat"], description: "Kondisi alat, Inventaris Alat Kesehatan (nomor seri, QR, foto, dokumen tiap alat), laporan kerusakan, perintah kerja, dan jadwal preventif" },
  { label: "Pengujian dan Kalibrasi", href: "/kalibrasi", icon: Gauge, description: "Data lengkap pengujian & kalibrasi alat: status berlaku, jatuh tempo, per unit, per lembaga, riwayat & sertifikat" },
  { label: "Lapor Kerusakan", href: "/lapor", icon: Wrench, description: "Laporkan alat kesehatan atau sarana yang rusak — tanpa perlu akun" },
  { label: "About STARS", href: "/about", icon: Info, description: "Tentang aplikasi, sumber data, dan cara kerja STARS" },
  { label: "Admin", href: "/admin", icon: Settings, description: "Impor/ekspor Excel, pemeliharaan, daftar alat, pengguna, dan log (perlu login)" },
];

export function menuAktif(item: NavItem, pathname: string) {
  if (item.href === "/") return pathname === "/";
  return (item.match ?? [item.href]).some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
