@echo off
chcp 65001 >nul
REM ============================================================
REM  STARS - Domain gratis lewat Tailscale Funnel
REM  Hasil: alamat https://<nama-pc>.<nama-tailnet>.ts.net yang bisa
REM  dibuka dari internet mana pun - tanpa sewa domain, tanpa setting
REM  router, dan alamatnya TETAP walau laptop pindah jaringan.
REM  Jalankan SETELAH server hidup (server-rs.bat / jalankan-produksi.bat).
REM  Penjelasan lengkap: docs\DOMAIN-GRATIS.md
REM ============================================================
set "TS=C:\Program Files\Tailscale\tailscale.exe"

if not exist "%TS%" (
  echo [INFO] Memasang Tailscale - gratis untuk pemakaian pribadi...
  winget install --id Tailscale.Tailscale -e --accept-package-agreements --accept-source-agreements
  if errorlevel 1 (
    echo [GAGAL] Pemasangan gagal. Unduh manual: https://tailscale.com/download/windows
    pause
    exit /b 1
  )
)

"%TS%" status >nul 2>nul
if errorlevel 1 (
  echo [INFO] Login Tailscale - browser akan terbuka, boleh pakai akun Google...
  "%TS%" login
  if errorlevel 1 (
    echo [GAGAL] Login gagal atau dibatalkan.
    pause
    exit /b 1
  )
)

echo [INFO] Mengaktifkan alamat publik (Funnel) untuk port 3000...
"%TS%" funnel --bg 3000

echo.
echo [INFO] Status alamat publik:
"%TS%" funnel status
echo.
echo Bila muncul tautan persetujuan di atas: buka tautannya di browser,
echo klik setuju (Enable Funnel), lalu jalankan berkas ini SEKALI LAGI.
echo.
echo Alamat https di atas bisa dibagikan dan dibuka dari mana saja.
echo Mematikan akses internet: "%TS%" funnel reset
pause
