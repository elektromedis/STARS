# Tahapan Pengembangan STARS — dari Prototipe sampai Siap Pakai

**STARS — Sistem Terintegrasi Alat Kesehatan Rumah Sakit, RSUD Cipayung**
Referensi struktur informasi: dashboard INAPROC "Profil Pengadaan" (Overview • Nilai • Paket • Data).
Dokumen ini ditulis untuk developer pemula yang akan mengerjakan sendiri, tahap demi tahap. Setiap tahap punya: tujuan, langkah, perintah yang dijalankan, dan **kriteria selesai** (checklist) supaya jelas kapan boleh lanjut.

Status per 10 November 2026:

| Tahap | Isi | Status |
|---|---|---|
| 0 | Persiapan lingkungan kerja | ✅ Selesai |
| 1 | Dashboard publik (Prioritas 1) | ✅ Selesai 10 Nov 2026 — data nyata RKPBU/RKBU 2024–2027 (lihat catatan di bawah tabel Tahap 1) |
| 2 | Administrasi Excel (Prioritas 2) | ✅ Selesai 10 Nov 2026 — `/admin` impor/ekspor/log (sandi sementara) |
| 3 | Keamanan & deployment ganda (Prioritas 3) | ✅ Selesai 11 Nov 2026 — teruji di Windows, Linux, dan **Docker** (server intranet berjalan di laptop via `deploy/server-rs.bat`); akses internet HTTPS aktif via Tailscale Funnel (`deploy/domain-gratis.bat`, lihat `docs/DOMAIN-GRATIS.md`) |
| 4 | Uji coba, migrasi data, serah terima | 🟡 Perangkat siap 11 Nov 2026 — `docs/UAT.md`, `docs/SOP.md`, `docs/PANDUAN-OPERATOR.md`, `docs/SERAH-TERIMA.md`; pelaksanaan uji oleh pengguna belum |

---

## Tahap 0 — Persiapan lingkungan (selesai)

Yang sudah terpasang dan terverifikasi di komputer ini:

- Node.js 26.13 dan npm 11.20 (`C:\Program Files\nodejs`). Bila terminal tidak mengenali `node`, tutup dan buka ulang VS Code agar PATH ter-refresh.
- VS Code, Python 3.15 (dipakai untuk skrip bantu membaca Excel).
- Dependensi proyek terpasang (`npm install`), **Next.js dinaikkan ke 15.5.29** karena 15.1.6 memiliki celah keamanan (CVE-2025-66478).
- `npm run typecheck` dan `npm run build` lolos. Semua halaman (`/`, `/nilai`, `/paket`, `/data`, `/about`) merespons 200.

Yang masih perlu dilakukan sekali saja:

1. **Pasang Git** (belum ada). GitHub Desktop sudah terunduh di `Downloads\GitHubDesktopSetup-x64.exe`; jalankan, lalu "Add local repository" pada folder proyek dan buat commit pertama. Tanpa Git, tidak ada riwayat perubahan dan tidak bisa deploy otomatis.
2. **Ganti nama folder** `meams` menjadi `stars` (tutup VS Code dulu, rename di Explorer, buka lagi). Ini sisa terakhir dari nama lama.

Cara menjalankan tanpa mengetik perintah: klik dua kali `jalankan-dev.bat` (pengembangan) atau `jalankan-produksi.bat` (build + jalan, bisa diakses komputer lain di LAN lewat `http://<IP-server>:3000`).

---

## Tahap 1 — Dashboard publik (Prioritas 1)

**Tujuan:** pengunjung (tanpa login) melihat statistik alat kesehatan RSUD Cipayung berdasarkan **Nilai**, **Paket**, dan **Data**, difilter per tahun anggaran dan per **Nama Unit Kerja** (28 unit).

### 1.1 Yang sudah ada (UI)

- Judul Overview: *Profil Perencanaan-Pengadaan Alat Kesehatan dan Pemeliharaan Alat Kesehatan di RSUD Cipayung*.
- Filter "Nama Unit Kerja" berisi 28 unit (AMBULANS … TIDAK ADA) di `src/lib/mock-data.ts`.
- Logo STARS (lingkaran navy–teal dengan ikon monitor detak) di sidebar, header, hero, halaman About, dan favicon.
- Kartu KPI, grafik tren bulanan, donat kategori, batang per unit kerja, tabel paket, kartu dataset.

