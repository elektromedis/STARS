/**
 * Monitoring lingkungan — kueri baca untuk dashboard, grafik, statistik, ringkasan harian, dan tabel data.
 * Agregasi dilakukan di SQLite (indeks utama lokasiId+waktu); kolom waktu tersimpan sebagai milidetik.
 */
import { prisma } from "@/lib/prisma";
import { AkumulasiMkt, HARI_MS, OFFSET_WIB_MS, awalHariWib, hariWib, statusLokasi, type Batas, type InfoStatus } from "@/lib/monitoring";

const n = (v: unknown) => (v == null ? null : Number(v));
const TREN_MS = 15 * 60_000;

// ---------------------------------------------------------------- rentang waktu
export const PRESET_RENTANG = [
  { kode: "24j", label: "24 jam", ms: HARI_MS },
  { kode: "7h", label: "7 hari", ms: 7 * HARI_MS },
  { kode: "30h", label: "30 hari", ms: 30 * HARI_MS },
  { kode: "1t", label: "1 tahun", ms: 365 * HARI_MS },
] as const;
export type Rentang = { kode: string; label: string; dari: number; sampai: number; langsung: boolean };
const TGL = /^\d{4}-\d{2}-\d{2}$/;

/** `?r=24j|7h|30h|1t` atau `?dari=YYYY-MM-DD&sampai=YYYY-MM-DD` (WIB, sampai inklusif). */
export function bacaRentang(sp: { r?: string; dari?: string; sampai?: string }, kini = Date.now()): Rentang {
  if (sp.dari && TGL.test(sp.dari)) {
    const dari = awalHariWib(sp.dari);
    const sampaiTgl = sp.sampai && TGL.test(sp.sampai) ? sp.sampai : hariWib(kini);
    let sampai = Math.min(awalHariWib(sampaiTgl) + HARI_MS, kini);
    if (sampai <= dari) sampai = dari + HARI_MS;
    if (sampai - dari > 400 * HARI_MS) sampai = dari + 400 * HARI_MS;
    return { kode: "kustom", label: `${sp.dari} s.d. ${sampaiTgl}`, dari, sampai, langsung: sampai >= kini - 60_000 };
  }
  const p = PRESET_RENTANG.find((x) => x.kode === sp.r) ?? PRESET_RENTANG[0];
  return { kode: p.kode, label: p.label, dari: kini - p.ms, sampai: kini, langsung: true };
}

// ---------------------------------------------------------------- dashboard
export type TitikTren = { t: number; s: number | null; l: number | null };
export type AlarmRingkas = { id: number; jenis: string; mulai: string; selesai: string | null; puncak: number | null; batas: number | null; diakui: boolean };
export type KartuLokasi = Batas & {
  id: number; kode: string; nama: string; jenis: string; unit: string | null; alat: { kode: string; nama: string } | null;
  aktif: boolean; tundaAlarm: number; batasPutusMenit: number;
  terakhirWaktu: string | null; suhu: number | null; lembap: number | null;
  status: InfoStatus; sensor: { serial: string; baterai: number | null; sinyal: number | null } | null;
  alarmTerbuka: AlarmRingkas[]; tren: TitikTren[];
};

const keAlarmRingkas = (a: { id: number; jenis: string; mulai: Date; selesai: Date | null; puncak: number | null; batas: number | null; diakuiPada: Date | null }): AlarmRingkas => ({
  id: a.id, jenis: a.jenis, mulai: a.mulai.toISOString(), selesai: a.selesai?.toISOString() ?? null, puncak: a.puncak, batas: a.batas, diakui: a.diakuiPada != null,
});

