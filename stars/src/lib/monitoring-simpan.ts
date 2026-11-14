/**
 * Monitoring lingkungan — sisi server: token sensor, simpan bacaan (anti-duplikat), evaluasi alarm, skema CMS.
 */
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { arahAlarm, NAMA_JENIS, PemindaiEkskursi, zona, type BarisPindai, type JenisAlarm, type Segmen } from "@/lib/monitoring";

// ---------------------------------------------------------------- token API sensor
/** Token acak 32 byte (base64url). Yang disimpan hanya SHA-256-nya; token asli ditampilkan sekali saat dibuat. */
export function buatToken() {
  const token = `stm_${randomBytes(32).toString("base64url")}`;
  return { token, hash: hashToken(token), petunjuk: token.slice(-4) };
}
export const hashToken = (t: string) => createHash("sha256").update(t, "utf8").digest("hex");

// ---------------------------------------------------------------- normalisasi bacaan masuk
export type BacaanMasuk = { waktu: number; suhu: number | null; lembap: number | null };
const MAKS_MASA_DEPAN_MS = 5 * 60_000;
const MAKS_MASA_LALU_MS = 400 * 86_400_000;

/** Waktu: angka detik/milidetik epoch, atau teks ISO. Teks tanpa zona waktu dianggap WIB. */
export function bacaWaktu(v: unknown, kini = Date.now()): number | null {
  if (v == null || v === "") return kini;
  if (typeof v === "number" && Number.isFinite(v)) return Math.round(v < 1e12 ? v * 1000 : v);
  if (typeof v === "string") {
    const t = v.trim();
    if (/^\d{9,13}$/.test(t)) return bacaWaktu(Number(t), kini);
    const iso = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(t) ? `${t.replace(" ", "T")}+07:00` : t;
    const ms = Date.parse(iso);
    return Number.isFinite(ms) ? ms : null;
  }
  return null;
}
const angkaAtauNull = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
};
const ambil = (o: Record<string, unknown>, ...kunci: string[]) => { for (const k of kunci) if (k in o) return o[k]; return undefined; };

export type HasilNormal = { bacaan: BacaanMasuk[]; baterai: number | null; sinyal: number | null; galat: string | null };
/**
 * Terima beberapa bentuk muatan dari perangkat:
 *   { "suhu": 4.6, "lembap": 55, "waktu": "2026-11-14T10:00:00+07:00", "baterai": 87, "sinyal": -61 }
 *   { "bacaan": [ { "waktu": 1763089200, "suhu": 4.6 }, ... ] }      ← kiriman tertunda (buffer) sekaligus
 *   [ { ... }, { ... } ]
 * Alias nama kolom: temperature/temp/t, humidity/hum/rh/h, time/timestamp/ts, battery/bat, rssi.
 */
export function normalkanMuatan(muatan: unknown, kini = Date.now()): HasilNormal {
  const hasil: HasilNormal = { bacaan: [], baterai: null, sinyal: null, galat: null };
  if (muatan == null || typeof muatan !== "object") return { ...hasil, galat: "Muatan harus JSON objek atau larik." };
  const akar = muatan as Record<string, unknown>;
  const daftar: unknown[] = Array.isArray(muatan) ? muatan : Array.isArray(akar.bacaan) ? (akar.bacaan as unknown[]) : Array.isArray(akar.readings) ? (akar.readings as unknown[]) : [muatan];
  if (daftar.length === 0) return { ...hasil, galat: "Tidak ada bacaan." };
  if (daftar.length > 5000) return { ...hasil, galat: "Maksimal 5.000 bacaan per kiriman." };
  if (!Array.isArray(muatan)) {
    const bat = angkaAtauNull(ambil(akar, "baterai", "battery", "bat"));
    const sig = angkaAtauNull(ambil(akar, "sinyal", "rssi", "signal"));
    if (bat != null && Number.isFinite(bat) && bat >= 0 && bat <= 100) hasil.baterai = Math.round(bat * 10) / 10;
    if (sig != null && Number.isFinite(sig) && sig >= -150 && sig <= 0) hasil.sinyal = Math.round(sig);
  }
  for (let i = 0; i < daftar.length; i++) {
    const d = daftar[i];
    if (d == null || typeof d !== "object" || Array.isArray(d)) return { ...hasil, galat: `Bacaan #${i + 1} harus objek.` };
    const o = d as Record<string, unknown>;
    const suhu = angkaAtauNull(ambil(o, "suhu", "temperature", "temp", "t"));
    const lembap = angkaAtauNull(ambil(o, "lembap", "kelembapan", "humidity", "hum", "rh", "h"));
    const waktu = bacaWaktu(ambil(o, "waktu", "time", "timestamp", "ts"), kini);
    if (Number.isNaN(suhu) || Number.isNaN(lembap)) return { ...hasil, galat: `Bacaan #${i + 1}: suhu/lembap harus angka.` };
    if (suhu == null && lembap == null) return { ...hasil, galat: `Bacaan #${i + 1}: isi suhu dan/atau lembap.` };
    if (suhu != null && (suhu < -100 || suhu > 200)) return { ...hasil, galat: `Bacaan #${i + 1}: suhu ${suhu} di luar −100…200 °C.` };
    if (lembap != null && (lembap < 0 || lembap > 100)) return { ...hasil, galat: `Bacaan #${i + 1}: kelembapan ${lembap} di luar 0…100 %RH.` };
    if (waktu == null) return { ...hasil, galat: `Bacaan #${i + 1}: waktu tidak dikenali.` };
    if (waktu > kini + MAKS_MASA_DEPAN_MS) return { ...hasil, galat: `Bacaan #${i + 1}: waktu di masa depan — periksa jam (NTP) perangkat.` };
    if (waktu < kini - MAKS_MASA_LALU_MS) return { ...hasil, galat: `Bacaan #${i + 1}: waktu lebih dari 400 hari yang lalu.` };
    hasil.bacaan.push({ waktu, suhu: suhu == null ? null : Math.round(suhu * 100) / 100, lembap: lembap == null ? null : Math.round(lembap * 10) / 10 });
  }
  return hasil;
}

