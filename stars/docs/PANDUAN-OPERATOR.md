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
5. Login dan menu **Admin** bisa dipakai dari mana saja: komputer RS (`http://<IP-server>:3000`) maupun
   HP/rumah lewat alamat **https STARS** (mis. `https://….ts.net`). Login berlaku per alamat — bila pindah
   alamat, login sekali lagi. Membuka dokumen paket tanpa login akan diarahkan ke halaman Masuk,
   lalu dokumen langsung terbuka setelah berhasil masuk.

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
- **Hak akses Viewer:** hanya melihat & mengunduh (tidak bisa impor). Bila akun Viewer diberi unit kerja
  (Admin → Pengguna → *Batas unit kerja*), seluruh data, ekspor, foto laporan, dan dokumennya otomatis
  dibatasi ke unit itu — filter unit terkunci.
- **"Semua Tahapan":** angka total & grafik memakai *pagu final* (tahap terakhir tahun itu) agar paket yang
  sama tidak terhitung dua kali; tabel *Perbandingan per Tahap* menunjukkan nilai tiap tahap dan selisihnya.
  Daftar paket dan ekspor tetap berisi baris dari semua tahap.
- **Dokumen paket (RKPBU, AKPA, Nota Dinas, SP/SPK, Invoice/Faktur):** Admin → *Dokumen Paket* → cari paket →
  *Kelola* → unggah per jenis (PDF/JPG/PNG/DOCX/XLSX, maks 15 MB; isi berkas diperiksa, bukan hanya
  ekstensinya). Di menu Paket, kolom dokumen menampilkan ikon bila sudah ada; membukanya wajib login, dan
  Viewer ber-unit hanya bisa membuka dokumen unitnya. Operator yang dibatasi unit hanya mengelola dokumen unitnya.
- **Label QR alat:** Admin → *Daftar Alat* → *Cetak label QR alat* (per unit/ruangan) atau *Cetak label QR*
  di baris satu alat. Tiap QR menunjuk tepat ke satu alat; dipindai kamera HP (atau tombol Scan QR) →
  halaman **detail inventaris** alat itu (berisi tombol *Lapor Kerusakan*). Label lama (berisi `/lapor?alat=`)
  tetap berfungsi. Isi kolom alamat dengan alamat **https publik** STARS (mis. Tailscale) —
  alamat `localhost`/`http://192.168…` tidak bisa dibuka dari HP. Agar tidak perlu diisi tiap kali, Admin
  server bisa menambahkan `STARS_URL_PUBLIK=https://…` di `deploy\.env` lalu menjalankan ulang `server-rs.bat`.
  Cetak di kertas stiker A4 pada skala 100% (ukuran sebenarnya).
- **Inventaris Alat Kesehatan (publik):** menu **Pemeliharaan** → bagian *Inventaris Alat Kesehatan*. Siapa pun
  (tanpa login) bisa mencari alat, menyaring per unit/jenis/kondisi/status kalibrasi, dan mengurutkan kolom.
  Kolom: **Nomor Seri (SN)** · QR · **Foto** · Nama Alat · Unit · Kondisi · Kalibrasi · **Dokumen** (n/12 jenis
  dokumen tersedia). Klik QR untuk memperbesar → *Detail inventaris*, *Lapor kerusakan*, *Unduh QR*, atau (bila
  login) *Cetak label*. Viewer ber-unit hanya melihat alat unitnya.
- **Detail inventaris alat** (klik nama/foto alat, atau scan QR-nya): identitas ala Trilux (SN, merk, tipe, tahun,
  lokasi, pelayanan), data teknis, riwayat pengujian & kalibrasi, riwayat pemeliharaan, jadwal preventif, QR, dan
  **File Penerimaan** (Kontrak, BA Penerimaan, AKD/AKL, BA Uji Fungsi, BA Uji Coba) serta **File Pendukung**
  (Garansi, Sertifikat Kalibrasi, SOP, User Manual, Service Manual, SP Pemeliharaan, SP Perbaikan) + File Lainnya.
  Kotak ⦸ = belum ada. Daftar dokumen bisa dilihat publik, tetapi **membuka berkas wajib login**; data
  *Pendanaan* hanya tampil untuk petugas yang login.
