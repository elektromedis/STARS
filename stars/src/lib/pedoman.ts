/**
 * Pedoman Penggunaan STARS — dasar hukum, SOP/alur penggunaan, dan referensi per fitur.
 * Sumber tunggal untuk halaman /about/pedoman serta unduhan PDF & DOC.
 */
export type BabPedoman = { id: string; judul: string; menu: string; tujuan: string; peran: string; dasar: string[]; sop: string[]; referensi: string[] };

export const VERSI_PEDOMAN = "Versi 1.0 — November 2026";

/** Dasar hukum umum yang berlaku untuk seluruh aplikasi. */
export const DASAR_UMUM = [
  "Undang-Undang Nomor 17 Tahun 2023 tentang Kesehatan.",
  "Peraturan Pemerintah Nomor 28 Tahun 2024 tentang Peraturan Pelaksanaan UU Nomor 17 Tahun 2023 tentang Kesehatan.",
  "Undang-Undang Nomor 11 Tahun 2008 tentang Informasi dan Transaksi Elektronik sebagaimana terakhir diubah dengan UU Nomor 1 Tahun 2024.",
  "Peraturan Pemerintah Nomor 71 Tahun 2019 tentang Penyelenggaraan Sistem dan Transaksi Elektronik (termasuk tanda tangan elektronik).",
  "Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi.",
  "Peraturan Menteri Kesehatan Nomor 15 Tahun 2023 tentang Pemeliharaan Alat Kesehatan di Fasilitas Pelayanan Kesehatan.",
  "Keputusan Menteri Kesehatan Nomor HK.01.07/MENKES/1128/2022 tentang Standar Akreditasi Rumah Sakit (bab Manajemen Fasilitas dan Keselamatan).",
];