Semua angka masih **data contoh** (badge "Data contoh" di header). Tahap ini selesai bila angka tersebut berasal dari basis data.

### 1.2 Rancang model data (ikuti format RKPBU yang sudah dipakai RS)

Kertas kerja `RKPBU Pemeliharaan Alat Kesehatan - Perubahan 2026.xlsx` sudah punya kolom baku. Pakai kolom yang sama agar operator tidak perlu belajar format baru:

| Kolom Excel RKPBU | Nama field | Tipe | Catatan |
|---|---|---|---|
| Nama Rekening | `nama_rekening` | teks | mis. "2.7.2020 Belanja Pemeliharaan Sarana Prasarana Penunjang" |
| Barang/Jasa | `nama_paket` | teks | nama paket/pekerjaan |
| Uraian Pemeliharaan | `uraian` | teks panjang | rincian item |
| Lokasi | `unit_kerja` | enum 28 unit | **wajib** salah satu dari daftar unit kerja |
| Kode Barang | `kode_barang` | teks | boleh "-" |
| Vol 1, Satuan, Vol 2, Satuan | `vol1, satuan1, vol2, satuan2` | angka/teks | 1 Set × 1 Kali |
| Satuan (Rp) | `harga_satuan` | angka | sudah termasuk PPN 11 % |
| Jumlah (Rp) | `nilai` | angka | = vol1 × vol2 × harga_satuan |
| Serapan | `serapan` | boolean | sudah terserap atau belum |
| Prioritas | `prioritas` | teks | PP 1, PP 2, … |
| Keterangan | `keterangan` | teks | |
| (judul sheet) | `tahun` | angka | 2026 |
| (judul sheet) | `tahap` | enum | Penetapan / Pergeseran I / Pergeseran II / Perubahan / Ranwal |
| (judul sheet) | `jenis` | enum | **Pemeliharaan** (RKPBU) atau **Modal/Pengadaan** (RKBU) |
| (judul sheet) | `sumber_dana` | teks | BLUD |

Dua tabel utama: `unit_kerja` (28 baris, master) dan `paket` (semua baris RKPBU/RKBU). Kategori alat, status paket, dan metode pengadaan ditambahkan sebagai kolom opsional.

### 1.3 Pasang basis data dengan Prisma

Mulai dengan **SQLite** (satu berkas, tanpa instalasi server) supaya cepat belajar; di Tahap 3 pindah ke PostgreSQL hanya dengan mengganti `provider` dan `DATABASE_URL`.

```bash
npm install prisma @prisma/client
npx prisma init --datasource-provider sqlite
```

Isi `prisma/schema.prisma` (ringkas):

```prisma
model UnitKerja {
  id    Int     @id @default(autoincrement())
  nama  String  @unique          // "ELEKTROMEDIK", "HCU-ICU", ...
  paket Paket[]
}

model Paket {
  id            Int       @id @default(autoincrement())
  kode          String    @unique          // PKT-2026-0001, dibuat otomatis saat impor
  tahun         Int
  tahap         String                     // Penetapan | Pergeseran I | Pergeseran II | Perubahan | Ranwal
  jenis         String                     // Pemeliharaan | Pengadaan
  sumberDana    String    @default("BLUD")
  namaRekening  String
  namaPaket     String
  uraian        String?
  unitKerja     UnitKerja @relation(fields: [unitKerjaId], references: [id])
  unitKerjaId   Int
  kodeBarang    String?
  vol1          Float     @default(1)
  satuan1       String?
  vol2          Float     @default(1)
  satuan2       String?
  hargaSatuan   Float
  nilai         Float
  serapan       Boolean   @default(false)
  prioritas     String?
  keterangan    String?
  kategori      String?                    // Diagnostik & Imaging, Monitoring Pasien, ...
  status        String    @default("Berjalan") // Selesai | Berjalan | Tender | Batal
  metode        String?                    // E-Purchasing | Tender | Pengadaan Langsung
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}
```

```bash
npx prisma migrate dev --name awal      # membuat tabel
npx prisma db seed                      # isi 28 unit kerja (buat prisma/seed.ts)
```

### 1.4 Buat API publik (Route Handler Next.js)