// ---------------------------------------------------------------- simpan + evaluasi alarm
const PER_SISIP = 400; // 400 baris × 6 kolom = 2.400 parameter (aman untuk SQLite)

/**
 * Simpan bacaan (INSERT OR IGNORE: waktu yang sama untuk lokasi yang sama tidak dobel → impor ulang aman),
 * perbarui ringkasan "terakhir" lokasi, lalu evaluasi alarm mulai bacaan baru paling awal.
 */
export async function simpanBacaan(lokasiId: number, data: BacaanMasuk[], o: { serial?: string | null; sumber: "api" | "impor" | "uji" }) {
  const unik = new Map<number, BacaanMasuk>();
  for (const b of data) unik.set(Math.round(b.waktu / 1000) * 1000, { ...b, waktu: Math.round(b.waktu / 1000) * 1000 }); // presisi detik
  const urut = [...unik.values()].sort((a, b) => a.waktu - b.waktu);
  if (urut.length === 0) return { diterima: 0, duplikat: 0 };
  let diterima = 0;
  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < urut.length; i += PER_SISIP) {
      const pot = urut.slice(i, i + PER_SISIP);
      const sql = `INSERT OR IGNORE INTO "BacaanSensor" ("lokasiId","waktu","suhu","lembap","serial","sumber") VALUES ${pot.map(() => "(?,?,?,?,?,?)").join(",")}`;
      const param = pot.flatMap((b) => [lokasiId, BigInt(b.waktu), b.suhu, b.lembap, o.serial ?? null, o.sumber]);
      diterima += await tx.$executeRawUnsafe(sql, ...param);
    }
  }, { timeout: 300_000, maxWait: 20_000 });
  if (diterima > 0) {
    await perbaruiTerakhir(lokasiId);
    await evaluasiAlarm(lokasiId, urut[0].waktu);
  }
  return { diterima, duplikat: urut.length - diterima };
}

export async function perbaruiTerakhir(lokasiId: number) {
  const akhir = await prisma.bacaanSensor.findFirst({ where: { lokasiId }, orderBy: { waktu: "desc" }, select: { waktu: true, suhu: true, lembap: true } });
  await prisma.lokasiPantau.update({
    where: { id: lokasiId },
    data: { terakhirWaktu: akhir?.waktu ?? null, terakhirSuhu: akhir?.suhu ?? null, terakhirLembap: akhir?.lembap ?? null },
  });
}

const PILIH_PINDAI = { waktu: true, suhu: true, lembap: true, sumber: true } as const;
const keBaris = (r: { waktu: Date; suhu: number | null; lembap: number | null; sumber: string }): BarisPindai => ({ waktu: r.waktu.getTime(), suhu: r.suhu, lembap: r.lembap, sumber: r.sumber });

