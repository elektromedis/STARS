/** Mengambil teks halaman web publik untuk basis pengetahuan. Alamat internal selalu ditolak, termasuk lewat pengalihan. */
import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import { BlockList, isIP, type LookupFunction } from "node:net";
import { extractText, getDocumentProxy } from "unpdf";

const MAKS_BYTE = 15 * 1024 * 1024;
const MAKS_ALIH = 4;
const WAKTU = 25_000;

const terlarang = new BlockList();
for (const [a, n] of [["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4]] as const) terlarang.addSubnet(a, n, "ipv4");
for (const [a, n] of [["::", 128], ["::1", 128], ["64:ff9b::", 96], ["100::", 64], ["2001:db8::", 32], ["fc00::", 7], ["fe80::", 10], ["ff00::", 8]] as const) terlarang.addSubnet(a, n, "ipv6");

export function ipPublik(ip: string) {
  const v4 = ip.toLowerCase().match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  const alamat = v4 ?? ip;
  const f = isIP(alamat);
  return f !== 0 && !terlarang.check(alamat, f === 6 ? "ipv6" : "ipv4");
}

/** Alamat diperiksa saat koneksi dibuat, sehingga DNS tidak bisa berganti ke IP internal setelah validasi. */
const lookupAman: LookupFunction = (host, opsi, cb) => {
  dns.lookup(host, { all: true, verbatim: true }, (e, daftar) => {
    if (e) return cb(e, "", 4);
    if (!daftar.length || daftar.some((x) => !ipPublik(x.address))) return cb(Object.assign(new Error("Alamat internal ditolak"), { code: "EALAMAT" }), "", 4);
    if (opsi.all) return (cb as unknown as (e: null, a: dns.LookupAddress[]) => void)(null, daftar);
    cb(null, daftar[0].address, daftar[0].family);
  });
};

function periksaUrl(teks: string) {
  let u: URL;
  try { u = new URL(teks); } catch { throw new Error("alamat tidak valid"); }
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("hanya http atau https");
  if (u.username || u.password) throw new Error("alamat tidak boleh memuat sandi");
  if (u.port && u.port !== "80" && u.port !== "443") throw new Error("hanya port 80 atau 443");
  const host = u.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".ts.net")) throw new Error("alamat internal ditolak");
  if (isIP(host) && !ipPublik(host)) throw new Error("alamat internal ditolak");
  return u;
}

type Respons = { status: number; tipe: string; lokasi: string | null; isi: Buffer };

function minta(u: URL, signal: AbortSignal) {
  return new Promise<Respons>((selesai, gagal) => {
    const pustaka = u.protocol === "https:" ? https : http;
    const req = pustaka.get(u, { lookup: lookupAman, signal, headers: { "User-Agent": "STARS-Pengetahuan/1.0", Accept: "text/html,application/xhtml+xml,text/plain,application/pdf" } }, (res) => {
      const status = res.statusCode ?? 0;
      const tipe = String(res.headers["content-type"] ?? "").toLowerCase();
      if (status >= 300 && status < 400) { res.resume(); return selesai({ status, tipe, lokasi: res.headers.location ?? null, isi: Buffer.alloc(0) }); }
      const potong: Buffer[] = [];
      let n = 0;
      res.on("data", (b: Buffer) => {
        n += b.length;
        if (n > MAKS_BYTE) { res.destroy(); gagal(new Error("lebih dari 15 MB")); return; }
        potong.push(b);
      });
      res.on("end", () => selesai({ status, tipe, lokasi: null, isi: Buffer.concat(potong) }));
      res.on("error", gagal);
    });
    req.on("error", gagal);
  });
}

const ENTITAS: Record<string, string> = { nbsp: " ", lt: "<", gt: ">", quot: '"', apos: "'", ndash: "-", mdash: "-", hellip: "...", laquo: '"', raquo: '"', rsquo: "'", lsquo: "'", rdquo: '"', ldquo: '"', amp: "&" };
const urai = (s: string) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, k: string) => {
  if (k[0] !== "#") return ENTITAS[k.toLowerCase()] ?? m;
  const c = k[1].toLowerCase() === "x" ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10);
  return c > 0 && c <= 0x10ffff ? String.fromCodePoint(c) : " ";
});

export function teksHtml(html: string) {
  const judul = urai(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").replace(/\s+/g, " ").trim();
  let t = html.replace(/<!--[\s\S]*?-->/g, " ").replace(/<(script|style|noscript|svg|canvas|iframe|template|nav|header|footer|aside|form)\b[\s\S]*?<\/\1\s*>/gi, " ");
  t = t.match(/<(main|article)\b[^>]*>[\s\S]*<\/\1\s*>/i)?.[0] ?? t.match(/<body\b[^>]*>[\s\S]*<\/body\s*>/i)?.[0] ?? t;
  t = t.replace(/<(br|\/p|\/div|\/li|\/tr|\/h[1-6]|\/section|\/article|\/blockquote)\b[^>]*>/gi, "\n").replace(/<\/t[dh]\s*>/gi, " | ").replace(/<[^>]+>/g, " ");
  return { judul, teks: urai(t).replace(/[ \t ]+/g, " ").replace(/ ?\n ?/g, "\n").replace(/\n{3,}/g, "\n\n").trim() };
}

/** Mengembalikan judul dan halaman teks, dengan alamat sumber pada awal halaman pertama. */
export async function ambilWeb(alamat: string) {
  const signal = AbortSignal.timeout(WAKTU);
  let u = periksaUrl(alamat);
  let r: Respons | null = null;
  for (let i = 0; i <= MAKS_ALIH; i++) {
    r = await minta(u, signal).catch((e: NodeJS.ErrnoException) => {
      throw new Error(e.code === "EALAMAT" ? "alamat internal ditolak" : e.name === "TimeoutError" || e.name === "AbortError" ? "waktu habis" : e.message === "lebih dari 15 MB" ? e.message : "situs tidak bisa dibuka");
    });
    if (r.status < 300 || r.status >= 400) break;
    if (!r.lokasi || i === MAKS_ALIH) throw new Error("terlalu banyak pengalihan");
    u = periksaUrl(new URL(r.lokasi, u).href);
  }
  if (!r || r.status !== 200) throw new Error(`situs menjawab ${r?.status ?? "kosong"}`);
  const sumber = u.href;
  const nama = decodeURIComponent(u.pathname.split("/").pop() || u.hostname).replace(/\.[a-z0-9]+$/i, "");
  let judul = nama, halaman: { halaman: number; teks: string }[];
  if (r.tipe.includes("pdf") || r.isi.subarray(0, 5).toString() === "%PDF-") {
    const { text } = await extractText(await getDocumentProxy(new Uint8Array(r.isi)), { mergePages: false });
    halaman = (text as string[]).map((teks, i) => ({ halaman: i + 1, teks }));
  } else if (r.tipe.includes("html") || r.tipe.includes("xml")) {
    const h = teksHtml(r.isi.toString("utf8"));
    judul = h.judul || nama;
    halaman = [{ halaman: 1, teks: h.teks }];
  } else if (r.tipe.startsWith("text/plain")) {
    halaman = [{ halaman: 1, teks: r.isi.toString("utf8") }];
  } else throw new Error("jenis isi tidak didukung");
  if (halaman.reduce((n, x) => n + x.teks.trim().length, 0) < 200) throw new Error("teks terlalu sedikit; halaman mungkin butuh login, JavaScript, atau hasil scan");
  halaman[0] = { ...halaman[0], teks: `Sumber: ${sumber}\n\n${halaman[0].teks}` };
  return { judul: judul.slice(0, 200), halaman, sumber };
}
