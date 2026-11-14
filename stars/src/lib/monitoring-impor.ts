/**
 * Baca berkas ekspor data logger (LogTag Analyzer / LogTag Online CSV, TXT, atau Excel, maupun CSV logger lain)
 * menjadi daftar bacaan. Toleran terhadap: baris keterangan di atas tabel, pemisah , ; tab, desimal koma,
 * kolom tanggal+jam terpisah atau gabungan, °F, UTF-16 (BOM), dan urutan tanggal HARI/BULAN atau BULAN/HARI.
 * Waktu tanpa zona dianggap WIB.
 */
import * as XLSX from "xlsx";
import { OFFSET_WIB_MS } from "@/lib/monitoring";
import type { BacaanMasuk } from "@/lib/monitoring-simpan";

export type UrutanTanggal = "auto" | "DMY" | "MDY" | "YMD";
export type HasilBaca = {
  bacaan: BacaanMasuk[];
  serial: string | null; model: string | null;
  kolom: { waktu: string; suhu: string | null; lembap: string | null };
  urutan: Exclude<UrutanTanggal, "auto">; urutanPasti: boolean; fahrenheit: boolean;
  dilewati: number; peringatan: string[];
};

const RE_SUHU = /temp|suhu|°c|°f|deg\s*[cf]/i;
const RE_LEMBAP = /humid|lembap|lembab|%\s*rh|\brh\b/i;
const RE_TGLJAM = /date\s*[\/&-]?\s*time|tanggal\s*(dan|&|\/)?\s*(waktu|jam)|timestamp|^waktu$|^time\s*stamp$/i;
const RE_TGL = /date|tanggal|^tgl/i;
const RE_JAM = /time|jam|pukul|waktu/i;

function dekode(buf: Buffer): string {
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) return buf.subarray(2).toString("utf16le");
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) { const b = Buffer.from(buf.subarray(2)); b.swap16(); return b.toString("utf16le"); }
  let t = buf.toString("utf8");
  if (t.charCodeAt(0) === 0xfeff) t = t.slice(1);
  if (t.includes("�")) t = buf.toString("latin1"); // ekspor lama Windows-1252 (simbol °)
  return t;
}

/** Pengurai CSV sederhana (tanda kutip ganda, pemisah satu karakter). */
function uraiCsv(teks: string, pemisah: string): string[][] {
  const hasil: string[][] = [];
  let baris: string[] = [], sel = "", kutip = false;
  for (let i = 0; i < teks.length; i++) {
    const c = teks[i];
    if (kutip) {
      if (c === '"') { if (teks[i + 1] === '"') { sel += '"'; i++; } else kutip = false; }
      else sel += c;
    } else if (c === '"') kutip = true;
    else if (c === pemisah) { baris.push(sel); sel = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && teks[i + 1] === "\n") i++;
      baris.push(sel); hasil.push(baris); baris = []; sel = "";
    } else sel += c;
  }
  if (sel !== "" || baris.length) { baris.push(sel); hasil.push(baris); }
  return hasil.map((b) => b.map((s) => s.trim()));
}

function tebakPemisah(teks: string): string {
  const contoh = teks.split(/\r?\n/).slice(0, 60);
  let terbaik = ",", skor = -1;
  for (const p of [",", ";", "\t", "|"]) {
    const hit = contoh.map((l) => l.split(p).length - 1).filter((x) => x > 0);
    const s = hit.length * 10 + (hit.length ? Math.min(...hit) : 0);
    if (s > skor) { skor = s; terbaik = p; }
  }
  return terbaik;
}

type Sel = string | number | null;
function bacaTabel(buf: Buffer, nama: string): Sel[][] {
  if (/\.(xlsx|xlsm|xls|ods)$/i.test(nama)) {
    const wb = XLSX.read(buf, { type: "buffer", cellDates: false }); // tanggal tetap nomor seri Excel (waktu dinding, tanpa geser zona)
    const ws = wb.Sheets[wb.SheetNames[0]];
    return (XLSX.utils.sheet_to_json<Sel[]>(ws, { header: 1, raw: true, defval: null }) as Sel[][]).map((r) => r.map((v) => (typeof v === "string" ? v.trim() : v)));
  }
  const teks = dekode(buf);
  return uraiCsv(teks, tebakPemisah(teks));
}

const teksSel = (v: Sel) => (v == null ? "" : String(v));

function angka(v: Sel, desimalKoma: boolean): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  let t = String(v).replace(/[^\d.,\-+eE]/g, "");
  if (!t || t === "-" || t === "+") return null;
  if (desimalKoma) t = t.replace(/\./g, "").replace(",", ".");
  else if (/^-?\d+,\d+$/.test(t)) t = t.replace(",", ".");
  else t = t.replace(/,/g, "");
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

