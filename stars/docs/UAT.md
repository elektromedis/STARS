# Rencana UAT (User Acceptance Test) — STARS RSUD Cipayung

> Versi 2 — 28 November 2026. Fokus: **inti CMMS-inventaris** (bagian G), karena STARS menjadi satu-satunya aplikasi
> dan TRILUX hanya dipertahankan sebagai arsip. Kolom *Pra-UAT* = hasil uji otomatis oleh pengembang di server uji;
> kolom *Lulus* tetap diisi penguji nyata.

Tujuan: memastikan STARS siap dipakai sehari-hari oleh pengguna nyata sebelum serah terima.
Pelaksana minimal 3 orang: **1 operator Elektromedik**, **1 operator unit lain** (mis. Farmasi), **1 manajemen sebagai Viewer**.
Kriteria lulus: **semua skenario wajib (W) lulus, nol temuan Blocker**. Temuan Mayor diperbaiki lalu skenario diulang.

## Persiapan

- [ ] Server uji berjalan (`jalankan-produksi.bat` atau Docker) dan bisa diakses dari komputer lain di LAN.
- [ ] Akun dibuat oleh Admin (Admin → CMS Pengguna): `operator-elektromedik` (Operator, unit ELEKTROMEDIK), `operator-farmasi` (Operator, unit FARMASI), `viewer-manajemen` (Viewer).
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
| B2 | W | Admin → CMS Impor-Ekspor: unduh template → isi 5 baris benar (unit ELEKTROMEDIK) → Periksa → Simpan | Pratinjau tanpa error, tersimpan, langsung tampil di dashboard publik | ☐ |
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

## G. Inti CMMS-inventaris (wajib sebelum TRILUX diarsipkan)

Pelaksana: operator Elektromedik (OE), operator unit lain (OU), Admin (AD), Viewer unit (VU).

| No | W | Skenario | Hasil diharapkan | Pra-UAT | Lulus |
|---|---|---|---|---|---|
| G1 | W | OE: Admin → CMS Pemeliharaan → Inventarisasi → Alat Kesehatan → tambah alat dengan kategori inventaris & nomor seri | Tersimpan, muncul di daftar dan kartu kategori | ✔ | ☐ |
| G2 | W | OE: simpan alat lain dengan nomor seri yang sama | Pesan ⚠ nomor seri ganda; banner kuning di Inventarisasi; muncul di lonceng notifikasi | ✔ | ☐ |
| G3 | W | OE: CMS Impor-Ekspor → Impor Excel (inventaris Trilux) → Periksa → Simpan; ulangi dengan *Ganti data lama* | Pratinjau benar; alat lama tanpa riwayat dihapus, yang punya riwayat dinonaktifkan | ✔ | ☐ |
| G4 | W | Cetak label QR alat → pindai dengan HP | Halaman detail alat terbuka | ☐ | ☐ |
| G5 | W | Publik: lapor kerusakan lewat QR → OE buat WO → selesai → TTE teknisi → pelapor setujui | Status berurutan benar; PDF berisi QR verifikasi | ☐ | ☐ |
| G6 | W | OE: jadwal preventif jatuh tempo | WO preventif terbentuk; muncul di notifikasi | ☐ | ☐ |
| G7 | W | OE: catat kalibrasi + unggah sertifikat | Status laik & masa berlaku tampil di detail alat | ☐ | ☐ |
| G8 | W | **Relokasi**: OE ajukan pindah ruangan (unit sama) → AD setujui → OE serah terima | Lokasi alat berubah; *Riwayat Lokasi* di detail alat; Berita Acara bisa dicetak | ✔ | ☐ |
| G9 | W | **Mutasi**: OE ajukan pindah ke unit lain; OE mencoba menyetujui pengajuannya sendiri | Persetujuan sendiri **ditolak**; setelah AD setuju & serah terima, unit alat berubah | ✔ | ☐ |
| G10 | W | Pengajuan kedua untuk alat yang sama saat yang pertama belum selesai | Ditolak dengan pesan jelas | ✔ | ☐ |
| G11 | W | OE: Dokumen Paket & Unggah Massal → pilih berkas bernama nomor seri / tipe | Pratinjau pasangan benar; berkas tidak cocok dilewati; dokumen muncul di detail alat | ✔ | ☐ |
| G12 |  | Sparepart & BHP-BMHP: catat keluar melebihi stok | Ditolak | ☐ | ☐ |
| G13 | W | KIR ruangan asal setelah relokasi selesai | KIR ditandai berubah; disahkan ulang | ☐ | ☐ |
| G14 | W | VU (Viewer unit) membuka Relokasi & Mutasi dan Inventarisasi | Hanya data unitnya; tidak ada tombol Ajukan/Setujui | ✔ | ☐ |
| G15 |  | AD: Karyawan AI → Jalankan sekarang (Petugas Inventaris) | Catatan kerja berisi temuan; notifikasi muncul | ✔ | ☐ |

### Rencana pemindahan fitur TRILUX (urutan)

1. **Relokasi & mutasi** — selesai di STARS (G8–G10).
2. **Depresiasi & kebutuhan sparepart** — berikutnya.
3. **Sinkron ASPAK** — hanya bila akses resmi (API/akun) dari Kemenkes tersedia.

Setelah bagian G lulus, TRILUX dibekukan sebagai arsip baca saja.

## Hasil pra-UAT otomatis

Dijalankan pengembang di server uji (data contoh), bukan pengganti uji oleh pengguna nyata.

| Tanggal | Cakupan | Hasil |
|---|---|---|
| 26 Nov 2026 | G3 (impor inventaris + Ganti data lama) | Lulus |
| 27 Nov 2026 | G1, G2, G8, G9, G10, G11, G14, G15 (14 pemeriksaan) + regresi CMS (15/15) & peran (11/11) | **Lulus semua** |
| — | G4 (pindai QR di HP), G5–G7, G12, G13 | Belum otomatis — wajib diuji penguji nyata |

## Form temuan

Salin tabel ini (atau pakai sheet Excel) dan isi setiap kali menemukan masalah:

| No | Tanggal | Penguji (peran) | Skenario | Temuan | Tingkat* | Status |
|---|---|---|---|---|---|---|
| 1 |  |  |  |  |  | Terbuka |

\* **Blocker** = tidak bisa dipakai / data salah · **Mayor** = fungsi utama terganggu tapi ada jalan lain · **Minor** = tampilan/kenyamanan.

Selesai UAT: tanda tangan ketiga penguji + Admin di bawah tabel temuan, simpan dokumen ini bersama berkas serah terima.
