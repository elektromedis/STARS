# Domain Gratis untuk STARS — akses dari mana saja

Tujuan: dashboard STARS yang berjalan di laptop/server RS bisa dibuka dari internet
(HP dinas, rumah, dinas kesehatan) **tanpa menyewa domain dan tanpa mengubah router**.

## Pilihan yang dipakai: Tailscale Funnel (direkomendasikan)

Yang didapat: alamat tetap berbentuk **`https://<nama-pc>.<nama-tailnet>.ts.net`**, HTTPS otomatis
(gembok hijau), gratis untuk pemakaian seperti ini, dan tetap bekerja walau laptop pindah
jaringan (RS, rumah, tethering) — tidak perlu IP publik atau port forwarding.

### Cara pasang (sekali saja)

1. Pastikan server STARS hidup (klik `deploy\server-rs.bat`, atau `jalankan-produksi.bat`).
2. Klik dua kali **`deploy\domain-gratis.bat`**:
   - Tailscale terpasang otomatis (lewat winget), lalu browser terbuka untuk login —
     buat akun gratis (bisa akun Google milik unit).
   - Saat pertama kali, Tailscale menampilkan **tautan persetujuan Funnel**: buka, klik setuju,
     lalu jalankan `domain-gratis.bat` sekali lagi.
3. Catat alamat `https://….ts.net` yang tampil pada "funnel status" — itulah domain Anda.
   Alamat ini tetap sama selamanya (mengikuti nama komputer + nama tailnet).

Mematikan akses internet (dashboard tetap jalan di LAN): `tailscale funnel reset`.

### Catatan keamanan

- Dengan Funnel, **halaman admin ikut terjangkau dari internet** (tetap di belakang login).
  Pastikan semua sandi kuat, akun tak terpakai dinonaktifkan, dan audit log dicek berkala —
  pembatas percobaan login sudah aktif bawaan.
- Arsitektur Tahap 3 (server internet terpisah yang *baca saja* + sinkron harian) tetap jadi
  tujuan akhir bila RS menyediakan VPS + domain resmi; Funnel adalah jalan cepat yang sah
  selama masa itu belum tiba.
- Login, halaman **Admin**, dan tautan dokumen bekerja dari alamat mana pun yang dipakai — `localhost`,
  `http://<IP-laptop>:3000`, maupun `https://….ts.net` — karena STARS mengikuti alamat yang sedang dibuka.
  Karena itu **jangan** mengisi `AUTH_URL` di `.env`/`deploy\.env`: nilai itu memaksa semua login kembali
  ke satu alamat (dulu `http://localhost:3000`, sehingga Admin tidak bisa dipakai dari HP).
- Sesi login berlaku per alamat: masuk lewat `localhost` tidak otomatis membuat Anda masuk di alamat `.ts.net`.
- Bila login lewat alamat `.ts.net` ditolak terus pada mode **tanpa Docker**
  (`jalankan-produksi.bat`), tambahkan baris `AUTH_TRUST_HOST=true` di berkas `.env` aplikasi
  lalu jalankan ulang. (Mode Docker sudah menyetel ini otomatis.)
- Kecepatan Funnel dibatasi relai Tailscale — cukup untuk dashboard dan unggah Excel,
  bukan untuk berkas raksasa.

## Alternatif (bila suatu saat dibutuhkan)

| Cara | Gratis? | Alamat tetap? | Catatan |
|---|---|---|---|
| **Tailscale Funnel** (dipakai) | ✅ | ✅ `nama.ts.net` | Tanpa setting router; batas kecepatan relai |
| Cloudflare Quick Tunnel (`cloudflared tunnel --url`) | ✅ | ❌ acak tiap jalan | Bagus untuk demo sesaat, bukan produksi |
| ngrok (1 domain statis gratis) | ✅ | ✅ `nama.ngrok-free.app` | Ada halaman peringatan sebelum masuk — mengganggu pengunjung |
| DuckDNS + port forwarding | ✅ | ✅ `nama.duckdns.org` | Butuh akses router/IP publik — biasanya tidak diizinkan di jaringan RS |
| Domain resmi RS + VPS (Tahap 3 profil `internet`) | ❌ (±Rp 150–300 rb/thn + VPS) | ✅ | Tujuan akhir; Caddy sudah siap memberi HTTPS otomatis |

## Ringkasan arsitektur saat ini

```
Pengunjung internet ──HTTPS──> Funnel (ts.net) ──> laptop server RS ──> STARS :3000
Komputer LAN RS     ──HTTP───────────────────────> http://<IP-laptop>:3000
```

Satu server melayani keduanya. Data tersimpan di volume Docker `stars_data`
(cadangan tetap lewat Admin → Sistem, lihat `docs/SOP.md`).
