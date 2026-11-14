# Memindahkan Server STARS ke Cloud (VPS)

Tujuan: STARS tetap bisa dibuka 24 jam walau **laptop dimatikan**. Laptop hanya dipakai untuk
mengembangkan fitur.

```
Sebelum : HP/PC ──HTTPS──> https://<nama>.ts.net ──> LAPTOP (Docker STARS)       laptop mati = STARS mati
Sesudah : HP/PC ──HTTPS──> https://<nama>.ts.net ──> VPS di pusat data (Docker STARS, menyala 24 jam)
```

- **Alamat tidak berubah.** VPS memakai nama mesin Tailscale yang sama dengan laptop, jadi alamat
  `https://….ts.net` tetap sama dan **label QR yang sudah tertempel tetap berfungsi**.
- Server cloud tetap memakai `STARS_MODE=intranet` (mode penuh). Mode `internet` itu baca saja,
  sehingga operator tidak bisa mengunggah. Sinkron harian tidak diperlukan lagi.
- STARS tidak bergantung pada perangkat di jaringan RS, jadi tidak ada kode yang perlu diubah.

Dua berkas mengerjakan semuanya:

| Berkas | Dijalankan di | Isi |
|---|---|---|
| `deploy\vps.bat` | laptop (klik dua kali) | menu: siapkan VPS, pindahkan data, perbarui, ambil cadangan, status |
| `deploy/pasang-vps.sh` | VPS (dipanggil otomatis oleh `vps.bat`) | pasang Docker, Tailscale, firewall, kode, `.env`; cadangan harian |

---

## 0. Sebelum mulai

- [ ] **Izin:** manajemen/IT RS setuju memakai VPS (atau RS menyediakan server dari Pemprov/Diskominfotik).
      Pilih pusat data **di Indonesia**.
- [ ] **VPS:** Ubuntu 24.04 LTS, 2 vCPU, RAM 4 GB (2 GB juga bisa, karena skrip menambah swap), SSD ≥ 40 GB,
      lokasi Jakarta. Catat **IP publik** dan **sandi root** di pengelola sandi RS, jangan di chat atau WA.
- [ ] **VS Code:** klik **Sync Changes** agar semua commit sudah ada di GitHub. VPS mengambil kode dari sana.
- [ ] Bisa login ke **GitHub** (pemilik repo STARS) dan ke **Tailscale** (akun yang sama dengan laptop).
- [ ] `deploy\.env` di laptop berisi `STARS_URL_PUBLIK=https://….ts.net`. Nilai ini dibaca otomatis.

## 1. Siapkan VPS (STARS di laptop tetap jalan)

1. Klik dua kali **`deploy\vps.bat`**, lalu isi alamat VPS, contoh `root@103.20.30.40`.
   Alamat ini disimpan di `deploy\vps-alamat.txt`, yang tidak ikut ke Git.
2. Pilih **menu 6** (sekali saja). Ketik `yes` saat ditanya *"Are you sure you want to continue connecting"*,
   lalu masukkan sandi root. Setelah itu VPS tidak menanyakan sandi lagi dari laptop ini.
3. Pilih **menu 1**. Skrip akan:
   - memperbarui Ubuntu, menambah swap, memasang Docker dan Tailscale, dan menyalakan firewall
     (hanya SSH yang dibuka);
   - mengambil kode dari GitHub. Jika repo privat, layar menampilkan satu baris kunci. Buka tautan yang
     tampil (GitHub → Settings → Deploy keys → Add), tempel kuncinya, **jangan** centang *Allow write access*,
     lalu tekan Enter;
   - membuat `deploy/.env` **baru dengan rahasia acak baru**, sehingga rahasia lama yang pernah terlihat
     di tangkapan layar tidak dipakai lagi. `APP_PORT=127.0.0.1:3000` membuat STARS hanya bisa dibuka
     lewat HTTPS Funnel;
   - membangun dan menyalakan STARS (15–25 menit), lalu menjadwalkan cadangan harian pukul 02:30 WIB.

   Di akhir, STARS di VPS masih kosong dan belum bisa dibuka dari luar. Itu normal.

