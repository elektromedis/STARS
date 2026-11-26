# Patch STARS — Fase A–E (hasil pembedahan TRILUX)

Isi patch ini **menambah** berkas baru dan mengubah dua berkas lama (`prisma/schema.prisma`, `src/app/admin/layout.tsx`) lewat skrip yang aman dijalankan ulang. Tidak ada berkas STARS Anda yang ditimpa.

## 1. Salin & terapkan (di PC, folder `...\GitHub\STARS\stars`)

1. Ekstrak zip ini **ke dalam folder `stars`** (struktur `src/`, `prisma/`, `scripts/` akan menyatu dengan yang ada).
2. Jalankan skrip penerap (membuat cadangan `*.bak`):
   ```
   python scripts/terapkan-fase-a-e.py
   ```
   Skrip menambah kolom/model ke `schema.prisma` dan menu baru ke `admin/layout.tsx`. Bila titik sisip menu tidak ditemukan, skrip berhenti dengan pesan; tambahkan menu manual (daftar di bawah).
3. Pasang & periksa:
   ```
   npm install
   npx prisma generate
   npm run typecheck
   npm run build
   ```
   > Kode ini belum dijalankan terhadap `tsc`/`next build` karena lingkungan penyusun tidak punya `node_modules`. Migrasi SQL sudah diuji di SQLite dan kesesuaian kolom schema↔SQL sudah dicek otomatis. Bila `typecheck` menemukan salah ketik/impor, perbaiki di berkas yang disebut (semuanya mengikuti pola `admin/stok` dan `admin/lembar-kerja`).
4. Uji lokal: `npm run db:migrate` (membuat 3 migrasi `20261129*` bila belum ada pada DB dev) lalu `npm run dev`.

## 2. Migrasi (urut setelah `20261128090000_mutasi_alat`)
| Migrasi | Isi |
|---|---|
| `20261129090000_fase_a_penerimaan_master` | Rekanan (supplier/rekanan/kalibrator/servis dalam 1 tabel), MerkAlat, TipeAlat, PenerimaanAlat, BerkasPenerimaan; kolom `Alat`: noInternal, urutJenis, soleAgent, tanggalTerhitung, nilaiResidu, kodeSimak, kodeSimbada, penerimaanId |
| `20261129100000_fase_b_tugas_skp` | Skp (Sistem Kredit Poin), MasterTugas; `JadwalPreventif.tugasId`; `PerintahKerja` rating & persetujuan |
| `20261129110000_fase_c_logistik` | `MutasiAlat`: dijemputOleh/Pada, gudang, nomorPenghapusan |

Semua hanya **menambah** (tabel baru / kolom nullable) — data lama aman. Cadangkan DB sebelum deploy (`stars_data` volume).

## 3. Menu baru (Admin → CMS Pemeliharaan)
Penerimaan Alat · Master Rekanan & Merk · Log Book Alat (seksi Inventarisasi) · Master Tugas & SKP · Jadwal Massal · Rating & Persetujuan WO · Logistik Mutasi · Kinerja Pemeliharaan.
Rute: `/admin/penerimaan`, `/admin/master`, `/admin/logbook`, `/admin/tugas`, `/admin/jadwal-massal`, `/admin/rating`, `/admin/logistik`, `/admin/kinerja`.

## 4. Pemetaan fase
- **A** master + penerimaan (kontrak, BAP, berkas — memakai penyimpanan `dokumen-alat` & validasi isi berkas yang sudah ada) + kolom aset tambahan (edit di Log Book).
- **B** master tugas (periode, durasi, biaya, kritis, suku cadang, kata kunci alat) + SKP; **jadwal massal** per unit/ruangan/instalasi dengan pratinjau & anti-duplikat; rating 1–5 & persetujuan WO; log book (garis waktu WO, lembar kerja, kalibrasi, mutasi).
- **C** melengkapi modul mutasi yang sudah ada: penjemputan, penggudangan, pengembalian, usulan penghapusan (membuat `Penghapusan` nomor `HPS-tahun-nnnn` — **cek format nomor ini sama dengan modul Penghapusan Anda**).
- **D** dashboard waktu tanggap/penyelesaian, kepatuhan preventif, kinerja teknisi (termasuk poin SKP & rating), penyusutan garis lurus per unit.
- **E** kolom `kodeAspak` (sudah ada), `kodeSimak`, `kodeSimbada` — hanya pencatatan; tidak ada sambungan ke sistem resmi.

## 5. Impor master dari TRILUX (opsional)
```
set TRILUX_DB_URL=mysql://pengguna:sandi@host:3306/namadb
npx tsx --env-file=.env scripts/impor-trilux-mysql.ts            # pratinjau
npx tsx --env-file=.env scripts/impor-trilux-mysql.ts --tulis    # tulis
npx tsx --env-file=.env scripts/impor-trilux-mysql.ts --tulis --merk-dari-alat
```
Hanya SELECT ke TRILUX; ulang-aman. Mengimpor `m_rekanan`, `m_kalibrator`, `skp`, `m_task` (+suku cadang), `penerimaan`. Asumsi yang perlu dicek: `m_task.durasi` dianggap **jam**; `satuan` 0 hari/1 minggu/2 bulan; nama kolom mengikuti dump di `db/*.sql` — sesuaikan bila DB produksi berbeda.

## 6. Deploy ke VPS
1. Commit & push (atau salin) perubahan, lalu jalankan skrip deploy Anda yang biasa (`deploy/pasang-vps.sh` / `vps.bat`). Container menjalankan `prisma migrate deploy` saat start, sehingga 3 migrasi baru diterapkan otomatis.
2. Sebelum itu: salin cadangan volume `stars_data`.
3. Setelah naik: buka `/admin/tugas` (isi SKP & tugas atau jalankan impor), lalu `/admin/jadwal-massal` → **Pratinjau** sebelum **Buat jadwal**.
4. Pastikan `UPLOAD_DIR` (sudah `/app/uploads` di compose) ada pada volume `stars_uploads`.

## 7. Catatan keamanan dari pembedahan TRILUX (jangan dibawa ke STARS)
Akun cadangan hard-coded di kode, kata sandi lemah, rahasia di file konfigurasi, debug toolbar aktif, dan tanpa CSRF. Patch ini tidak menyalin satu pun; aksi memakai `sesiHalaman`, validasi `zod`, audit log, dan mode baca `STARS_MODE=internet`. Disarankan segera mengganti kredensial/rahasia TRILUX yang pernah tertulis di repositori.

## 8. Yang belum / perlu keputusan Anda
- Rating oleh pelapor (tanpa akun) lewat halaman lacak publik belum dibuat; saat ini rating diisi Operator+ dari `/admin/rating`.
- SKP hirarkis TRILUX (`parent_id`, `skp_path`) diratakan menjadi satu daftar kode+poin.
- Form master tugas hanya menambah; mengubah tugas yang sudah ada saat ini lewat impor atau Prisma Studio (tombol ubah menyusul bila diperlukan).