/**
 * Pindai ulang bacaan mulai `sejak` (ditambah beberapa bacaan konteks sebelumnya) dan selaraskan tabel AlarmPantau:
 * ekskursi yang bertumpang-tindih dengan alarm lama digabung (pengakuan tetap utuh), yang baru dibuat.
 * Dibaca per potongan 20.000 baris agar impor besar tidak menghabiskan memori.
 */
export async function evaluasiAlarm(lokasiId: number, sejak: number) {
  const l = await prisma.lokasiPantau.findUnique({ where: { id: lokasiId } });
  if (!l) return;
  const tunda = Math.max(1, l.tundaAlarm);
  const pemindai = new PemindaiEkskursi({ suhuMin: l.suhuMin, suhuMaks: l.suhuMaks, lembapMin: l.lembapMin, lembapMaks: l.lembapMaks, tunda, putusMs: l.batasPutusMenit * 60_000 });
  const konteks = await prisma.bacaanSensor.findMany({ where: { lokasiId, waktu: { lt: new Date(sejak) } }, orderBy: { waktu: "desc" }, take: tunda + 1, select: PILIH_PINDAI });
  pemindai.tambah(konteks.reverse().map(keBaris));
  let kursor = new Date(sejak);
  let pertama = true;
  for (;;) {
    const pot = await prisma.bacaanSensor.findMany({ where: { lokasiId, waktu: pertama ? { gte: kursor } : { gt: kursor } }, orderBy: { waktu: "asc" }, take: 20_000, select: PILIH_PINDAI });
    pertama = false;
    if (pot.length === 0) break;
    pemindai.tambah(pot.map(keBaris));
    kursor = pot[pot.length - 1].waktu;
    if (pot.length < 20_000) break;
  }
  await selaraskanAlarm(lokasiId, pemindai.akhiri(), l);
}

type LokasiBatas = { suhuMin: number | null; suhuMaks: number | null; lembapMin: number | null; lembapMaks: number | null };

async function selaraskanAlarm(lokasiId: number, segmen: Segmen[], l: LokasiBatas) {
  const cocok = new Set<number>();
  for (const s of segmen) {
    const tumpang = await prisma.alarmPantau.findMany({
      where: {
        lokasiId, jenis: s.jenis,
        ...(s.selesai != null ? { mulai: { lte: new Date(s.selesai) } } : {}),
        OR: [{ selesai: null }, { selesai: { gte: new Date(s.mulai) } }],
      },
      orderBy: { mulai: "asc" },
    });
    if (tumpang.length === 0) {
      const a = await prisma.alarmPantau.create({ data: { lokasiId, jenis: s.jenis, mulai: new Date(s.mulai), selesai: s.selesai == null ? null : new Date(s.selesai), puncak: s.puncak, batas: s.batas } });
      cocok.add(a.id);
      continue;
    }
    const [utama, ...lain] = tumpang;
    const arah = arahAlarm(s.jenis);
    const puncak = s.puncak == null ? utama.puncak : utama.puncak == null ? s.puncak : arah === "tinggi" ? Math.max(utama.puncak, s.puncak) : Math.min(utama.puncak, s.puncak);
    await prisma.alarmPantau.update({
      where: { id: utama.id },
      data: { mulai: new Date(Math.min(utama.mulai.getTime(), s.mulai)), selesai: s.selesai == null ? null : new Date(s.selesai), puncak, batas: s.batas ?? utama.batas },
    });
    cocok.add(utama.id);
    // alarm lain yang kini tergabung: hapus bila belum diakui (pengakuan tidak pernah dibuang)
    const buang = lain.filter((x) => !x.diakuiPada).map((x) => x.id);
    if (buang.length) await prisma.alarmPantau.deleteMany({ where: { id: { in: buang } } });
  }
  // Jaring pengaman: alarm suhu/lembap yang masih terbuka tetapi tidak lagi berlangsung (mis. batas diubah) → tutup
  // pada bacaan normal pertama sesudah alarm mulai.
  const terbuka = await prisma.alarmPantau.findMany({ where: { lokasiId, selesai: null, jenis: { not: "putus" }, id: { notIn: [...cocok] } } });
  for (const a of terbuka) {
    const p = a.jenis.startsWith("suhu") ? "suhu" : "lembap";
    const sesudah = await prisma.bacaanSensor.findMany({ where: { lokasiId, waktu: { gt: a.mulai }, [p]: { not: null } }, orderBy: { waktu: "asc" }, take: 5000, select: { waktu: true, suhu: true, lembap: true } });
    const arah = arahAlarm(a.jenis);
    const normal = sesudah.find((r) => {
      const v = r[p as "suhu" | "lembap"];
      const z = p === "suhu" ? zona(v, l.suhuMin, l.suhuMaks) : zona(v, l.lembapMin, l.lembapMaks);
      return z !== arah;
    });
    if (normal) await prisma.alarmPantau.update({ where: { id: a.id }, data: { selesai: normal.waktu } });
  }
}

