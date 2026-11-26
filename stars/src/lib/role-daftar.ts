/** Daftar peran, izin aksi, dan menu yang dapat diatur — tanpa akses basis data (aman dipakai di komponen browser). */
import type { Peran } from "./peran";

export const ROLE: { nama: string; tingkat: Peran; ket: string }[] = [
  { nama: "Super Administrator", tingkat: "Super Admin", ket: "Akses penuh seluruh sistem, termasuk pengaturan peran" },
  { nama: "Administrator", tingkat: "Admin", ket: "Kelola pengguna, data master, dan seluruh modul" },
  { nama: "Elektromedis", tingkat: "Operator", ket: "Pemeliharaan, perbaikan, kalibrasi alat kesehatan" },
  { nama: "Kesehatan Lingkungan", tingkat: "Operator", ket: "Monitoring lingkungan, limbah, sanitasi" },
  { nama: "Farmasi", tingkat: "Operator", ket: "Alat kesehatan & BMHP farmasi, rantai dingin" },
  { nama: "Engineer", tingkat: "Operator", ket: "Teknisi pelaksana perintah kerja" },
  { nama: "IPSRS", tingkat: "Operator", ket: "Pemeliharaan sarana & prasarana rumah sakit" },
  { nama: "Kepala Instalasi", tingkat: "Operator", ket: "Menyetujui & memantau pekerjaan instalasinya" },
  { nama: "Kepala Ruangan", tingkat: "Operator", ket: "Mengelola & menyetujui keperluan alat di ruangannya" },
  { nama: "PJ Unit Pelayanan", tingkat: "Operator", ket: "Penanggung jawab alat di unit pelayanan" },
  { nama: "Pengguna Ruangan", tingkat: "Viewer", ket: "Melapor kerusakan & melihat alat di ruangannya" },
  { nama: "Pengelola Barang", tingkat: "Operator", ket: "Inventaris, mutasi, dan penghapusan barang" },
  { nama: "Kepala Bidang / Kepala Seksi", tingkat: "Operator", ket: "Persetujuan & pemantauan lintas instalasi" },
  { nama: "Top Manajemen", tingkat: "Viewer", ket: "Dashboard & laporan pimpinan" },
  { nama: "Kalibrator", tingkat: "Operator", ket: "Lembaga/petugas pengujian & kalibrasi" },
  { nama: "PDE CMMS", tingkat: "Operator", ket: "Pengolah data elektronik CMMS" },
  { nama: "PDE ART", tingkat: "Operator", ket: "Pengolah data elektronik aset rumah tangga" },
  { nama: "Perencanaan", tingkat: "Operator", ket: "Penyusunan RKBU/RKPBU & HTA" },
  { nama: "Pengadaan", tingkat: "Operator", ket: "Proses pengadaan & realisasi" },
  { nama: "Tim Ahli", tingkat: "Viewer", ket: "Kajian teknis & rekomendasi" },
  { nama: "Surveyor", tingkat: "Viewer", ket: "Penilai akreditasi (baca saja)" },
  { nama: "Dosen", tingkat: "Viewer", ket: "Pembimbing akademik (baca saja)" },
  { nama: "Legal", tingkat: "Viewer", ket: "Regulasi & dokumen hukum" },
  { nama: "IT", tingkat: "Admin", ket: "Pengelola sistem informasi" },
  { nama: "K3RS", tingkat: "Operator", ket: "Keselamatan & kesehatan kerja RS, MFK" },
  { nama: "Humas", tingkat: "Viewer", ket: "Informasi publik & CMS situs" },
  { nama: "Cleaning Service", tingkat: "Viewer", ket: "Melapor kerusakan sarana" },
  { nama: "Security", tingkat: "Viewer", ket: "Melapor kejadian & kerusakan sarana" },
  { nama: "Viewer", tingkat: "Viewer", ket: "Hanya melihat" },
  { nama: "Pengguna Tidak Aktif", tingkat: "Viewer", ket: "Akun dinonaktifkan — tidak dapat login" },
];
export const ROLE_PENUH = "Super Administrator";
export const ROLE_NONAKTIF = "Pengguna Tidak Aktif";
export const namaRole = new Set(ROLE.map((r) => r.nama));
export const roleBawaan = (peran: string): string =>
  peran === "Super Admin" ? "Super Administrator" : peran === "Admin" ? "Administrator" : peran === "Operator" ? "Elektromedis" : "Viewer";

