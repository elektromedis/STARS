@echo off
chcp 65001 >nul
setlocal EnableExtensions
REM ============================================================
REM  STARS - Panel server cloud (VPS), dijalankan dari laptop.
REM  Klik dua kali berkas ini lalu pilih nomor menu.
REM  Butuh: OpenSSH Client (bawaan Windows 10/11). Menu 2 juga
REM  butuh Docker Desktop yang menjalankan server STARS laptop.
REM  Panduan lengkap: docs\PINDAH-KE-CLOUD.md
REM ============================================================
cd /d "%~dp0"

where ssh >nul 2>nul
if errorlevel 1 goto tanpa_ssh

:alamat
set "VPS="
if exist "vps-alamat.txt" set /p VPS=<"vps-alamat.txt"
if defined VPS goto baca_url
echo.
echo Masukkan alamat VPS dalam bentuk root@IP  - contoh: root@103.20.30.40
set /p "VPS=Alamat VPS: "
if not defined VPS goto alamat
echo %VPS%| find "@" >nul
if errorlevel 1 set "VPS=root@%VPS%"
>"vps-alamat.txt" echo %VPS%

:baca_url
set "URLPUB="
if exist ".env" for /f "usebackq tokens=1,* delims==" %%a in (`findstr /b /c:"STARS_URL_PUBLIK=" ".env"`) do set "URLPUB=%%b"

:menu
echo.
echo ==========================================================
echo  STARS - server cloud      VPS: %VPS%
echo  Alamat publik             : %URLPUB%
echo ==========================================================
echo  1. Siapkan VPS - pertama kali, STARS di laptop tetap jalan
echo  2. Pindahkan data laptop ke VPS - STARS berhenti +-30 menit
echo  3. Perbarui STARS di VPS - setelah Sync Changes di VS Code
echo  4. Ambil cadangan terbaru dari VPS ke laptop
echo  5. Lihat status VPS
echo  6. Masuk VPS tanpa sandi - pasang kunci SSH laptop
echo  7. Ganti alamat VPS
echo  8. Keluar
echo.
choice /C 12345678 /N /M "Pilih nomor [1-8]: "
set "PIL=%errorlevel%"
if "%PIL%"=="1" goto siapkan
if "%PIL%"=="2" goto pindah
if "%PIL%"=="3" goto perbarui
if "%PIL%"=="4" goto ambil
if "%PIL%"=="5" goto status
if "%PIL%"=="6" goto kunci
if "%PIL%"=="7" goto ganti
goto selesai

REM ---------------------------------------------------------- 1
:siapkan
echo.
echo [INFO] VPS mengambil kode dari GitHub: pastikan sudah klik Sync Changes di VS Code.
if not defined URLPUB echo [PERHATIAN] STARS_URL_PUBLIK belum ada di deploy\.env - alamat .ts.net tidak ikut dipindah.
echo [INFO] Mengirim skrip ke VPS - masukkan sandi root VPS bila diminta...
scp "pasang-vps.sh" %VPS%:/root/pasang-vps.sh
if errorlevel 1 goto gagal_ssh
ssh -t %VPS% "sed -i 's/\r$//' /root/pasang-vps.sh && bash /root/pasang-vps.sh siapkan %URLPUB%"
if errorlevel 1 goto gagal_vps
echo.
echo [OK] VPS siap. Pilih menu 2 di luar jam kerja untuk memindahkan data.
pause
goto menu

REM ---------------------------------------------------------- 2
:pindah
echo.
echo  Menu ini akan:
echo   a. memeriksa VPS sudah disiapkan - menu 1,
echo   b. MENGHENTIKAN STARS di laptop - pengguna tidak bisa membuka STARS sementara,
echo   c. mengemas basis data + foto/dokumen/sertifikat ke C:\pindahan\stars-pindahan.tgz,
echo   d. mengirimnya ke VPS, lalu memindahkan alamat .ts.net ke VPS.
echo  Siapkan browser untuk https://login.tailscale.com/admin/machines
choice /C YN /M "Lanjutkan"
if errorlevel 2 goto menu
docker info >nul 2>nul
if errorlevel 1 goto tanpa_docker
docker volume inspect stars_stars_data >nul 2>nul
if errorlevel 1 goto tanpa_volume
echo [INFO] Memeriksa VPS...
ssh %VPS% "test -f /opt/STARS/stars/deploy/.env && command -v tailscale >/dev/null"
if errorlevel 1 goto belum_siap
echo [INFO] Menghentikan STARS di laptop...
docker compose -f docker-compose.yml --env-file .env stop app
if not exist "C:\pindahan" mkdir "C:\pindahan"
echo [INFO] Mengemas data...
docker run --rm -v stars_stars_data:/data:ro -v stars_stars_uploads:/uploads:ro -v C:\pindahan:/out alpine tar czf /out/stars-pindahan.tgz -C / data uploads
if errorlevel 1 goto gagal_kemas
for %%F in ("C:\pindahan\stars-pindahan.tgz") do echo [OK] Paket data: %%~fF - %%~zF byte
echo [INFO] Mengirim paket ke VPS...
scp "C:\pindahan\stars-pindahan.tgz" %VPS%:/root/stars-pindahan.tgz
if errorlevel 1 goto gagal_kirim
ssh -t %VPS% "bash /opt/STARS/stars/deploy/pasang-vps.sh pindah"
if errorlevel 1 goto gagal_pindah
echo.
echo [OK] STARS sekarang berjalan di VPS.
echo      JANGAN jalankan server-rs.bat lagi di laptop - nanti ada dua server dengan data berbeda.
choice /C YN /M "Hapus kontainer server STARS di laptop? Data laptop TETAP disimpan sebagai cadangan"
if errorlevel 2 goto jeda
docker compose -f docker-compose.yml --env-file .env down
echo [OK] Server laptop dimatikan. Laptop sekarang boleh dimatikan kapan saja.
goto jeda

