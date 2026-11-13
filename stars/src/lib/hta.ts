/**
 * Data HTA (server): menyatukan model alat di Inventaris (kelompok merek + tipe) dengan data ProdukHta
 * (harga, garansi, spesifikasi) lalu menghitung kriteria penilaian dari data operasional STARS.
 */
import { createHash } from "node:crypto";
import { prisma } from "./prisma";
import { statusKalibrasi } from "./kalibrasi";
import { JUMLAH_SLOT_DOKUMEN, urlFotoAlat } from "./dokumen-alat";
import { bacaAngka, judulProduk, kunciProduk, normTeks, type Atribut, type Spesifikasi, type SubjekHta, type SubjekRingkas } from "./hta-banding";

/** Jendela pengamatan kerusakan & biaya. */
export const JENDELA_BULAN = 24;
export const idSubjek = (kunci: string) => `h${createHash("sha1").update(kunci).digest("hex").slice(0, 12)}`;

type AlatKelompok = { id: number; nama: string; merek: string | null; model: string | null; foto: string | null };
type Kelompok = { kunci: string; nama: string; merek: string | null; model: string | null; alat: AlatKelompok[]; foto: string | null };

const terbanyak = (xs: (string | null)[]) => {
  const m = new Map<string, number>();
  for (const x of xs) if (x?.trim()) m.set(x.trim(), (m.get(x.trim()) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
};

/** Semua kelompok model alat aktif (opsional: hanya unit kerja tertentu). */
async function kelompokInventaris(unitId?: number | null) {
  const alat = await prisma.alat.findMany({
    where: { aktif: true, ...(unitId ? { unitKerjaId: unitId } : {}) },
    select: { id: true, nama: true, merek: true, model: true, foto: true },
  });
  const peta = new Map<string, Kelompok>();
  for (const a of alat) {
    const k = kunciProduk(a.nama, a.merek, a.model);
    const g = peta.get(k) ?? { kunci: k, nama: a.nama, merek: a.merek, model: a.model, alat: [], foto: null };
    g.alat.push(a);
    peta.set(k, g);
  }
  for (const g of peta.values()) {
    g.nama = terbanyak(g.alat.map((a) => a.nama)) ?? g.nama;
    g.merek = terbanyak(g.alat.map((a) => a.merek));
    g.model = terbanyak(g.alat.map((a) => a.model));
    g.foto = g.alat.find((a) => a.foto)?.foto ?? null;
  }
  return peta;
}

type ProdukBaris = Awaited<ReturnType<typeof prisma.produkHta.findMany>>[number];

function ringkas(kunci: string, g: Kelompok | undefined, p: ProdukBaris | undefined): SubjekRingkas {
  const nama = p?.nama ?? g!.nama;
  const merek = p?.merek ?? g?.merek ?? null;
  const model = p?.model ?? g?.model ?? null;
  return {
    id: idSubjek(kunci), judul: judulProduk(nama, merek, model), nama, merek, model, jenis: nama,
    unit: g?.alat.length ?? 0, kandidat: !g, produkId: p?.id ?? null, fotoKecil: urlFotoAlat(p?.foto ?? g?.foto, true),
  };
}

/** Daftar semua produk yang bisa dibandingkan (model di inventaris + produk kandidat). */
export async function daftarSubjek(unitId?: number | null): Promise<SubjekRingkas[]> {
  const [peta, produk] = await Promise.all([kelompokInventaris(unitId), prisma.produkHta.findMany()]);
  const pp = new Map(produk.map((p) => [p.kunci, p]));
  const kunci = new Set([...peta.keys(), ...pp.keys()]);
  return [...kunci].map((k) => ringkas(k, peta.get(k), pp.get(k))).sort((a, b) => b.unit - a.unit || a.judul.localeCompare(b.judul, "id"));
}

/** Cari produk: setiap kata harus cocok dengan jenis/merek/tipe. */
export function saringSubjek(semua: SubjekRingkas[], q: string, maks = 20) {
  const kata = normTeks(q).split(" ").filter(Boolean);
  if (!kata.length) return [];
  const cocok = semua.filter((s) => { const t = normTeks(`${s.nama} ${s.merek ?? ""} ${s.model ?? ""}`); return kata.every((k) => t.includes(k)); });
  const awal = normTeks(q);
  return cocok.sort((a, b) => Number(normTeks(b.judul).startsWith(awal)) - Number(normTeks(a.judul).startsWith(awal)) || b.unit - a.unit).slice(0, maks);
}

/** Kelompok per jenis alat (untuk kartu kategori & saran perbandingan). */
export function kelompokJenis(semua: SubjekRingkas[]) {
  const m = new Map<string, { jenis: string; produk: SubjekRingkas[] }>();
  for (const s of semua) {
    const k = normTeks(s.nama);
    const g = m.get(k) ?? { jenis: s.nama, produk: [] };
    g.produk.push(s);
    m.set(k, g);
  }
  return [...m.values()].map((g) => ({ ...g, unit: g.produk.reduce((a, p) => a + p.unit, 0) })).sort((a, b) => b.produk.length - a.produk.length || b.unit - a.unit);
}

const rata = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const bulat = (n: number | null, d = 2) => (n === null ? null : Math.round(n * 10 ** d) / 10 ** d);

export function bacaSpesifikasi(json: string | null | undefined): Spesifikasi[] {
  if (!json) return [];
  try {
    const x = JSON.parse(json);
    return Array.isArray(x) ? x.filter((s) => s && typeof s.parameter === "string" && s.parameter.trim()).map((s) => ({
      parameter: String(s.parameter).trim(), nilai: String(s.nilai ?? "").trim(), satuan: String(s.satuan ?? "").trim(),
      arah: s.arah === "tinggi" || s.arah === "rendah" ? s.arah : "-",
    })) : [];
  } catch { return []; }
}

/** Data lengkap produk yang dibandingkan (urutan mengikuti `ids`; id tak dikenal dilewati). */
export async function muatSubjek(ids: string[], unitId?: number | null): Promise<SubjekHta[]> {
  const [peta, produk] = await Promise.all([kelompokInventaris(unitId), prisma.produkHta.findMany()]);
  const pp = new Map(produk.map((p) => [p.kunci, p]));
  const semuaKunci = new Map([...new Set([...peta.keys(), ...pp.keys()])].map((k) => [idSubjek(k), k]));
  const dipilih = [...new Set(ids)].map((id) => semuaKunci.get(id)).filter((k): k is string => Boolean(k));
  if (!dipilih.length) return [];

  const alatIds = dipilih.flatMap((k) => peta.get(k)?.alat.map((a) => a.id) ?? []);
  const sejak = new Date(Date.now() - JENDELA_BULAN * 30.44 * 86_400_000);
  const [detail, wr, wo, kal, dok] = await Promise.all([
    prisma.alat.findMany({ where: { id: { in: alatIds } }, select: { id: true, kondisi: true, tahunPerolehan: true, tahunPembelian: true, tahunPembukuan: true, hargaPerolehan: true, akl: true, kelasRisiko: true, risiko: true, produsen: true, distributor: true, usiaTeknis: true, teknologi: true } }),
    prisma.permintaanKerja.findMany({ where: { alatId: { in: alatIds }, createdAt: { gte: sejak }, status: { not: "Ditolak" } }, select: { alatId: true } }),
    prisma.perintahKerja.findMany({ where: { alatId: { in: alatIds }, createdAt: { gte: sejak }, status: { not: "Batal" } }, select: { alatId: true, jenis: true, status: true, biaya: true, permintaanId: true, tanggalMulai: true, tanggalSelesai: true, createdAt: true, permintaan: { select: { createdAt: true } } } }),
    prisma.kalibrasi.findMany({ where: { alatId: { in: alatIds } }, orderBy: [{ tanggal: "desc" }, { id: "desc" }], select: { alatId: true, laik: true, berlakuSampai: true, berkas: true } }),
    prisma.dokumenAlat.findMany({ where: { alatId: { in: alatIds } }, select: { alatId: true, jenis: true } }),
  ]);
  const tahunIni = new Date().getFullYear();
  const kini = Date.now();

  return dipilih.map((k) => {
    const g = peta.get(k);
    const p = pp.get(k);
    const ids = new Set(g?.alat.map((a) => a.id) ?? []);
    const unit = ids.size;
    const da = detail.filter((d) => ids.has(d.id));
    const nama = p?.nama ?? g!.nama;
    const merek = p?.merek ?? g?.merek ?? null;
    const model = p?.model ?? g?.model ?? null;
    const atribut: Atribut[] = [];
    const tambah = (a: Atribut) => atribut.push(a);
    const adaUnit = unit > 0;

    // ── Keselamatan & mutu
    const terbaru = new Map<number, (typeof kal)[number]>();
    for (const c of kal) if (ids.has(c.alatId) && !terbaru.has(c.alatId)) terbaru.set(c.alatId, c);
    const tercatat = [...terbaru.values()];
    tambah({ id: "laik", label: "Hasil uji/kalibrasi terakhir laik", domain: "keselamatan", format: "persen", arah: "tinggi", frasa: "lebih banyak unit lulus uji/kalibrasi (laik)",
      nilai: adaUnit && tercatat.length ? bulat((tercatat.filter((c) => c.laik).length / tercatat.length) * 100, 0) : null, ket: "Dari catatan uji/kalibrasi terakhir tiap unit (menu Pengujian dan Kalibrasi)" });
    tambah({ id: "berlaku", label: "Unit dengan kalibrasi masih berlaku", domain: "keselamatan", format: "persen", arah: "tinggi", frasa: "lebih banyak unit dengan kalibrasi berlaku",
      nilai: adaUnit ? bulat(([...ids].filter((id) => ["berlaku", "segera", "tanpa-batas"].includes(statusKalibrasi(terbaru.get(id) ?? null, kini).kunci)).length / unit) * 100, 0) : null, ket: "Persentase seluruh unit; unit yang belum pernah dikalibrasi dihitung belum berlaku" });
    const akl = p?.akl?.trim() || terbanyak(da.map((d) => d.akl));
    tambah({ id: "akl", label: "Izin edar AKL/AKD tercatat", domain: "keselamatan", format: "ya-tidak", arah: "tinggi", frasa: "izin edar AKL/AKD tercatat", nilai: akl ? true : (p || adaUnit ? false : null), ket: akl ? `Nomor: ${akl}` : "Belum ada nomor AKL/AKD di data HTA maupun inventaris" });
    const kelas = terbanyak(da.map((d) => d.kelasRisiko ?? d.risiko));
    if (kelas) tambah({ id: "kelasRisiko", label: "Kelas risiko", domain: "umum", format: "teks", arah: null, nilai: kelas });

    // ── Keandalan
    const kejadian = wr.filter((w) => w.alatId && ids.has(w.alatId)).length + wo.filter((w) => w.alatId && ids.has(w.alatId) && w.jenis === "Korektif" && !w.permintaanId).length;
    tambah({ id: "kerusakan", label: "Laporan kerusakan per unit per tahun", domain: "keandalan", format: "angka", desimal: 2, satuan: "laporan/unit/tahun", arah: "rendah", frasa: "lebih jarang dilaporkan rusak",
      nilai: adaUnit ? bulat(kejadian / unit / (JENDELA_BULAN / 12)) : null, ket: `Laporan Kerusakan (WR) + perintah kerja korektif tanpa WR, ${JENDELA_BULAN} bulan terakhir` });
    const lama = wo.filter((w) => w.alatId && ids.has(w.alatId) && w.jenis === "Korektif" && w.status === "Selesai" && w.tanggalSelesai)
      .map((w) => (w.tanggalSelesai!.getTime() - (w.permintaan?.createdAt ?? w.tanggalMulai ?? w.createdAt).getTime()) / 86_400_000).filter((d) => d >= 0);
    tambah({ id: "lamaPerbaikan", label: "Rata-rata lama perbaikan", domain: "keandalan", format: "angka", desimal: 1, satuan: "hari", arah: "rendah", frasa: "lebih cepat selesai diperbaiki",
      nilai: bulat(rata(lama), 1), ket: "Dari laporan masuk sampai perintah kerja korektif selesai" });
    tambah({ id: "kondisiBaik", label: "Unit dalam kondisi baik", domain: "keandalan", format: "persen", arah: "tinggi", frasa: "lebih banyak unit dalam kondisi baik",
      nilai: adaUnit ? bulat((da.filter((d) => d.kondisi === "Baik").length / unit) * 100, 0) : null });
    const umur = da.map((d) => d.tahunPerolehan ?? d.tahunPembelian ?? d.tahunPembukuan).filter((t): t is number => Boolean(t) && t! > 1950 && t! <= tahunIni).map((t) => tahunIni - t);
    tambah({ id: "umur", label: "Rata-rata umur unit", domain: "umum", format: "angka", desimal: 1, satuan: "tahun", arah: null, nilai: bulat(rata(umur), 1), ket: "Dari tahun perolehan/pembelian di inventaris" });

    // ── Ekonomi
    const hargaInv = rata(da.map((d) => d.hargaPerolehan ?? 0).filter((h) => h > 0));
    tambah({ id: "harga", label: "Harga per unit", domain: "ekonomi", format: "rupiah", arah: "rendah", frasa: "lebih murah per unit",
      nilai: p?.harga ?? (hargaInv ? Math.round(hargaInv) : null), ket: p?.harga ? "Harga e-Katalog/penawaran (data HTA)" : "Rata-rata harga perolehan di inventaris" });
    const biaya = wo.filter((w) => w.alatId && ids.has(w.alatId)).reduce((a, w) => a + (w.biaya || 0), 0);
    tambah({ id: "biaya", label: "Biaya pemeliharaan & perbaikan", domain: "ekonomi", format: "rupiah", satuan: "/unit/tahun", arah: "rendah", frasa: "biaya pemeliharaan & perbaikan lebih rendah",
      nilai: adaUnit ? Math.round(biaya / unit / (JENDELA_BULAN / 12)) : null, ket: `Jumlah biaya perintah kerja (korektif & preventif) ${JENDELA_BULAN} bulan terakhir ÷ unit ÷ tahun` });
    tambah({ id: "garansi", label: "Garansi", domain: "ekonomi", format: "angka", desimal: 0, satuan: "bulan", arah: "tinggi", frasa: "garansi lebih panjang", nilai: p?.garansiBulan ?? null });
    const usia = p?.usiaTeknis ?? (Number(terbanyak(da.map((d) => (d.usiaTeknis ? String(d.usiaTeknis) : null)))) || null);
    tambah({ id: "usiaTeknis", label: "Umur teknis", domain: "ekonomi", format: "angka", desimal: 0, satuan: "tahun", arah: "tinggi", frasa: "umur teknis lebih panjang", nilai: usia });

    // ── Spesifikasi teknis (diisi tim HTA)
    for (const s of bacaSpesifikasi(p?.spesifikasi)) {
      const n = bacaAngka(s.nilai);
      const arah = s.arah === "-" || n === null ? null : s.arah;
      tambah({ id: `spek:${normTeks(s.parameter)}`, label: s.parameter, domain: "teknis", format: n === null ? "teks" : "angka", desimal: 2, satuan: s.satuan || undefined, arah,
        nilai: n ?? (s.nilai || null), frasa: arah ? `${s.parameter.toLowerCase()} lebih ${arah === "tinggi" ? "tinggi" : "rendah"}` : undefined });
    }

    // ── Dukungan & kebijakan
    const jenisDok = new Set(dok.filter((d) => ids.has(d.alatId)).map((d) => d.jenis));
    if (tercatat.some((c) => c.berkas) || kal.some((c) => ids.has(c.alatId) && c.berkas)) jenisDok.add("SERTIFIKAT_KALIBRASI");
    const slot = [...jenisDok].filter((j) => j !== "LAINNYA").length;
    tambah({ id: "dokumen", label: "Kelengkapan dokumen alat", domain: "dukungan", format: "angka", desimal: 0, satuan: `dari ${JUMLAH_SLOT_DOKUMEN} jenis`, arah: "tinggi", frasa: "dokumen alat lebih lengkap",
      nilai: adaUnit ? slot : null, ket: "Gabungan jenis dokumen pada semua unit merek & tipe ini (Kontrak, BA, AKD/AKL, manual, sertifikat, …)" });
    tambah({ id: "userManual", label: "User manual tersedia", domain: "dukungan", format: "ya-tidak", arah: "tinggi", frasa: "user manual tersedia", nilai: adaUnit ? jenisDok.has("USER_MANUAL") : null });
    tambah({ id: "serviceManual", label: "Service manual tersedia", domain: "dukungan", format: "ya-tidak", arah: "tinggi", frasa: "service manual tersedia", nilai: adaUnit ? jenisDok.has("SERVICE_MANUAL") : null });
    tambah({ id: "tkdn", label: "TKDN", domain: "dukungan", format: "persen", desimal: 2, arah: "tinggi", frasa: "TKDN lebih tinggi", nilai: p?.tkdn ?? null, ket: "Tingkat Komponen Dalam Negeri" });

    // ── Informasi umum
    tambah({ id: "unit", label: "Jumlah unit di RS", domain: "umum", format: "angka", desimal: 0, satuan: "unit", arah: null, nilai: unit });
    const produsen = terbanyak(da.map((d) => d.produsen));
    if (p?.asal || produsen) tambah({ id: "asal", label: "Produsen / negara asal", domain: "umum", format: "teks", arah: null, nilai: [produsen, p?.asal].filter(Boolean).join(" — ") });
    const penyedia = p?.penyedia?.trim() || terbanyak(da.map((d) => d.distributor));
    if (penyedia) tambah({ id: "penyedia", label: "Distributor / service center", domain: "umum", format: "teks", arah: null, nilai: penyedia });
    const tek = terbanyak(da.map((d) => d.teknologi));
    if (tek) tambah({ id: "teknologi", label: "Teknologi", domain: "umum", format: "teks", arah: null, nilai: tek });

    return {
      id: idSubjek(k), kunci: k, judul: judulProduk(nama, merek, model), nama, merek, model,
      foto: urlFotoAlat(p?.foto ?? g?.foto), unit, produkId: p?.id ?? null, kandidat: !g,
      tautan: p?.tautan ?? null, catatan: p?.catatan ?? null, diperbarui: p?.updatedAt.toISOString() ?? null, atribut,
    };
  });
}
