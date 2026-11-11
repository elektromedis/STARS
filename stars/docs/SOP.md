# SOP Pengelolaan Data STARS — RSUD Cipayung (1 halaman)

**Aplikasi:** STARS — Sistem Terintegrasi Alat Kesehatan Rumah Sakit
**Berlaku untuk:** operator unit kerja, Admin STARS, IT RS. **Pemilik proses:** Unit Elektromedik / IPSRS.

## 1. Jadwal pembaruan data

| Kapan | Apa | Siapa |
|---|---|---|
| Setiap tahap anggaran terbit (Penetapan / Pergeseran / Perubahan / Ranwal) | Unggah data tahap tersebut, paling lambat 5 hari kerja setelah dokumen disahkan | Operator unit (data unitnya) atau Admin (semua unit) |
| Setiap ada realisasi/serapan | Perbarui kolom `serapan` lewat siklus ekspor → edit → unggah | Operator unit |
| Setiap Jumat | Unduh cadangan `.db` dari Admin → Sistem, simpan di drive RS (folder terpisah dari server) | Admin |
| Setiap malam (otomatis) | Sinkronisasi intranet → internet (`deploy/sinkron-harian.ps1`) | Terjadwal; Admin memeriksa hasilnya Senin |
| Setiap awal bulan | `npm audit` + cek pembaruan Next.js; pasang patch keamanan | IT RS |

## 2. Alur unggah data (ringkas)

1. Login → Admin → **Ekspor & Template** → unduh template (atau ekspor data yang ada).
2. Isi/ubah di Excel. **Jangan mengubah nama kolom dan jangan menghapus kolom `kode`.** Kolom `unit_kerja` wajib salah satu dari 28 unit resmi.
3. Admin → **Impor Excel** → pilih berkas → **Periksa** → baca pratinjau dan peringatan → **Simpan** (hanya aktif bila nol error).
4. Buka dashboard publik, cocokkan Total Nilai dengan kertas kerja. **Nol error bukan berarti angka benar** — kebenaran angka tanggung jawab pengunggah/PPA.

## 3. Persetujuan

Data tahap anggaran baru **diverifikasi PPA/keuangan** (total per tahap = kertas kerja) sebelum diumumkan ke manajemen. Selisih dicatat di Log Impor (kolom keterangan berkas) dan dilaporkan ke Admin.

## 4. Pelaporan gangguan

| Gejala | Tindakan pertama | Eskalasi |
|---|---|---|
| Halaman tidak terbuka dari LAN | Cek server menyala; jalankan ulang `jalankan-produksi.bat` / `docker compose up -d` | IT RS |
| Tidak bisa login / akun terkunci | Tunggu 15 menit; bila tetap, minta Admin setel ulang sandi | Admin STARS |
| Impor ditolak terus | Baca pesan error (nomor baris + kolom), perbaiki Excel | Admin STARS |
| Angka dashboard ≠ kertas kerja | Jangan diumumkan; cek Log Impor dan berkas asli di `uploads/` | Admin + PPA |
| Situs internet tidak mutakhir | Jalankan `npm run sync` manual dari server intranet | IT RS |

Kontak Admin STARS: Unit Elektromedik (ext. ___ / WA ___). Kontak IT RS: ext. ___.

## 5. Keamanan akun

- Satu orang satu akun; dilarang berbagi sandi. Akun pegawai pindah/keluar **dinonaktifkan hari itu juga** oleh Admin.
- Sandi minimal 10 karakter, diganti bila dicurigai bocor. Akun Super Admin hanya dipegang IT RS.
- Semua aktivitas admin terekam di audit log dan ditinjau Admin tiap bulan.

## 6. Pemulihan bencana (ringkas)

Server rusak → pasang ulang aplikasi dari repositori Git → ganti berkas database dengan cadangan `.db` terakhir → nyalakan → cocokkan Total Nilai. Target pemulihan: ≤ 1 hari kerja. Uji prosedur ini minimal 1× per 6 bulan.

---
*Disetujui oleh: Ka. IPSRS ________________  ·  IT RS ________________  ·  Tanggal: ________*