Letakkan di `src/app/api/...`. Semua endpoint **hanya baca** (GET) dan tidak butuh login:

| Endpoint | Parameter | Dipakai oleh |
|---|---|---|
| `GET /api/ringkasan` | `tahun`, `unit` | 4 kartu KPI (total nilai, jumlah paket, alkes dipelihara, realisasi) |
| `GET /api/nilai-bulanan` | `tahun`, `unit` | grafik tren |
| `GET /api/nilai-per-unit` | `tahun` | grafik batang 8 unit tertinggi |
| `GET /api/nilai-per-kategori` | `tahun`, `unit` | donat kategori |
| `GET /api/paket` | `tahun`, `unit`, `status`, `q`, `page` | tabel paket + pencarian |
| `GET /api/dataset/[nama]?format=xlsx\|csv` | — | tombol Unduh di halaman Data |

Contoh satu endpoint:

```ts
// src/app/api/ringkasan/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const tahun = Number(req.nextUrl.searchParams.get("tahun") ?? new Date().getFullYear());
  const unit = req.nextUrl.searchParams.get("unit");
  const where = { tahun, ...(unit ? { unitKerja: { nama: unit } } : {}) };

  const [agg, terserap] = await Promise.all([
    prisma.paket.aggregate({ where, _sum: { nilai: true }, _count: true }),
    prisma.paket.aggregate({ where: { ...where, serapan: true }, _sum: { nilai: true } }),
  ]);
  const total = agg._sum.nilai ?? 0;
  return NextResponse.json({
    totalNilai: total,
    jumlahPaket: agg._count,
    realisasiPersen: total ? ((terserap._sum.nilai ?? 0) / total) * 100 : 0,
  });
}
```

### 1.5 Hubungkan filter ke halaman

- `FilterBar` menulis pilihan ke **query string** (`/?tahun=2026&unit=RADIOLOGI`), persis seperti INAPROC (`?tahun=2026&view=Nilai`). Gunakan `useRouter` + `useSearchParams`.
- Halaman (`page.tsx`) adalah Server Component: baca `searchParams`, panggil fungsi query Prisma langsung (tanpa fetch ke diri sendiri), kirim hasil ke komponen grafik.
- Hapus `KPIS`, `MONTHLY_VALUE`, dll. dari `mock-data.ts` satu per satu setelah penggantinya jalan. Sisakan `UNIT_KERJA` sebagai fallback.

### 1.6 Kriteria selesai Tahap 1

- [x] Angka "Total Nilai" di Overview sama dengan total kolom *Jumlah (Rp)* pada sheet RKPBU tahun yang dipilih (Penetapan 2026 = Rp 790.243.459 = PAGU di kertas kerja).
- [x] Mengganti unit kerja di filter mengubah KPI, grafik, dan tabel.
- [x] Halaman Paket bisa cari nama paket dan filter status.
- [x] Tombol Unduh di halaman Data menghasilkan XLSX dan CSV yang bisa dibuka di Excel.
- [x] Badge "Data contoh" dihapus.
- [x] `npm run build` tetap lolos.

### 1.7 Catatan hasil implementasi (10 Nov 2026)

Yang dibangun: Prisma 6 + SQLite (`prisma/schema.prisma`), konverter `scripts/konversi-rkpbu.py`, seed, 7 endpoint API, filter via query string (tahun, tahap, unit kerja, kategori), halaman Overview/Nilai/Paket/Data membaca basis data, unduhan XLSX/CSV.

Sheet yang dimuat (901 baris):

| Sheet Excel | Tahun | Tahap | Baris | Total (Rp) |
|---|---|---|---|---|
| BLUD Perubahan Fase II 2024 | 2024 | Perubahan II | 157 | 692.770.000 |
| BLUD Penetapan 2025 | 2025 | Penetapan | 141 | 703.254.683 |
| BLUD Penetapan 2026 | 2026 | Penetapan | 130 | 790.243.459 |
| BLUD Pergeseran 2026 | 2026 | Pergeseran | 132 | 823.576.759 |
| RKPBU PM ALKES - PERUBAHAN 2026 | 2026 | Perubahan | 82 | 2.392.681.269 |
| RKPBU PM ALKES - RANWAL 2027 | 2027 | Ranwal (Pemeliharaan) | 124 | 2.362.681.269 |
| RKBU MODAL ALKES - RANWAL 2027 | 2027 | Ranwal (Pengadaan) | 135 | 2.255.114.102 |

