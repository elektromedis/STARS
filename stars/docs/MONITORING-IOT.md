# Live Monitoring — menyambungkan sensor suhu & kelembapan ke STARS

Menu **Live Monitoring** (Live Medical Device Environmental Monitoring System) memantau suhu dan kelembapan
alat kesehatan, misalnya kulkas vaksin, kulkas darah, freezer, dan ruang alat, secara real time. Konsepnya
mengikuti LogTag Online: **lokasi** adalah titik yang dipantau, dan sensornya boleh diganti tanpa memutus riwayat.

- **Dashboard (publik):** `/monitoring`, diperbarui tiap 15 detik. Detail tiap lokasi ada di `/monitoring/LP-001`.
- **Pengaturan:** Admin → **Monitoring**. Menambah dan mengubah memerlukan peran Operator; menghapus lokasi atau data memerlukan Admin.

---

## 1. Mulai dalam 5 langkah

1. Admin → Monitoring → **Tambah lokasi**.
   - Pilih jenis; batas contohnya terisi otomatis (Kulkas 2–8 °C, Kulkas darah 2–6 °C, Freezer ≤ −15 °C, Ruangan 15–25 °C & 30–70 %RH).
   - **Sesuaikan batas dengan SOP RS dan petunjuk pabrikan.**
2. Atur **Alarm setelah N bacaan berturut-turut** (bawaan 2) dan **Terputus bila tanpa data > X menit** (bawaan 15).
3. Tab **Sensor** → **Daftarkan sensor** → pilih lokasinya → **token API tampil sekali**. Salin dan simpan.
4. Isi alamat STARS dan token itu di perangkat (lihat §3).
5. Buka `/monitoring`. Bacaan pertama akan tampil dalam satu menit.

Belum punya sensor? Gunakan tab **Integrasi & uji** → *Kirim bacaan uji* untuk latihan. Admin bisa menghapus bacaan uji sekaligus.

## 2. Pilihan perangkat

| Pilihan | Cocok untuk | Cara masuk ke STARS |
|---|---|---|
| **ESP32 + SHT31** (suhu & RH) atau **+ DS18B20** (probe suhu, kabel masuk kulkas/freezer) | Murah, real time, dirakit sendiri | Kirim langsung ke API tiap 1 menit (§3–§4) |
| **Logger USB** (mis. LogTag TRIX-8, HAXO-8) | Tanpa WiFi; dibaca berkala | LogTag Analyzer → ekspor CSV/TXT/Excel → Admin → Monitoring → **Impor data logger** |
| **LogTag Online / logger WiFi LogTag** | Sudah punya akun LogTag Online | Unduh CSV dari LogTag Online → **Impor data logger**. STARS belum tersambung otomatis ke LogTag Online. |
| **Gateway komersial** (LoRaWAN, Zigbee, dll.) | Banyak sensor sekaligus | Hanya bila gateway bisa mengirim **HTTP POST JSON** dengan header sendiri. Setiap sensor memakai tokennya sendiri. |

Catatan impor:
- **Pratinjau dulu**, lalu periksa contoh waktu. Bila urutan tanggal ambigu (semua angka ≤ 12), pilih *Hari/Bulan/Tahun* atau *Bulan/Hari/Tahun*.
- Waktu tanpa zona waktu dianggap **WIB**.
- Mengimpor ulang berkas yang sama aman: bacaan yang waktunya sudah ada dilewati.

## 3. API untuk perangkat

```
POST https://<alamat-STARS>/api/iot/bacaan
Authorization: Bearer <token sensor>        (atau  X-Api-Key: <token sensor>)
Content-Type: application/json
```

Satu bacaan:

```json
{ "suhu": 4.6, "lembap": 55, "waktu": "2026-11-14T10:00:00+07:00", "baterai": 87, "sinyal": -61 }
```

