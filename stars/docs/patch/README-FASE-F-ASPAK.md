# Fase F — Kelengkapan Faskes gaya ASPAK

Menu baru: **Admin → Inventarisasi → Kelengkapan Faskes (ASPAK)** (`/admin/aspak`) dengan lima tab:
Pemenuhan Alat · Standar Alat · Prasarana · Perizinan & Mutu · Tenaga Kesehatan.

## Cara pasang
1. Ekstrak ke folder `stars` (gabung dengan folder yang ada), lalu `python scripts/terapkan-fase-f.py`.
2. `npm run prisma generate`, `npm run typecheck`, `npm run build`, lalu deploy (migrasi `20261201090000_fase_f_aspak` dijalankan `prisma migrate deploy`).

## Cara pakai
- Tab Pemenuhan: Admin mengisi **strata** (Utama/Madya/Pratama/Dasar).
- Tab Standar: tempel baris `ruangan;alat;jumlah` dari sumber resmi Anda. Standar **tidak** disertakan (data Kemenkes).
- Tab Prasarana / Perizinan & Mutu: klik "Isi daftar baku" sekali, lalu isi nilainya. Baris kedaluwarsa merah, ≤ 90 hari kuning.
- Pemenuhan = min(ada, standar) ÷ standar. Alat dicocokkan lewat kata pada **nama alat** dan **nama ruangan/unit kerja**; samakan penamaan agar cocok.

## Catatan
- Hak akses: lihat = Viewer; ubah = Operator; profil/hapus = Admin. Mode `STARS_MODE=internet` baca saja. Semua perubahan tercatat di audit.
- Belum dijalankan lewat `tsc`/`next build` di lingkungan ini; jalankan langkah 2 dan laporkan galatnya bila ada.
- Tidak ada integrasi/API ASPAK; modul ini hanya meniru struktur.
