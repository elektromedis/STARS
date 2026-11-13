/**
 * Data per perangkat (localStorage) untuk pengunjung tanpa akun: laporan yang pernah dikirim (beserta kode lacak),
 * riwayat alat yang dipindai, dan kapan notifikasi terakhir dibaca. Semua akses dibungkus try/catch
 * (mode privat / penyimpanan diblokir → aplikasi tetap jalan, hanya tanpa riwayat).
 */
export const PERISTIWA_LOKAL = "stars:lokal";
export const PERISTIWA_DIBACA = "stars:dibaca";
export const PERISTIWA_SCAN = "stars:scan";

const K_LAPORAN = "stars-laporan-saya";
const K_SCAN = "stars-riwayat-scan";
const K_DIBACA = "stars-notif-dibaca";
const MAKS = 50;

export type LaporanSaya = { nomor: string; kode: string; namaAlat: string; waktu: string };
export type ScanSaya = { kode: string; nama: string; keterangan?: string | null; waktu: string };

function baca<T>(k: string, awal: T): T {
  try { const v = window.localStorage.getItem(k); return v ? (JSON.parse(v) as T) : awal; } catch { return awal; }
}
function tulis(k: string, v: unknown, peristiwa = PERISTIWA_LOKAL) {
  try { window.localStorage.setItem(k, JSON.stringify(v)); } catch { /* penyimpanan diblokir */ }
  try { window.dispatchEvent(new Event(peristiwa)); } catch { /* SSR */ }
}

const larik = <T,>(v: unknown, cek: (x: T) => boolean): T[] => (Array.isArray(v) ? (v as T[]).filter((x) => x && typeof x === "object" && cek(x)) : []);

export const laporanSaya = () => larik<LaporanSaya>(baca(K_LAPORAN, []), (x) => typeof x.nomor === "string" && typeof x.kode === "string");
export function tambahLaporanSaya(l: LaporanSaya) {
  tulis(K_LAPORAN, [l, ...laporanSaya().filter((x) => x.nomor !== l.nomor)].slice(0, MAKS));
}

export const riwayatScan = () => larik<ScanSaya>(baca(K_SCAN, []), (x) => typeof x.kode === "string" && typeof x.nama === "string");
export function catatScan(s: Omit<ScanSaya, "waktu">) {
  tulis(K_SCAN, [{ ...s, waktu: new Date().toISOString() }, ...riwayatScan().filter((x) => x.kode !== s.kode)].slice(0, MAKS));
}

export function hapusLokal(jenis: "scan" | "laporan") { tulis(jenis === "scan" ? K_SCAN : K_LAPORAN, []); }

export const waktuDibaca = () => { const v = baca<string>(K_DIBACA, ""); return typeof v === "string" ? v : ""; };
export function tandaiDibaca() { tulis(K_DIBACA, new Date().toISOString(), PERISTIWA_DIBACA); }

/** Buka layar Scan QR dari mana saja (tombol tengah menu bawah, formulir Lapor, dsb.). */
export function bukaScan() { try { window.dispatchEvent(new Event(PERISTIWA_SCAN)); } catch { /* SSR */ } }
