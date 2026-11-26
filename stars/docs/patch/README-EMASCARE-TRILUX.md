# Patch EMASCARE ← TRILUX

Melengkapi EMASCARE (`/imms`) dengan fitur sisi ruangan TRILUX yang belum ada. **Prasyarat:** patch Fase A–E sudah diterapkan (memakai kolom `rating*` pada `PerintahKerja`).

## Fitur baru
| Menu EMASCARE | Asal di TRILUX | Isi |
|---|---|---|
| **Penilaian Perbaikan** `/imms/penilaian` | `wo_data.rating`, `complain.finish_status` | Setelah WO korektif Selesai, ruangan mengonfirmasi *Berfungsi / Belum berfungsi* dan memberi rating 1–5. Bila *Belum berfungsi*, laporan tindak lanjut (prioritas Tinggi) dibuat otomatis. Satu konfirmasi per WO. |
| **Percakapan laporan** `/imms/keluhan/<nomor>` | `messages`, `message_contents` | Utas pesan pelapor ↔ teknisi pada tiap laporan keluhan (nomor laporan di daftar keluhan menjadi tautan). Pengguna ruangan hanya melihat laporan unit kerjanya. |
| **Permintaan Alat** `/imms/permintaan-alat` | `request_asset`, `request_detail` | Ruangan mengajukan alat (hingga 5 baris per form, nama + jumlah + alasan). Kepala instalasi/Admin memutuskan **Pengadaan / Mutasi / Relokasi / Ditolak** dan jumlah disetujui per item; teknisi mencatat jumlah terpenuhi → status otomatis Selesai. |

Semua aksi memakai `sesiAksiImms` (Tamu/Dosen hanya baca), validasi sisi server, pembatasan unit kerja untuk Viewer, dan audit log. Tidak ada kredensial atau rahasia TRILUX yang dibawa.

## Cara pasang (folder `stars`)
1. Ekstrak zip ke folder `stars`.
2. `python scripts/terapkan-emascare-trilux.py` — menambah model/kolom ke `schema.prisma`, 2 menu ke `components/imms/shell.tsx`, dan tautan percakapan di `imms/(app)/keluhan/page.tsx` (cadangan `.bak`, aman diulang; berhenti bila prasyarat belum ada).
3. `npm install` · `npx prisma generate` · `npm run typecheck` · `npm run build`.
4. Deploy seperti biasa — migrasi `20261130090000_emascare_trilux` jalan otomatis saat container start. Cadangkan volume `stars_data` dulu.

## Catatan
- Migrasi hanya menambah tabel/kolom nullable. Sudah diuji di SQLite (bersama patch Fase A–E) dan dicek kesesuaian schema↔SQL; kode **belum** dijalankan lewat `tsc`/`next build` (tidak ada `node_modules` di lingkungan penyusun) — jalankan langkah 3 dan perbaiki bila ada galat.
- Kelas CSS (`kaca`, `panel`, `kapsul`, `isian`, `lencana`) dan komponen `Lencana/Kosong/Tabel` diambil dari EMASCARE yang ada; warna variabel `--aksen-lembut`/`--kaca-2` memakai nilai cadangan bila tidak didefinisikan.
- Belum dibuat: notifikasi dorong untuk pesan baru dan form permintaan alat lebih dari 5 baris (aksi sudah mendukung 10).