/** Izin aksi (seperti "Allow Create/Approve/Process" di TRILUX). */
export const AKSI = [
  { kode: "buat", label: "Izinkan Tambah Data" },
  { kode: "ubah", label: "Izinkan Ubah Data" },
  { kode: "hapus", label: "Izinkan Hapus Data" },
  { kode: "impor", label: "Izinkan Impor Excel" },
  { kode: "ekspor", label: "Izinkan Unduh / Ekspor" },
  { kode: "setujui", label: "Izinkan Persetujuan (usulan, TTE)" },
  { kode: "proses", label: "Izinkan Proses Perintah Kerja" },
] as const;
export type KodeAksi = (typeof AKSI)[number]["kode"];

/** Menu/fitur yang dapat di-ON/OFF-kan. Akses ditentukan dari awalan alamat (href). */
export const MENU_AKSES: { grup: string; item: { href: string; label: string }[] }[] = [
  { grup: "Dashboard", item: [{ href: "/dashboard-3d", label: "Dashboard 3D" }, { href: "/allies", label: "ALLIES" }] },
  { grup: "SI-ALKES", item: [{ href: "/nilai", label: "Nilai" }, { href: "/paket", label: "Paket" }, { href: "/data", label: "Data" }, { href: "/rkbu", label: "Cetak RKBU" }, { href: "/hta", label: "HTA" }] },
  { grup: "SI-FARMALKES", item: [{ href: "/pemeliharaan", label: "Pemeliharaan" }, { href: "/alat", label: "Detail Alat" }, { href: "/kalibrasi", label: "Pengujian & Kalibrasi" }, { href: "/kalender", label: "Kalender" }, { href: "/peminjaman", label: "Peminjaman" }] },
  { grup: "Modul", item: [{ href: "/cmms", label: "CMMS (TRILUX)" }, { href: "/imms", label: "EMASCARE" }, { href: "/monitoring", label: "SI-LOGGER" }, { href: "/tracking", label: "SI-TRACKING" }, { href: "/avicenna", label: "AVICENNA" }, { href: "/smart-mfk", label: "SMART MFK" }, { href: "/jdih", label: "JDIH" }] },
  { grup: "Admin", item: [
    { href: "/admin/ekspor", label: "CMS Impor-Ekspor" }, { href: "/admin/impor", label: "· Impor Excel" }, { href: "/admin/dokumen", label: "Dokumen Paket" },
    { href: "/admin/pemeliharaan", label: "Pemeliharaan (admin)" }, { href: "/admin/lembar-kerja", label: "Lembar Kerja" }, { href: "/admin/pengetahuan", label: "Pengetahuan AI" },
    { href: "/admin/alat", label: "Daftar Alat" }, { href: "/admin/jadwal", label: "Jadwal Preventif" }, { href: "/admin/kalibrasi", label: "Kalibrasi (admin)" },
    { href: "/admin/stok", label: "Stok & BHP" }, { href: "/admin/audit", label: "Audit Inventaris" }, { href: "/admin/htm", label: "HTM WHO 2025" },
    { href: "/admin/bobot", label: "Pembobotan" }, { href: "/admin/regulasi", label: "Regulasi" }, { href: "/admin/kir", label: "KIR Ruangan" }, { href: "/admin/mutasi", label: "Relokasi & Mutasi" },
    { href: "/admin/label-inspeksi", label: "Label Inspeksi" }, { href: "/admin/analitik", label: "Analitik WHO" }, { href: "/admin/monitoring", label: "Monitoring (admin)" },
    { href: "/admin/log", label: "Log Impor" }, { href: "/admin/situs", label: "CMS Situs" }, { href: "/admin/jdih", label: "CMS JDIH" },
    { href: "/admin/karyawan-ai", label: "Karyawan AI" }, { href: "/admin/pengguna", label: "CMS Pengguna" }, { href: "/admin/user-system", label: "· User System" }, { href: "/admin/sistem", label: "Sistem" },
  ] },
];
export const SEMUA_MENU = MENU_AKSES.flatMap((g) => g.item.map((i) => i.href));


/** Href menu yang menutup alamat `path` (awalan terpanjang), atau null bila tidak diatur. */
export function menuUntuk(path: string) {
  let hasil: string | null = null;
  for (const h of SEMUA_MENU) if ((path === h || path.startsWith(h + "/")) && (!hasil || h.length > hasil.length)) hasil = h;
  return hasil;
}
