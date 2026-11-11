@echo off
REM ============================================================
REM  STARS - Build lalu jalankan mode produksi (lebih cepat, tanpa hot reload)
REM  Cocok untuk server intranet rumah sakit (Windows) sebelum ada Docker.
REM  Akses dari komputer lain di LAN: http://<IP-server>:3000
REM ============================================================
cd /d "%~dp0"
set "PATH=C:\Program Files\nodejs;%PATH%"

where node >nul 2>nul
if errorlevel 1 (
  echo [GAGAL] Node.js tidak ditemukan. Pasang dulu dari https://nodejs.org (versi LTS).
  pause
  exit /b 1
)

if not exist "node_modules\.bin\next.cmd" (
  echo [INFO] Menginstal dependensi pertama kali...
  call npm install --no-audit --no-fund
)

call node scripts\siapkan-env.js

if not exist "prisma\dev.db" (
  echo [INFO] Menyiapkan basis data pertama kali (migrasi + isi data RKPBU)...
  call npm run db:setup
)

echo [INFO] Membangun versi produksi...
call npm run build
if errorlevel 1 (
  echo [GAGAL] Build gagal. Lihat pesan error di atas.
  pause
  exit /b 1
)

echo [INFO] STARS berjalan di http://localhost:3000  (tekan Ctrl+C untuk berhenti)
call npm run start -- -H 0.0.0.0 -p 3000
pause
