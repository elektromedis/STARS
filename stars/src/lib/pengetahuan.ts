/** Basis pengetahuan ALLIES: pemotongan dokumen dan pencarian BM25 lokal (tanpa layanan embedding). */
import { prisma } from "./prisma";
import { saring } from "./saring";

const STOP = new Set("yang dan di ke dari untuk pada dengan atau ini itu adalah dalam oleh sebagai apa bagaimana berapa kapan siapa mana apakah saya kami harus bisa dapat akan tidak ada para secara tentang cara".split(" "));
export const token = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length >= 3 && !STOP.has(w));

export function potongHalaman(teks: string, n = 900, tumpang = 120) {
  const t = saring(teks).replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  const hasil: string[] = [];
  for (let i = 0; i < t.length; i += n - tumpang) {
    const p = t.slice(i, i + n).trim();
    if (p.length >= 40) hasil.push(p);
    if (i + n >= t.length) break;
  }
  return hasil;
}

/** Berkas .txt boleh memakai penanda "=== Halaman N ===" agar nomor halaman terjaga. */
export function halamanDariTeks(teks: string) {
  const b = teks.split(/^=== Halaman (\d+) ===\s*$/m);
  if (b.length < 3) return [{ halaman: 1, teks }];
  const r: { halaman: number; teks: string }[] = [];
  for (let i = 1; i < b.length; i += 2) r.push({ halaman: Number(b[i]), teks: b[i + 1] ?? "" });
  return r;
}

export async function simpanDokumen(judul: string, jenis: string, halaman: { halaman: number; teks: string }[], oleh: string | null) {
  const baris = halaman.flatMap((h) => potongHalaman(h.teks).map((teks, urut) => ({ halaman: h.halaman, urut, teks })));
  if (!baris.length) return null;
  return prisma.$transaction(async (tx) => {
    const d = await tx.dokumenPengetahuan.create({ data: { judul, jenis, halaman: halaman.length, oleh } });
    for (let i = 0; i < baris.length; i += 200) await tx.potonganPengetahuan.createMany({ data: baris.slice(i, i + 200).map((x) => ({ ...x, dokumenId: d.id })) });
    return { id: d.id, potongan: baris.length };
  }, { timeout: 60_000 });
}

type Indeks = { kunci: string; baris: { id: number; halaman: number; teks: string; judul: string; f: Map<string, number>; pjg: number }[]; df: Map<string, number>; rata: number };
let cache: Indeks | null = null;

async function indeks() {
  const [n, maks, dok] = await Promise.all([prisma.potonganPengetahuan.count(), prisma.potonganPengetahuan.aggregate({ _max: { id: true } }), prisma.dokumenPengetahuan.count()]);
  const kunci = `${n}:${maks._max.id ?? 0}:${dok}`;
  if (cache?.kunci === kunci) return cache;
  const rows = await prisma.potonganPengetahuan.findMany({ select: { id: true, halaman: true, teks: true, dokumen: { select: { judul: true } } } });
  const df = new Map<string, number>();
  let total = 0;
  const baris = rows.map((r) => {
    const t = token(`${r.teks} ${r.dokumen.judul}`), f = new Map<string, number>();
    for (const w of t) f.set(w, (f.get(w) ?? 0) + 1);
    for (const w of f.keys()) df.set(w, (df.get(w) ?? 0) + 1);
    total += t.length;
    return { id: r.id, halaman: r.halaman, teks: r.teks, judul: r.dokumen.judul, f, pjg: t.length };
  });
  cache = { kunci, baris, df, rata: total / Math.max(1, baris.length) };
  return cache;
}

export async function cariPengetahuan(kueri: string, batas = 5) {
  const q = [...new Set(token(kueri))].slice(0, 16);
  if (!q.length) return [];
  const ix = await indeks();
  const N = ix.baris.length, syarat = Math.min(2, q.length);
  return ix.baris.flatMap((b) => {
    let skor = 0, cocok = 0;
    for (const w of q) {
      const tf = b.f.get(w);
      if (!tf) continue;
      cocok++;
      const d = ix.df.get(w) ?? 0;
      skor += Math.log(1 + (N - d + 0.5) / (d + 0.5)) * (tf * 2.2) / (tf + 1.2 * (0.25 + 0.75 * b.pjg / (ix.rata || 1)));
    }
    return cocok >= syarat ? [{ judul: b.judul, halaman: b.halaman, kutipan: b.teks, skor }] : [];
  }).sort((a, b) => b.skor - a.skor).slice(0, batas);
}
