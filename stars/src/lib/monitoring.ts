/**
 * Live Medical Device Environmental Monitoring — konstanta, status, format, MKT, dan pemindai ekskursi.
 * Aman diimpor komponen klien (tanpa Prisma / Node).
 *
 * Konsep mengikuti LogTag Online: "Lokasi" = titik yang dipantau (kulkas vaksin, freezer, ruang alat);
 * alarm batas atas/bawah baru berbunyi setelah N bacaan BERTURUT-TURUT di luar batas (penundaan alarm),
 * dan lokasi dianggap "terputus" bila tidak ada bacaan selama batas waktu tertentu.
 */

export const ZONA_WAKTU = "Asia/Jakarta";
export const OFFSET_WIB_MS = 7 * 3600_000; // WIB tanpa musim panas
export const HARI_MS = 86_400_000;

export type JenisLokasi = { nama: string; keterangan: string; suhuMin: number | null; suhuMaks: number | null; lembapMin: number | null; lembapMaks: number | null };
/** Pilihan jenis + batas awal. Batas hanya CONTOH umum (profil LogTag: Ambient 15–25 °C, Fridge 2–8 °C, Freezer ≤ −15 °C) — sesuaikan SOP RS & petunjuk pabrikan. */
export const JENIS_LOKASI: JenisLokasi[] = [
  { nama: "Kulkas", keterangan: "Kulkas vaksin / obat (rantai dingin)", suhuMin: 2, suhuMaks: 8, lembapMin: null, lembapMaks: null },
  { nama: "Kulkas darah", keterangan: "Blood bank refrigerator", suhuMin: 2, suhuMaks: 6, lembapMin: null, lembapMaks: null },
  { nama: "Freezer", keterangan: "Freezer obat / plasma (hanya batas atas)", suhuMin: null, suhuMaks: -15, lembapMin: null, lembapMaks: null },
  { nama: "Ruangan", keterangan: "Ruang alat / gudang / ruang penyimpanan", suhuMin: 15, suhuMaks: 25, lembapMin: 30, lembapMaks: 70 },
  { nama: "Inkubator", keterangan: "Inkubator — isi batas sesuai setelan alat", suhuMin: null, suhuMaks: null, lembapMin: null, lembapMaks: null },
  { nama: "Lainnya", keterangan: "Atur batas sendiri", suhuMin: null, suhuMaks: null, lembapMin: null, lembapMaks: null },
];
export const NAMA_JENIS = JENIS_LOKASI.map((j) => j.nama);

export type Batas = { suhuMin: number | null; suhuMaks: number | null; lembapMin: number | null; lembapMaks: number | null };
export type Parameter = "suhu" | "lembap";
export type Zona = "rendah" | "normal" | "tinggi";

export function zona(nilai: number | null | undefined, min: number | null, maks: number | null): Zona | null {
  if (nilai == null || !Number.isFinite(nilai)) return null;
  if (maks != null && nilai > maks) return "tinggi";
  if (min != null && nilai < min) return "rendah";
  return "normal";
}

// ---------------------------------------------------------------- alarm
export const JENIS_ALARM = ["suhu-tinggi", "suhu-rendah", "lembap-tinggi", "lembap-rendah", "putus"] as const;
export type JenisAlarm = (typeof JENIS_ALARM)[number];
export const LABEL_ALARM: Record<JenisAlarm, string> = {
  "suhu-tinggi": "Suhu di atas batas",
  "suhu-rendah": "Suhu di bawah batas",
  "lembap-tinggi": "Kelembapan di atas batas",
  "lembap-rendah": "Kelembapan di bawah batas",
  putus: "Koneksi sensor terputus",
};
export const parameterAlarm = (j: string): Parameter | null => (j.startsWith("suhu") ? "suhu" : j.startsWith("lembap") ? "lembap" : null);
export const arahAlarm = (j: string): "tinggi" | "rendah" | null => (j.endsWith("tinggi") ? "tinggi" : j.endsWith("rendah") ? "rendah" : null);

// ---------------------------------------------------------------- status lokasi
export type KunciStatusPantau = "alarm" | "luar" | "putus" | "normal" | "belum" | "nonaktif";
export const LABEL_STATUS: Record<KunciStatusPantau, string> = {
  alarm: "Alarm",
  luar: "Di luar batas",
  putus: "Terputus",
  normal: "Normal",
  belum: "Belum ada data",
  nonaktif: "Nonaktif",
};
/** Urutan keparahan untuk penyortiran (kecil = paling mendesak). */
export const PERINGKAT_STATUS: Record<KunciStatusPantau, number> = { alarm: 0, putus: 1, luar: 2, normal: 3, belum: 4, nonaktif: 5 };

export type InfoStatus = { kunci: KunciStatusPantau; alarm: boolean; putus: boolean; zonaSuhu: Zona | null; zonaLembap: Zona | null; menitSejak: number | null };