/** Semua lokasi (aktif dulu) + status + alarm terbuka + tren 24 jam (rata-rata per 15 menit). */
export async function dataDashboard(o: { unitId?: number | null; termasukNonaktif?: boolean } = {}, kini = Date.now()): Promise<KartuLokasi[]> {
  const lokasi = await prisma.lokasiPantau.findMany({
    where: { ...(o.unitId ? { unitKerjaId: o.unitId } : {}), ...(o.termasukNonaktif ? {} : { aktif: true }) },
    orderBy: [{ kode: "asc" }],
    include: {
      unitKerja: { select: { nama: true } }, alat: { select: { kode: true, nama: true } },
      sensor: { select: { serial: true, baterai: true, sinyal: true } },
      alarm: { where: { selesai: null, jenis: { not: "putus" } }, orderBy: { mulai: "asc" } },
    },
  });
  if (lokasi.length === 0) return [];
  const dari = kini - HARI_MS;
  const ids = lokasi.map((l) => l.id);
  const baris = await prisma.$queryRawUnsafe<{ l: unknown; b: unknown; s: unknown; h: unknown }[]>(
    `SELECT "lokasiId" AS l, ("waktu" - ?) / ${TREN_MS} AS b, AVG("suhu") AS s, AVG("lembap") AS h
       FROM "BacaanSensor" WHERE "lokasiId" IN (${ids.map(() => "?").join(",")}) AND "waktu" >= ?
      GROUP BY l, b ORDER BY l, b`,
    BigInt(dari), ...ids, BigInt(dari),
  );
  const tren = new Map<number, TitikTren[]>();
  for (const r of baris) {
    const id = Number(r.l);
    if (!tren.has(id)) tren.set(id, []);
    tren.get(id)!.push({ t: dari + Number(r.b) * TREN_MS + TREN_MS / 2, s: n(r.s), l: n(r.h) });
  }
  return lokasi.map((l) => ({
    id: l.id, kode: l.kode, nama: l.nama, jenis: l.jenis, unit: l.unitKerja?.nama ?? null, alat: l.alat,
    suhuMin: l.suhuMin, suhuMaks: l.suhuMaks, lembapMin: l.lembapMin, lembapMaks: l.lembapMaks,
    aktif: l.aktif, tundaAlarm: l.tundaAlarm, batasPutusMenit: l.batasPutusMenit,
    terakhirWaktu: l.terakhirWaktu?.toISOString() ?? null, suhu: l.terakhirSuhu, lembap: l.terakhirLembap,
    status: statusLokasi({ ...l }, l.alarm.length, kini),
    sensor: l.sensor, alarmTerbuka: l.alarm.map(keAlarmRingkas), tren: tren.get(l.id) ?? [],
  }));
}

export type AlarmDaftar = AlarmRingkas & { lokasi: { kode: string; nama: string }; diakuiOleh: string | null; diakuiPada: string | null; tindakan: string | null; dampak: string | null; pencegahan: string | null };

/** Alarm yang perlu ditindaklanjuti: masih berlangsung, atau belum diakui (30 hari terakhir). */
export async function alarmPerluTindakan(o: { unitId?: number | null } = {}, kini = Date.now()): Promise<AlarmDaftar[]> {
  const a = await prisma.alarmPantau.findMany({
    where: {
      lokasi: { aktif: true, ...(o.unitId ? { unitKerjaId: o.unitId } : {}) },
      OR: [{ selesai: null, jenis: { not: "putus" } }, { diakuiPada: null, mulai: { gte: new Date(kini - 30 * HARI_MS) } }],
    },
    orderBy: [{ mulai: "desc" }], take: 100,
    include: { lokasi: { select: { kode: true, nama: true } } },
  });
  return a.map(keAlarmDaftar);
}
export const keAlarmDaftar = (a: Parameters<typeof keAlarmRingkas>[0] & { lokasi: { kode: string; nama: string }; diakuiOleh: string | null; tindakan: string | null; dampak: string | null; pencegahan: string | null }): AlarmDaftar => ({
  ...keAlarmRingkas(a), lokasi: a.lokasi, diakuiOleh: a.diakuiOleh, diakuiPada: a.diakuiPada?.toISOString() ?? null, tindakan: a.tindakan, dampak: a.dampak, pencegahan: a.pencegahan,
});

// ---------------------------------------------------------------- grafik
export type TitikGrafik = { t: number; s: number | null; sMin: number | null; sMaks: number | null; l: number | null; lMin: number | null; lMaks: number | null };
export type SeriGrafik = { mode: "mentah" | "agregat"; ukuranMs: number; titik: TitikGrafik[]; jumlah: number };
const MAKS_MENTAH = 1600;
const TARGET_EMBER = 600;

