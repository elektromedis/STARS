@echo off
REM ============================================================
REM  STARS - Jalankan mode pengembangan (hot reload)
REM  Klik dua kali berkas ini. Browser akan membuka localhost:3000
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
  echo [INFO] Menginstal dependensi pertama kali, tunggu 1-3 menit...
  call npm install --no-audit --no-fund
)

call node scripts\siapkan-env.js

if not exist "prisma\dev.db" (
  echo [INFO] Menyiapkan basis data pertama kali (migrasi + isi data RKPBU)...
  call npm run db:setup
)

echo [INFO] Menjalankan STARS di http://localhost:3000  (tekan Ctrl+C untuk berhenti)
start "" "http://localhost:3000"
call npm run dev
pause