export function statusLokasi(
  l: Batas & { aktif: boolean; batasPutusMenit: number; terakhirWaktu: Date | string | number | null; terakhirSuhu: number | null; terakhirLembap: number | null },
  alarmTerbuka: number,
  kini = Date.now(),
): InfoStatus {
  const t = l.terakhirWaktu == null ? null : new Date(l.terakhirWaktu).getTime();
  const menitSejak = t == null ? null : Math.max(0, Math.floor((kini - t) / 60_000));
  const zonaSuhu = zona(l.terakhirSuhu, l.suhuMin, l.suhuMaks);
  const zonaLembap = zona(l.terakhirLembap, l.lembapMin, l.lembapMaks);
  const putus = t != null && l.batasPutusMenit > 0 && kini - t > l.batasPutusMenit * 60_000;
  const alarm = alarmTerbuka > 0;
  let kunci: KunciStatusPantau;
  if (!l.aktif) kunci = "nonaktif";
  else if (t == null) kunci = "belum";
  else if (alarm) kunci = "alarm";
  else if (putus) kunci = "putus";
  else if ((zonaSuhu && zonaSuhu !== "normal") || (zonaLembap && zonaLembap !== "normal")) kunci = "luar";
  else kunci = "normal";
  return { kunci, alarm, putus, zonaSuhu, zonaLembap, menitSejak };
}

// ---------------------------------------------------------------- format (id-ID, WIB)
const desimal = (n: number, d: number) => n.toLocaleString("id-ID", { minimumFractionDigits: d, maximumFractionDigits: d });
export const fSuhu = (n: number | null | undefined, d = 1) => (n == null || !Number.isFinite(n) ? "–" : `${desimal(n, d)} °C`);
export const fLembap = (n: number | null | undefined, d = 0) => (n == null || !Number.isFinite(n) ? "–" : `${desimal(n, d)} %RH`);
export const fNilai = (p: Parameter, n: number | null | undefined, d?: number) => (p === "suhu" ? fSuhu(n, d ?? 1) : fLembap(n, d ?? 0));
export const fAngka = (n: number, d = 1) => desimal(n, d);
export const SATUAN: Record<Parameter, string> = { suhu: "°C", lembap: "%RH" };
export const NAMA_PARAMETER: Record<Parameter, string> = { suhu: "Suhu", lembap: "Kelembapan" };

export function fRentang(min: number | null, maks: number | null, p: Parameter): string {
  const s = SATUAN[p];
  const a = (n: number) => desimal(n, p === "suhu" && !Number.isInteger(n) ? 1 : 0);
  if (min != null && maks != null) return `${a(min)}–${a(maks)} ${s}`;
  if (maks != null) return `≤ ${a(maks)} ${s}`;
  if (min != null) return `≥ ${a(min)} ${s}`;
  return "tanpa batas";
}

const fmtTglJam = new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: ZONA_WAKTU });
const fmtJam = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: ZONA_WAKTU });
const fmtTglPendek = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: ZONA_WAKTU });
export const tglJamWib = (d: Date | string | number) => fmtTglJam.format(new Date(d)).replace(/\./g, ":");
export const jamWib = (d: Date | string | number) => fmtJam.format(new Date(d)).replace(/\./g, ":");
export const tglPendekWib = (d: Date | string | number) => fmtTglPendek.format(new Date(d));

export function relatif(menit: number | null): string {
  if (menit == null) return "belum pernah";
  if (menit < 1) return "baru saja";
  if (menit < 60) return `${menit} mnt lalu`;
  if (menit < 48 * 60) return `${Math.floor(menit / 60)} jam lalu`;
  return `${Math.floor(menit / 1440)} hari lalu`;
}
export function durasi(ms: number): string {
  const m = Math.round(ms / 60_000);
  if (m < 60) return `${m} mnt`;
  const j = Math.floor(m / 60), sm = m % 60;
  if (j < 48) return sm ? `${j} jam ${sm} mnt` : `${j} jam`;
  const h = Math.floor(j / 24), sj = j % 24;
  return sj ? `${h} hari ${sj} jam` : `${h} hari`;
}

/** Kunci hari WIB "YYYY-MM-DD" dari milidetik UTC. */
export function hariWib(ms: number): string {
  return new Date(ms + OFFSET_WIB_MS).toISOString().slice(0, 10);
}
/** Awal hari WIB (milidetik UTC) dari "YYYY-MM-DD". */
export function awalHariWib(tgl: string): number {
  return Date.parse(`${tgl}T00:00:00Z`) - OFFSET_WIB_MS;
}
/** Sesi inspeksi harian (LogTag AM/PM): Pagi sebelum 12.00 WIB, Sore sesudahnya. */
export const sesiSekarang = (kini = Date.now()): "Pagi" | "Sore" => (new Date(kini + OFFSET_WIB_MS).getUTCHours() < 12 ? "Pagi" : "Sore");

