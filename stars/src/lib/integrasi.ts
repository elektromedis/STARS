/**
 * Bridging STARS <-> SMART MFK (server saja).
 * - SMART MFK menarik alat, kalibrasi, & perintah kerja dari /api/integrasi/* STARS dan meneruskan laporan kerusakan alat
 *   sebagai Permintaan Kerja (POST /api/integrasi/permintaan).
 * - STARS membaca ringkasan MFK dari SMART MFK (GET {SMARTMFK_URL}/api/integrasi/ringkasan) untuk menu SMART MFK.
 * Env: INTEGRASI_TOKEN (sama di kedua aplikasi, min. 16 karakter), SMARTMFK_URL (alamat yang dapat dijangkau server STARS),
 * SMARTMFK_URL_PUBLIK (untuk tautan di layar).
 */
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export function tolakTanpaToken(req: Request): NextResponse | null {
  const token = process.env.INTEGRASI_TOKEN ?? "";
  if (token.length < 16) return NextResponse.json({ error: "API integrasi belum diaktifkan (INTEGRASI_TOKEN)." }, { status: 503 });
  const kiriman = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(kiriman), b = Buffer.from(token);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return NextResponse.json({ error: "Token tidak valid." }, { status: 401 });
  return null;
}

export const konfigSmartMfk = () => {
  const url = (process.env.SMARTMFK_URL ?? "").replace(/\/+$/, "");
  const token = process.env.INTEGRASI_TOKEN ?? "";
  return {
    url, token, aktif: Boolean(url) && token.length >= 16,
    publik: (process.env.SMARTMFK_URL_PUBLIK ?? "https://elektromedis-pc.tailc683f5.ts.net:10000").replace(/\/+$/, ""),
  };
};

export type RingkasanMfk = {
  dibuat: string;
  bab: { persen: number; lulus: boolean; dinilai: number; berlaku: number; ambang: number };
  standar: { kode: string; nama: string; persen: number; lulus: boolean; dinilai: number; berlaku: number }[];
  risiko: {
    aktif: number; band: Record<"RENDAH" | "SEDANG" | "TINGGI" | "EKSTREM", number>; areaBelumDikaji: number;
    alkes: { kode: string; pernyataan: string; skor: number; band: string; status: string; pic: string; unit: string | null }[];
  };
  recall: { tanggal: string; sumber: string; produk: string; merk: string; tipe: string; lot: string; uraian: string; tindakan: string; status: string; kodeAlat: string | null; namaAlat: string | null }[];
  insidenAlat: { nomor: string; tanggal: string; judul: string; status: string; band: string | null; kodeAlat: string | null }[];
  fasilitas: { perluTindakan: number; total: number; perKategori: { kode: string; nama: string; perlu: number }[] };
  syaratSurvei: { kode: string; uraian: string; status: string }[];
};

async function panggil<T>(path: string, init: RequestInit = {}): Promise<T> {
  const k = konfigSmartMfk();
  if (!k.aktif) throw new Error("Bridging SMART MFK belum dikonfigurasi (SMARTMFK_URL & INTEGRASI_TOKEN).");
  const r = await fetch(`${k.url}${path}`, { ...init, cache: "no-store", signal: AbortSignal.timeout(90_000), headers: { ...(init.headers ?? {}), Authorization: `Bearer ${k.token}` } });
  const isi = await r.text();
  if (!r.ok) throw new Error(`SMART MFK ${path} → HTTP ${r.status}: ${isi.slice(0, 160)}`);
  return JSON.parse(isi) as T;
}

/** Ringkasan MFK langsung dari SMART MFK; data null + pesan bila tidak terjangkau (halaman tetap tampil). */
export async function ambilRingkasanMfk(): Promise<{ data: RingkasanMfk | null; galat: string | null }> {
  try { return { data: await panggil<RingkasanMfk>("/api/integrasi/ringkasan"), galat: null }; }
  catch (e) { return { data: null, galat: e instanceof Error ? e.message : String(e) }; }
}

/** Minta SMART MFK menarik data STARS sekarang (tombol "Sinkron" di STARS). */
export const mintaSinkronSmartMfk = () => panggil<{ berhasil: boolean; ringkasan: string }>("/api/integrasi/sinkron", { method: "POST" });