export const BAB: BabPedoman[] = [
  {
    id: "akun", judul: "Akun, Peran, dan Keamanan", menu: "Masuk / Daftar / ADMIN › Pengguna",
    tujuan: "Mengatur siapa yang dapat melihat dan mengubah data STARS sesuai tugasnya.",
    peran: "Public (tanpa akun), Viewer (unit kerja), Operator (elektromedis), Admin, Super Admin.",
    dasar: ["UU 27/2022 tentang Pelindungan Data Pribadi.", "PP 71/2019 tentang Penyelenggaraan Sistem dan Transaksi Elektronik.", "Permenkes 24/2022 tentang Rekam Medis (prinsip kerahasiaan data pasien)."],
    sop: ["Pengguna mendaftar di halaman Daftar memakai email aktif (contoh nama@gmail.com).", "Admin memeriksa identitas, menetapkan peran dan unit kerja, lalu menyetujui akun.", "Akun Viewer hanya melihat data unit kerjanya sendiri.", "Lupa sandi: gunakan menu Lupa sandi; tautan dikirim ke email terdaftar.", "Admin menonaktifkan akun pegawai yang mutasi/berhenti pada hari yang sama.", "Rahasia server (.env, token, sandi aplikasi email) tidak boleh dibagikan lewat chat atau disimpan di Git."],
    referensi: ["ISO/IEC 27001:2022 Information security management systems.", "WHO. Development of medical devices policies, 2nd ed. Geneva: WHO; 2025 — §9.1 Patient data privacy, §9.5 Cybersecurity."],
  },
  {
    id: "perencanaan", judul: "Perencanaan-Pengadaan (Nilai, Paket, Data, Cetak RKBU)", menu: "SI-ALKES › Perencanaan-Pengadaan",
    tujuan: "Memantau nilai, paket, dan dataset RKPBU/RKBU alat kesehatan BLUD per tahun dan tahap anggaran.",
    peran: "Viewer melihat; Operator/Admin mengimpor Excel dan mencetak RKBU.",
    dasar: ["Peraturan Presiden 16/2018 tentang Pengadaan Barang/Jasa Pemerintah sebagaimana diubah dengan Perpres 12/2021.", "Permendagri 77/2020 tentang Pedoman Teknis Pengelolaan Keuangan Daerah.", "Permendagri 79/2018 tentang Badan Layanan Umum Daerah.", "Permendagri 19/2016 tentang Pedoman Pengelolaan Barang Milik Daerah."],
    sop: ["Siapkan kertas kerja RKPBU/RKBU sesuai template di menu Ekspor & Template.", "ADMIN › Impor Excel: pilih tahun dan tahap (Ranwal/Penetapan/Pergeseran/Perubahan), unggah berkas.", "Periksa ringkasan impor dan Log Impor; perbaiki baris yang ditolak.", "Telusuri Nilai per unit/kategori, daftar Paket, dan Data.", "Cetak RKBU dari menu Cetak RKBU untuk pengesahan."],
    referensi: ["WHO. Needs assessment for medical devices. Geneva: WHO; 2011.", "WHO. Procurement process resource guide. Geneva: WHO; 2011."],
  },
  {
    id: "hta", judul: "Penilaian Teknologi Kesehatan (HTA)", menu: "SI-ALKES › HTA dan ADMIN › Regulasi (Matriks Format 3)",
    tujuan: "Membandingkan produk/kandidat alat dan memprioritaskan topik penilaian berbasis bukti.",
    peran: "Tim HTA/Operator mengisi data produk; manajemen membaca hasil.",
    dasar: ["Permenkes 51/2017 tentang Pedoman Penilaian Teknologi Kesehatan (Format 3 Matriks Penetapan Topik).", "Resolusi WHA67.23 (2014) Health intervention and technology assessment in support of UHC."],
    sop: ["Pilih subjek alat, tambahkan kandidat produk beserta harga, garansi, TKDN, AKL, spesifikasi.", "Sistem menghitung data operasional (kerusakan, biaya, kalibrasi) dari alat merek/tipe sama 24 bulan terakhir.", "Bandingkan skor 5 domain dan tinjau kriteria yang datanya kosong.", "Untuk menetapkan topik: isi Matriks Format 3 (8 kriteria, skor 1–5), cetak, bahas di komite."],
    referensi: ["WHO. Health technology assessment of medical devices, 2nd ed. Geneva: WHO; 2025.", "WHO. Institutionalizing health technology assessment mechanisms: a how to guide. Geneva: WHO; 2021."],
  },
  {
    id: "inventaris", judul: "Inventaris Alat, Detail Alat, dan Label QR", menu: "SI-FARMALKES › Pemeliharaan, ADMIN › Daftar Alat",
    tujuan: "Mencatat seluruh alat kesehatan sesuai standar inventaris WHO dan menempel label QR di setiap alat.",
    peran: "Operator/Admin mengelola; semua orang dapat memindai QR untuk melihat detail publik.",
    dasar: ["Permenkes 31/2018 tentang Aplikasi Sarana, Prasarana, dan Alat Kesehatan (ASPAK) — kode ASPAK dicatat per alat.", "Permenkes 62/2017 tentang Izin Edar Alat Kesehatan (nomor AKL/AKD).", "Permenkes 15/2023 tentang Pemeliharaan Alat Kesehatan."],
    sop: ["Tambah alat satu per satu atau impor Excel (ADMIN › Impor Alat).", "Lengkapi data standar WHO: status operasi, daya, firmware, penanggung jawab, kontrak servis, EMDN/GMDN/UDI, kategori limbah.", "Klasifikasikan IKATEMI otomatis lalu tinjau hasilnya.", "Cetak label QR (kecil/besar) per unit atau per alat, tempel pada badan alat.", "Pindai QR untuk membuka detail alat dan tombol Lapor Kerusakan."],
    referensi: ["WHO. Introduction to medical equipment inventory management. Geneva: WHO; 2011.", "WHO. Inventory and maintenance management information system for medical devices. Geneva: WHO; 2025.", "IKATEMI. Klasifikasi Alat Kesehatan No. 1/2023."],
  },
  {
    id: "lapor", judul: "Lapor Kerusakan, Perintah Kerja, dan TTE", menu: "SI-FARMALKES › Lapor Kerusakan, ADMIN › Pemeliharaan, Riwayat",
    tujuan: "Melaporkan kerusakan tanpa akun, menindaklanjuti dengan perintah kerja (WO), dan mengesahkan hasil perbaikan secara elektronik.",
    peran: "Pelapor (siapa saja) → Operator/elektromedis → pelapor menyetujui hasil.",
    dasar: ["Permenkes 15/2023 tentang Pemeliharaan Alat Kesehatan.", "PP 71/2019 — tanda tangan elektronik tidak tersertifikasi tetap sah sebagai alat bukti dengan syarat keterkaitan dan keutuhan data.", "Standar akreditasi RS bab MFK (pengelolaan peralatan medis)."],
    sop: ["Pelapor memindai QR alat atau membuka Lapor Kerusakan, mengisi keluhan dan kontak, mengirim; simpan nomor WR & kode lacak.", "Operator menerima laporan, membuat WO, menunjuk teknisi, mengisi checklist, tindakan, suku cadang, biaya.", "Setelah selesai, teknisi menekan Tandatangani penyelesaian (TTE Teknisi).", "Pelapor membuka Riwayat, memeriksa alat, lalu Setujui hasil perbaikan (TTE Pelapor).", "Unduh PDF laporan berisi QR verifikasi; keaslian dicek di /verifikasi."],
    referensi: ["WHO. Medical equipment maintenance programme overview. Geneva: WHO; 2011 — §5 corrective maintenance, §5.4 performance indicators.", "WHO. Computerized maintenance management system. Geneva: WHO; 2012."],
  },
  {
    id: "preventif", judul: "Pemeliharaan Preventif, Skor Risiko, dan Pembobotan", menu: "ADMIN › Jadwal Preventif, Daftar Alat (skor EM/EMR), Pembobotan",
    tujuan: "Menentukan alat yang masuk program pemeliharaan dan interval inspeksi/PM berdasarkan risiko.",
    peran: "Operator/Admin.",
    dasar: ["Permenkes 15/2023 tentang Pemeliharaan Alat Kesehatan.", "Permenkes 54/2015 Pasal 8 — uji/kalibrasi minimal sekali setahun bagi alat wajib uji."],
    sop: ["Isi skor EM (fungsi, risiko fisik, kebutuhan pemeliharaan) dan EMR (misi kritis, utilisasi) pada tiap alat.", "Buka Pembobotan: sistem menghitung skor 0–100 dan Prioritas I–IV beserta interval PM/inspeksi/kalibrasi.", "Buat Jadwal Preventif sesuai interval; WO preventif dibuat otomatis saat jatuh tempo.", "Tinjau ulang skor setiap tahun atau setelah kejadian kerusakan berulang."],
    referensi: ["Fennigkoh L, Smith B. Clinical equipment management. JCAHO PTSM Series. 1989;(2):5–14.", "Wang B, Levenson A. Equipment inclusion criteria — a new interpretation of JCAHO's medical equipment management standard. J Clin Eng. 2000;25(1):26–35.", "WHO. Medical equipment maintenance programme overview. Geneva: WHO; 2011 — Annex A.1."],
  },
  {
    id: "kalibrasi", judul: "Pengujian dan Kalibrasi, Regulasi Permenkes 54/2015", menu: "SI-FARMALKES › Pengujian dan Kalibrasi, ADMIN › Regulasi",
    tujuan: "Memastikan alat wajib uji laik pakai, menyimpan sertifikat, mencetak label laik/tidak laik dan laporan triwulan.",
    peran: "Operator/Admin; Viewer melihat status unitnya.",
    dasar: ["Permenkes 54/2015 tentang Pengujian dan Kalibrasi Alat Kesehatan (Lampiran I daftar alat wajib uji; Lampiran II format sertifikat dan label; Pasal 36 laporan 3 bulanan)."],
    sop: ["Catat hasil uji/kalibrasi (manual atau impor Excel massal) dan unggah sertifikat.", "Buka ADMIN › Regulasi: tinjau status Pasal 8 (berlaku, lewat 1 tahun, wajib uji ulang pasca-perbaikan, belum diuji, tidak laik).", "Cetak label hijau/merah dan tempel pada alat.", "Cetak laporan triwulan (TW I–IV) dan kirim ke Dinas Kesehatan/Sudinkes.", "Sertifikat asli diterbitkan institusi penguji; cetakan STARS adalah salinan."],
    referensi: ["Kementerian Kesehatan RI. Permenkes Nomor 54 Tahun 2015."],
  },
  {
    id: "inspeksi", judul: "Label Inspeksi (WHO Lampiran E)", menu: "ADMIN › Label Inspeksi",
    tujuan: "Mencetak label tempel bukti inspeksi, hasil uji, pemberitahuan rusak, dan cek baterai.",
    peran: "Operator/Admin.",
    dasar: ["Permenkes 15/2023 tentang Pemeliharaan Alat Kesehatan."],
    sop: ["Pilih jenis label, unit kerja, dan tanggal.", "Cetak PDF A4 (10 label/lembar) pada kertas stiker.", "Isi paraf petugas, tempel pada alat; warna pita berganti tiap tahun.", "Alat rusak: tempel label merah RUSAK — JANGAN DIPAKAI dan buat laporan kerusakan."],
    referensi: ["WHO. Medical equipment maintenance programme overview. Geneva: WHO; 2011 — Annex E."],
  },
  {
    id: "kalender", judul: "Kalender Pemeliharaan & Perbaikan", menu: "SI-FARMALKES › Kalender",
    tujuan: "Melihat jadwal preventif, perbaikan, kalibrasi jatuh tempo, peminjaman, dan kontrak servis, serta menautkannya ke Google Calendar.",
    peran: "Semua pengguna terdaftar (Viewer melihat unitnya).",
    dasar: ["Permenkes 15/2023 tentang Pemeliharaan Alat Kesehatan (perencanaan jadwal pemeliharaan)."],
    sop: ["Buka Kalender; pilih tampilan Bulan atau Agenda; saring jenis kegiatan.", "Klik acara untuk melihat detail atau menambahkannya ke Google Calendar.", "Tekan Kirim ke email saya: email berisi tautan langganan Google Calendar dan berkas .ics.", "Jangan bagikan URL kalender; bila bocor, tekan Buat ulang tautan."],
    referensi: ["IETF. RFC 5545 Internet Calendaring and Scheduling Core Object Specification (iCalendar). 2009."],
  },
  {
    id: "peminjaman", judul: "Peminjaman Alat Antar Unit", menu: "SI-FARMALKES › Peminjaman",
    tujuan: "Mencatat peminjaman alat antar unit kerja dengan persetujuan dan serah terima elektronik.",
    peran: "Unit peminjam mengajukan; Operator/Admin menyetujui & menerima kembali.",
    dasar: ["Permendagri 19/2016 tentang Pedoman Pengelolaan Barang Milik Daerah (penggunaan dan pengamanan BMD).", "PP 71/2019 (tanda tangan elektronik)."],
    sop: ["Ajukan: pilih alat, unit peminjam, tanggal pinjam dan rencana kembali, keperluan.", "Operator/Admin menyetujui (TTE Pemberi) atau menolak.", "Unit peminjam menerima alat (TTE Penerima).", "Saat kembali, Operator memeriksa dan mengisi kondisi (TTE Pengembalian).", "Unduh PDF formulir; pelacakan RFID masih dalam pengembangan."],
    referensi: ["WHO. Medical equipment maintenance programme overview. Geneva: WHO; 2011."],
  },
  {
    id: "stok", judul: "Stok Suku Cadang, BHP, Alat Kerja & Alat Uji", menu: "ADMIN › Stok & BHP",
    tujuan: "Mengelola aksesori, bahan habis pakai, dan suku cadang agar alat tidak berhenti beroperasi.",
    peran: "Operator/Admin.",
    dasar: ["Permendagri 19/2016 (penatausahaan persediaan).", "Permenkes 15/2023 (ketersediaan suku cadang untuk pemeliharaan)."],
    sop: ["Tambah barang dengan stok awal, stok minimum, lot, kedaluwarsa, alat terkait.", "Catat mutasi Masuk/Keluar/Penyesuaian; sistem menolak keluar melebihi stok.", "Tindak lanjuti peringatan stok menipis, kedaluwarsa, dan kalibrasi alat uji."],
    referensi: ["WHO. Development of medical devices policies, 2nd ed. 2025 — §7.15 Accessories, consumables and spare parts."],
  },
  {
    id: "audit", judul: "Audit Inventaris & KIR Ruangan", menu: "ADMIN › Audit Inventaris, KIR Ruangan",
    tujuan: "Opname fisik alat dengan pemindaian QR dan pengesahan Kartu Inventaris Ruangan.",
    peran: "Operator; Kepala Ruangan/PJ Unit, PJ Alkes, Pengurus Barang, Direktur menandatangani KIR.",
    dasar: ["Permendagri 47/2021 tentang Tata Cara Pelaksanaan Pembukuan, Inventarisasi, dan Pelaporan BMD (format KIR).", "Permendagri 19/2016 tentang Pedoman Pengelolaan BMD.", "Peraturan Gubernur DKI Jakarta tentang pengelolaan BMD yang berlaku (verifikasi nomor dengan BPAD)."],
    sop: ["Audit: mulai sesi audit, pindai QR tiap alat; alat tidak ditemukan tercatat untuk tindak lanjut.", "KIR: pilih unit dan tahun, periksa daftar barang per ruangan.", "TTE berurutan: Kepala Ruangan/PJ Unit → PJ Alkes → Pengurus Barang → Direktur.", "Cetak KIR A4 lanskap berkop Pemprov DKI dan tempel di ruangan.", "Bila isi ruangan berubah, KIR ditandai — Admin membatalkan TTE lalu disahkan ulang."],
    referensi: ["Kementerian Dalam Negeri. Permendagri Nomor 47 Tahun 2021."],
  },
  {
    id: "htm", judul: "Manajemen Teknologi Kesehatan (WHO 2025)", menu: "ADMIN › HTM WHO 2025, Analitik WHO",
    tujuan: "Nomenklatur EMDN/GMDN/UDI, uji terima, biaya total kepemilikan, prediksi kerusakan, kecukupan tenaga elektromedis, keberlanjutan, dan penghapusan alat.",
    peran: "Operator mengusulkan dan memverifikasi; Admin menyetujui atas nama Direktur.",
    dasar: ["Permenpan RB 28/2013 tentang Jabatan Fungsional Teknisi Elektromedis dan Angka Kreditnya (sebagian diubah Permenpan RB 1/2023).", "Permenkes 51/2015 tentang Petunjuk Teknis Jabatan Fungsional Teknisi Elektromedis.", "Permendagri 19/2016 (penghapusan BMD).", "Permenkes 7/2019 tentang Kesehatan Lingkungan Rumah Sakit (pengelolaan limbah)."],
    sop: ["Lengkapi kode EMDN/GMDN/UDI, daya, dan kategori limbah di Daftar Alat.", "Saat alat baru datang: cetak Lembar Uji Terima, isi bersama pengguna dan penyedia, catat tanggal instalasi.", "Tinjau TCO dan prediksi kerusakan untuk usulan penggantian dan prioritas inspeksi.", "Isi tempat tidur & jumlah elektromedis untuk melihat kecukupan tenaga (indikatif; resmi memakai ABK/WISN).", "Penghapusan: ajukan → dekontaminasi & hapus data pasien → TTE PJ Alkes → TTE Direktur → cetak berita acara."],
    referensi: ["WHO. Development of medical devices policies, 2nd ed. Geneva: WHO; 2025.", "WHO. Access to safe, effective and quality-assured health products and technologies: roadmap for WHO action 2025–2030. Geneva: WHO; 2025.", "WHO. Decommissioning medical devices. Geneva: WHO; 2019.", "WHO. Human resources for medical devices: the role of biomedical engineers. Geneva: WHO; 2017."],
  },
  {
    id: "logger", judul: "SI-LOGGER — Live Monitoring Lingkungan", menu: "SI-LOGGER, ADMIN › Monitoring",
    tujuan: "Memantau suhu dan kelembapan kulkas vaksin/darah, freezer, dan ruang alat secara real time dari sensor IoT.",
    peran: "Operator mengatur lokasi/sensor/token; pengguna mengakui alarm.",
    dasar: ["Permenkes 15/2023 (kondisi lingkungan penyimpanan alat).", "Pedoman rantai dingin vaksin Kementerian Kesehatan RI yang berlaku."],
    sop: ["Tambah lokasi dan sensor, atur batas suhu/kelembapan dan tunda alarm.", "Buat token perangkat, pasang di ESP32/gateway (lihat docs/MONITORING-IOT.md).", "Pantau dashboard; akui alarm dan tulis catatan insiden.", "Unduh laporan/ekspor data untuk audit."],
    referensi: ["WHO. Temperature-sensitive health products in the Expanded Programme on Immunization cold chain (WHO/IVB). Geneva: WHO."],
  },
  {
    id: "integrasi", judul: "Integrasi & Bridging Aplikasi Lain", menu: "API /api/integrasi/alat, /api/iot/bacaan",
    tujuan: "Membagikan data alat (baca saja) ke aplikasi lain seperti SMART MFK atau penyusunan data ASPAK.",
    peran: "Admin server menetapkan INTEGRASI_TOKEN; pengembang aplikasi tujuan memakainya.",
    dasar: ["UU 27/2022 tentang Pelindungan Data Pribadi (data pribadi tidak ikut dibagikan).", "Permenkes 31/2018 tentang ASPAK.", "Peraturan Presiden 95/2018 tentang Sistem Pemerintahan Berbasis Elektronik (interoperabilitas)."],
    sop: ["Admin membuat token acak ≥ 16 karakter dan menyimpannya di .env server (INTEGRASI_TOKEN).", "Aplikasi tujuan memanggil GET /api/integrasi/alat dengan header Authorization: Bearer <token>; ?format=csv untuk CSV; ?sejak=YYYY-MM-DD untuk data berubah.", "Data dicocokkan memakai kode alat STARS.", "Ganti token bila bocor atau pengembang berganti."],
    referensi: ["WHO. Global strategy on digital health 2020–2025. Geneva: WHO; 2021."],
  },
];