// ---------------------------------------------------------------- skema CMS
const teks = (maks: number) => z.string().trim().max(maks);
const teksOpsional = (maks: number) => z.string().trim().max(maks).optional().nullable().transform((v) => (v ? v : null));
const angkaOpsional = (min: number, maks: number) =>
  z.union([z.number(), z.string(), z.null()]).optional().transform((v, ctx) => {
    if (v == null || v === "") return null;
    const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
    if (!Number.isFinite(n) || n < min || n > maks) { ctx.addIssue({ code: "custom", message: `harus angka ${min}…${maks}` }); return z.NEVER; }
    return Math.round(n * 100) / 100;
  });

export const skemaLokasi = z.object({
  nama: teks(160).min(2, "Nama lokasi minimal 2 karakter"),
  jenis: z.string().refine((v) => NAMA_JENIS.includes(v), "Jenis tidak dikenal"),
  deskripsi: teksOpsional(1000),
  unitKerjaId: z.union([z.number().int().positive(), z.null()]).optional().transform((v) => v ?? null),
  alatId: z.union([z.number().int().positive(), z.null()]).optional().transform((v) => v ?? null),
  suhuMin: angkaOpsional(-100, 200), suhuMaks: angkaOpsional(-100, 200),
  lembapMin: angkaOpsional(0, 100), lembapMaks: angkaOpsional(0, 100),
  tundaAlarm: z.coerce.number().int().min(1, "Penundaan alarm minimal 1 bacaan").max(60),
  batasPutusMenit: z.coerce.number().int().min(0).max(7 * 24 * 60),
  penanggungJawab: teksOpsional(200),
  aktif: z.boolean().default(true),
}).superRefine((v, ctx) => {
  if (v.suhuMin != null && v.suhuMaks != null && v.suhuMin >= v.suhuMaks) ctx.addIssue({ code: "custom", path: ["suhuMaks"], message: "Batas atas suhu harus lebih besar dari batas bawah" });
  if (v.lembapMin != null && v.lembapMaks != null && v.lembapMin >= v.lembapMaks) ctx.addIssue({ code: "custom", path: ["lembapMaks"], message: "Batas atas kelembapan harus lebih besar dari batas bawah" });
});
export type DataLokasi = z.infer<typeof skemaLokasi>;

export const skemaSensor = z.object({
  serial: teks(80).min(2, "Nomor seri / ID sensor minimal 2 karakter").regex(/^[\w.\-:/ ]+$/, "Nomor seri hanya huruf, angka, spasi, dan . - _ : /"),
  nama: teksOpsional(120),
  model: teksOpsional(120),
  lokasiId: z.union([z.number().int().positive(), z.null()]).optional().transform((v) => v ?? null),
  aktif: z.boolean().default(true),
});

export const skemaAkui = z.object({
  tindakan: teks(4000).min(3, "Tuliskan tindakan yang dilakukan"),
  dampak: teksOpsional(4000),
  pencegahan: teksOpsional(4000),
});

export const pesanZod = (e: z.ZodError) => e.issues.map((i) => `${i.path.length ? `${i.path.join(".")}: ` : ""}${i.message}`).join("; ");

/** Pastikan unit kerja & alat yang dipilih memang ada. */
export async function cekRelasi(d: { unitKerjaId: number | null; alatId: number | null }) {
  if (d.unitKerjaId && !(await prisma.unitKerja.findUnique({ where: { id: d.unitKerjaId }, select: { id: true } }))) return "Unit kerja tidak dikenal.";
  if (d.alatId && !(await prisma.alat.findUnique({ where: { id: d.alatId }, select: { id: true } }))) return "Alat tidak dikenal.";
  return null;
}

/** Kode lokasi berikutnya: LP-001, LP-002, … */
export async function kodeLokasiBaru() {
  const semua = await prisma.lokasiPantau.findMany({ select: { kode: true } });
  const maks = semua.reduce((m, l) => Math.max(m, Number(/^LP-(\d+)$/.exec(l.kode)?.[1] ?? 0)), 0);
  return `LP-${String(maks + 1).padStart(3, "0")}`;
}

export const jenisAlarmValid = (j: string): j is JenisAlarm => ["suhu-tinggi", "suhu-rendah", "lembap-tinggi", "lembap-rendah", "putus"].includes(j);