- **Foto & dokumen alat (Operator):** buka detail alat → *Pasang foto* (foto diperkecil otomatis; tampil publik,
  jadi **jangan ada pasien/wajah** di foto) dan *Unggah dokumen* / klik kotak dokumen yang masih ⦸ (PDF/JPG/PNG/
  DOCX/XLSX, maks 30 MB). Untuk User Manual, Service Manual, SOP, dan AKD/AKL tersedia centang **"Terapkan juga
  ke alat lain dengan nama, merek & tipe sama"** — satu berkas langsung tertaut ke semua alat sejenis.
  Hapus dokumen bisa dari alat ini saja atau dari semua alat yang memakainya. Sertifikat Kalibrasi diambil
  otomatis dari CMS Kalibrasi. Dari Admin → *Daftar Alat*, tautan *Foto, dokumen & detail* membuka halaman ini.
- **CMS Kalibrasi (Operator):** Admin → *Kalibrasi* → *Unggah sertifikat* (PDF/JPG/PNG, boleh banyak sekaligus).
  Dari **PDF berteks** STARS mengisi otomatis tanggal kalibrasi, masa berlaku, nomor sertifikat, lembaga, hasil
  (laik/tidak), dan alatnya (dicocokkan lewat **nomor seri/kode** yang tercantum; ikon ✦ = terisi otomatis).
  Laporan kolektif yang memuat banyak alat otomatis menjadi satu baris per alat. PDF hasil pindai/foto tidak
  berteks → isi tanggal & data secara manual (alat tetap dicoba dicocokkan dari **nama berkas**, mis.
  `Sertifikat_SP2009-00102.pdf`). Masa berlaku yang tidak tertulis = tanggal kalibrasi + 12 bulan (bisa diubah
  6/24/36 bulan). **Periksa isian sebelum menekan Simpan.** Mengunggah ulang sertifikat untuk alat & tanggal
  yang sama memperbarui catatan (tidak dobel). Klik alat di *Perlu perhatian* untuk langsung mencatat
  kalibrasinya; riwayat bisa dicari, diubah (ganti tanggal/sertifikat), dan dihapus. Membuka sertifikat wajib login.
  Setiap catatan punya **Jenis: Kalibrasi atau Pengujian** (dikenali otomatis dari judul sertifikat bila jelas).
  Dari detail alat, tombol *Catat kalibrasi* membuka CMS dengan alat itu sudah terpilih.
- **Pengujian dan Kalibrasi (menu publik):** cakupan berlaku, jumlah kedaluwarsa/tidak laik, jatuh tempo 12 bulan ke
  depan (untuk perencanaan anggaran), lembaga penguji, catatan per tahun, rekap per unit, dan tabel data lengkap
  (*Per alat* = status terkini, *Seluruh riwayat* = semua catatan) dengan filter unit/status/jenis/lembaga/tahun.
  Tombol **Unduh Excel** mengikuti filter yang sedang dipakai.
- **Urutkan tabel paket:** klik judul kolom (Kode, Nama Paket, Unit Kerja, Nilai, Serapan); klik lagi untuk membalik.
- **Menu bawah** (gaya aplikasi bank): **Beranda · Riwayat · [Scan QR] · Notifikasi · Akun Saya** — di HP
  menempel di dasar layar, di komputer mengambang di tengah bawah.
  - **Scan QR** (tombol bulat di tengah): layar kamera penuh dengan bingkai pindai, tombol *Galeri* (pilih foto QR)
    dan *Senter*, serta tab *Ketik Kode* (ketik nomor seri/kode/nama alat). Setelah terbaca muncul kartu alat
    dengan tombol **Detail Inventaris** dan **Lapor Kerusakan**. QR lama Trilux & label lama tetap dikenali.
    Kamera hanya jalan lewat alamat **https** (mis. Tailscale); lewat http lokal gunakan *Galeri* atau *Ketik Kode*.
  - **Riwayat:** laporan yang dikirim dari HP/komputer ini beserta tahapnya (Terkirim → Ditinjau → Diproses →
    Selesai), alat yang pernah dipindai, dan (bila login) aktivitas akun. Riwayat laporan & scan disimpan di
    browser perangkat itu, bukan di akun.
  - **Notifikasi:** pelapor mendapat kabar saat laporannya ditinjau/diproses/selesai (lencana merah di menu).
    Petugas yang login juga mendapat: laporan kerusakan baru, perintah kerja yang ditugaskan, preventif jatuh
    tempo, dan kalibrasi kedaluwarsa/segera habis.
  - **Akun Saya:** profil, peran & unit, pintasan Admin, **ganti sandi sendiri**, dan Keluar.
