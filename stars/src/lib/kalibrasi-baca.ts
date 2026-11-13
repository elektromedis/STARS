/**
 * "Otomatis isi" CMS Kalibrasi: membaca teks sertifikat PDF lalu menebak tanggal kalibrasi, masa berlaku,
 * nomor sertifikat, lembaga kalibrator, hasil (laik/tidak), dan alat yang dimaksud (dari nomor seri / kode).
 * Hanya PDF berteks (hasil cetak digital). PDF hasil pindai/foto tidak berteks → isian manual, alat tetap
 * dicoba dicocokkan dari NAMA BERKAS. Semua hasil hanya saran: operator memeriksa sebelum menyimpan.
 */
import { adalahIso, isoTanggal } from "./kalibrasi";

export type SaranKalibrasi = {
  tanggal: string | null;
  /** Hanya bila TERTULIS di sertifikat; bila null formulir menghitung tanggal + interval (bawaan 12 bulan). */
  berlakuSampai: string | null;
  nomorSertifikat: string | null;
  kalibrator: string | null;
  laik: boolean | null;
  /** "Pengujian" bila sertifikat/laporan pengujian, "Kalibrasi" bila sertifikat kalibrasi, null bila tak jelas. */
  jenis: "Kalibrasi" | "Pengujian" | null;
};
export type AlatUntukCocok = { id: number; kode: string; nomorSeri: string | null; noUrutAset: string | null };
export type AlatCocok = { id: number; via: "nomor seri" | "kode" | "no. aset" | "nama berkas" };

const BULAN: Record<string, number> = {
  januari: 1, jan: 1, january: 1, februari: 2, pebruari: 2, feb: 2, peb: 2, february: 2, maret: 3, mar: 3, march: 3,
  april: 4, apr: 4, mei: 5, may: 5, juni: 6, jun: 6, june: 6, juli: 7, jul: 7, july: 7,
  agustus: 8, agu: 8, agt: 8, ags: 8, aug: 8, august: 8, september: 9, sep: 9, sept: 9,
  oktober: 10, okt: 10, oct: 10, october: 10, november: 11, nopember: 11, nov: 11, nop: 11, desember: 12, des: 12, dec: 12, december: 12,
};

type TanggalDitemukan = { iso: string; awal: number; akhir: number };

function buatIso(th: number, bl: number, hr: number): string | null {
  if (th < 2000 || th > 2100 || bl < 1 || bl > 12 || hr < 1 || hr > 31) return null;
  const iso = `${th}-${String(bl).padStart(2, "0")}-${String(hr).padStart(2, "0")}`;
  return adalahIso(iso) ? iso : null;
}

/** Semua tanggal dalam teks: 12-02-2026, 12/02/2026, 2026-02-12, 12 Februari 2026, 12-Feb-2026, February 12, 2026. */
export function cariTanggal(teks: string): TanggalDitemukan[] {
  const hasil: TanggalDitemukan[] = [];
  const pola = /(\d{1,2})\s*[-/.]\s*(\d{1,2})\s*[-/.]\s*(\d{4})|(\d{4})\s*[-/.]\s*(\d{1,2})\s*[-/.]\s*(\d{1,2})|(\d{1,2})\s*[- ]\s*([A-Za-z]{3,9})\.?\s*[- ,]\s*(\d{4})|([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})/g;
  for (const m of teks.matchAll(pola)) {
    let iso: string | null = null;
    if (m[1]) iso = buatIso(+m[3], +m[2], +m[1]);
    else if (m[4]) iso = buatIso(+m[4], +m[5], +m[6]);
    else if (m[7]) { const bl = BULAN[m[8].toLowerCase()]; if (bl) iso = buatIso(+m[9], bl, +m[7]); }
    else if (m[10]) { const bl = BULAN[m[10].toLowerCase()]; if (bl) iso = buatIso(+m[12], bl, +m[11]); }
    if (iso) hasil.push({ iso, awal: m.index!, akhir: m.index! + m[0].length });
  }
  return hasil;
}

const LABEL_TANGGAL = /(?:tanggal|tgl\.?)\s*(?:kalibrasi|pengujian|uji(?:\s*fungsi)?|pelaksanaan|pengukuran|pemeriksaan)|date\s*of\s*(?:calibration|test(?:ing)?|inspection)|calibration\s*date|test\s*date|(?:dikalibrasi|diuji)\s*(?:pada|tanggal|tgl)/gi;
const LABEL_BERLAKU = /berlaku\s*(?:sampai|hingga|s\s*\.?\s*\/?\s*d\.?)|masa\s*berlaku|valid\s*(?:until|thru|through|to)|(?:kalibrasi|pengujian|uji)\s*(?:ulang|berikutnya|selanjutnya)|next\s*(?:calibration|due|test)|due\s*date|(?:tanggal|tgl\.?)\s*(?:kedaluwarsa|kadaluarsa|kadaluwarsa|expired?)|expir(?:y|ed|es)\s*(?:date)?/gi;