Keputusan data yang perlu diketahui operator:

1. **Tahap tidak dijumlahkan.** Tiap tahap adalah revisi anggaran tahun yang sama, maka dashboard selalu menampilkan satu tahap (default: tahap paling akhir pada tahun berjalan). Pengguna dapat memilih tahap lain di filter.
2. **Baris bernilai Rp 0 dilewati** (sisa/duplikat di kertas kerja). Dengan aturan ini jumlah baris Penetapan 2026 persis 130 seperti nomor urut sheet.
3. **Lokasi gabungan** ("ICU, IGD, OK") dicatat pada unit pertama yang dikenal; teks asli disimpan di kolom `lokasiAsli` dan ikut terunduh.
4. **Lokasi bukan unit** ("SELURUH UNIT", "YANMED") masuk unit **TIDAK ADA** (30 baris).
5. **Kategori** diturunkan otomatis dari nama rekening/uraian: Pengujian & Kalibrasi, Pemeliharaan Alat Kesehatan, Suku Cadang & Aksesori, Kontrak Servis, Jasa Perbaikan & Servis, Sarana & Prasarana.
6. **Perlu verifikasi RS:** judul sheet *RKPBU PM ALKES - RANWAL 2027* mencantumkan GRAND TOTAL Rp 724.757.041, tetapi jumlah baris datanya Rp 2.362.681.269. Kemungkinan rumus total di sheet hanya mencakup sebagian baris. Angka di STARS mengikuti baris data; cek dengan PPA sebelum dipublikasikan.
7. Sheet kertas kerja berblok banyak (KK Pemeliharaan, Sarpras, MASTER, KK BLUD) **tidak** dimuat karena satu baris berisi beberapa tahap sekaligus; data tahap-tahap itu sudah terwakili oleh sheet tunggalnya.

Cara memperbarui data bila Excel berubah: `npm run db:konversi -- "path\RKPBU.xlsx"` lalu `npm run db:seed`. Di Tahap 2 proses ini digantikan halaman unggah Excel.

---

## Tahap 2 — Administrasi Excel (Prioritas 2)

**Tujuan:** operator mengelola data lewat **unggah Excel**, bukan input satu per satu. Ekspor juga lewat Excel, sehingga alur kerja RS yang sudah berbasis Excel tidak berubah.

### 2.1 Tetapkan template Excel standar

Berkas RKPBU asli punya judul 11 baris, header dua baris, dan sel gabung. Itu sulit dibaca program dengan andal. Buat **template STARS** yang sederhana (satu sheet = satu tabel, header di baris 1, satu baris = satu paket), lalu sediakan tombol "Unduh template" di halaman admin:

```
Sheet "paket":
tahun | tahap | jenis | nama_rekening | nama_paket | uraian | unit_kerja | kode_barang | vol1 | satuan1 | vol2 | satuan2 | harga_satuan | nilai | serapan | prioritas | keterangan | kategori | status | metode
```

Untuk berkas RKPBU lama yang sudah ada, buat **konverter sekali pakai** (Python/openpyxl) yang membaca mulai baris header "No | Nama Rekening | Barang/Jasa | …" dan menulis ke template. Dengan begitu data 2024–2026 bisa dimigrasikan di Tahap 4 tanpa mengetik ulang.

### 2.2 Halaman `/admin/impor`

Alur yang mudah dipahami operator, tiga langkah di satu halaman:

1. **Unggah** `.xlsx` (maks. 10 MB).
2. **Pratinjau & validasi** — tampilkan 20 baris pertama + daftar error per baris:
   - `unit_kerja` harus salah satu dari 28 unit (bandingkan tanpa peduli huruf besar/kecil dan spasi).
   - `nilai`, `harga_satuan`, `vol1`, `vol2` harus angka ≥ 0; `tahun` 4 digit.
   - `nilai` harus = `vol1 × vol2 × harga_satuan` (toleransi Rp 1), kalau tidak beri peringatan, bukan error.
   - Baris duplikat (tahun + tahap + nama_paket + unit) ditandai sebagai "akan diperbarui".