export async function seriGrafik(lokasiId: number, dari: number, sampai: number): Promise<SeriGrafik> {
  const [{ c }] = await prisma.$queryRawUnsafe<{ c: unknown }[]>(`SELECT COUNT(*) AS c FROM "BacaanSensor" WHERE "lokasiId" = ? AND "waktu" >= ? AND "waktu" < ?`, lokasiId, BigInt(dari), BigInt(sampai));
  const jumlah = Number(c);
  if (jumlah <= MAKS_MENTAH) {
    const r = await prisma.bacaanSensor.findMany({ where: { lokasiId, waktu: { gte: new Date(dari), lt: new Date(sampai) } }, orderBy: { waktu: "asc" }, select: { waktu: true, suhu: true, lembap: true } });
    return { mode: "mentah", ukuranMs: 0, jumlah, titik: r.map((x) => ({ t: x.waktu.getTime(), s: x.suhu, sMin: x.suhu, sMaks: x.suhu, l: x.lembap, lMin: x.lembap, lMaks: x.lembap })) };
  }
  const ukuranMs = Math.max(60_000, Math.ceil((sampai - dari) / TARGET_EMBER / 60_000) * 60_000);
  const r = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT ("waktu" - ?) / ${ukuranMs} AS b, AVG("suhu") AS s, MIN("suhu") AS smin, MAX("suhu") AS smaks, AVG("lembap") AS l, MIN("lembap") AS lmin, MAX("lembap") AS lmaks
       FROM "BacaanSensor" WHERE "lokasiId" = ? AND "waktu" >= ? AND "waktu" < ? GROUP BY b ORDER BY b`,
    BigInt(dari), lokasiId, BigInt(dari), BigInt(sampai),
  );
  return {
    mode: "agregat", ukuranMs, jumlah,
    titik: r.map((x) => ({ t: dari + Number(x.b) * ukuranMs + ukuranMs / 2, s: n(x.s), sMin: n(x.smin), sMaks: n(x.smaks), l: n(x.l), lMin: n(x.lmin), lMaks: n(x.lmaks) })),
  };
}

// ---------------------------------------------------------------- statistik (format "trip summary" LogTag)
export type StatParameter = { jumlah: number; min: number | null; minPada: number | null; maks: number | null; maksPada: number | null; rata: number | null; msDiatas: number; msDibawah: number; msTotal: number };
export type Statistik = { jumlah: number; awal: number | null; akhir: number | null; suhu: StatParameter & { mkt: number | null }; lembap: StatParameter; alarm: Record<string, number> };

export async function statistik(lokasiId: number, dari: number, sampai: number, b: Batas, batasPutusMenit: number): Promise<Statistik> {
  // celah antar-bacaan > batas putus (atau > 2 jam bila putus tidak dipantau) tidak dihitung sebagai durasi
  const cap = (batasPutusMenit > 0 ? batasPutusMenit : 120) * 60_000;
  const nul = (v: number | null) => (v == null ? null : v);
  const [r] = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `WITH d AS (
       SELECT "waktu" AS w, "suhu" AS s, "lembap" AS l, LEAD("waktu") OVER (ORDER BY "waktu") AS nx
         FROM "BacaanSensor" WHERE "lokasiId" = ? AND "waktu" >= ? AND "waktu" < ?
     ), e AS (SELECT w, s, l, MIN(COALESCE(nx, w) - w, ?) AS dur FROM d)
     SELECT COUNT(*) AS n, MIN(w) AS awal, MAX(w) AS akhir,
       COUNT(s) AS ns, MIN(s) AS smin, MAX(s) AS smaks, AVG(s) AS srata,
       SUM(CASE WHEN s IS NOT NULL THEN dur ELSE 0 END) AS sdur,
       SUM(CASE WHEN ? IS NOT NULL AND s > ? THEN dur ELSE 0 END) AS satas,
       SUM(CASE WHEN ? IS NOT NULL AND s < ? THEN dur ELSE 0 END) AS sbawah,
       COUNT(l) AS nl, MIN(l) AS lmin, MAX(l) AS lmaks, AVG(l) AS lrata,
       SUM(CASE WHEN l IS NOT NULL THEN dur ELSE 0 END) AS ldur,
       SUM(CASE WHEN ? IS NOT NULL AND l > ? THEN dur ELSE 0 END) AS latas,
       SUM(CASE WHEN ? IS NOT NULL AND l < ? THEN dur ELSE 0 END) AS lbawah
     FROM e`,
    lokasiId, BigInt(dari), BigInt(sampai), BigInt(cap),
    nul(b.suhuMaks), nul(b.suhuMaks), nul(b.suhuMin), nul(b.suhuMin), nul(b.lembapMaks), nul(b.lembapMaks), nul(b.lembapMin), nul(b.lembapMin),
  );
  const waktuNilai = async (kolom: "suhu" | "lembap", v: number | null) => {
    if (v == null) return null;
    const x = await prisma.bacaanSensor.findFirst({ where: { lokasiId, waktu: { gte: new Date(dari), lt: new Date(sampai) }, [kolom]: v }, orderBy: { waktu: "asc" }, select: { waktu: true } });
    return x?.waktu.getTime() ?? null;
  };
  const smin = n(r.smin), smaks = n(r.smaks), lmin = n(r.lmin), lmaks = n(r.lmaks);
  const [sminPada, smaksPada, lminPada, lmaksPada, mkt, alarm] = await Promise.all([
    waktuNilai("suhu", smin), waktuNilai("suhu", smaks), waktuNilai("lembap", lmin), waktuNilai("lembap", lmaks),
    hitungMktRentang(lokasiId, dari, sampai),
    prisma.alarmPantau.groupBy({ by: ["jenis"], where: { lokasiId, mulai: { lt: new Date(sampai) }, OR: [{ selesai: null }, { selesai: { gte: new Date(dari) } }] }, _count: { _all: true } }),
  ]);
  return {
    jumlah: Number(r.n ?? 0), awal: n(r.awal), akhir: n(r.akhir),
    suhu: { jumlah: Number(r.ns ?? 0), min: smin, minPada: sminPada, maks: smaks, maksPada: smaksPada, rata: n(r.srata), msTotal: Number(r.sdur ?? 0), msDiatas: Number(r.satas ?? 0), msDibawah: Number(r.sbawah ?? 0), mkt },
    lembap: { jumlah: Number(r.nl ?? 0), min: lmin, minPada: lminPada, maks: lmaks, maksPada: lmaksPada, rata: n(r.lrata), msTotal: Number(r.ldur ?? 0), msDiatas: Number(r.latas ?? 0), msDibawah: Number(r.lbawah ?? 0) },
    alarm: Object.fromEntries(alarm.map((x) => [x.jenis, x._count._all])),
  };
}

/** MKT dihitung di Node (SQLite tanpa fungsi exp), dibaca per 50.000 baris agar hemat memori. */
async function hitungMktRentang(lokasiId: number, dari: number, sampai: number) {
  const a = new AkumulasiMkt();
  let kursor = dari - 1;
  for (;;) {
    const pot = await prisma.$queryRawUnsafe<{ w: unknown; s: unknown }[]>(
      `SELECT "waktu" AS w, "suhu" AS s FROM "BacaanSensor" WHERE "lokasiId" = ? AND "waktu" > ? AND "waktu" < ? AND "suhu" IS NOT NULL ORDER BY "waktu" LIMIT 50000`,
      lokasiId, BigInt(kursor), BigInt(sampai),
    );
    for (const x of pot) a.tambah(Number(x.s));
    if (pot.length < 50_000) break;
    kursor = Number(pot[pot.length - 1].w);
  }
  return a.hasil();
}

// ---------------------------------------------------------------- ringkasan harian (Day Summary)
export type HariRingkas = { tgl: string; jumlah: number; sMin: number | null; sMaks: number | null; lMin: number | null; lMaks: number | null; alarm: string[]; inspeksi: { sesi: string; suhu: number | null; lembap: number | null; oleh: string; waktu: string }[] };

/** `bulan` = "YYYY-MM" (WIB). */
export async function ringkasanHarian(lokasiId: number, bulan: string, sertakanNama: boolean): Promise<HariRingkas[]> {
  const [th, bl] = bulan.split("-").map(Number);
  const awalTgl = `${th}-${String(bl).padStart(2, "0")}-01`;
  const akhirTgl = bl === 12 ? `${th + 1}-01-01` : `${th}-${String(bl + 1).padStart(2, "0")}-01`;
  const dari = awalHariWib(awalTgl), sampai = awalHariWib(akhirTgl);
  const [r, alarm, insp] = await Promise.all([
    prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT ("waktu" + ${OFFSET_WIB_MS}) / ${HARI_MS} AS h, COUNT(*) AS n, MIN("suhu") AS smin, MAX("suhu") AS smaks, MIN("lembap") AS lmin, MAX("lembap") AS lmaks
         FROM "BacaanSensor" WHERE "lokasiId" = ? AND "waktu" >= ? AND "waktu" < ? GROUP BY h ORDER BY h`,
      lokasiId, BigInt(dari), BigInt(sampai),
    ),
    prisma.alarmPantau.findMany({ where: { lokasiId, mulai: { lt: new Date(sampai) }, OR: [{ selesai: null }, { selesai: { gte: new Date(dari) } }] }, select: { jenis: true, mulai: true, selesai: true } }),
    prisma.inspeksiPantau.findMany({ where: { lokasiId, tanggal: { gte: awalTgl, lt: akhirTgl } }, orderBy: { createdAt: "asc" } }),
  ]);
  const peta = new Map<string, HariRingkas>();
  const hari = (tgl: string) => {
    if (!peta.has(tgl)) peta.set(tgl, { tgl, jumlah: 0, sMin: null, sMaks: null, lMin: null, lMaks: null, alarm: [], inspeksi: [] });
    return peta.get(tgl)!;
  };
  for (const x of r) {
    const h = hari(new Date(Number(x.h) * HARI_MS).toISOString().slice(0, 10));
    Object.assign(h, { jumlah: Number(x.n), sMin: n(x.smin), sMaks: n(x.smaks), lMin: n(x.lmin), lMaks: n(x.lmaks) });
  }
  const kini = Date.now();
  for (const a of alarm) {
    const ujung = Math.min(a.selesai?.getTime() ?? kini, sampai - 1);
    for (let t = Math.max(a.mulai.getTime(), dari); t <= ujung; t = awalHariWib(hariWib(t)) + HARI_MS) {
      const h = hari(hariWib(t));
      if (!h.alarm.includes(a.jenis)) h.alarm.push(a.jenis);
    }
  }
  for (const i of insp) hari(i.tanggal).inspeksi.push({ sesi: i.sesi, suhu: i.suhu, lembap: i.lembap, oleh: sertakanNama ? i.oleh : "", waktu: i.createdAt.toISOString() });
  return [...peta.values()].sort((a, b) => a.tgl.localeCompare(b.tgl));
}

