# Checklist Serah Terima & Pemantauan — STARS RSUD Cipayung

Diisi saat aplikasi dinyatakan siap pakai (seluruh checklist Tahap 1–3 tercentang + UAT nol blocker).

## 1. Prasyarat (dari tahap sebelumnya)

- [ ] Seluruh kriteria selesai Tahap 1–3 di `docs/TAHAPAN-PENGEMBANGAN.md` tercentang, termasuk uji Docker/deploy di server RS.
- [ ] UAT selesai, nol temuan Blocker (`docs/UAT.md` ditandatangani).
- [ ] Data historis 2024–2026 lengkap dan totalnya diverifikasi PPA/keuangan, termasuk keputusan atas selisih GRAND TOTAL *RANWAL 2027* (catatan §1.7 TAHAPAN-PENGEMBANGAN).

## 2. Pemantauan (pasang sebelum serah terima)

- [ ] Uptime monitor gratis (mis. UptimeRobot) memantau URL publik tiap 5 menit; notifikasi ke email/WhatsApp IT RS.
- [ ] Untuk server intranet (tidak terjangkau monitor internet): tugas terjadwal di server yang mengecek `http://localhost:3000` dan menulis log / mengirim pesan bila gagal.
- [ ] Jadwal sinkron harian (`deploy/sinkron-harian.ps1`) aktif dan hasilnya terpantau minimal 1 minggu berturut-turut.
- [ ] Cadangan otomatis/manual mingguan berjalan ≥ 1 minggu dan **uji pulih dari cadangan sudah pernah dilakukan** (skenario D4 UAT).

## 3. Penyerahan akses

- [ ] Akun **Super Admin** dialihkan ke IT RS (email IT, sandi baru yang dibuat IT sendiri).
- [ ] Akun pengembang diturunkan menjadi Admin, atau dinonaktifkan sesuai kebijakan.
- [ ] Semua kredensial (Super Admin, `SYNC_TOKEN`, akses VPS/domain, akun monitor) disimpan di **pengelola sandi RS** — tidak lewat chat/WA/email.
- [ ] Repositori Git (kode + `docs/` + riwayat) dapat diakses IT RS; alamat repo dicatat di sini: ________________

## 4. Dokumen yang diserahkan

- [ ] `README.md` — cara menjalankan & arsitektur singkat
- [ ] `docs/TAHAPAN-PENGEMBANGAN.md` — riwayat & keputusan teknis
- [ ] `docs/UAT.md` — hasil uji + tanda tangan
- [ ] `docs/SOP.md` — disetujui Ka. IPSRS & IT
- [ ] `docs/PANDUAN-OPERATOR.md` + rekaman video pelatihan
- [ ] Salinan `.env.example` terisi keterangan tiap variabel (tanpa nilai rahasia)

## 5. Pelatihan

- [ ] 1 sesi 60 menit terlaksana (operator Elektromedik, operator unit lain, manajemen) — materi: `docs/PANDUAN-OPERATOR.md`.
- [ ] Rekaman layar sesi tersimpan di drive RS dan tautannya dicatat di sini: ________________

## 6. Pekerjaan lanjutan yang disepakati (tidak menghalangi serah terima)

Dicatat agar tidak hilang — dari catatan keamanan Tahap 3 §3.5:

- [ ] Content-Security-Policy belum dipasang.
- [ ] Belum ada 2FA; alur lupa sandi masih lewat Admin.
- [ ] Pembatas login per IP kurang efektif di intranet ber-NAT (semua pengguna berbagi satu IP).
- [ ] `npm audit` + patch keamanan bulanan (penanggung jawab: IT RS, lihat SOP §1).

---

**Tanggal serah terima:** ________  ·  **Pengembang:** ________________  ·  **IT RS:** ________________  ·  **Ka. IPSRS:** ________________
