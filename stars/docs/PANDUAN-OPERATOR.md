# Panduan Operator STARS (materi pelatihan 60 menit)

Untuk operator unit kerja RSUD Cipayung. Tidak perlu keahlian komputer khusus — cukup bisa Excel.
Susunan materi = urutan sesi pelatihan. Rekam layar saat sesi berlangsung untuk jadi video panduan.

## Menit 0–10 · Mengenal STARS

- Buka alamat STARS (intranet: `http://<IP-server>:3000`, internet: alamat https RS).
- **Tanpa login** semua orang bisa melihat: Overview (KPI + grafik), Nilai, Paket (cari & filter), Data (unduh).
- Filter di atas halaman: **Tahun → Tahap → Nama Unit Kerja → Kategori**. Pilih unit Anda dan lihat angkanya.
- Penting dipahami: **tahap tidak dijumlahkan** — satu tahap adalah satu revisi anggaran; dashboard menampilkan satu tahap (bawaan: tahap terakhir tahun berjalan).

## Menit 10–20 · Login dan peran

1. Klik **Masuk** → isi email + sandi yang diberikan Admin.
2. Peran Anda **Operator**: boleh mengunggah dan mengekspor data **unit Anda sendiri** saja.
3. Salah sandi 5× = diblokir sementara (±15 menit). Lupa sandi → hubungi Admin (Elektromedik).
4. Sesi habis setelah 8 jam — login ulang adalah hal normal.

## Menit 20–40 · Latihan inti: unduh template → isi → unggah

1. **Admin → Ekspor & Template** → klik **Unduh template**.
2. Buka di Excel, isi sheet `paket`, satu baris = satu paket. Aturan utama:
   - `unit_kerja`: harus persis salah satu dari 28 unit (lihat sheet `petunjuk` di template).
   - `tahun` 4 digit; `tahap`: Penetapan / Pergeseran / Perubahan / Ranwal; `jenis`: Pemeliharaan / Pengadaan.
   - `nilai`, `harga_satuan`, `vol1`, `vol2`: angka tanpa "Rp" (format Indonesia 1.000.000,50 boleh).
   - `serapan`: ya/tidak (sudah terserap atau belum).
   - **Jangan mengganti nama kolom. Jangan menghapus kolom `kode`** (pengenal baris — kosong untuk baris baru).
3. **Admin → Impor Excel** → pilih berkas → **Periksa**.
   - Tabel pratinjau muncul + daftar **error** (merah, menyebut baris & kolom — wajib diperbaiki) dan **peringatan** (kuning — boleh lanjut).
   - Baris lama yang cocok ditandai "akan diperbarui" — ini normal, bukan duplikat.
4. **Simpan** (aktif hanya bila nol error) → buka dashboard → pastikan data Anda muncul dan totalnya masuk akal.

**Latihan error (sengaja):** ketik unit "ELEKTROMEDIS" (salah) dan nilai "satu juta" → Periksa → baca pesannya → perbaiki → Simpan.

## Menit 40–50 · Memperbarui data yang sudah ada

Siklus **unduh → edit → unggah**:
1. **Ekspor & Template** → pilih tahun/tahap/unit Anda → unduh XLSX (kolom `kode` ikut).
2. Ubah angka yang perlu (mis. tandai `serapan` = ya) — **jangan sentuh kolom `kode`**.
3. Unggah kembali lewat Impor → baris yang sama diperbarui, tidak ada data ganda.

**Mengganti data lama seutuhnya (satu kali impor):** di halaman Impor, centang
**"Ganti data lama (hapus lalu impor ulang)"**. Semua paket lama pada *tahun & tahap yang sama*
dengan isi berkas dihapus dulu, lalu diganti seluruh isi berkas — cocok bila daftar lama mau
dibuang dan diganti versi baru. Jumlah baris yang akan terhapus tampil saat **Periksa**, dan ada
konfirmasi sebelum Simpan. Akun yang dibatasi satu unit hanya mengganti data unitnya sendiri.
Hati-hati: penghapusan tidak bisa dibatalkan (buat Cadangan dulu di Admin → Sistem bila ragu).

**Ekspor PDF & formulir cetak:** di **Ekspor & Template** kini ada tombol **PDF** (laporan daftar
paket siap cetak, lengkap dengan total), **PDF rekap unit**, dan **Formulir PDF (cetak)** — formulir
kosong untuk pengumpulan usulan tertulis dari unit sebelum disalin ke template Excel.

## Menit 50–60 · Hal penting lain + tanya jawab

- **Log Impor**: semua unggahan terekam (siapa, kapan, berkas apa). Berkas asli tersimpan di server.
- **Nol error ≠ angka benar.** Validasi hanya menjaga format; cocokkan total dengan kertas kerja Anda.
- Jadwal unggah dan kontak bantuan: lihat `docs/SOP.md`.

## Pesan error yang sering muncul

| Pesan | Artinya | Solusi |
|---|---|---|
| "unit_kerja tidak dikenal (baris N)" | Nama unit tidak sama dengan daftar resmi | Salin nama unit dari sheet `petunjuk` |
| "nilai bukan angka (baris N)" | Ada huruf/"Rp" di kolom angka | Isi angka saja |
| "nilai ≠ vol × harga" (peringatan) | Perkalian tidak pas (sering karena PPN) | Boleh lanjut bila memang begitu di kertas kerja |
| "bukan unit Anda (baris N)" | Operator hanya boleh unit sendiri | Hapus baris itu / minta operator unit ybs. |
| Tombol Simpan tidak aktif | Masih ada error merah | Perbaiki semua error, Periksa ulang |