REM ---------------------------------------------------------- 3
:perbarui
echo.
echo [INFO] Pastikan perubahan sudah dikirim lewat Sync Changes di VS Code.
ssh -t %VPS% "bash /opt/STARS/stars/deploy/pasang-vps.sh perbarui"
if errorlevel 1 goto gagal_vps
goto jeda

REM ---------------------------------------------------------- 4
:ambil
for /f %%d in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmm"') do set "STEMPEL=%%d"
if not exist "C:\cadangan-stars" mkdir "C:\cadangan-stars"
echo [INFO] Membuat cadangan baru di VPS...
ssh %VPS% "bash /opt/STARS/stars/deploy/pasang-vps.sh cadangan"
if errorlevel 1 goto gagal_vps
scp %VPS%:/root/cadangan-stars/terbaru.tgz "C:\cadangan-stars\stars-%STEMPEL%.tgz"
if errorlevel 1 goto gagal_ssh
echo [OK] Tersimpan: C:\cadangan-stars\stars-%STEMPEL%.tgz
echo      Salin juga ke drive RS atau hard disk eksternal - jangan ke grup chat.
goto jeda

REM ---------------------------------------------------------- 5
:status
ssh -t %VPS% "bash /opt/STARS/stars/deploy/pasang-vps.sh status"
goto jeda

REM ---------------------------------------------------------- 6
:kunci
if not exist "%USERPROFILE%\.ssh" mkdir "%USERPROFILE%\.ssh"
if not exist "%USERPROFILE%\.ssh\id_ed25519.pub" ssh-keygen -q -t ed25519 -N "" -f "%USERPROFILE%\.ssh\id_ed25519"
echo [INFO] Masukkan sandi root VPS sekali lagi...
type "%USERPROFILE%\.ssh\id_ed25519.pub" | ssh %VPS% "umask 077; mkdir -p ~/.ssh; cat >> ~/.ssh/authorized_keys"
if errorlevel 1 goto gagal_ssh
echo [OK] Kunci terpasang - berikutnya VPS tidak menanyakan sandi lagi dari laptop ini.
goto jeda

REM ---------------------------------------------------------- 7
:ganti
del "vps-alamat.txt" 2>nul
goto alamat

REM ---------------------------------------------------------- pesan
:gagal_kirim
echo [GAGAL] Paket data tidak terkirim ke VPS - periksa internet, lalu ulangi menu 2.
goto tawar_laptop
:gagal_pindah
echo [GAGAL] Pemindahan di VPS belum tuntas - baca pesan di atas.
echo         Menu 2 aman diulang setelah masalahnya diperbaiki.
echo         Bila ingin kembali ke laptop dulu: kembalikan nama mesin laptop di
echo         https://login.tailscale.com/admin/machines lalu jawab Y di bawah.
:tawar_laptop
choice /C YN /M "Nyalakan lagi STARS di laptop sementara"
if errorlevel 2 goto jeda
docker compose -f docker-compose.yml --env-file .env up -d
goto jeda
:gagal_kemas
echo [GAGAL] Gagal mengemas data. STARS di laptop dinyalakan lagi.
docker compose -f docker-compose.yml --env-file .env up -d
goto jeda
:belum_siap
echo [GAGAL] VPS belum disiapkan atau tidak terjangkau. Jalankan menu 1 dulu.
echo         STARS di laptop TIDAK dihentikan.
goto jeda
:gagal_ssh
echo [GAGAL] Tidak bisa terhubung ke %VPS%. Periksa alamat IP, sandi root, dan internet.
goto jeda
:gagal_vps
echo [GAGAL] Perintah di VPS gagal - salin pesan di atas untuk dilaporkan.
goto jeda
:tanpa_docker
echo [GAGAL] Docker Desktop belum berjalan. Buka Docker Desktop, tunggu ikonnya hijau, lalu ulangi.
goto jeda
:tanpa_volume
echo [GAGAL] Data server laptop - volume stars_stars_data - tidak ditemukan di laptop ini.
goto jeda
:tanpa_ssh
echo [GAGAL] Perintah ssh tidak ditemukan. Windows: Settings - Apps - Optional features - tambah OpenSSH Client.
pause
exit /b 1

:jeda
pause
goto menu

:selesai
endlocal
exit /b 0
