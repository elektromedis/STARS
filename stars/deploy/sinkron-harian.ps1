# ============================================================
# STARS - sinkronisasi harian intranet -> internet (server intranet Windows)
# Daftarkan di Task Scheduler, mis. setiap hari 22:00:
#   Program : powershell.exe
#   Argumen : -NoProfile -ExecutionPolicy Bypass -File "C:\stars\deploy\sinkron-harian.ps1"
#   Mulai di: C:\stars
# Butuh SYNC_URL dan SYNC_TOKEN di .env. Log tersimpan di deploy\sinkron.log
# ============================================================
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$env:Path = "C:\Program Files\nodejs;" + $env:Path
$log = Join-Path $PSScriptRoot "sinkron.log"
"[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] mulai" | Out-File $log -Append -Encoding utf8
try {
  $hasil = & npm run sync 2>&1
  $hasil | Out-File $log -Append -Encoding utf8
  "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] selesai (exit $LASTEXITCODE)" | Out-File $log -Append -Encoding utf8
  exit $LASTEXITCODE
} catch {
  "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] GAGAL: $($_.Exception.Message)" | Out-File $log -Append -Encoding utf8
  exit 1
}