3. **Simpan** — hanya aktif bila tidak ada error. Simpan dalam satu transaksi (`prisma.$transaction`) agar kalau gagal di tengah, tidak ada data setengah masuk.

Pustaka: `npm install xlsx` (SheetJS) untuk membaca, `exceljs` bila perlu ekspor dengan format (warna, lebar kolom).

```ts
// src/app/api/admin/impor/route.ts  (inti pembacaan)
import * as XLSX from "xlsx";

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file") as File;
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets["paket"], { defval: null });
  const hasil = validasi(rows);          // kembalikan { valid: Paket[], error: {baris, pesan}[] }
  if (hasil.error.length) return Response.json(hasil, { status: 422 });
  await simpanTransaksi(hasil.valid);    // upsert per baris di dalam prisma.$transaction
  return Response.json({ tersimpan: hasil.valid.length });
}
```

### 2.3 Ekspor dan log

- `/admin/ekspor`: pilih tahun/tahap/unit → unduh XLSX dengan format yang sama dengan template, sehingga operator bisa edit lalu unggah kembali (siklus **unduh → edit → unggah**).
- Tabel `log_impor`: siapa, kapan, nama berkas, jumlah baris masuk, jumlah error. Tampilkan 10 terakhir di halaman admin. Ini penting untuk audit BLUD.
- Simpan berkas asli yang diunggah di folder `uploads/` (di luar `public/`) selama 90 hari.

### 2.4 Kriteria selesai Tahap 2

- [x] Operator mengunggah template berisi 100+ baris dan semuanya muncul di dashboard publik seketika (uji: 130 baris Penetapan 2026, < 5 detik).
- [x] Baris dengan unit kerja salah ketik ditolak dengan pesan yang menyebut nomor baris dan kolom.
- [x] Unggah ulang berkas yang sama tidak menggandakan data (dikenali lewat `kode`, atau tahun+tahap+nama paket+unit+rekening bila kode kosong).
- [x] Ekspor → edit → unggah kembali memperbarui baris yang sama (kolom `kode` ikut terekspor).

### 2.5 Catatan hasil implementasi (10 Nov 2026)

| Bagian | Berkas |
|---|---|
| Pembacaan + validasi (murni) | `src/lib/impor.ts` — alias header, angka format Indonesia/Inggris, aturan unit, tahap, nilai, serapan, kategori otomatis |
| Pemetaan unit kerja | `src/lib/unit-kerja.ts` — 28 unit + alias; lokasi gabungan → unit pertama (peringatan) |
| Penentuan kode + simpan transaksi + log | `src/lib/impor-simpan.ts` |
| API | `POST /api/admin/impor` (mode `validasi`/`simpan`), `GET /api/admin/template` |
| Halaman | `/admin/impor` (3 langkah: pilih → Periksa → Simpan), `/admin/ekspor`, `/admin/log` |
| Pelindung sementara | `src/middleware.ts` — Basic Auth dari `ADMIN_USER`/`ADMIN_PASSWORD` di `.env` |
| Audit | tabel `LogImpor`; salinan berkas asli di folder `uploads/` (di luar `public/`, tidak ikut Git) |

Perilaku penting:

- **Simpan hanya aktif bila nol error.** Peringatan (pemetaan unit, nilai dihitung otomatis) tidak menghalangi.
- **Harga satuan vs nilai:** kertas kerja RS menulis harga satuan *sebelum* PPN dan nilai *sesudah* PPN, maka selisih 0–13 % dianggap wajar dan tidak diberi peringatan.
- **Nol error ≠ data benar.** Validasi menjaga format; kebenaran angka tetap tanggung jawab PPA. Log impor menyimpan siapa, kapan, berapa baris, dan berkas aslinya.
- **Keamanan sementara:** satu akun Basic Auth untuk semua operator. Cukup untuk uji coba internal, **tidak** untuk dipublikasikan ke internet; Tahap 3 menggantinya dengan login per pengguna dan peran.

Uji yang dijalankan: akses tanpa sandi → 401; unggah ulang hasil ekspor Penetapan 2026 → 130 diperbarui, total tetap Rp 790.243.459; berkas dengan 3 error → Simpan ditolak (422); berkas 2 baris baru → tersimpan, unggah ulang → 2 diperbarui, tidak ada duplikat.

---

## Tahap 3 — Keamanan dan deployment ganda (Prioritas 3)

