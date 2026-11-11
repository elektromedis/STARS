# Pemeliharaan Alat & Integrasi Fiix (RSUD Cipayung)

Status per 11 November 2026:
- **Modul Pemeliharaan internal STARS: aktif** (lihat bagian bawah) — CMMS ringan milik RS sendiri.
- **Tombol "Submit a work request" ke Fiix: aktif** (Tahap A).
- **Integrasi data API Fiix: belum dibuat** (Tahap B) — menunggu kredensial & keputusan resmi.

STARS kini punya alur pemeliharaan sendiri **dan** tetap menautkan ke Fiix. Keduanya
bisa dipakai bersamaan; RS dapat memilih memakai modul internal, Fiix, atau keduanya.

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

---

# Modul Pemeliharaan internal STARS (CMMS ringan)

CMMS milik RS sendiri di dalam STARS, terpisah dari data pengadaan (tabel `Paket`
tidak tersentuh). Alur: **Alat → Permintaan Kerja (lapor) → Perintah Kerja → Selesai**.

## Tabel (Prisma, migrasi `20261111123535_modul_pemeliharaan`)

- `Alat` — aset/alat kesehatan (kode inventaris unik, unit, kondisi, dll.).
- `PermintaanKerja` — laporan kerusakan / work request. Bisa dibuat **publik tanpa akun**.
  Nomor otomatis `WR-YYYY-NNNN`. Status: Baru → Ditinjau → Diproses → Selesai/Ditolak.
- `PerintahKerja` — work order (`WO-YYYY-NNNN`), dikerjakan teknisi. Status: Terbuka →
  Dikerjakan → Selesai/Batal. Satu permintaan paling banyak satu WO (relasi unik).
- `JadwalPreventif` — jadwal PM berkala per alat. **Tabel sudah ada; UI penuh menyusul.**

## Halaman

- Publik: **`/lapor`** — formulir lapor kerusakan (tanpa login). Foto opsional
  (JPG/PNG/WEBP ≤ 5 MB) disimpan di `UPLOAD_DIR/permintaan` dan hanya bisa dilihat
  petugas lewat `/api/pemeliharaan/foto/<nama>` (perlu login Viewer+).
- Dashboard: tombol **Lapor Kerusakan** (ke `/lapor`) + **Submit a work request** (Fiix).
- Admin → **Pemeliharaan** (`/admin/pemeliharaan`) — triase laporan, ubah status,
  jadikan perintah kerja, tugaskan teknisi, catat tindakan/biaya, selesaikan.
- Admin → **Daftar Alat** (`/admin/alat`) — registri aset (tambah/ubah).

## Hak akses

- **Publik**: boleh membuat laporan kerusakan saja.
- **Viewer**: melihat semua (termasuk foto), tidak mengubah.
- **Operator ke atas**: triase, buat/kelola perintah kerja, kelola alat.
- Semua aksi penting dicatat ke `AuditLog` (`permintaan.*`, `perintah.*`, `alat.*`).
- Server `STARS_MODE=internet` (baca saja) menolak semua penulisan modul ini.

## Deployment

- Migrasi dijalankan otomatis saat kontainer start (`entrypoint.sh` → `prisma migrate deploy`).
  Saat memperbarui server, pakai `server-rs.bat` → jawab **N** agar data live tidak tertimpa;
  tabel baru tercipta tanpa menghapus data lama.
- Foto laporan ikut volume `/app/uploads`. Pastikan folder itu punya ruang cukup.

## Rencana lanjutan (belum dibuat)

- UI jadwal preventif (buat/ubah jadwal, pengingat jatuh tempo).
- Ekspor PDF kartu riwayat pemeliharaan per alat.
- Tautan antara `Alat` dan paket pengadaan (`Paket`) bila diperlukan.
