import { Activity, Landmark, ArrowLeftRight, CalendarDays, Glasses, Boxes, LifeBuoy, Bot, Radar, ClipboardList, Database, Gauge, LayoutDashboard, PackageSearch, Printer, Scale, Settings, ShieldCheck, Thermometer, Wallet, Wrench, type LucideIcon, Box } from "lucide-react";

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
  { label: "Cetak RKBU", href: "/rkbu", icon: Printer, description: "Susun, ubah, dan cetak dokumen RKBU/RKPBU ber-kop RSUD Cipayung dari data paket (perlu login)" },
];

/** Sub-menu SIFARMALKES (Pemeliharaan, Pengujian dan Kalibrasi, Lapor Kerusakan); tampil sebagai tab di atas halamannya. */
export const SIFARMALKES_TABS: NavItem[] = [
  { label: "Pemeliharaan", href: "/pemeliharaan", icon: Activity, match: ["/pemeliharaan", "/alat"], description: "Kondisi alat, Inventaris Alat Kesehatan (nomor seri, QR, foto, dokumen tiap alat), laporan kerusakan, perintah kerja, dan jadwal preventif" },
  { label: "Pengujian dan Kalibrasi", href: "/kalibrasi", icon: Gauge, description: "Data lengkap pengujian & kalibrasi alat: status berlaku, jatuh tempo, per unit, per lembaga, riwayat & sertifikat" },
  { label: "Lapor Kerusakan", href: "/lapor", icon: Wrench, description: "Laporkan alat kesehatan atau sarana yang rusak — tanpa perlu akun" },
  { label: "Kalender", href: "/kalender", icon: CalendarDays, description: "Kalender pemeliharaan & perbaikan bergaya Google Calendar — bisa ditautkan ke Google Calendar email Anda" },
  { label: "Peminjaman", href: "/peminjaman", icon: ArrowLeftRight, description: "Peminjaman alat antar unit kerja dengan persetujuan TTE; pelacakan RFID (dalam pengembangan)" },
];

/** Sub-menu SI-ALKES (Perencanaan-Pengadaan, HTA); tampil sebagai tab di atas halamannya. */
export const SIALKES_TABS: NavItem[] = [
  { label: "Perencanaan-Pengadaan", href: "/nilai", icon: ClipboardList, match: PERENCANAAN_TABS.map((t) => t.href), description: "Nilai anggaran, daftar paket, unduhan data, dan cetak dokumen RKPBU/RKBU dalam satu menu" },
  { label: "HTA", href: "/hta", icon: Scale, description: "Health Technology Assessment: bandingkan merek & tipe alat kesehatan (keselamatan, keandalan, biaya, spesifikasi) — perlu login" },
];

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, description: "Ringkasan seluruh menu: perencanaan-pengadaan, pemeliharaan alat, dan laporan kerusakan" },
  { label: "DASHBOARD 3D", href: "/dashboard-3d", icon: Box, description: "Dashboard alternatif: kantor 3D Karyawan AI dengan jumlah tugas terbuka tiap petugas" },
  { label: "ALLIES", href: "/allies", icon: Bot, description: "Agen pengelolaan alat medik: siklus alat dari Analisa Kebutuhan s.d. Penghapusan (Pre-Market → Post-Market), rekomendasi penggantian, dan tanya-jawab dari data STARS" },
  { label: "SI-ALKES", href: "/nilai", icon: Boxes, match: [...PERENCANAAN_TABS.map((t) => t.href), "/hta"], description: "Perencanaan-Pengadaan (nilai, paket, data, cetak RKBU) dan HTA dalam satu menu" },
  { label: "SI-FARMALKES", href: "/pemeliharaan", icon: Activity, match: ["/pemeliharaan", "/alat", "/kalibrasi", "/lapor", "/kalender", "/peminjaman"], description: "Pemeliharaan alat & inventaris, Pengujian dan Kalibrasi, serta Lapor Kerusakan dalam satu menu" },
  { label: "SI-LOGGER", href: "/monitoring", icon: Thermometer, description: "Live Monitoring — Live Medical Device Environmental Monitoring System: suhu & kelembapan alat kesehatan (kulkas vaksin, kulkas darah, freezer, ruang alat) secara real time dari sensor IoT — alarm, ringkasan harian, dan laporan" },
  { label: "SI-TRACKING", href: "/tracking", icon: Radar, description: "Live Tracking — Sampai mana proses kerja di setiap menu: paket, laporan kerusakan, perintah kerja, preventif, kalibrasi, alarm, dan siklus alat — diperbarui otomatis; lacak nomor WR/WO" },
  { label: "AVICENNA", href: "/avicenna", icon: Glasses, description: "Virtual Reality untuk alat kesehatan: pelatihan & simulasi pengoperasian alat, edukasi keselamatan, dan uji kompetensi tenaga kesehatan" },
  { label: "SMART MFK", href: "/smart-mfk", icon: ShieldCheck, description: "Manajemen Fasilitas dan Keselamatan (akreditasi bab MFK): nilai standar, risiko alat medis, recall, insiden alat — tersambung dua arah dengan inventaris, kalibrasi, dan perbaikan STARS" },
  { label: "ADMIN", href: "/admin", icon: Settings, description: "Impor/ekspor Excel, pemeliharaan, daftar alat, pengguna, dan log (perlu login)" },
  { label: "JDIH", href: "/jdih", icon: Landmark, description: "Jaringan Dokumentasi dan Informasi Hukum: peraturan alat kesehatan, pengadaan, BMD, SDM elektromedis, TTE — cari, saring, unduh PDF, tautan JDIH BPK" },
  { label: "TENTANG SAYA", href: "/about", icon: LifeBuoy, description: "Bantuan, tentang aplikasi, sumber data, dan cara kerja STARS" },
];

export function menuAktif(item: NavItem, pathname: string) {
  if (item.href === "/") return pathname === "/";
  return (item.match ?? [item.href]).some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