**Tujuan:** aplikasi bisa diakses dari **internet** (publik, HTTPS) dan dari **jaringan internal RS** (tetap jalan saat internet putus), dengan halaman admin yang terlindungi.

### 3.1 Autentikasi dan peran

Pakai **Auth.js v5** (`next-auth@beta`) dengan *Credentials provider* (email + sandi, hash dengan `bcryptjs`). Tidak perlu Google/SSO dulu.

| Peran | Hak |
|---|---|
| Public | lihat dashboard, unduh dataset |
| Viewer | + lihat halaman admin (baca saja), mis. manajemen RS |
| Operator | + unggah/ekspor Excel untuk unit kerjanya |
| Admin | + semua unit, kelola pengguna, lihat log |
| Super Admin | + pengaturan sistem, backup/restore |

Lindungi rute dengan `src/middleware.ts`: semua `/admin/*` dan `/api/admin/*` wajib sesi; cek peran di setiap Route Handler (jangan hanya sembunyikan tombol di UI).

### 3.2 Pengerasan (hardening) minimum

- Rahasia hanya di `.env` (`AUTH_SECRET`, `DATABASE_URL`); `.env` sudah ada di `.gitignore`.
- Batasi percobaan login (5 kali / 15 menit per IP) dan kunci akun setelah 10 gagal.
- Header keamanan sudah disiapkan di `deploy/Caddyfile` (HSTS, nosniff, X-Frame-Options).
- Validasi semua input dengan `zod`, termasuk isi Excel.
- Jalankan `npm audit` dan perbarui Next.js tiap bulan (sudah terbukti perlu: 15.1.6 → 15.5.29).
- Backup PostgreSQL harian: `pg_dump` ke folder `deploy/backup/`, salin ke komputer lain / cloud drive RS.
- Catat aktivitas admin (login, impor, hapus) di tabel `audit_log`.

### 3.3 Dua lokasi, satu paket deploy

Berkas sudah dibuat di folder `deploy/` (belum diuji karena Docker belum terpasang di komputer ini):

| Berkas | Fungsi |
|---|---|
| `deploy/Dockerfile` | membangun image aplikasi dari output *standalone* Next.js |
| `deploy/docker-compose.yml` | layanan `app` + `db` (PostgreSQL 16) + `caddy` (hanya profil `internet`) |
| `deploy/Caddyfile` | HTTPS otomatis + header keamanan |
| `deploy/.env.example` | daftar variabel yang harus diisi |

**Server internet (VPS Linux, 2 vCPU / 2 GB cukup):**

```bash
sudo apt install docker.io docker-compose-v2 git
git clone <repo-stars> && cd stars
cp deploy/.env.example deploy/.env && nano deploy/.env    # STARS_MODE=internet, STARS_DOMAIN=stars.domain-rs (AUTH_URL tidak perlu)
docker compose -f deploy/docker-compose.yml --env-file deploy/.env --profile internet up -d --build
```

Arahkan DNS domain ke IP VPS; Caddy mengurus sertifikat HTTPS sendiri.

**Server intranet RS (bisa Windows dengan Docker Desktop, atau PC Linux kecil):**

```bash
docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d --build   # tanpa --profile internet
```

Akses dari komputer lain: `http://<IP-server>:3000`. Minta tim IT menambahkan nama `stars.rsud.local` di DNS internal agar mudah diingat.
Bila Docker belum boleh dipasang, alternatif sementara: `jalankan-produksi.bat` + daftarkan sebagai Windows Service dengan NSSM.

**Sinkronisasi data antara dua server (pilih yang paling sederhana dulu):**

- **Rekomendasi awal:** server **intranet** adalah sumber kebenaran (operator mengunggah Excel di sana). Setiap malam sebuah *cron* mengekspor dataset publik ke JSON/XLSX dan mengunggahnya ke server internet lewat endpoint `POST /api/sync` berbekal token rahasia. Server internet bersifat **baca saja**. Data sensitif (harga satuan per item, keterangan internal) bisa disaring sebelum dikirim.
- Alternatif bila RS punya VPN ke VPS: kedua `app` memakai satu PostgreSQL yang sama; lebih sederhana tetapi internet putus = intranet ikut mati, jadi kurang disarankan.

### 3.4 Kriteria selesai Tahap 3

