# STARS — Sistem Terintegrasi Alat Kesehatan Rumah Sakit

Profil Perencanaan-Pengadaan Alat Kesehatan dan Pemeliharaan Alat Kesehatan di RSUD Cipayung.
Struktur informasi (Overview • Nilai • Paket • Data) terinspirasi dashboard INAPROC; bukan aplikasi resmi INAPROC/LKPP.

Status: **Tahap 1–3 selesai (kode)** — dashboard publik dengan data nyata RKPBU/RKBU BLUD 2024–2027, administrasi Excel di `/admin`, login per pengguna dengan peran, audit log, cadangan, sinkronisasi intranet → internet, dan paket Docker. Kode teruji di **Windows dan Linux** (devcontainer: install, typecheck, build, smoke test API — 11 Nov 2026). Perangkat Tahap 4 siap di `docs/` (UAT, SOP, panduan operator, serah terima). Yang tersisa: uji Docker di server RS dan **pelaksanaan** Tahap 4 bersama pengguna.
Peta jalan lengkap sampai siap pakai: [docs/TAHAPAN-PENGEMBANGAN.md](docs/TAHAPAN-PENGEMBANGAN.md).

## Menjalankan

Cara cepat (Windows): klik dua kali `jalankan-dev.bat` (pengembangan) atau `jalankan-produksi.bat` (build + jalan, bisa diakses dari LAN).
Skrip ini otomatis membuat `.env`, menyiapkan basis data, dan mengisi data bila belum ada.

Lewat terminal:
```bash
npm install                 # juga menjalankan prisma generate
copy .env.example .env      # DATABASE_URL SQLite
npm run db:setup            # migrasi + isi data dari prisma/data/paket.json
npm run dev                 # http://localhost:3000
npm run typecheck
npm run build
```

## Data

- Sumber: kertas kerja `RKPBU Pemeliharaan Alat Kesehatan - Perubahan 2026.xlsx` (sheet per tahun/tahap).
- Konversi ulang bila Excel berubah: `npm run db:konversi -- "C:\path\ke\RKPBU.xlsx"` lalu `npm run db:seed` (idempoten, upsert per kode).
- Skrip konversi: `scripts/konversi-rkpbu.py` (mencari kolom berdasarkan nama header; aturan pemetaan unit kerja dan kategori ada di dalamnya).
- Lihat isi basis data: `npm run db:studio`.

## Login dan peran

- Tombol **Masuk** → `/login`. Akun pertama (Super Admin) dibuat otomatis dari `SUPERADMIN_EMAIL`/`SUPERADMIN_PASSWORD` di `.env` saat seed atau saat server pertama kali start. Ganti sandinya lewat Admin → Pengguna.
- Peran: **Viewer** (lihat admin) < **Operator** (unggah data; bisa dibatasi satu unit kerja) < **Admin** (semua unit, kelola pengguna, cadangan) < **Super Admin**.
- Perlindungan: sesi 8 jam, 5 percobaan login per 15 menit per IP, akun terkunci 15 menit setelah 10 sandi salah, semua kejadian tercatat di audit log (Admin → Sistem).

## Administrasi Excel (`/admin`)

1. **Impor Excel**: unduh template → isi sheet `paket` → pilih berkas → **Periksa** (pratinjau, error per baris, peringatan) → **Simpan** (aktif bila nol error; satu transaksi).
2. **Ekspor & Template**: unduh data per tahun/tahap/unit berikut kolom `kode`, edit di Excel, unggah kembali untuk memperbarui.
3. **Log Impor**: riwayat 50 impor terakhir; salinan berkas asli tersimpan di `uploads/`.
4. **Pengguna** (Admin+): tambah/ubah/nonaktifkan akun, setel ulang sandi.
5. **Sistem** (Admin+): mode server, unduh cadangan `.db`, petunjuk sinkron, audit log.

Aturan validasi lengkap ada di sheet `petunjuk` pada template (`GET /api/admin/template`).

