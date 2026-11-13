/**
 * HTA (Health Technology Assessment) — perbandingan produk alat kesehatan ala versus.com.
 * Aman untuk browser: tipe, domain penilaian, format nilai, dan perhitungan skor/keunggulan.
 *
 * Skor (0–100) per produk = rata-rata berbobot skor domain; skor domain = rata-rata skor kriteria
 * yang datanya ADA untuk SEMUA produk yang dibandingkan (agar adil: data kosong tidak dihitung sebagai kalah/menang).
 * Skor kriteria: "lebih tinggi lebih baik" → nilai ÷ nilai terbaik; "lebih rendah lebih baik" → (terbaik + c) ÷ (nilai + c),
 * c = 10 % nilai terbesar (peredam agar 0 vs 0,1 tidak dianggap berbeda ekstrem); ya/tidak → 1/0.
 */

export type Arah = "tinggi" | "rendah" | null;
export type Domain = "keselamatan" | "keandalan" | "ekonomi" | "teknis" | "dukungan" | "umum";
export type FormatNilai = "rupiah" | "persen" | "angka" | "ya-tidak" | "teks";
export type NilaiAtribut = number | boolean | string | null;

export type Atribut = {
  id: string; label: string; domain: Domain; nilai: NilaiAtribut; arah: Arah;
  format: FormatNilai; satuan?: string; desimal?: number;
  /** Arti "lebih baik", mis. "lebih jarang dilaporkan rusak". */
  frasa?: string;
  /** Keterangan sumber/cara hitung (tooltip). */
  ket?: string;
};

export type SubjekHta = {
  id: string; kunci: string; judul: string; nama: string; merek: string | null; model: string | null;
  foto: string | null; unit: number; produkId: number | null; kandidat: boolean;
  tautan: string | null; catatan: string | null; diperbarui: string | null;
  atribut: Atribut[];
};

export type SubjekRingkas = Pick<SubjekHta, "id" | "judul" | "nama" | "merek" | "model" | "unit" | "kandidat" | "produkId"> & { fotoKecil: string | null; jenis: string };

export const DOMAIN_HTA: { id: Exclude<Domain, "umum">; label: string; ket: string; bobot: number }[] = [
  { id: "keselamatan", label: "Keselamatan & Mutu", ket: "Hasil uji/kalibrasi laik, kalibrasi berlaku, izin edar AKL/AKD", bobot: 3 },
  { id: "keandalan", label: "Keandalan", ket: "Frekuensi kerusakan, lama perbaikan, kondisi unit di RS", bobot: 3 },
  { id: "ekonomi", label: "Ekonomi", ket: "Harga per unit, biaya pemeliharaan & perbaikan, garansi, umur teknis", bobot: 2 },
  { id: "teknis", label: "Spesifikasi Teknis", ket: "Parameter teknis yang diisi tim (mis. baterai, akurasi, berat)", bobot: 2 },
  { id: "dukungan", label: "Dukungan & Kebijakan", ket: "Kelengkapan dokumen, user/service manual, TKDN", bobot: 1 },
];
export const LABEL_DOMAIN: Record<Domain, string> = { ...Object.fromEntries(DOMAIN_HTA.map((d) => [d.id, d.label])), umum: "Informasi Umum" } as Record<Domain, string>;
export type Bobot = Record<Exclude<Domain, "umum">, number>;
export const BOBOT_BAWAAN: Bobot = Object.fromEntries(DOMAIN_HTA.map((d) => [d.id, d.bobot])) as Bobot;

/** Warna identitas produk A/B/C (lolos uji palet buta warna; selalu disertai huruf & nama). */
export const WARNA_PRODUK = ["#14A0A8", "#6250d6", "#eb6834"] as const;
export const HURUF_PRODUK = ["A", "B", "C"] as const;
export const MAKS_BANDING = 3;

const angkaId = (n: number, desimal = 0) => n.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: desimal });

export function formatNilai(a: Pick<Atribut, "format" | "satuan" | "desimal">, v: NilaiAtribut): string {
  if (v === null || v === "") return "—";
  if (typeof v === "boolean") return v ? "Ya" : "Tidak";
  if (typeof v === "string") return v;
  switch (a.format) {
    case "rupiah": return `Rp ${angkaId(Math.round(v))}`;
    case "persen": return `${angkaId(v, a.desimal ?? 0)}%`;
    default: return `${angkaId(v, a.desimal ?? 1)}${a.satuan ? ` ${a.satuan}` : ""}`;
  }
}