- `suhu` (°C) dan/atau `lembap` (%RH) wajib.
- `waktu` opsional; bila tidak diisi, dipakai waktu server.
- Waktu boleh epoch detik/milidetik atau ISO. Teks tanpa zona dianggap WIB.
- `baterai` (0–100 %) dan `sinyal` (dBm) opsional.
- Alias nama kolom yang juga diterima: `temperature`/`temp`/`t`, `humidity`/`hum`/`rh`/`h`, `time`/`timestamp`/`ts`, `battery`, `rssi`.

Kiriman tertunda, misalnya setelah WiFi pulih (maks 5.000 bacaan, maks 1 MB):

```json
{ "bacaan": [ { "waktu": 1763089200, "suhu": 4.5 }, { "waktu": 1763089260, "suhu": 4.6 } ] }
```

Balasan `200`:

```json
{ "ok": true, "lokasi": "LP-001", "diterima": 1, "duplikat": 0, "status": "normal" }
```

| Kode | Arti |
|---|---|
| 400 | Data salah (bukan JSON, bukan angka, kelembapan > 100, waktu di masa depan > 5 menit, atau > 400 hari lalu) |
| 401 | Token salah. Terlalu banyak token salah dari satu IP → 429 |
| 403 | Sensor dinonaktifkan |
| 409 | Sensor belum dipasang di lokasi, atau lokasinya nonaktif |
| 413 | Kiriman > 1 MB |
| 429 | Lebih dari 240 kiriman per menit per sensor |

Bacaan dengan waktu yang sama tidak tersimpan dua kali, jadi kirim ulang aman.

Uji cepat dari laptop.

curl:

```bash
curl -X POST "https://<alamat-STARS>/api/iot/bacaan" \
  -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
  -d '{"suhu": 4.6, "lembap": 55}'
```

PowerShell:

```powershell
Invoke-RestMethod -Method Post -Uri "https://<alamat-STARS>/api/iot/bacaan" `
  -Headers @{ Authorization = "Bearer <TOKEN>" } -ContentType "application/json" `
  -Body '{"suhu": 4.6, "lembap": 55}'
```

## 4. Contoh program ESP32 + SHT31 (Arduino IDE)

Pustaka yang dibutuhkan: **Adafruit SHT31** (Library Manager). Board: *ESP32 Dev Module*.

- Program mencatat setiap menit dan mengirim lewat HTTPS.
- Bila WiFi putus, bacaan disimpan di memori (±3 jam) lalu dikirim sekaligus saat WiFi pulih.

```cpp
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <Adafruit_SHT31.h>
#include <time.h>

const char* WIFI_SSID = "NAMA_WIFI";
const char* WIFI_PASS = "SANDI_WIFI";
const char* URL_STARS = "https://<alamat-STARS>/api/iot/bacaan";
const char* TOKEN     = "stm_...";            // dari Admin → Monitoring → Sensor (JANGAN unggah ke Git)
const uint32_t INTERVAL_MS = 60000;           // 1 menit
const int MAKS_ANTRE = 180;                   // ±3 jam saat WiFi putus

Adafruit_SHT31 sht;
struct Bacaan { time_t t; float suhu; float lembap; };
Bacaan antre[MAKS_ANTRE];
int nAntre = 0;

void setup() {
  Serial.begin(115200);
  sht.begin(0x44);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  configTime(0, 0, "pool.ntp.org", "time.google.com");   // jam dari internet (epoch UTC)
}

void kirim() {
  if (WiFi.status() != WL_CONNECTED || nAntre == 0) return;
  WiFiClientSecure klien;
  klien.setInsecure();   // HANYA uji coba. Produksi: klien.setCACert(ISRG_ROOT_X1) — sertifikat dari letsencrypt.org/certs/isrgrootx1.pem
  HTTPClient http;
  http.begin(klien, URL_STARS);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", String("Bearer ") + TOKEN);
  String json = "{\"sinyal\":" + String(WiFi.RSSI()) + ",\"bacaan\":[";
  for (int i = 0; i < nAntre; i++) {
    if (i) json += ",";
    json += "{\"waktu\":" + String((long)antre[i].t) + ",\"suhu\":" + String(antre[i].suhu, 2) + ",\"lembap\":" + String(antre[i].lembap, 1) + "}";
  }
  json += "]}";
  int kode = http.POST(json);
  Serial.printf("STARS: HTTP %d\n", kode);
  http.end();
  // 200 = tersimpan; 4xx selain 429 = data/token salah → buang agar antrean tidak macet
  if (kode == 200 || (kode >= 400 && kode < 500 && kode != 429)) nAntre = 0;
}

void loop() {
  static uint32_t terakhir = 0;
  static bool pertama = true;
  if (pertama || millis() - terakhir >= INTERVAL_MS) {
    pertama = false;
    terakhir = millis();
    time_t kini = time(nullptr);
    float s = sht.readTemperature(), h = sht.readHumidity();
    if (!isnan(s) && kini > 1700000000) {           // tunggu jam NTP benar
      if (nAntre == MAKS_ANTRE) { memmove(antre, antre + 1, sizeof(Bacaan) * (MAKS_ANTRE - 1)); nAntre--; }
      antre[nAntre++] = { kini, s, h };
    }
    kirim();
  }
  delay(200);
}
```

