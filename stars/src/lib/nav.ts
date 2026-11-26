import { Cpu, FileHeart, HeartPulse, Library, Pill, ShoppingCart, Video, BadgeCheck, Activity, Landmark, ArrowLeftRight, CalendarDays, Glasses, Boxes, LifeBuoy, Bot, Radar, ClipboardList, Database, Gauge, LayoutDashboard, PackageSearch, Printer, Scale, Settings, ShieldCheck, Thermometer, Wallet, Wrench, type LucideIcon, Box } from "lucide-react";

export type NavItem = {
  label: string; href: string; icon: LucideIcon; description: string;
  /** Awalan path lain yang membuat menu ini aktif (menu gabungan). */
  match?: string[];
  /** Sub-menu yang muncul mengambang saat menu diklik. */
  children?: NavItem[];
  /** Tautan ke situs luar (dibuka di tab baru). */
  external?: boolean;
  /** Label bahasa Inggris (menu samping). */
  en?: string;
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

/** Daftar modul lama (dipakai pintasan di Dashboard). Menu samping memakai NAV_SAMPING. */
export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, description: "Ringkasan seluruh menu: perencanaan-pengadaan, pemeliharaan alat, dan laporan kerusakan" },
  { label: "DASHBOARD 3D", href: "/dashboard-3d", icon: Box, description: "Dashboard alternatif: kantor 3D Karyawan AI dengan jumlah tugas terbuka tiap petugas" },
  { label: "ALLIES", href: "/allies", icon: Bot, description: "Agen pengelolaan alat medik: siklus alat dari Analisa Kebutuhan s.d. Penghapusan (Pre-Market → Post-Market), rekomendasi penggantian, dan tanya-jawab dari data STARS" },
  { label: "SI-ALKES", href: "/nilai", icon: Boxes, match: [...PERENCANAAN_TABS.map((t) => t.href), "/hta"], description: "Perencanaan-Pengadaan (nilai, paket, data, cetak RKBU) dan HTA dalam satu menu" },
  { label: "SI-FARMALKES", href: "/pemeliharaan", icon: Activity, match: ["/pemeliharaan", "/alat", "/kalibrasi", "/lapor", "/kalender", "/peminjaman"], description: "Pemeliharaan alat & inventaris, Pengujian dan Kalibrasi, serta Lapor Kerusakan dalam satu menu" },
  { label: "CMMS", href: "/cmms", icon: Wrench, description: "Sistem manajemen pemeliharaan dan aset alat kesehatan (perlu login)" },
  { label: "SI-LOGGER", href: "/monitoring", icon: Thermometer, description: "Live Monitoring — Live Medical Device Environmental Monitoring System: suhu & kelembapan alat kesehatan (kulkas vaksin, kulkas darah, freezer, ruang alat) secara real time dari sensor IoT — alarm, ringkasan harian, dan laporan" },
  { label: "SI-TRACKING", href: "/tracking", icon: Radar, description: "Live Tracking — Sampai mana proses kerja di setiap menu: paket, laporan kerusakan, perintah kerja, preventif, kalibrasi, alarm, dan siklus alat — diperbarui otomatis; lacak nomor WR/WO" },
  { label: "AVICENNA", href: "/avicenna", icon: Glasses, description: "Virtual Reality untuk alat kesehatan: pelatihan & simulasi pengoperasian alat, edukasi keselamatan, dan uji kompetensi tenaga kesehatan" },
  { label: "SMART MFK", href: "/smart-mfk", icon: ShieldCheck, description: "Manajemen Fasilitas dan Keselamatan (akreditasi bab MFK): nilai standar, risiko alat medis, recall, insiden alat — tersambung dua arah dengan inventaris, kalibrasi, dan perbaikan STARS" },
  { label: "ADMIN", href: "/admin", icon: Settings, description: "Impor/ekspor Excel, pemeliharaan, daftar alat, pengguna, dan log (perlu login)" },
  { label: "JDIH", href: "/jdih", icon: Landmark, description: "Jaringan Dokumentasi dan Informasi Hukum: peraturan alat kesehatan, pengadaan, BMD, SDM elektromedis, TTE — cari, saring, unduh PDF, tautan JDIH BPK" },
  { label: "TENTANG SAYA", href: "/about", icon: LifeBuoy, description: "Bantuan, tentang aplikasi, sumber data, dan cara kerja STARS" },
];

