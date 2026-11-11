# Integrasi STARS ↔ Fiix CMMS (RSUD Cipayung)

Status per 11 November 2026: **Tahap A selesai** (tombol permintaan kerja publik).
**Tahap B belum dibuat** (integrasi data lewat API resmi) — menunggu kredensial & keputusan resmi.

## Tahap A — Tombol "Submit a work request" (sudah jalan)

- Lokasi: dashboard Overview (`/`), banner di bawah hero — komponen
  `src/components/dashboard/fiix-cta.tsx`.
- Isi: judul **RSUD Cipayung**, teks **Have an issue to report?**, tombol
  **Submit a work request**.
- Tujuan: formulir permintaan kerja **publik** (guest) Fiix RSUD Cipayung,
  dibuka di tab baru (`target="_blank"` + `rel="noopener noreferrer"`):
  `https://rsudcipayung.fiix.software/guest-mr/login?tenantId=0aeb773c-...&returnUrl=https://rsudcipayung.fiix.software`
- Mengubah URL tanpa build ulang: isi `FIIX_WORK_REQUEST_URL` di `.env` lalu
  restart aplikasi/container.
- Tidak ada login, cookie, atau data Fiix yang disentuh dari STARS; formulir
  guest memang disediakan Fiix untuk pelapor tanpa akun.

## Tahap B — Integrasi data (rancangan; BELUM dibangun)

Tujuan yang masuk akal: menampilkan ringkasan work order pemeliharaan alkes dari
Fiix di STARS (jumlah WO terbuka/selesai per unit), berdampingan dengan — bukan
menimpa — data RKPBU/RKBU.

### Yang masih diperlukan (resmi, jangan dikarang)

1. **Kredensial API Fiix** untuk tenant `rsudcipayung.macmms.com`, dibuat oleh
   admin Fiix RS dari menu pengaturan/integrasi Fiix (biasanya berupa
   Application Key + Access Key + Secret Key). Minta ke pemegang akun admin
   Fiix atau vendor (MAC MMS).
2. **Dokumentasi developer Fiix resmi** (Fiix/Rockwell Automation) untuk
   endpoint, autentikasi, dan batas pemakaian versi terbaru.
3. **Keputusan RS**: data apa yang boleh tampil (hindari data operasional
   sensitif di halaman publik), peran STARS mana yang boleh melihat.

### Prinsip teknis saat dibangun nanti

- Rahasia hanya di environment variables (`FIIX_API_URL`, `FIIX_APP_KEY`,
  `FIIX_ACCESS_KEY`, `FIIX_SECRET_KEY` — sudah dicadangkan di `.env.example`),
  tidak pernah di kode, Git, log, atau browser.
- Semua panggilan **server-side** (route handler Next.js); token tidak dikirim
  ke browser. Timeout + penanganan error + log tanpa rahasia.
- Data Fiix disimpan terpisah (tabel/kolom baru lewat migrasi Prisma), tidak
  menyentuh tabel `Paket` RKPBU/RKBU.
- Akses dibatasi peran (minimal Viewer login untuk detail; agregat saja untuk
  publik), aksi penting dicatat ke `AuditLog`.

## Catatan keamanan

- Kata sandi akun Fiix tidak boleh dititipkan ke STARS, chat, atau dokumen.
  Bila pernah terkirim lewat chat/tangkapan layar, **segera ganti** di Fiix.
- Formulir login Fiix tidak boleh ditiru di dalam STARS; STARS hanya menautkan
  ke halaman resmi Fiix.