## 2. Pindahkan data dan alamat (di luar jam kerja, ±30 menit STARS tidak bisa dibuka)

Siapkan browser yang sudah login ke https://login.tailscale.com/admin/machines, lalu di `vps.bat` pilih **menu 2**:

1. Skrip memeriksa VPS sudah siap. Jika belum, laptop **tidak** dihentikan.
2. STARS di laptop dihentikan. Basis data **dan** semua foto, dokumen, dan sertifikat dikemas ke
   `C:\pindahan\stars-pindahan.tgz`. Folder ini sengaja di luar OneDrive.
   Tombol *Cadangan* di Admin → Sistem hanya berisi basis data, jadi tidak cukup untuk pindahan.
3. Paket dikirim ke VPS dan dimuat. Data VPS sebelumnya dicadangkan dulu.
4. **Alamat dipindah.** Skrip meminta Anda mengganti nama mesin laptop di halaman admin Tailscale:
   **⋯ → Edit machine name**, ganti misalnya `elektromedis-pc` menjadi `elektromedis-pc-laptop`.
   Lalu tekan Enter. Saat pertama kali, buka tautan login Tailscale yang muncul dan masuk dengan **akun yang sama**.
   Jika VPS mendapat nama `…-1`, ganti nama mesin VPS di halaman yang sama sesuai petunjuk di layar.
5. Funnel dinyalakan di VPS dan alamat https diuji.
6. `vps.bat` menawarkan untuk menghapus kontainer server di laptop. Data laptop **tetap disimpan** sebagai cadangan.

### Wajib setelah menu 2

- [ ] Halaman admin Tailscale → mesin **VPS** → **⋯ → Disable key expiry**. Tanpa ini VPS terputus otomatis
      sekitar 6 bulan lagi.
- [ ] Buka STARS dari **HP dengan data seluler**, lalu periksa data, foto alat, dokumen, dan sertifikat.
      **Scan satu label QR lama.**
- [ ] Admin → Pengguna: **ganti sandi Super Admin**. Semua pengguna perlu login ulang sekali, dan itu normal.
- [ ] Jangan jalankan `server-rs.bat` lagi di laptop. Kalau dijalankan, akan ada dua server dengan data berbeda.

Mulai sekarang **laptop boleh dimatikan**.

## 3. Perawatan rutin

| Kapan | Apa | Caranya |
|---|---|---|
| Setelah ada fitur baru | Perbarui STARS | VS Code **Sync Changes**, lalu `vps.bat` **menu 3**. Data dicadangkan dulu; STARS lama tetap melayani selama build. |
| Setiap hari 02:30 | Cadangan di VPS | Otomatis ke `/root/cadangan-stars` (14 terakhir), termasuk foto dan dokumen. |
| Setiap minggu | Salinan di luar VPS | `vps.bat` **menu 4** menyimpan ke `C:\cadangan-stars\`. Salin juga ke drive RS. |
| Sekali | Snapshot penyedia | Aktifkan fitur *backup/snapshot otomatis* di panel penyedia VPS, untuk berjaga jika VPS rusak total. |
| Sebulan sekali | Pembaruan Ubuntu | `ssh root@IP`, lalu `apt update && apt upgrade -y && reboot`. STARS dan Funnel hidup lagi sendiri. |
| Bila ada keluhan | Cek keadaan | `vps.bat` **menu 5**: kontainer, versi, alamat, disk, cadangan, dan log. |

### Mengaktifkan email "Lupa sandi" (opsional, sekali)

1. Buat/akses akun Gmail khusus STARS → aktifkan **Verifikasi 2 Langkah** → buat **App Password** di
   `myaccount.google.com/apppasswords` (16 huruf).
2. `ssh root@IP`, lalu `nano /opt/STARS/stars/deploy/.env` dan tambahkan (jangan kirim isinya lewat chat):
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_USER=akun-stars@gmail.com
   SMTP_PASS=<App Password 16 huruf>
   SMTP_FROM=STARS RSUD Cipayung <akun-stars@gmail.com>
   ```
   Pastikan `STARS_URL_PUBLIK` sudah berisi alamat https STARS (tautan di email memakai alamat ini).