// ---------------------------------------------------------------- MKT
/** ΔH/R untuk Mean Kinetic Temperature: 83,144 kJ/mol ÷ 8,3144 J/(mol·K) = 10.000 K (USP <1079.2>). */
export const DH_R = 10_000;
export class AkumulasiMkt {
  private jumlah = 0;
  private n = 0;
  tambah(suhuC: number) { if (Number.isFinite(suhuC)) { this.jumlah += Math.exp(-DH_R / (suhuC + 273.15)); this.n += 1; } }
  hasil(): number | null { return this.n ? DH_R / -Math.log(this.jumlah / this.n) - 273.15 : null; }
}
export function hitungMkt(suhu: Iterable<number>): number | null {
  const a = new AkumulasiMkt();
  for (const t of suhu) a.tambah(t);
  return a.hasil();
}

// ---------------------------------------------------------------- pemindai ekskursi
export type BarisPindai = { waktu: number; suhu: number | null; lembap: number | null; sumber?: string | null };
export type Segmen = { jenis: JenisAlarm; mulai: number; selesai: number | null; puncak: number | null; batas: number | null };
export type AturanPindai = Batas & { tunda: number; putusMs: number };

type Lintasan = { jenis: JenisAlarm; mulai: number; hitung: number; puncak: number };

/**
 * Pemindai bertahap (data boleh diberikan per potongan, berurutan waktu):
 * - ekskursi suhu/lembap tercatat bila ≥ `tunda` bacaan berturut-turut di luar batas yang sama;
 *   mulai = bacaan pelanggaran pertama, selesai = bacaan normal pertama sesudahnya (null = masih berlangsung).
 *   Bacaan kosong untuk parameter itu dilewati (tidak memutus hitungan).
 * - "putus" tercatat untuk celah antar-bacaan > `putusMs` bila KEDUA bacaan berasal dari sensor langsung (sumber "api").
 */
export class PemindaiEkskursi {
  private lintas: Record<Parameter, Lintasan | null> = { suhu: null, lembap: null };
  private sebelum: BarisPindai | null = null;
  readonly segmen: Segmen[] = [];
  constructor(private aturan: AturanPindai) {}

  private batasDari(p: Parameter, arah: "tinggi" | "rendah") {
    const a = this.aturan;
    return p === "suhu" ? (arah === "tinggi" ? a.suhuMaks : a.suhuMin) : (arah === "tinggi" ? a.lembapMaks : a.lembapMin);
  }

  private tutup(p: Parameter, waktu: number | null) {
    const l = this.lintas[p];
    if (l && l.hitung >= Math.max(1, this.aturan.tunda)) {
      const arah = arahAlarm(l.jenis)!;
      this.segmen.push({ jenis: l.jenis, mulai: l.mulai, selesai: waktu, puncak: l.puncak, batas: this.batasDari(p, arah) });
    }
    this.lintas[p] = null;
  }

  tambah(baris: Iterable<BarisPindai>) {
    const a = this.aturan;
    for (const b of baris) {
      const s = this.sebelum;
      if (s && b.waktu <= s.waktu) continue; // harus berurutan & unik
      if (s && a.putusMs > 0 && s.sumber === "api" && b.sumber === "api" && b.waktu - s.waktu > a.putusMs) {
        this.segmen.push({ jenis: "putus", mulai: s.waktu, selesai: b.waktu, puncak: null, batas: null });
      }
      for (const p of ["suhu", "lembap"] as const) {
        const v = b[p];
        if (v == null || !Number.isFinite(v)) continue;
        const z = p === "suhu" ? zona(v, a.suhuMin, a.suhuMaks) : zona(v, a.lembapMin, a.lembapMaks);
        const l = this.lintas[p];
        if (z === "normal" || z == null) { if (l) this.tutup(p, b.waktu); continue; }
        const jenis = `${p}-${z}` as JenisAlarm;
        if (l && l.jenis === jenis) {
          l.hitung += 1;
          l.puncak = z === "tinggi" ? Math.max(l.puncak, v) : Math.min(l.puncak, v);
        } else {
          if (l) this.tutup(p, b.waktu);
          this.lintas[p] = { jenis, mulai: b.waktu, hitung: 1, puncak: v };
        }
      }
      this.sebelum = b;
    }
    return this;
  }

  /** Akhiri pemindaian: lintasan yang masih ≥ tunda menjadi ekskursi yang masih berlangsung. */
  akhiri(): Segmen[] {
    this.tutup("suhu", null);
    this.tutup("lembap", null);
    return this.segmen;
  }
}

export function pindaiEkskursi(baris: BarisPindai[], aturan: AturanPindai): Segmen[] {
  return new PemindaiEkskursi(aturan).tambah(baris).akhiri();
}