type BagianTgl = { a: number; b: number; c: number; jam: number; mnt: number; dtk: number; zona: number | null } | { ms: number };
/** Pecah teks tanggal/jam menjadi bagian; urutan hari/bulan diputuskan belakangan. */
function pecahTanggal(tgl: Sel, jam: Sel): BagianTgl | null {
  const seriExcel = (v: number) => Math.round((v - 25569) * 86_400_000) - OFFSET_WIB_MS; // nomor seri Excel = waktu dinding WIB
  if (typeof tgl === "number") {
    if (jam == null || jam === "") {
      if (tgl > 1e9) return { ms: tgl < 1e12 ? tgl * 1000 : tgl }; // epoch detik / milidetik
      if (tgl > 20000 && tgl < 80000) return { ms: seriExcel(tgl) };
    } else if (typeof jam === "number" && jam >= 0 && jam < 1 && tgl > 20000 && tgl < 80000) return { ms: seriExcel(Math.floor(tgl) + jam) };
  }
  const t = teksSel(tgl);
  let j = teksSel(jam);
  if (typeof jam === "number" && jam < 1) { const d = Math.round(jam * 86400); j = `${Math.floor(d / 3600)}:${Math.floor((d % 3600) / 60)}:${d % 60}`; }
  if (/^\d{4}-\d{2}-\d{2}T/.test(t) && !j) {
    const zona = /(Z|[+-]\d{2}:?\d{2})$/.test(t);
    const ms = Date.parse(zona ? t : `${t}+07:00`);
    return Number.isFinite(ms) ? { ms } : null;
  }
  const gabung = `${t} ${j}`.trim();
  const m = /^(\d{1,4})[\/.\-](\d{1,2})[\/.\-](\d{1,4})(?:[ T,]+(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?(?:[.,]\d+)?\s*([AaPp][Mm])?)?\s*(Z|[+-]\d{2}:?\d{2})?$/.exec(gabung);
  if (!m) return null;
  let jamN = Number(m[4] ?? 0);
  const ampm = m[7]?.toUpperCase();
  if (ampm === "PM" && jamN < 12) jamN += 12;
  if (ampm === "AM" && jamN === 12) jamN = 0;
  let zona: number | null = null;
  if (m[8]) zona = m[8] === "Z" ? 0 : (m[8][0] === "-" ? -1 : 1) * (Number(m[8].slice(1, 3)) * 60 + Number(m[8].slice(-2)));
  return { a: Number(m[1]), b: Number(m[2]), c: Number(m[3]), jam: jamN, mnt: Number(m[5] ?? 0), dtk: Number(m[6] ?? 0), zona };
}

function keMs(p: BagianTgl, urutan: Exclude<UrutanTanggal, "auto">): number | null {
  if ("ms" in p) return p.ms;
  let th: number, bl: number, hr: number;
  if (p.a > 999) { th = p.a; bl = p.b; hr = p.c; }
  else if (urutan === "MDY") { bl = p.a; hr = p.b; th = p.c; }
  else { hr = p.a; bl = p.b; th = p.c; }
  if (th < 100) th += 2000;
  if (bl < 1 || bl > 12 || hr < 1 || hr > 31 || p.jam > 23 || p.mnt > 59 || p.dtk > 59) return null;
  const utc = Date.UTC(th, bl - 1, hr, p.jam, p.mnt, p.dtk);
  if (new Date(utc).getUTCDate() !== hr) return null;
  return utc - (p.zona == null ? OFFSET_WIB_MS : p.zona * 60_000);
}

export function bacaBerkasLogger(buf: Buffer, nama: string, urutanDiminta: UrutanTanggal = "auto"): HasilBaca | { galat: string } {
  let tabel: Sel[][];
  try { tabel = bacaTabel(buf, nama); } catch (e) { return { galat: `Berkas tidak dapat dibaca: ${e instanceof Error ? e.message : String(e)}` }; }
  if (tabel.length === 0) return { galat: "Berkas kosong." };

  // 1) metadata di atas tabel (Serial Number, Product Type …)
  let serial: string | null = null, model: string | null = null;
  const nilaiSetelah = (r: Sel[], i: number) => r.slice(i + 1).map(teksSel).find((x) => x.trim() !== "")?.trim() ?? null;

  // 2) cari baris judul kolom
  let iJudul = -1;
  for (let i = 0; i < Math.min(tabel.length, 200); i++) {
    const r = tabel[i].map(teksSel);
    r.forEach((s, k) => {
      if (!serial && /serial\s*(number|no)?|nomor\s*seri|^s\/?n\b/i.test(s) && !RE_SUHU.test(s)) serial = nilaiSetelah(tabel[i], k) ?? s.split(/[:=]/)[1]?.trim() ?? null;
      if (!model && /product\s*type|model|tipe\s*produk/i.test(s)) model = nilaiSetelah(tabel[i], k) ?? s.split(/[:=]/)[1]?.trim() ?? null;
    });
    if (r.some((s) => RE_SUHU.test(s) || RE_LEMBAP.test(s)) && r.some((s) => RE_TGL.test(s) || RE_JAM.test(s) || RE_TGLJAM.test(s))) { iJudul = i; break; }
  }
  if (iJudul < 0) return { galat: "Kolom tidak dikenali: berkas harus punya judul kolom tanggal/waktu dan suhu (Temperature) dan/atau kelembapan (Humidity)." };
  const judul = tabel[iJudul].map(teksSel);
  const cari = (re: RegExp, kecuali: number[] = []) => judul.findIndex((s, k) => !kecuali.includes(k) && re.test(s));
  let kTglJam = cari(RE_TGLJAM);
  let kTgl = -1, kJam = -1;
  const kSuhu = judul.findIndex((s) => RE_SUHU.test(s) && !RE_LEMBAP.test(s) && !/alarm|batas|limit/i.test(s));
  const kLembap = judul.findIndex((s) => RE_LEMBAP.test(s) && !/alarm|batas|limit/i.test(s));
  if (kTglJam < 0) {
    kTgl = cari(RE_TGL, [kSuhu, kLembap]);
    kJam = cari(/time|jam|pukul/i, [kSuhu, kLembap, kTgl]);
    if (kTgl < 0 && kJam >= 0) { kTglJam = kJam; kJam = -1; }
    else if (kTgl >= 0 && kJam < 0) { kTglJam = kTgl; kTgl = -1; }
  }
  if (kTglJam < 0 && kTgl < 0) return { galat: "Kolom tanggal/waktu tidak ditemukan." };
  if (kSuhu < 0 && kLembap < 0) return { galat: "Kolom suhu (Temperature) atau kelembapan (Humidity) tidak ditemukan." };
  const fahrenheit = kSuhu >= 0 && /°\s*f|\(f\)|deg\s*f|fahrenheit/i.test(judul[kSuhu]);

  // 3) baris data
  const data = tabel.slice(iJudul + 1).filter((r) => r.some((v) => teksSel(v) !== ""));
  const contohAngka = data.slice(0, 200).map((r) => teksSel(r[kSuhu >= 0 ? kSuhu : kLembap])).filter(Boolean);
  const desimalKoma = contohAngka.length > 0 && contohAngka.filter((s) => /^-?\d+,\d+$/.test(s)).length > contohAngka.length / 2;
  const bagian: { p: BagianTgl; s: number | null; l: number | null }[] = [];
  let dilewati = 0;
  for (const r of data) {
    const p = kTgl >= 0 ? pecahTanggal(r[kTgl], r[kJam] ?? null) : pecahTanggal(r[kTglJam], kJam >= 0 ? r[kJam] : null);
    let s = kSuhu >= 0 ? angka(r[kSuhu], desimalKoma) : null;
    const l = kLembap >= 0 ? angka(r[kLembap], desimalKoma) : null;
    if (!p || (s == null && l == null)) { dilewati++; continue; }
    if (s != null && fahrenheit) s = ((s - 32) * 5) / 9;
    if ((s != null && (s < -100 || s > 200)) || (l != null && (l < 0 || l > 100))) { dilewati++; continue; }
    bagian.push({ p, s: s == null ? null : Math.round(s * 100) / 100, l: l == null ? null : Math.round(l * 10) / 10 });
  }
  if (bagian.length === 0) return { galat: "Tidak ada baris data yang bisa dibaca di bawah judul kolom." };

  // 4) urutan tanggal
  let urutan: Exclude<UrutanTanggal, "auto"> = "DMY";
  let urutanPasti = true;
  const peringatan: string[] = [];
  if (urutanDiminta !== "auto") urutan = urutanDiminta;
  else {
    const teks = bagian.map((x) => x.p).filter((p): p is Extract<BagianTgl, { a: number }> => "a" in p);
    if (teks.length && teks.every((p) => p.a > 999)) urutan = "YMD";
    else if (teks.some((p) => p.a > 12 && p.a <= 31)) urutan = "DMY";
    else if (teks.some((p) => p.b > 12)) urutan = "MDY";
    else if (teks.length) { urutan = "DMY"; urutanPasti = false; peringatan.push("Urutan tanggal ambigu (semua angka ≤ 12) — dianggap HARI/BULAN/TAHUN. Ganti pilihan bila salah."); }
  }
  const bacaan: BacaanMasuk[] = [];
  for (const x of bagian) {
    const ms = keMs(x.p, urutan);
    if (ms == null || !Number.isFinite(ms)) { dilewati++; continue; }
    bacaan.push({ waktu: ms, suhu: x.s, lembap: x.l });
  }
  bacaan.sort((a, b) => a.waktu - b.waktu);
  if (dilewati > 0) peringatan.push(`${dilewati.toLocaleString("id-ID")} baris dilewati (tanggal/angka tidak terbaca).`);
  if (fahrenheit) peringatan.push("Suhu dalam °F — sudah dikonversi ke °C.");
  if (bacaan.length && bacaan[bacaan.length - 1].waktu > Date.now() + 5 * 60_000) peringatan.push("Ada waktu di masa depan — periksa urutan tanggal.");
  return {
    bacaan, serial, model, urutan, urutanPasti, fahrenheit, dilewati, peringatan,
    kolom: { waktu: kTgl >= 0 ? `${judul[kTgl]} + ${judul[kJam]}` : `${judul[kTglJam]}${kJam >= 0 ? ` + ${judul[kJam]}` : ""}`, suhu: kSuhu >= 0 ? judul[kSuhu] : null, lembap: kLembap >= 0 ? judul[kLembap] : null },
  };
}
