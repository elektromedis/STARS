import { prisma } from "@/lib/prisma";
import { simpanBacaan, type BacaanMasuk } from "@/lib/monitoring-simpan";

/**
 * Data simulasi SI-LOGGER (tanpa perangkat IoT). Semua lokasi demo berkode "DEMO-…" dan sensornya berserial "DEMO-…",
 * sehingga bisa dihapus bersih tanpa menyentuh data asli.
 */
export const AWALAN_DEMO = "DEMO-";
const MENIT = 60_000;
const LANGKAH = 10 * MENIT; // satu bacaan tiap 10 menit
const RIWAYAT_HARI = 7;

type Profil = { kode: string; nama: string; jenis: string; suhu: [number, number]; lembap: [number, number] | null; dasar: number; ayun: number; lembapDasar?: number; ekskursi?: { hariLalu: number; jam: number; menit: number; puncak: number } };

const PROFIL: Profil[] = [
  { kode: "DEMO-01", nama: "Kulkas Vaksin Farmasi (demo)", jenis: "Kulkas", suhu: [2, 8], lembap: null, dasar: 4.6, ayun: 0.8, ekskursi: { hariLalu: 2, jam: 14, menit: 50, puncak: 9.6 } },
  { kode: "DEMO-02", nama: "Kulkas Darah Bank Darah (demo)", jenis: "Kulkas darah", suhu: [2, 6], lembap: null, dasar: 4.1, ayun: 0.5 },
  { kode: "DEMO-03", nama: "Freezer Plasma (demo)", jenis: "Freezer", suhu: [-30, -18], lembap: null, dasar: -23.5, ayun: 1.2 },
  { kode: "DEMO-04", nama: "Ruang Alat Elektromedik (demo)", jenis: "Ruangan", suhu: [18, 26], lembap: [40, 65], dasar: 22.5, ayun: 1.5, lembapDasar: 54, ekskursi: { hariLalu: 4, jam: 11, menit: 60, puncak: 27.4 } },
];

const bulat = (x: number) => Math.round(x * 10) / 10;

function nilai(p: Profil, t: number, kini: number): BacaanMasuk {
  const jam = ((t / 3_600_000) + 7) % 24; // WIB
  let suhu = p.dasar + p.ayun * Math.sin(((jam - 9) / 24) * 2 * Math.PI) + (Math.random() - 0.5) * p.ayun * 0.4;
  if (p.ekskursi) {
    const e = p.ekskursi;
    const hari0 = new Date(kini - e.hariLalu * 86_400_000);
    const mulai = Date.UTC(hari0.getUTCFullYear(), hari0.getUTCMonth(), hari0.getUTCDate(), e.jam - 7, 0);
    const lama = e.menit * MENIT;
    if (t >= mulai && t <= mulai + lama) suhu = suhu + (e.puncak - suhu) * Math.sin(((t - mulai) / lama) * Math.PI);
  }
  const lembap = p.lembap ? bulat((p.lembapDasar ?? 50) + 5 * Math.sin((jam / 24) * 2 * Math.PI) + (Math.random() - 0.5) * 2) : null;
  return { waktu: t, suhu: bulat(suhu), lembap };
}

/** Buat lokasi + sensor demo bila belum ada, lalu isi bacaan dari bacaan terakhir (atau 7 hari lalu) sampai sekarang. */
export async function isiDemo(oleh: string) {
  const kini = Date.now();
  let total = 0;
  for (const p of PROFIL) {
    const l = await prisma.lokasiPantau.upsert({
      where: { kode: p.kode },
      update: {},
      create: {
        kode: p.kode, nama: p.nama, jenis: p.jenis, deskripsi: "Data simulasi — hapus lewat tombol \"Hapus data demo\".",
        suhuMin: p.suhu[0], suhuMaks: p.suhu[1], lembapMin: p.lembap?.[0] ?? null, lembapMaks: p.lembap?.[1] ?? null,
        tundaAlarm: 2, batasPutusMenit: 15, penanggungJawab: "Simulasi", dibuatOleh: oleh,
      },
    });
    await prisma.sensorIot.upsert({
      where: { serial: `${AWALAN_DEMO}SN-${p.kode.slice(-2)}` },
      update: { terakhirTerhubung: new Date(kini), baterai: 80 + Math.round(Math.random() * 15), sinyal: -55 - Math.round(Math.random() * 15) },
      create: { serial: `${AWALAN_DEMO}SN-${p.kode.slice(-2)}`, nama: `Sensor simulasi ${p.kode}`, model: "Simulasi (tanpa perangkat)", lokasiId: l.id, terakhirTerhubung: new Date(kini), baterai: 92, sinyal: -58, dibuatOleh: oleh },
    });
    const awal = l.terakhirWaktu ? l.terakhirWaktu.getTime() + LANGKAH : kini - RIWAYAT_HARI * 86_400_000;
    const data: BacaanMasuk[] = [];
    for (let t = Math.ceil(awal / LANGKAH) * LANGKAH; t <= kini; t += LANGKAH) data.push(nilai(p, t, kini));
    if (data.length === 0 || data[data.length - 1].waktu < kini - MENIT) data.push(nilai(p, kini, kini)); // bacaan "baru saja"
    const h = await simpanBacaan(l.id, data, { serial: `${AWALAN_DEMO}SN-${p.kode.slice(-2)}`, sumber: "uji" });
    total += h.diterima;
  }
  return { lokasi: PROFIL.length, bacaan: total };
}

/** Hapus semua lokasi (beserta bacaan, alarm, inspeksi) dan sensor demo. */
export async function hapusDemo() {
  const s = await prisma.sensorIot.deleteMany({ where: { serial: { startsWith: AWALAN_DEMO } } });
  const l = await prisma.lokasiPantau.deleteMany({ where: { kode: { startsWith: AWALAN_DEMO } } });
  return { lokasi: l.count, sensor: s.count };
}