3. `vps.bat` **menu 3** (atau di VPS: `bash pasang-vps.sh perbarui`) agar pengaturan terbaca.
4. Uji: halaman Masuk → **Lupa sandi?** → email akun Anda. Bila gagal, lihat *Admin → Sistem → Audit log* (`sandi.lupa.gagal`).

### Memulihkan dari cadangan

```
scp C:\cadangan-stars\stars-YYYYMMDD-HHMM.tgz root@IP-VPS:/root/
ssh -t root@IP-VPS "bash /opt/STARS/stars/deploy/pasang-vps.sh pulihkan /root/stars-YYYYMMDD-HHMM.tgz"
```
Cadangan yang sudah ada di VPS bisa langsung dipakai: `pulihkan /root/cadangan-stars/stars-….tgz`.
Data yang sedang berjalan selalu dicadangkan dulu sebelum ditimpa.

## 4. Jika ada masalah

- **Menu 2 gagal di tengah jalan:** baca pesannya. Setelah diperbaiki, menu 2 **aman diulang**.
  Untuk sementara kembali ke laptop: kembalikan nama mesin laptop di halaman admin Tailscale, lalu jawab `Y`
  saat `vps.bat` menawarkan menyalakan STARS laptop.
- **Hanya langkah alamat yang gagal:** `ssh -t root@IP-VPS "bash /opt/STARS/stars/deploy/pasang-vps.sh alamat"`.
- **Build gagal kehabisan memori:** pastikan RAM minimal 2 GB. Skrip sudah menambah swap 2 GB.
- **Lupa IP VPS:** lihat panel penyedia, lalu `vps.bat` **menu 7**.

## 5. Catatan keamanan

- Dari internet hanya **SSH** yang terbuka. STARS (port 3000) hanya mendengar di `127.0.0.1` dan dibuka lewat
  Tailscale Funnel (HTTPS). Docker melewati firewall `ufw`, jadi `APP_PORT=127.0.0.1:3000` di `.env`
  **jangan diubah**.
- `deploy/.env` di VPS hanya bisa dibaca root (`chmod 600`). Isinya jangan disalin ke chat.
  Sandi Super Admin yang dibuat skrip hanya untuk basis data kosong. Setelah menu 2, akun yang berlaku
  adalah akun dari laptop.
- Kunci GitHub VPS hanya bisa **membaca** repo. Cabut di GitHub → Settings → Deploy keys bila VPS tidak dipakai lagi.

## 6. Bila nanti RS punya domain resmi

Tetap `STARS_MODE=intranet`. Isi `STARS_DOMAIN` di `/opt/STARS/stars/deploy/.env`, arahkan DNS domain ke IP VPS,
lalu jalankan `docker compose --env-file .env --profile internet up -d` di folder itu. Caddy memberi HTTPS otomatis.
Biarkan Funnel `.ts.net` tetap menyala agar label QR lama tetap bisa dibuka.

## Perintah lengkap `pasang-vps.sh` (di VPS, sebagai root)

```
bash /opt/STARS/stars/deploy/pasang-vps.sh siapkan [URL]   # menu 1
bash /opt/STARS/stars/deploy/pasang-vps.sh pindah          # menu 2 (bagian VPS)
bash /opt/STARS/stars/deploy/pasang-vps.sh alamat          # ulang pemindahan alamat .ts.net
bash /opt/STARS/stars/deploy/pasang-vps.sh perbarui        # menu 3
bash /opt/STARS/stars/deploy/pasang-vps.sh cadangan        # cadangan sekarang
bash /opt/STARS/stars/deploy/pasang-vps.sh pulihkan FILE   # kembalikan data dari .tgz
bash /opt/STARS/stars/deploy/pasang-vps.sh status          # menu 5
```