/** Tanggal pertama (atau terakhir, untuk rentang "12 Feb 2026 s/d 11 Feb 2027") dalam ±160 karakter setelah label. */
function tanggalSetelahLabel(teks: string, label: RegExp, semua: TanggalDitemukan[], ambilTerakhir: boolean): string | null {
  for (const m of teks.matchAll(label)) {
    const akhirLabel = m.index! + m[0].length;
    const dekat = semua.filter((t) => t.awal >= akhirLabel && t.awal - akhirLabel <= 160).slice(0, 2);
    if (dekat.length === 0) continue;
    if (ambilTerakhir && dekat.length === 2) return dekat[0].iso > dekat[1].iso ? dekat[0].iso : dekat[1].iso;
    return dekat[0].iso;
  }
  return null;
}

function cariNomor(teks: string): string | null {
  const pola = [
    /(?:nomor|no\.?|nmr\.?)\s*(?:sertifikat|sertipikat|certificate)\s*(?:\/\s*certificate\s*(?:no\.?|number))?\s*[:.]?\s*([A-Z0-9][A-Z0-9./\-_]{2,60})/i,
    /certificate\s*(?:no\.?|number|#)\s*[:.]?\s*([A-Z0-9][A-Z0-9./\-_]{2,60})/i,
    /sertifikat[^\n]{0,60}?\b(?:no\.?|nomor)\s*[:.]?\s*([A-Z0-9][A-Z0-9./\-_]{2,60})/i,
  ];
  for (const p of pola) {
    const m = teks.match(p);
    const n = m?.[1]?.replace(/[./\-_]+$/, "");
    if (n && /\d/.test(n) && n.length >= 3) return n.slice(0, 120);
  }
  return null;
}

const KATA_HENTI = new Set(["sertifikat", "kalibrasi", "calibration", "certificate", "nomor", "no", "jl", "jalan", "telp", "telepon", "kementerian", "direktorat", "laporan", "hasil", "alamat", "address", "pengujian"]);

const judul = (s: string) => s.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());

/** Hingga `maks` kata berhuruf kapital setelah posisi `dari` (mis. nama kota), berhenti di kata henti. */
function kataLanjutan(teks: string, dari: number, maks: number): string[] {
  const hasil: string[] = [];
  for (const m of teks.slice(dari, dari + 60).matchAll(/[ \t]+([A-Z][A-Za-z]+)/gy)) {
    if (hasil.length >= maks || KATA_HENTI.has(m[1].toLowerCase())) break;
    hasil.push(judul(m[1]));
  }
  return hasil;
}

function cariLembaga(teks: string): string | null {
  const satu = (s: string) => s.replace(/\s+/g, " ").trim().slice(0, 160);
  const balai = teks.match(/\b(balai|loka)\s+pengamanan\s+fasilitas\s+kesehatan\b/i);
  if (balai) return satu([judul(balai[0].replace(/\s+/g, " ")), ...kataLanjutan(teks, balai.index! + balai[0].length, 2)].join(" "));
  const singkat = teks.match(/\b(BPFK|LPFK|BPAFK|LPAFK|BPPFK)\b/);
  if (singkat) return satu([singkat[1], ...kataLanjutan(teks, singkat.index! + singkat[0].length, 1)].join(" "));
  const badan = teks.match(/\b((?:PT|CV)\.?[ \t]+[A-Z][A-Za-z0-9&.\-]*(?:[ \t]+[A-Z][A-Za-z0-9&.\-]*){0,5})/);
  if (badan) return satu(badan[1]);
  const lab = teks.match(/\b(laboratorium[ \t]+(?:kalibrasi|pengujian)(?:[ \t]+[A-Z][A-Za-z0-9&.\-]*){1,4})/i);
  if (lab) return satu(lab[1]);
  return null;
}

function cariLaik(teks: string): boolean | null {
  // Formulir yang mencetak kedua pilihan ("Laik Pakai / Tidak Laik Pakai") tidak bisa disimpulkan dari teks.
  if (/laik\s*pakai\s*[/|]\s*tidak\s*laik|tidak\s*laik\s*(?:pakai)?\s*[/|]\s*laik/i.test(teks)) return null;
  if (/tidak\s+laik|tidak\s+layak\s+pakai|tidak\s+memenuhi(?:\s+(?:syarat|persyaratan))?|tidak\s+lulus|not\s+(?:fit|pass(?:ed)?|comply|acceptable)|\bfail(?:ed)?\b/i.test(teks)) return false;
  if (/laik\s+pakai|\blaik\b|layak\s+pakai|memenuhi\s+(?:syarat|persyaratan)|lulus\s+uji|\bpass(?:ed)?\b|fit\s+for\s+use/i.test(teks)) return true;
  return null;
}

