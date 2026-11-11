# Membuat deploy\.env dari .env.example dengan rahasia acak.
# Dipanggil otomatis oleh server-rs.bat; bisa juga dijalankan sendiri.
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

if (Test-Path '.env') {
  Write-Host '[env] deploy\.env sudah ada - tidak diubah.'
  exit 0
}

function New-Secret([int]$bytes) {
  $b = New-Object byte[] $bytes
  [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
  ([Convert]::ToBase64String($b) -replace '[+/=]', '')
}

$raw = Get-Content -Raw '.env.example'
$pw  = New-Secret 12
$raw = $raw -replace '(?m)^AUTH_SECRET=.*$',         ('AUTH_SECRET=' + (New-Secret 32))
$raw = $raw -replace '(?m)^SYNC_TOKEN=.*$',          ('SYNC_TOKEN=' + (New-Secret 24))
$raw = $raw -replace '(?m)^SUPERADMIN_PASSWORD=.*$', ('SUPERADMIN_PASSWORD=' + $pw)
Set-Content -Path '.env' -Value $raw -Encoding ascii

$email = [regex]::Match($raw, '(?m)^SUPERADMIN_EMAIL=(.*)$').Groups[1].Value.Trim()
Write-Host ''
Write-Host '=============================================================='
Write-Host ' deploy\.env dibuat. CATAT akun Super Admin awal ini:'
Write-Host ('   Email : ' + $email)
Write-Host ('   Sandi : ' + $pw)
Write-Host ' Ganti sandi lewat Admin -> Pengguna setelah login pertama.'
Write-Host ' Nilai lain dapat diubah kapan saja di berkas deploy\.env'
Write-Host '=============================================================='