// ---------------------------------------------------------------- tabel data
export async function halamanBacaan(lokasiId: number, dari: number, sampai: number, halaman: number, ukuran = 50) {
  const where = { lokasiId, waktu: { gte: new Date(dari), lt: new Date(sampai) } };
  const [total, baris] = await Promise.all([
    prisma.bacaanSensor.count({ where }),
    prisma.bacaanSensor.findMany({ where, orderBy: { waktu: "desc" }, skip: (Math.max(1, halaman) - 1) * ukuran, take: ukuran, select: { waktu: true, suhu: true, lembap: true, serial: true, sumber: true } }),
  ]);
  return { total, halaman: Math.max(1, halaman), ukuran, baris: baris.map((b) => ({ ...b, waktu: b.waktu.toISOString() })) };
}

// ---------------------------------------------------------------- ringkas untuk Dashboard utama
export async function ringkasanMonitoring(unitId: number | null, kini = Date.now()) {
  const where = { aktif: true, ...(unitId ? { unitKerjaId: unitId } : {}) };
  const [l, belumDiakui] = await Promise.all([
    prisma.lokasiPantau.findMany({ where, include: { _count: { select: { alarm: { where: { selesai: null, jenis: { not: "putus" } } } } } } }),
    prisma.alarmPantau.count({ where: { lokasi: where, diakuiPada: null, mulai: { gte: new Date(kini - 30 * HARI_MS) } } }),
  ]);
  const st = l.map((x) => statusLokasi(x, x._count.alarm, kini));
  return {
    total: l.length, normal: st.filter((s) => s.kunci === "normal").length, luar: st.filter((s) => s.kunci === "luar").length,
    alarm: l.reduce((n, x) => n + x._count.alarm, 0), terputus: st.filter((s) => s.putus || s.kunci === "belum").length, belumDiakui,
  };
}