- **Lapor Kerusakan:** kolom *Nama alat*, *Unit kerja*, dan *Rincian lokasi* menampilkan pilihan otomatis saat
  diketik (alat terdaftar RSUD Cipayung, daftar unit, ruangan unit itu). Memilih alat langsung mengisi unit &
  lokasinya. Lampiran: **foto** (JPG/PNG maks 5 MB, foto HP besar diperkecil otomatis) dan **video**
  (MP4/MOV/WEBM maks 20 MB, ±10–20 detik). Foto/video hanya bisa dilihat petugas (Admin → Pemeliharaan).
- **Cetak RKBU / RKPBU** (Perencanaan-Pengadaan → tab *Cetak RKBU*, perlu login): pilih jenis (RKPBU
  Pemeliharaan / RKBU Pengadaan), tahun & tahap, unit, dan rekening → *Buat & buka editor*. Tabel 15 kolom
  (No · Kode Rekening · Barang/Jasa · Uraian · Lokasi · Kode Barang · Vol 1 · Satuan · x · Vol 2 · Satuan ·
  Harga Satuan · Jumlah · Prioritas · Keterangan) terisi dari data **Paket**; PPN dideteksi otomatis (11 %/12 %).
  - Panel kiri: *Tabel kebutuhan* (tambah/gandakan/geser/hapus baris, *Ambil dari data Paket*), *Judul &
    identitas*, *Kop surat* (unggah **logo** sekali), *Tanda tangan* (jabatan, nama, NIP, tempat & tanggal),
    *Catatan kaki*, *Lampiran* (gambar, 2 per halaman tegak), *Judul kolom*, *Pengaturan cetak* (A4/F4,
    lanskap/tegak, ukuran huruf, nomor halaman, jaga baris utuh). **Klik baris di pratinjau** untuk mengubahnya.
  - Jumlah = Vol 1 × Vol 2 × Harga satuan × (1 + PPN); bisa diganti **manual** per baris. Mengubah baris di
    dokumen **tidak** mengubah data Paket.
  - **Simpan** (Operator; Ctrl+S) → dokumen tersimpan di daftar dan bisa dibuka/diubah kapan saja. Kop, nama
    & NIP penandatangan cukup diisi sekali: dokumen baru menyalin dari dokumen terakhir. Tombol *Salin* di
    daftar membuat dokumen baru dari dokumen lama (mis. untuk tahap berikutnya).
  - **Cetak / Simpan PDF** membuka dialog cetak browser (pilih *Simpan sebagai PDF*; matikan *Header dan
    footer* browser). Kepala tabel berulang tiap halaman, tanda tangan di akhir tabel. **Excel** mengunduh
    tabel yang sama (.xlsx) untuk diolah lanjut. Viewer bisa membuka & mencetak, tetapi tidak menyimpan.
- **HTA — bandingkan alat kesehatan** (menu *HTA*, perlu login): ketik jenis/merek/tipe → pilih 2–3 produk →
  *Bandingkan*. Produk = **merek + tipe** alat di Inventaris (data dihitung otomatis dari semua unit sejenis)
  atau **produk kandidat** pengadaan (mis. dari e-Katalog) yang ditambah Operator lewat *Tambah produk kandidat*.
  - Halaman perbandingan: **skor 0–100** tiap produk, daftar *"Mengapa A lebih unggul dari B?"* (mis. "2,7x
    lebih jarang dilaporkan rusak"), skor per domain, dan rincian kriteria: **Keselamatan & Mutu** (uji/kalibrasi
    laik, kalibrasi berlaku, AKL/AKD), **Keandalan** (laporan kerusakan/unit/tahun, lama perbaikan, kondisi
    baik — 24 bulan terakhir), **Ekonomi** (harga per unit, biaya pemeliharaan & perbaikan/unit/tahun, garansi,
    umur teknis), **Spesifikasi Teknis** (diisi tim), **Dukungan & Kebijakan** (kelengkapan dokumen, manual, TKDN).
  - Kriteria yang datanya kosong pada salah satu produk **tidak dihitung** (adil untuk kandidat yang belum
    dimiliki). Bobot tiap domain bisa diatur (0–5) dan tersimpan di perangkat.
  - Operator: *Lengkapi data HTA* / *Ubah data HTA* untuk mengisi harga, garansi, umur teknis, TKDN, AKL, negara
    asal, distributor, tautan e-Katalog, catatan, foto, dan **spesifikasi teknis** (parameter + nilai + satuan +
    arah "lebih tinggi/lebih rendah lebih baik"). Pakai **nama parameter yang sama** di tiap produk agar bisa
    dibandingkan. Hasil HTA adalah alat bantu keputusan, bukan pengganti kajian klinis/Komite.