## Deployment ganda (intranet + internet)

- **Sekali klik (Windows + Docker Desktop):** `deploy\server-rs.bat` — membuat `deploy\.env` berisi rahasia acak (catat sandi Super Admin yang tampil), build + jalankan server untuk seluruh LAN, dan menawarkan pemuatan data awal dari `prisma\dev.db`. Lanjutkan dengan `deploy\domain-gratis.bat` untuk alamat internet gratis `https://….ts.net` (Tailscale Funnel) — lihat `docs/DOMAIN-GRATIS.md`.
- **Tanpa Docker (Windows, intranet):** `jalankan-produksi.bat`, akses `http://<IP>:3000`. Untuk berjalan sebagai layanan, daftarkan dengan NSSM.
- **Docker (intranet / VPS internet):** `copy deploy\.env.example deploy\.env`, isi, lalu
  `docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d --build` (tambah `--profile internet` di VPS untuk HTTPS otomatis via Caddy). Basis data SQLite tersimpan di volume `stars_data`. *Belum diuji di mesin pengembang.*
- **Sinkronisasi:** di server intranet isi `SYNC_URL` + `SYNC_TOKEN` lalu `npm run sync` (jadwal harian: `deploy/sinkron-harian.ps1`). Server internet (`STARS_MODE=internet`) bersifat baca saja.

## API publik (hanya baca)

| Endpoint | Keterangan |
|---|---|
| `GET /api/filter-options` | tahun → tahap, unit kerja, kategori |
| `GET /api/ringkasan?tahun=&tahap=&unit=&kategori=` | KPI |
| `GET /api/nilai-per-unit?…&limit=8` | nilai per unit kerja |
| `GET /api/nilai-per-kategori?…` | nilai per kategori |
| `GET /api/nilai-per-tahun?unit=&kategori=` | nilai per tahun × tahap |
| `GET /api/paket?…&q=&status=terserap\|direncanakan&page=&pageSize=` | daftar paket |
| `GET /api/dataset/{paket\|nilai-per-unit\|nilai-per-kategori\|unit-kerja}?format=xlsx\|csv&…` | unduhan |

## Struktur
- `src/app` — halaman: `/` Overview, `/nilai`, `/paket`, `/data`, `/about`; `src/app/api` — Route Handler
- `src/lib/filter.ts` — filter dari query string; `queries.ts` — kueri Prisma; `export.ts` — XLSX/CSV; `prisma.ts` — klien
- `src/lib/impor.ts` — baca + validasi Excel; `impor-simpan.ts` — kode & simpan transaksi; `unit-kerja.ts` — 28 unit + alias
- `src/auth.ts`, `src/auth.config.ts`, `src/middleware.ts` — Auth.js; `src/lib/peran.ts`, `sesi.ts`, `rate-limit.ts`, `audit.ts`, `bootstrap.ts`
- `src/app/admin` — Impor, Ekspor & Template, Log, Pengguna, Sistem; `src/app/login`; `src/app/api/sync`; `src/components/admin`
- `scripts/sinkron.ts` — kirim data ke server internet; `scripts/siapkan-env.js` — buat `.env` + `AUTH_SECRET`
- `src/components/ui` — primitif gaya shadcn/ui; `layout` — AppShell, Sidebar, Header, Logo; `dashboard` — FilterBar, StatCard, PackageTable, Pagination; `charts` — TahunChart, CategoryDonut, BarListChart
- `prisma/schema.prisma` — model `UnitKerja`, `Paket`; `prisma/seed.ts`; `prisma/data/paket.json`
- `public/stars-logo.png`, `public/stars-icon.png`, `src/app/icon.png` — logo STARS
- `deploy/` — Dockerfile, docker-compose, Caddyfile untuk Tahap 3 (internet + intranet)

Catatan: Next.js 15.5.29 (patch CVE-2025-66478); Prisma 6; jalankan `npm audit` berkala.
