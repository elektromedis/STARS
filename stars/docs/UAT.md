# Rencana UAT (User Acceptance Test) — STARS RSUD Cipayung

Tujuan: memastikan STARS siap dipakai sehari-hari oleh pengguna nyata sebelum serah terima.
Pelaksana minimal 3 orang: **1 operator Elektromedik**, **1 operator unit lain** (mis. Farmasi), **1 manajemen sebagai Viewer**.
Kriteria lulus: **semua skenario wajib (W) lulus, nol temuan Blocker**. Temuan Mayor diperbaiki lalu skenario diulang.

## Persiapan

- [ ] Server uji berjalan (`jalankan-produksi.bat` atau Docker) dan bisa diakses dari komputer lain di LAN.
- [ ] Akun dibuat oleh Admin: `operator-elektromedik` (Operator, unit ELEKTROMEDIK), `operator-farmasi` (Operator, unit FARMASI), `viewer-manajemen` (Viewer).
- [ ] Kertas kerja RKPBU/RKBU asli tersedia untuk pencocokan angka.

## A. Pengunjung publik (tanpa login)

| No | W | Skenario | Hasil diharapkan | Lulus |
|---|---|---|---|---|
| A1 | W | Buka halaman utama dari HP dan komputer | Judul "Profil Perencanaan-Pengadaan…", KPI dan grafik tampil, tanpa error | ☐ |
| A2 | W | Ganti filter Tahun → 2026, Tahap → Penetapan | Total Nilai = **Rp 790.243.459** (sama dengan PAGU kertas kerja) | ☐ |
| A3 | W | Ganti "Nama Unit Kerja" → ELEKTROMEDIK | KPI, grafik, dan tabel ikut berubah | ☐ |
| A4 | W | Halaman Paket: cari sebagian nama paket + filter status | Baris yang cocok saja yang tampil | ☐ |
| A5 | W | Halaman Data: unduh XLSX dan CSV | Berkas terbuka di Excel, isi sesuai filter | ☐ |
| A6 |  | Buka `/admin` tanpa login | Dialihkan ke `/login`, tidak ada data admin yang bocor | ☐ |

## B. Operator (login per unit)

| No | W | Skenario | Hasil diharapkan | Lulus |
|---|---|---|---|---|
| B1 | W | Login `operator-elektromedik` | Masuk ke `/admin`, hanya menu sesuai peran | ☐ |
| B2 | W | Unduh template → isi 5 baris benar (unit ELEKTROMEDIK) → Periksa → Simpan | Pratinjau tanpa error, tersimpan, langsung tampil di dashboard publik | ☐ |
| B3 | W | Unggah berkas berisi unit salah ketik ("ELEKTROMEDIS") dan nilai bukan angka | Ditolak; pesan menyebut **nomor baris dan kolom**; tombol Simpan nonaktif | ☐ |
| B4 | W | Unggah baris untuk unit FARMASI memakai akun Elektromedik | Baris ditandai error (bukan unitnya), tidak tersimpan | ☐ |
| B5 | W | Ekspor data unitnya → ubah 1 angka di Excel → unggah kembali | Baris yang sama **diperbarui**, tidak menggandakan (cek jumlah baris tetap) | ☐ |
| B6 |  | Unggah ulang berkas yang sama persis | "diperbarui", total tidak berubah | ☐ |
| B7 |  | Cek Log Impor | Tercatat: siapa, kapan, nama berkas, jumlah baris | ☐ |

## C. Viewer (manajemen)

| No | W | Skenario | Hasil diharapkan | Lulus |
|---|---|---|---|---|
| C1 | W | Login `viewer-manajemen`, buka halaman admin | Bisa melihat; tombol Simpan/kelola pengguna tidak tersedia | ☐ |
| C2 | W | Coba akses langsung URL impor dan tekan simpan (bila bisa) | Ditolak oleh server (bukan hanya tombol disembunyikan) | ☐ |

## D. Admin / Super Admin

| No | W | Skenario | Hasil diharapkan | Lulus |
|---|---|---|---|---|
| D1 | W | Tambah pengguna baru, setel ulang sandi, nonaktifkan akun uji | Semua berhasil; akun nonaktif tidak bisa login | ☐ |
| D2 | W | Lihat audit log setelah rangkaian uji | Login gagal/berhasil, impor, dan kelola pengguna tercatat | ☐ |
| D3 | W | Unduh cadangan `.db` dari Admin → Sistem | Berkas terunduh | ☐ |
| D4 | W | **Uji pulih**: matikan server, ganti berkas db dengan cadangan, nyalakan lagi | Data kembali seperti saat cadangan dibuat | ☐ |

## E. Keamanan & ketahanan

| No | W | Skenario | Hasil diharapkan | Lulus |
|---|---|---|---|---|
| E1 | W | Salah sandi 5× berturut-turut | Percobaan berikutnya ditolak sementara (±15 menit) | ☐ |
| E2 |  | Biarkan sesi login > 8 jam | Diminta login ulang | ☐ |
| E3 | W | Cabut kabel internet server intranet | Dashboard intranet tetap bisa diakses dari LAN | ☐ |
| E4 |  | Jalankan `npm run sync` dari intranet | Data muncul di server internet; server internet menolak impor langsung | ☐ |

## F. Migrasi data historis (bagian 1 Tahap 4)

| No | W | Skenario | Hasil diharapkan | Lulus |
|---|---|---|---|---|
| F1 | W | Cocokkan total tiap tahun/tahap di dashboard dengan kertas kerja keuangan | Selisih Rp 0 (lihat tabel sheet di `docs/TAHAPAN-PENGEMBANGAN.md` §1.7) | ☐ |
| F2 | W | **Verifikasi dengan PPA:** sheet *RKPBU PM ALKES - RANWAL 2027* — GRAND TOTAL tertulis Rp 724.757.041, jumlah baris data Rp 2.362.681.269 | PPA memutuskan angka yang benar; data diperbaiki bila perlu | ☐ |
| F3 |  | Baris berlokasi gabungan / "SELURUH UNIT" | Dicek apakah penempatan unitnya dapat diterima operator | ☐ |

## Form temuan

Salin tabel ini (atau pakai sheet Excel) dan isi setiap kali menemukan masalah:

| No | Tanggal | Penguji (peran) | Skenario | Temuan | Tingkat* | Status |
|---|---|---|---|---|---|---|
| 1 |  |  |  |  |  | Terbuka |

\* **Blocker** = tidak bisa dipakai / data salah · **Mayor** = fungsi utama terganggu tapi ada jalan lain · **Minor** = tampilan/kenyamanan.

Selesai UAT: tanda tangan ketiga penguji + Admin di bawah tabel temuan, simpan dokumen ini bersama berkas serah terima.