- **Live Monitoring — suhu & kelembapan alat** (menu *Live Monitoring* = Live Medical Device Environmental
  Monitoring System; dashboard terbuka untuk umum, pengaturan di Admin → *Monitoring*):
  - **Siapkan sekali (Operator):** Admin → Monitoring → *Tambah lokasi* (mis. "Kulkas Vaksin Farmasi"; pilih
    jenis → batas contoh terisi otomatis: Kulkas 2–8 °C, Kulkas darah 2–6 °C, Freezer ≤ −15 °C, Ruangan 15–25 °C
    & 30–70 %RH — **sesuaikan SOP RS & pabrikan**). Lalu tab *Sensor* → *Daftarkan sensor* → **token** tampil
    sekali: salin & tanam di perangkat. Cara menyambungkan sensor: `docs/MONITORING-IOT.md`.
  - **Dashboard** memperbarui sendiri tiap 15 detik: kartu tiap titik (nilai terkini, meter batas, grafik 24 jam),
    panel *Perlu tindakan*, dan tombol *Notifikasi aktif* (bunyi + notifikasi browser selama halaman terbuka).
  - **Status:** *Normal*; *Di luar batas* (nilai terakhir keluar batas, belum alarm); **Alarm** (keluar batas
    N bacaan berturut-turut — N diatur per lokasi, bawaan 2); *Terputus* (tidak ada data melebihi batas menit).
  - **Saat alarm (Operator):** buka lokasi → *Riwayat alarm* → **Akui** → isi tindakan, produk/alat terdampak,
    dan pencegahan. Pengakuan tercatat dengan nama & waktu (log audit).
  - **Inspeksi harian:** di *Ringkasan harian*, tekan *Catat inspeksi pagi/sore* (memakai bacaan sensor terkini).
    Kalender menandai hari beralarm (garis merah) dan inspeksi P/S.
  - **Laporan:** pilih rentang (24 jam/7/30 hari/1 tahun atau tanggal) → statistik min/maks/rata-rata/**MKT**,
    % waktu dalam batas, durasi di luar batas; *CSV*/*Excel* untuk data mentah; *Cetak laporan* untuk PDF.
  - **Logger tanpa WiFi** (mis. LogTag USB): ekspor CSV dari LogTag Analyzer/LogTag Online → Admin → Monitoring →
    *Impor data logger* → *Pratinjau* (periksa contoh waktu) → *Impor*. Impor ulang berkas yang sama aman.
  - *Integrasi & uji* → *Kirim bacaan uji* untuk latihan tanpa sensor; Admin bisa menghapus bacaan uji sekaligus.
- **Membersihkan data lama (Admin):** Admin → Sistem → *Hapus data paket per tahun / tahap*. Centang
  tahun/tahap, ketik `HAPUS`, lalu tekan *Hapus permanen*. Salinan basis data dibuat otomatis sebelum
  menghapus (di server: folder `cadangan` di samping basis data); tetap disarankan unduh cadangan dulu.

## Pesan error yang sering muncul

| Pesan | Artinya | Solusi |
|---|---|---|
| "unit_kerja tidak dikenal (baris N)" | Nama unit tidak sama dengan daftar resmi | Salin nama unit dari sheet `petunjuk` |
| "nilai bukan angka (baris N)" | Ada huruf/"Rp" di kolom angka | Isi angka saja |
| "nilai ≠ vol × harga" (peringatan) | Perkalian tidak pas (sering karena PPN) | Boleh lanjut bila memang begitu di kertas kerja |
| "bukan unit Anda (baris N)" | Operator hanya boleh unit sendiri | Hapus baris itu / minta operator unit ybs. |
| Tombol Simpan tidak aktif | Masih ada error merah | Perbaiki semua error, Periksa ulang |