/** Baca angka gaya Indonesia/Inggris: "1.200,5" → 1200.5; "2,5" → 2.5; "1200" → 1200; teks lain → null. */
export function bacaAngka(s: string): number | null {
  const t = s.trim().replace(/\s+/g, "");
  if (!/^-?[\d.,]+$/.test(t)) return null;
  let x = t;
  if (x.includes(".") && x.includes(",")) x = x.replace(/\./g, "").replace(",", ".");
  else if (x.includes(",")) x = x.replace(",", ".");
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(x)) x = x.replace(/\./g, "");
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

export type BarisBanding = {
  id: string; label: string; domain: Domain; format: FormatNilai; satuan?: string; desimal?: number; arah: Arah; frasa?: string; ket?: string;
  nilai: NilaiAtribut[];
  /** Skor 0–1 per produk (null bila tidak dibandingkan/tidak ada data). */
  skor: (number | null)[];
  /** Indeks produk terbaik (kosong bila seri/tak dibandingkan). */
  terbaik: number[];
  /** true bila semua produk punya data → ikut skor total. */
  lengkap: boolean;
  /** Nilai relatif 0–1 untuk panjang batang (nilai ÷ nilai terbesar). */
  batang: (number | null)[];
};

export type Fakta = { id: string; domain: Domain; judul: string; teks: string; detail: string };

export type HasilBanding = {
  baris: BarisBanding[];
  skor: (number | null)[];
  skorDomain: Record<Exclude<Domain, "umum">, (number | null)[]>;
  kriteriaDipakai: number;
  fakta: Fakta[][];
};

const dapatDibanding = (v: NilaiAtribut): v is number | boolean => typeof v === "number" || typeof v === "boolean";

function rasioTeks(a: number, b: number, arah: Exclude<Arah, null>): string {
  const [besar, kecil] = arah === "tinggi" ? [a, b] : [b, a];
  if (kecil <= 0) return "";
  const r = besar / kecil;
  if (r >= 1.95) return `${angkaId(r, 1)}x`;
  const p = Math.round((r - 1) * 100);
  return p >= 1 ? `${p}%` : "";
}