- [x] Dashboard terbuka dengan HTTPS dari HP di luar RS. *(teruji 11 Nov 2026 via domain gratis Tailscale Funnel `….ts.net`; domain resmi RS + VPS tetap jadi rencana akhir)*
- [ ] `http://<IP-server>:3000` terbuka dari komputer unit kerja saat kabel internet dicabut. *(server intranet laptop sudah berjalan 11 Nov 2026 via Docker; uji dari komputer lain belum)*
- [x] Membuka `/admin` tanpa login dialihkan ke `/login`; Operator unit A tidak bisa mengunggah untuk unit B. *(teruji 11 Nov 2026)*
- [x] Data yang diunggah di intranet dapat dikirim ke internet lewat `npm run sync` (jadwal harian: `deploy/sinkron-harian.ps1`). *(teruji ke server lokal)*
- [x] Cadangan dapat diunduh dari Admin → Sistem; pulihkan dengan mengganti berkas `.db`. *(teruji unduh; uji pulih saat Tahap 4)*

### 3.5 Catatan hasil implementasi (11 Nov 2026)

| Bagian | Berkas / mekanisme |
|---|---|
| Login & sesi | Auth.js v5 (`src/auth.ts`, `src/auth.config.ts`), Credentials + bcrypt (cost 12), sesi JWT 8 jam, halaman `/login` |
| Peran | `src/lib/peran.ts`: Viewer < Operator < Admin < Super Admin; pemeriksaan di setiap halaman/route lewat `src/lib/sesi.ts`, bukan hanya menyembunyikan tombol |
| Batas unit | Operator dengan `unitKerjaId` hanya boleh menyimpan baris unitnya (baris lain ditandai error) |
| Pembatas login | `src/lib/rate-limit.ts`: 5 percobaan / 15 menit per IP; akun dikunci 15 menit setelah 10 sandi salah |
| Audit | tabel `AuditLog` (login berhasil/gagal/dibatasi, impor, kelola pengguna, cadangan, sinkron) di Admin → Sistem |
| Kelola pengguna | `/admin/pengguna` (Admin+): tambah, ubah peran/unit/aktif, setel ulang sandi; hanya Super Admin yang menetapkan Super Admin; tidak bisa menonaktifkan diri sendiri |
| Super Admin pertama | otomatis dari `SUPERADMIN_EMAIL/PASSWORD` saat seed **atau** saat server start (`src/instrumentation.ts` → `src/lib/bootstrap.ts`) bila belum ada pengguna |
| Header keamanan | `next.config.mjs`: nosniff, X-Frame-Options, Referrer-Policy, Permissions-Policy, HSTS; `poweredByHeader: false` |
| Cadangan | `GET /api/admin/cadangan` (Admin+): `VACUUM INTO` → berkas `.db` konsisten |
| Sinkronisasi | `POST /api/sync` dengan `SYNC_TOKEN` (perbandingan waktu-konstan); `scripts/sinkron.ts` (`npm run sync`); mode `internet` menolak Simpan di impor |
| Docker | `deploy/Dockerfile` (multi-stage, standalone, Prisma linux-musl), `deploy/entrypoint.sh` (migrate deploy lalu start), `deploy/docker-compose.yml` (app + caddy profil internet), `deploy/Caddyfile` |

**Keputusan: SQLite tetap dipakai di produksi (volume Docker), bukan PostgreSQL.** Alasan: skala data kecil (ratusan–ribuan baris/tahun), operator sedikit, satu instance per lokasi, dan tidak ada PostgreSQL untuk diuji di mesin pengembang. Prisma memungkinkan pindah ke PostgreSQL nanti: ganti `provider` di `schema.prisma`, buat ulang folder migrasi (`prisma migrate dev` ke server PostgreSQL), lalu pindahkan data lewat ekspor/impor Excel atau `npm run sync`. Cadangan SQLite cukup dengan tombol di Admin → Sistem; untuk PostgreSQL gunakan `pg_dump`.

**Yang belum bisa diuji di sini dan harus diuji di server:** build image Docker, sertifikat HTTPS Caddy, akses dari LAN RS, pulih dari cadangan. Jalankan `docker compose ... up -d --build` di server uji dulu; bila gagal pada tahap Prisma, periksa log `entrypoint` dan pastikan `binaryTargets` di `schema.prisma` memuat `linux-musl-openssl-3.0.x`.

