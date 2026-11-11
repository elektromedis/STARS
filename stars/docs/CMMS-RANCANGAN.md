# Rancangan CMMS STARS (terinspirasi Trilux CAMS)

Tujuan: STARS menjadi sistem pemeliharaan alat kesehatan milik RSUD Cipayung sendiri,
dengan fungsi setara aplikasi Trilux CAMS lama (PHP/Yii, `Lite/trilux_cams`), namun
dibangun ulang di atas Next.js + Prisma + SQLite yang sudah dipakai STARS.
Kode Trilux **tidak disalin** (hak cipta vendor; folder `Lite/` dan `stars/trilux_cams/`
hanya referensi dan di-gitignore). Yang diambil hanya *pola proses kerja* dan *data* RS.

## Peta fitur Trilux → STARS

| Trilux CAMS (modul) | STARS | Status |
|---|---|---|
| Inventaris alat (assets, kategori, kondisi, foto, dok) | `Alat` + Admin → Daftar Alat | ✅ Fase 1 (foto/dok: Fase 2) |
| Room / Instalasi | `Ruangan` (di bawah Unit Kerja) | ✅ Fase 1 |
| Pengaduan (complain) | `PermintaanKerja` + halaman publik `/lapor` | ✅ |
| Lembar Kerja korektif (LK) | `PerintahKerja` jenis Korektif | ✅ |
| Jadwal & LK preventif, checklist tugas (m_task) | `JadwalPreventif` + WO Preventif otomatis + checklist | ✅ Fase 1 |
| Kalibrasi (sertifikat, laik, kedaluwarsa) | `Kalibrasi` + Admin → Kalibrasi | ✅ Fase 1 |
| Cetak LK / WO | PDF lembar kerja (`/api/pemeliharaan/wo/[id]/pdf`) | ✅ Fase 1 |
| Dashboard medik/non-medik, kondisi, pengaduan, response time | Halaman publik `/pemeliharaan` (agregat saja) | ✅ Fase 1 |
| Perencanaan / pagu / DPA | Sudah ada: `Paket` (RKPBU/RKBU) | ✅ (modul lama STARS) |
| Mutasi, relokasi, dekomisi (afkir) | — | Fase 2 |
| Stok sparepart (m_parts, min stock, pemakaian) | — | Fase 2 |
| KIR (Kartu Inventaris Ruangan) PDF | — | Fase 2 |
| Depresiasi, usia teknis, standar nilai | kolom `hargaPerolehan`, `usiaTeknis` sudah ada | Fase 2 (laporan) |
| Foto & dokumen alat, label QR | — | Fase 2 |
| Integrasi ASPAK / SIMAK-BMN / SIMBADA | — | Fase 3 (butuh akses resmi) |
| SKP teknisi, rekanan, penawaran | — | Fase 3 |
| Impor inventaris massal dari Excel | — | Fase 2 (pakai mesin impor STARS) |

## Prinsip

- Data pemeliharaan **terpisah** dari data pengadaan (`Paket`) — tidak saling menimpa.
- Publik hanya boleh **melapor** dan melihat **agregat**; detail hanya setelah login.
- Operator ke atas mengelola; semua aksi penting masuk `AuditLog`.
- Server `STARS_MODE=internet` baca saja.
- Satu migrasi per fase; `prisma migrate deploy` jalan otomatis saat kontainer start.

## Fase 1 (dibangun 11 Nov 2026)

Migrasi `cmms_fase1`: tabel `Ruangan`, `Kalibrasi`; kolom baru `Alat` (jenis, risiko,
ruangan, hargaPerolehan, usiaTeknis, garansiSampai); `PerintahKerja.checklist` + `jadwalId`.

Halaman: Admin → Daftar Alat (dengan Ruangan), Admin → Jadwal Preventif, Admin → Kalibrasi,
tombol cetak PDF di Perintah Kerja, dashboard publik `/pemeliharaan`.

## Pengujian minimum tiap fase

`npm run typecheck`, `npx next lint`, `npm run build`, uji logika di DB percobaan,
cek rute terproteksi (307/401), lihat hasil PDF.
