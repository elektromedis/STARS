# Menjalankan Hermes di laptop dan menyambungkannya ke STARS di VPS lewat Tailscale.
param([Parameter(Mandatory = $true)][string]$Vps)
$ErrorActionPreference = "Stop"
function Gagal($pesan) { Write-Host "[GAGAL] $pesan" -ForegroundColor Red; exit 1 }

$ts = "C:\Program Files\Tailscale\tailscale.exe"
if (-not (Test-Path $ts)) { Gagal "Tailscale belum terpasang di laptop. Jalankan domain-gratis.bat dulu." }
$ipLaptop = (& $ts ip -4 | Select-Object -First 1).Trim()
if ($ipLaptop -notmatch '^100\.') { Gagal "Tailscale laptop belum login." }
Write-Host "[INFO] Memeriksa VPS..."
$ipVps = (ssh $Vps "tailscale ip -4 | head -1").Trim()
if ($LASTEXITCODE -ne 0 -or $ipVps -notmatch '^100\.') { Gagal "VPS belum tersambung ke Tailscale." }

$folder = Join-Path $env:LOCALAPPDATA "Programs\Ollama"
$ollama = Join-Path $folder "ollama.exe"
if (-not (Test-Path $ollama)) {
  Write-Host "[INFO] Memasang Ollama..."
  winget install --id Ollama.Ollama -e --accept-package-agreements --accept-source-agreements
  if (-not (Test-Path $ollama)) { Gagal "Ollama gagal dipasang. Unduh dari https://ollama.com/download/windows" }
}

$alamat = "${ipLaptop}:11434"
[Environment]::SetEnvironmentVariable("OLLAMA_HOST", $alamat, "User")
[Environment]::SetEnvironmentVariable("OLLAMA_KEEP_ALIVE", "10m", "User")
$env:OLLAMA_HOST = $alamat

Write-Host "[INFO] Membatasi akses: hanya VPS yang boleh memakai Hermes. Setujui jendela Administrator."
$aturan = @"
Get-NetFirewallApplicationFilter | Where-Object { `$_.Program -like '*ollama*' } | Get-NetFirewallRule | Where-Object { `$_.Direction -eq 'Inbound' } | Disable-NetFirewallRule
Remove-NetFirewallRule -DisplayName 'STARS Hermes' -ErrorAction SilentlyContinue
New-NetFirewallRule -DisplayName 'STARS Hermes' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 11434 -LocalAddress $ipLaptop -RemoteAddress $ipVps | Out-Null
"@
$kode = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($aturan))
$p = Start-Process powershell -Verb RunAs -Wait -PassThru -ArgumentList "-NoProfile -EncodedCommand $kode"
if ($p.ExitCode -ne 0) { Gagal "Aturan firewall gagal dibuat." }

# Lewati proxy kantor untuk alamat Tailscale, lalu jalankan server langsung agar alamatnya pasti terpakai.
[System.Net.WebRequest]::DefaultWebProxy = $null
$env:NO_PROXY = "$ipLaptop,127.0.0.1,localhost"
Get-Process -Name "ollama*" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3
$log = Join-Path $env:TEMP "stars-ollama.log"
$logKeluar = Join-Path $env:TEMP "stars-ollama-keluar.log"
Start-Process $ollama -ArgumentList "serve" -WindowStyle Hidden -RedirectStandardError $log -RedirectStandardOutput $logKeluar
$siap = $false
foreach ($i in 1..90) {
  try { Invoke-RestMethod "http://$alamat/api/version" -TimeoutSec 3 | Out-Null; $siap = $true; break } catch { Start-Sleep -Seconds 1 }
}
if (-not $siap) {
  Write-Host "--- Catatan Ollama ---"
  if (Test-Path $log) { Get-Content $log -Tail 12 }
  Gagal "Ollama tidak menyala di alamat $alamat."
}

Write-Host "[INFO] Mengunduh Hermes 3, sekitar 2 GB..."
& $ollama pull hermes3:3b
if ($LASTEXITCODE -ne 0) { Gagal "Model gagal diunduh." }

Write-Host "[INFO] Menyambungkan STARS di VPS..."
ssh -t $Vps "cd /opt/STARS && git pull --ff-only && bash /opt/STARS/stars/deploy/aktifkan-ai.sh laptop http://$alamat"
if ($LASTEXITCODE -ne 0) { Gagal "Sambungan di VPS gagal. Pengaturan VPS sudah dikembalikan bila perlu." }
Write-Host "[OK] Selesai. Biarkan laptop menyala agar ALLIES bisa memakai Hermes." -ForegroundColor Green