/** Jenis dokumen: judul "Sertifikat/Laporan Hasil Pengujian" / "Test Report" vs "Sertifikat Kalibrasi" / "Calibration Certificate". */
function cariJenis(teks: string): "Kalibrasi" | "Pengujian" | null {
  const uji = /(sertifikat|laporan|lembar)\s+(hasil\s+)?pengujian|hasil\s+uji\s+(?:fungsi|keselamatan)|\btest\s+report\b/i.test(teks);
  const kal = /sertifikat\s+kalibrasi|calibration\s+certificate|certificate\s+of\s+calibration|laporan\s+(hasil\s+)?kalibrasi/i.test(teks);
  if (uji && !kal) return "Pengujian";
  if (kal && !uji) return "Kalibrasi";
  return null;
}

export function saranDariTeks(teks: string): SaranKalibrasi {
  const semua = cariTanggal(teks);
  let tanggal = tanggalSetelahLabel(teks, LABEL_TANGGAL, semua, false);
  let berlakuSampai = tanggalSetelahLabel(teks, LABEL_BERLAKU, semua, true);
  if (!tanggal) {
    const unik = [...new Set(semua.map((t) => t.iso))].filter((t) => t !== berlakuSampai).sort();
    // Tanpa label: hanya disimpulkan bila jelas — satu tanggal saja, atau sepasang tanggal berjarak ±1 tahun.
    if (unik.length === 1) tanggal = unik[0];
    else if (unik.length === 2 && !berlakuSampai) {
      const selisih = (Date.parse(unik[1]) - Date.parse(unik[0])) / 86_400_000;
      if (selisih >= 300 && selisih <= 400) { tanggal = unik[0]; berlakuSampai = unik[1]; }
    }
  }
  if (tanggal && berlakuSampai && berlakuSampai <= tanggal) berlakuSampai = null;
  if (tanggal && tanggal > isoTanggal(new Date(Date.now() + 86_400_000))) tanggal = null; // tanggal kalibrasi tidak mungkin di masa depan
  return { tanggal, berlakuSampai, nomorSertifikat: cariNomor(teks), kalibrator: cariLembaga(teks), laik: cariLaik(teks), jenis: cariJenis(teks) };
}

/** Teks dinormalisasi: huruf besar, selain huruf/angka jadi spasi tunggal, diapit spasi (pencocokan per kata utuh). */
const norm = (s: string) => ` ${s.toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim()} `;
/** Pengenal cukup khas untuk dicocokkan (hindari "014", "03", "2026"). */
function khas(n: string): boolean {
  const padat = n.replace(/ /g, "");
  if (padat.length < 5) return false;
  if (/^\d+$/.test(padat)) return padat.length >= 6 && !/^(19|20)\d{2}$/.test(padat);
  return true;
}
/** Segmen terpanjang pengenal (mis. "(21)X19E161595" → "X19E161595"); hanya dipakai bila cukup panjang. */
function segmenKhas(n: string): string | null {
  const seg = n.trim().split(" ").sort((x, y) => y.length - x.length)[0] ?? "";
  return seg.length >= 7 && /\d/.test(seg) && ` ${seg} ` !== n ? ` ${seg} ` : null;
}

/** Alat yang nomor seri / kode / no. aset-nya tercantum di teks sertifikat atau nama berkas (maks. 300). */
export function cocokkanAlat(teks: string, namaBerkas: string, daftar: AlatUntukCocok[]): AlatCocok[] {
  const t = norm(teks), b = norm(namaBerkas.replace(/\.[a-z0-9]+$/i, ""));
  type Calon = { id: number; n: string; via: Exclude<AlatCocok["via"], "nama berkas">; segmen: boolean };
  const calon: Calon[] = [];
  for (const a of daftar) {
    for (const [nilai, via] of [[a.nomorSeri, "nomor seri"], [a.kode, "kode"], [a.noUrutAset, "no. aset"]] as const) {
      if (!nilai) continue;
      const n = norm(nilai);
      if (khas(n)) calon.push({ id: a.id, n, via, segmen: false });
      const seg = segmenKhas(n);
      if (seg) calon.push({ id: a.id, n: seg, via, segmen: true });
    }
  }
  // Segmen (potongan pengenal) hanya sah bila milik SATU alat — "SP2009" dari "SP2009-00102" dipakai banyak alat.
  const pemilik = new Map<string, Set<number>>();
  for (const c of calon) pemilik.set(c.n, (pemilik.get(c.n) ?? new Set()).add(c.id));
  const hasil = new Map<number, AlatCocok["via"]>();
  for (const c of calon) {
    if (hasil.has(c.id) || (c.segmen && pemilik.get(c.n)!.size > 1)) continue;
    if (t.length > 2 && t.includes(c.n)) hasil.set(c.id, c.via);
    else if (b.includes(c.n)) hasil.set(c.id, "nama berkas");
    if (hasil.size >= 300) break;
  }
  return [...hasil].map(([id, via]) => ({ id, via }));
}

/** Teks PDF (semua halaman, maks. 60). null bila bukan PDF berteks / terenkripsi / rusak. */
export async function teksPdf(buf: Buffer): Promise<string | null> {
  try {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    if (pdf.numPages > 60) return null;
    const { text } = await extractText(pdf, { mergePages: true });
    const t = text.replace(/\u0000/g, "").trim();
    return t.length >= 20 ? t : null;
  } catch {
    return null;
  }
}