export function menuAktif(item: NavItem, pathname: string): boolean {
  if (item.external) return false;
  if (item.children?.length) return item.children.some((c) => menuAktif(c, pathname)) || (item.match ?? []).some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (item.href.includes("?")) return false;
  if (item.href === "/") return pathname === "/";
  return (item.match ?? [item.href]).some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

const dp = (fitur: string) => `/dalam-pengembangan?fitur=${fitur}`;

/** Menu samping kiri (dock): grup bersub-menu muncul mengambang saat diklik. */
export const NAV_SAMPING: NavItem[] = [
  { label: "DASHBOARD", href: "/", icon: Box, match: ["/dashboard-3d"], description: "Dashboard ringkasan dan Dashboard 3D Karyawan AI", children: [
    { label: "Dashboard", href: "/", icon: LayoutDashboard, description: "Ringkasan seluruh menu: perencanaan-pengadaan, pemeliharaan alat, dan laporan kerusakan" },
    { label: "Dashboard 3D", href: "/dashboard-3d", icon: Box, description: "Kantor 3D Karyawan AI dengan jumlah tugas terbuka tiap petugas" },
  ] },
  { label: "ALLIES - AGEN AI KAMU", en: "ALLIES - YOUR AI AGENT", href: "/allies", icon: Bot, description: "Agen AI pengelolaan alat medik: siklus alat dari analisa kebutuhan s.d. penghapusan, rekomendasi, dan tanya-jawab data STARS" },
  { label: "IMMIS", href: "/imms", icon: HeartPulse, description: "Integrated Medical Equipment Management Information System", children: [
    { label: "EMASCARE", href: "/imms", icon: HeartPulse, description: "Keluhan alat, perintah kerja, dan usulan alat dari ruangan" },
  ] },
  { label: "CMMS", href: "/cmms", icon: Wrench, match: ["/pemeliharaan", "/alat", "/kalibrasi", "/lapor", "/kalender", "/peminjaman"], description: "Computerized Maintenance Management System", children: [
    { label: "TRILUX", href: "/cmms", icon: Wrench, description: "Aplikasi CMMS TRILUX (akun terpisah, tab baru)" },
    { label: "SI-FARMALKES", href: "/pemeliharaan", icon: Activity, match: ["/pemeliharaan", "/alat", "/kalibrasi", "/lapor", "/kalender", "/peminjaman"], description: "Pemeliharaan & inventaris, pengujian dan kalibrasi, lapor kerusakan" },
  ] },
  { label: "EHR", href: "https://rsudcipayung.jakarta.go.id", external: true, icon: FileHeart, description: "Electronic Health Record — situs RSUD Cipayung (tab baru)" },
  { label: "ESP", href: "/nilai", icon: Boxes, match: [...PERENCANAAN_TABS.map((t) => t.href), "/hta"], description: "Equipment Service Planning", children: [
    { label: "SI-ALKES", href: "/nilai", icon: Boxes, match: [...PERENCANAAN_TABS.map((t) => t.href), "/hta"], description: "Perencanaan-pengadaan (nilai, paket, data, cetak RKBU) dan HTA" },
  ] },
  { label: "MDM-IOT", href: dp("mdm-iot"), icon: Cpu, description: "Medical Device Management & Internet of Things (dalam pengembangan)", children: [
    { label: "LIS", href: dp("lis"), icon: Cpu, description: "Laboratory Information System (dalam pengembangan)" },
  ] },
  { label: "BMS", href: "/monitoring", icon: Thermometer, description: "Building Management System", children: [
    { label: "SI-LOGGER", href: "/monitoring", icon: Thermometer, description: "Live monitoring suhu & kelembapan dari sensor IoT" },
  ] },
  { label: "SCPS", href: dp("si-pengadaan"), icon: ShoppingCart, description: "Supply Chain & Procurement System", children: [
    { label: "SI-PENGADAAN", href: dp("si-pengadaan"), icon: ShoppingCart, description: "Sistem informasi pengadaan (dalam pengembangan)" },
  ] },
  { label: "QMS", href: "/tracking", icon: BadgeCheck, description: "Quality Management System", children: [
    { label: "SI-TRACKING", href: "/tracking", icon: Radar, description: "Lacak proses kerja: paket, laporan kerusakan, perintah kerja, kalibrasi" },
  ] },
  { label: "RCD", href: dp("nomenklatur"), icon: Library, description: "Reference & Coding Database", children: [
    { label: "NOMENKLATUR", href: dp("nomenklatur"), icon: Library, description: "Nomenklatur alat kesehatan (dalam pengembangan)" },
  ] },
  { label: "JDIH", href: "/jdih", icon: Landmark, description: "Jaringan Dokumentasi dan Informasi Hukum" },
  { label: "SMARTMFK", href: "/smart-mfk", icon: ShieldCheck, description: "Manajemen Fasilitas dan Keselamatan (akreditasi bab MFK)" },
  { label: "AVICENNA", href: "/avicenna", icon: Glasses, description: "Virtual Reality untuk pelatihan alat kesehatan" },
  { label: "TELEMEDICINE", href: dp("telemedicine"), icon: Video, description: "Konsultasi jarak jauh (dalam pengembangan)" },
  { label: "TELEFARMA", href: dp("telefarma"), icon: Pill, description: "Layanan kefarmasian jarak jauh (dalam pengembangan)" },
  { label: "TENTANG SAYA", en: "ABOUT", href: "/about", icon: LifeBuoy, description: "Bantuan, tentang aplikasi, sumber data, dan cara kerja STARS" },
  { label: "ADMIN", href: "/admin", icon: Settings, description: "CMS impor-ekspor, pemeliharaan, daftar alat, pengguna, dan log (perlu login)" },
];