- **Sensor probe DS18B20** (OneWire + DallasTemperature) untuk kulkas/freezer: ganti pembacaan `sht.readTemperature()`, lalu hapus `lembap` dari JSON.
- **Tempatkan sensor/probe** di tengah ruang simpan, jangan menempel dinding atau evaporator.
- **Dokumentasikan kalibrasinya:** bandingkan dengan termometer terkalibrasi.

## 5. Aturan alarm & status

| Status | Arti |
|---|---|
| **Normal** | Bacaan terakhir di dalam batas dan sensor terhubung |
| **Di luar batas** | Bacaan terakhir sudah keluar batas, tetapi belum mencapai N bacaan berturut-turut |
| **Alarm** | Keluar batas **N bacaan berturut-turut** (mencegah alarm palsu saat pintu kulkas dibuka sebentar). Alarm selesai pada bacaan normal pertama. |
| **Terputus** | Tidak ada bacaan melebihi *batas putus* menit. Celah antar-kiriman sensor yang melebihi batas itu tercatat sebagai kejadian "Koneksi sensor terputus". Data impor tidak dihitung. |

Mengubah batas berlaku ke depan; alarm yang sedang berjalan ikut disesuaikan.

**Saat alarm:**
1. Buka lokasi → *Riwayat alarm* → **Akui**.
2. Isi **tindakan**, **produk/alat terdampak & keputusannya**, dan **pencegahan**.
3. Pengakuan tercatat dengan nama dan waktu di log audit.

**Inspeksi harian:** *Ringkasan harian* → *Catat inspeksi pagi/sore*. Yang tercatat adalah bacaan sensor terkini (≤ 60 menit).

**Laporan:** pilih rentang waktu. Yang tersedia:
- statistik min/maks (beserta waktunya), rata-rata, **MKT** (Mean Kinetic Temperature, ΔH/R 10.000 K);
- persentase waktu di dalam batas dan durasi di atas/bawah batas;
- unduh **CSV/Excel**, atau **Cetak laporan** (PDF lewat dialog cetak browser).

## 6. Keamanan & batasan

- **Token:** satu token per sensor. Yang disimpan STARS hanya sidik (hash)-nya.
  - Bila token bocor atau perangkat hilang: tab Sensor → **Buat token baru**. Token lama langsung tidak berlaku.
  - Jangan menaruh token di Git, chat, atau foto.
- **Akses:** alamat STARS sudah HTTPS (Tailscale Funnel / domain), jadi sensor dari jaringan mana pun bisa mengirim asalkan ada internet.
- **Notifikasi:** saat ini hanya **di browser** (bunyi + notifikasi selama halaman `/monitoring` terbuka). WhatsApp/email/SMS belum tersedia.
  - Untuk ruang jaga: buka dashboard di satu PC/TV dan aktifkan *Notifikasi*.
- **Ukuran data:** satu sensor dengan bacaan per menit ≈ 525 ribu baris/tahun, ±30–40 MB. Data ini ikut dalam cadangan harian VPS.
