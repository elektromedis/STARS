@echo off
chcp 65001 >nul
REM ============================================================
REM  STARS - Server RS (intranet) memakai Docker Desktop
REM  Klik dua kali berkas ini. Aman dijalankan berulang kali.
REM  Hasil: server hidup di http://<IP-laptop>:3000 untuk seluruh LAN,
REM  data tersimpan di volume Docker (bukan di folder OneDrive).
REM ============================================================
cd /d "%~dp0"

where docker >nul 2>nul
if errorlevel 1 (
  echo [GAGAL] Docker tidak ditemukan. Pasang Docker Desktop: https://www.docker.com/products/docker-desktop/
  pause
  exit /b 1
)

docker info >nul 2>nul
if errorlevel 1 (
  echo [GAGAL] Docker Desktop belum berjalan. Buka aplikasi Docker Desktop,
  echo         tunggu ikonnya hijau, lalu jalankan berkas ini lagi.
  pause
  exit /b 1
)

if not exist ".env" (
  echo [INFO] Membuat deploy\.env dengan rahasia acak...
  powershell -NoProfile -ExecutionPolicy Bypass -File "siapkan-env-deploy.ps1"
  if errorlevel 1 (
    echo [GAGAL] Gagal membuat .env
    pause
    exit /b 1
  )
  echo.
  echo CATAT email+sandi Super Admin di atas sebelum melanjutkan, lalu
  pause
)

echo [INFO] Membangun dan menjalankan server (pertama kali bisa 5-15 menit)...
docker compose -f docker-compose.yml --env-file .env up -d --build
if errorlevel 1 (
  echo [GAGAL] Docker compose gagal. Salin pesan error di atas untuk dilaporkan.
  pause
  exit /b 1
)

if exist "..\prisma\dev.db" (
  echo.
  echo Ditemukan basis data pengembangan: ..\prisma\dev.db ^(berisi data RKPBU^)
  choice /C YN /M "Salin sebagai data awal server? HANYA untuk instalasi pertama - menimpa data server"
  if not errorlevel 2 (
    docker compose -f docker-compose.yml --env-file .env cp ..\prisma\dev.db app:/app/data/stars.db
    docker compose -f docker-compose.yml --env-file .env restart app
    echo [INFO] Data awal dimuat ke server.
  )
)

REM Buka firewall Windows untuk port 3000 (butuh hak Administrator; boleh gagal)
netsh advfirewall firewall show rule name="STARS 3000" >nul 2>nul
if errorlevel 1 netsh advfirewall firewall add rule name="STARS 3000" dir=in action=allow protocol=TCP localport=3000 >nul 2>nul

echo.
echo ==========================================================
echo  STARS berjalan sebagai server RS.
echo  Dari laptop ini      : http://localhost:3000
echo  Dari komputer lain di jaringan yang sama, pakai salah satu:
powershell -NoProfile -Command "Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254*'} | ForEach-Object { '      http://' + $_.IPAddress + ':3000' }"
echo.
echo  Agar server otomatis hidup saat laptop menyala:
echo  Docker Desktop - Settings - General - centang "Start Docker Desktop when you sign in".
echo.
echo  Lihat log : docker compose -f docker-compose.yml logs -f app
echo  Matikan   : docker compose -f docker-compose.yml down
echo  Bila komputer lain tidak bisa akses: jalankan berkas ini sekali
echo  sebagai Administrator (klik kanan - Run as administrator).
echo ==========================================================
pause