/** Gabungkan atribut semua produk (urutan kemunculan pertama) lalu hitung skor & keunggulan. */
export function bandingkan(subjek: SubjekHta[], bobot: Bobot = BOBOT_BAWAAN): HasilBanding {
  const n = subjek.length;
  const urut: Atribut[] = [];
  const peta = new Map<string, Atribut[]>();
  subjek.forEach((s, i) => {
    for (const a of s.atribut) {
      if (!peta.has(a.id)) { peta.set(a.id, Array(n).fill(null)); urut.push(a); }
      peta.get(a.id)![i] = a;
    }
  });

  const baris: BarisBanding[] = urut.map((contoh) => {
    const per = peta.get(contoh.id)!;
    const nilai = per.map((a) => a?.nilai ?? null);
    const arah: Arah = per.find((a) => a?.arah)?.arah ?? contoh.arah;
    const isi = nilai.map((v, i) => ({ v, i })).filter((x) => dapatDibanding(x.v)) as { v: number | boolean; i: number }[];
    const skor: (number | null)[] = Array(n).fill(null);
    let terbaik: number[] = [];
    const angka = isi.map((x) => (typeof x.v === "boolean" ? (x.v ? 1 : 0) : x.v));
    const maks = angka.length ? Math.max(...angka.map(Math.abs)) : 0;
    const batang = nilai.map((v) => (typeof v === "number" ? (maks > 0 ? Math.abs(v) / maks : 0) : typeof v === "boolean" ? (v ? 1 : 0) : null));
    if (arah && n >= 2 && isi.length >= 2) {
      const best = arah === "tinggi" ? Math.max(...angka) : Math.min(...angka);
      const c = arah === "rendah" ? Math.max(maks * 0.1, 1e-9) : 0;
      isi.forEach((x, k) => {
        const v = angka[k];
        skor[x.i] = arah === "tinggi" ? (best > 0 ? Math.max(v, 0) / best : 1) : (best + c) / (v + c);
      });
      if (angka.some((v) => v !== best)) terbaik = isi.filter((_, k) => angka[k] === best).map((x) => x.i);
    }
    return {
      id: contoh.id, label: contoh.label, domain: contoh.domain, format: contoh.format, satuan: contoh.satuan, desimal: contoh.desimal,
      arah, frasa: per.find((a) => a?.frasa)?.frasa ?? contoh.frasa, ket: contoh.ket,
      nilai, skor, terbaik, lengkap: Boolean(arah) && n >= 2 && isi.length === n, batang,
    };
  });

  const skorDomain = Object.fromEntries(DOMAIN_HTA.map((d) => {
    const b = baris.filter((r) => r.domain === d.id && r.lengkap);
    return [d.id, Array.from({ length: n }, (_, i) => (b.length ? b.reduce((a, r) => a + (r.skor[i] ?? 0), 0) / b.length : null))];
  })) as HasilBanding["skorDomain"];

  const skor = Array.from({ length: n }, (_, i) => {
    let jum = 0, w = 0;
    for (const d of DOMAIN_HTA) {
      const s = skorDomain[d.id][i];
      if (s === null || !bobot[d.id]) continue;
      jum += s * bobot[d.id]; w += bobot[d.id];
    }
    return n >= 2 && w > 0 ? Math.round((jum / w) * 100) : null;
  });

  const fakta: Fakta[][] = subjek.map(() => []);
  for (const r of baris) {
    if (r.terbaik.length !== 1 || !r.arah) continue;
    const i = r.terbaik[0];
    const lain = r.nilai.map((v, k) => ({ v, k })).filter((x) => x.k !== i && dapatDibanding(x.v));
    if (!lain.length) continue;
    const v = r.nilai[i] as number | boolean;
    // pembanding = produk lain yang paling dekat (terbaik kedua)
    const pemb = lain.reduce((a, b) => {
      const na = typeof a.v === "boolean" ? Number(a.v) : (a.v as number);
      const nb = typeof b.v === "boolean" ? Number(b.v) : (b.v as number);
      return (r.arah === "tinggi" ? nb > na : nb < na) ? b : a;
    });
    const fmt = (x: NilaiAtribut) => formatNilai(r, x);
    const judul = typeof v === "number" && typeof pemb.v === "number" ? rasioTeks(v, pemb.v, r.arah) : "";
    fakta[i].push({
      id: r.id, domain: r.domain, judul, teks: r.frasa ?? (r.arah === "tinggi" ? `${r.label} lebih tinggi` : `${r.label} lebih rendah`),
      detail: lain.length === 1 ? `${fmt(v)} vs ${fmt(pemb.v)}` : `${fmt(v)} vs ${lain.map((x) => fmt(x.v)).join(" / ")}`,
    });
  }
  // urutkan fakta: domain berbobot besar dulu
  for (const f of fakta) f.sort((a, b) => (bobot[b.domain as keyof Bobot] ?? 0) - (bobot[a.domain as keyof Bobot] ?? 0));

  return { baris, skor, skorDomain, kriteriaDipakai: baris.filter((r) => r.lengkap).length, fakta };
}

/** Spesifikasi teknis yang diisi tim HTA. */
export type Spesifikasi = { parameter: string; nilai: string; satuan: string; arah: "tinggi" | "rendah" | "-" };
export const MAKS_SPESIFIKASI = 60;
export const normTeks = (s: string | null | undefined) => (s ?? "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

/** Teks kunci tanpa spasi/tanda baca: "SK-600II", "SK 600 II", "sk600ii" → "sk600ii". */
const normKunci = (s: string | null | undefined) => normTeks(s).replace(/ /g, "");

/** Kunci produk: merek + tipe/model bila ada model, selain itu jenis alat + merek. Dipakai bersama inventaris & ProdukHta. */
export function kunciProduk(nama: string | null | undefined, merek: string | null | undefined, model: string | null | undefined) {
  const m = normKunci(model);
  return m ? `${normKunci(merek)}|${m}` : `${normKunci(nama)}|${normKunci(merek)}`;
}

export const judulProduk = (nama: string, merek: string | null, model: string | null) => [merek, model].filter(Boolean).join(" ").trim() || nama;