**Catatan keamanan yang masih terbuka (masuk Tahap 4):** pembatas login berbasis IP memakai header `x-forwarded-for`, jadi di belakang Caddy bekerja per pengguna, tetapi di intranet tanpa proxy semua pengguna di satu NAT berbagi jatah; Content-Security-Policy belum dipasang; belum ada 2FA; alur "lupa sandi" lewat Admin (belum self-service) — sejak 13 Nov 2026 pengguna bisa **mengganti sandinya sendiri** di menu *Akun Saya* (wajib sandi lama, dibatasi 5 percobaan/15 menit).

---

## Tahap 4 — Uji coba, migrasi data, serah terima (siap pakai)

Perangkat tahap ini sudah disiapkan (11 Nov 2026): rencana uji **`docs/UAT.md`**, SOP satu halaman **`docs/SOP.md`**, materi pelatihan 60 menit **`docs/PANDUAN-OPERATOR.md`**, checklist serah terima & pemantauan **`docs/SERAH-TERIMA.md`**. Butir di bawah adalah acuan pelaksanaannya.

1. **Migrasi data historis**: konversi RKPBU 2024, 2025, 2026 (semua tahap) ke template, unggah, cocokkan total per tahap dengan kertas kerja keuangan.
2. **UAT (User Acceptance Test)** dengan 3 peran nyata: 1 operator Elektromedik, 1 operator unit lain, 1 manajemen sebagai Viewer. Catat temuan, perbaiki, ulangi sampai nol temuan "blocker".
3. **Pelatihan** 1 sesi 60 menit: alur unduh template → isi → unggah → cek dashboard. Rekam layar sebagai video panduan.
4. **SOP** satu halaman: jadwal unggah (mis. setiap tahap anggaran), siapa menyetujui, cara lapor error, jadwal backup.
5. **Pemantauan**: *uptime monitor* gratis (mis. UptimeRobot) ke URL publik, notifikasi ke WhatsApp/email IT.
6. **Serah terima**: akun Super Admin dipegang IT RS, repositori Git berisi kode + `docs/`, kredensial disimpan di pengelola sandi RS, bukan di chat.

**Definisi "siap pakai":** semua checklist Tahap 1–3 tercentang, data 2026 lengkap, UAT nol blocker, SOP dan backup berjalan minimal 1 minggu tanpa insiden.

---

**Tambahan 13 Nov 2026:** menu **HTA** (perbandingan merek & tipe alat ala versus.com: skor berbobot 5 domain dari data
operasional STARS + data produk/spesifikasi yang diisi tim; model `ProdukHta`) dan tab **Cetak RKBU** (editor dokumen
RKBU/RKPBU ber-kop dengan pratinjau A4, isi dari data Paket, tanda tangan, lampiran gambar, simpan, cetak/PDF, Excel;
model `DokumenRkbu`, gambar di `UPLOAD_DIR/rkbu`). Migrasi `20261113120000_rkbu_hta`.

## Ringkasan urutan kerja minggu per minggu (perkiraan 8–10 minggu)

| Minggu | Pekerjaan |
|---|---|
| 1 | ✅ Git + commit awal, Prisma + SQLite, seed unit kerja, konverter RKPBU → JSON |
| 2–3 | ✅ API publik, filter via query string, ganti semua data contoh, unduh XLSX/CSV (selesai lebih cepat: 1 hari) |
| 4–5 | ✅ Halaman admin impor/ekspor, validasi, log impor (selesai 10 Nov 2026) |
| 6 | ✅ Auth.js, peran, middleware, audit log (selesai 11 Nov 2026) |
| 7 | ✅ Berkas Docker + sinkronisasi + cadangan; Docker teruji & server intranet berjalan di laptop (11 Nov 2026) |
| 8 | ✅ Akses internet + HTTPS via Tailscale Funnel (11 Nov 2026); ⬜ jadwal sinkron harian (belum perlu — satu server), uji pulih cadangan |
| 9–10 | Migrasi data, UAT, pelatihan, SOP, serah terima |

Prinsip untuk pemula: **satu tahap satu cabang Git**, selesaikan checklist sebelum pindah tahap, dan setiap akhir hari pastikan `npm run build` masih lolos.
