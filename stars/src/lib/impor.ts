/**
 * Pembacaan dan validasi berkas Excel template STARS (murni, tanpa akses basis data).
 * Dipakai oleh /api/admin/impor. Aturan validasi dijelaskan di sheet "petunjuk" pada template.
 */
import * as XLSX from "xlsx";
import { TAHAP_URUT } from "./filter";
import { cocokkanUnit } from "./unit-kerja";

export const JENIS = ["Pemeliharaan", "Pengadaan"] as const;
export const TAHAP_KODE: Record<string, string> = { Ranwal: "RW", Penetapan: "PN", Pergeseran: "PG", Perubahan: "PB", "Perubahan II": "PB2" };

/** Kolom template (urutan sama dengan hasil ekspor sehingga siklus unduh → edit → unggah mulus). */
export const KOLOM_TEMPLATE = [
  "kode", "tahun", "tahap", "jenis", "sumber_dana", "nama_rekening", "nama_paket", "uraian", "unit_kerja", "lokasi_asli",
  "kode_barang", "vol1", "satuan1", "vol2", "satuan2", "harga_satuan", "nilai", "serapan", "prioritas", "kategori", "keterangan", "link_harga",
] as const;
export type KolomTemplate = (typeof KOLOM_TEMPLATE)[number];

/** Nama header lain yang diterima → kolom template. */
const ALIAS_KOLOM: Record<string, KolomTemplate> = {
  kode_paket: "kode", no_paket: "kode",
  tahun_anggaran: "tahun", ta: "tahun",
  tahap_anggaran: "tahap",
  sumber_anggaran: "sumber_dana", sumber: "sumber_dana",
  rekening: "nama_rekening", nama_rek: "nama_rekening",
  barang_jasa: "nama_paket", nama_barang_jasa: "nama_paket", nama_komponen: "nama_paket", komponen: "nama_paket", paket: "nama_paket", nama_pekerjaan: "nama_paket",
  uraian_pemeliharaan: "uraian", rincian: "uraian",
  unit: "unit_kerja", nama_unit_kerja: "unit_kerja", nama_unit: "unit_kerja", lokasi: "unit_kerja", lokasi_barang: "unit_kerja",
  vol_1: "vol1", volume_1: "vol1", volume: "vol1", vol_2: "vol2", volume_2: "vol2",
  satuan_1: "satuan1", satuan: "satuan1", satuan_2: "satuan2",
  satuan_rp: "harga_satuan", harga: "harga_satuan", harga_satuan_rp: "harga_satuan",
  jumlah_rp: "nilai", jumlah: "nilai", total: "nilai", total_rp: "nilai", nilai_rp: "nilai",
  terserap: "serapan", realisasi: "serapan",
  ket: "keterangan", link: "link_harga", link_e_katalog: "link_harga",
};

export type BarisImpor = {
  baris: number; // nomor baris Excel (header = 1)
  kode: string | null; tahun: number; tahap: string; jenis: string; sumberDana: string; namaRekening: string; namaPaket: string;
  uraian: string | null; unitKerja: string; lokasiAsli: string | null; kodeBarang: string | null; vol1: number; satuan1: string | null;
  vol2: number; satuan2: string | null; hargaSatuan: number; nilai: number; serapan: boolean; prioritas: string | null; kategori: string;
  keterangan: string | null; linkHarga: string | null;
};
export type Masalah = { baris: number; kolom: string; pesan: string };
export type HasilValidasi = {
  sheet: string; totalBaris: number; valid: BarisImpor[]; errors: Masalah[]; warnings: Masalah[]; totalNilai: number;
  kolomDikenali: string[]; kolomTidakDikenali: string[];
};

const normHeader = (h: string) => h.toString().trim().toLowerCase().replace(/\(.*?\)/g, " ").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
const teks = (v: unknown) => (v === null || v === undefined ? "" : String(v).replace(/\s+/g, " ").trim());
const opsional = (v: unknown) => teks(v) || null;

/**
 * Mengubah teks rupiah menjadi angka. Mengenali format Indonesia dan Inggris:
 * "Rp 1.234.567" → 1234567 ; "1.234.567,50" → 1234567.5 ; "1,234,567.50" → 1234567.5 ; 1234 → 1234 ; "" → null ; "abc" → NaN
 */
export function keAngka(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return NaN;
  let s = String(v).replace(/rp/gi, "").replace(/\s/g, "");
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, "").replace(",", "."); // 1.234.567 atau 1.234.567,50 (Indonesia)
  else if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, ""); // 1,234,567.50 (Inggris)
  else if (/^-?\d+,\d{1,2}$/.test(s)) s = s.replace(",", "."); // 1234,5
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

export function keBoolean(v: unknown): boolean | null {
  if (typeof v === "boolean") return v;
  const s = teks(v).toLowerCase();
  if (!s) return null;
  if (["ya", "y", "true", "1", "terserap", "sudah", "v", "✓", "x"].includes(s)) return true;
  if (["tidak", "t", "false", "0", "belum", "-", "direncanakan"].includes(s)) return false;
  return null;
}

/** Kategori otomatis bila kolom kategori kosong (aturan sama dengan scripts/konversi-rkpbu.py). */
export function tebakKategori(rekening: string, uraian: string, paket: string) {
  const t = `${rekening} ${uraian} ${paket}`.toLowerCase();
  if (/kalibrasi|pengujian/.test(t)) return "Pengujian & Kalibrasi";
  if (/sarana|prasarana|gedung|bangunan/.test(t)) return "Sarana & Prasarana";
  if (/suku cadang|sparepart|spare part|aksesoris|accessories/.test(t)) return "Suku Cadang & Aksesori";
  if (/kontrak servis|service contract|kso/.test(t)) return "Kontrak Servis";
  if (/perbaikan|servis|service|jasa pemeliharaan/.test(t)) return "Jasa Perbaikan & Servis";
  if (/modal|pengadaan/.test(t)) return "Belanja Modal Alkes";
  if (/pemeliharaan alat|alat kedokteran|alat kesehatan|ipm/.test(t)) return "Pemeliharaan Alat Kesehatan";
  return "Pemeliharaan Lainnya";
}

/** Membaca sheet "paket" (atau sheet pertama) menjadi baris objek dengan header yang sudah dinormalkan. */
export function bacaExcel(buffer: ArrayBuffer | Buffer) {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const namaSheet = wb.SheetNames.find((n) => n.toLowerCase() === "paket") ?? wb.SheetNames[0];
  if (!namaSheet) throw new Error("Berkas tidak memiliki sheet.");
  const ws = wb.Sheets[namaSheet];
  const mentah = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null, raw: true });
  const petaKolom = new Map<string, KolomTemplate>();
  const tidakDikenali: string[] = [];
  for (const h of Object.keys(mentah[0] ?? {})) {
    const n = normHeader(h);
    const k = (KOLOM_TEMPLATE as readonly string[]).includes(n) ? (n as KolomTemplate) : ALIAS_KOLOM[n];
    if (k && !petaKolom.has(h) && ![...petaKolom.values()].includes(k)) petaKolom.set(h, k);
    else if (!k && !/^__empty/i.test(h)) tidakDikenali.push(h);
  }
  const baris = mentah.map((r) => {
    const o: Partial<Record<KolomTemplate, unknown>> = {};
    for (const [h, k] of petaKolom) o[k] = r[h];
    return o;
  });
  return { sheet: namaSheet, baris, kolomDikenali: [...new Set(petaKolom.values())], kolomTidakDikenali: tidakDikenali };
}

/**
 * Validasi baris. `daftarUnit` = nama unit dari basis data.
 * Baris dengan error tidak masuk `valid`; peringatan tidak menghalangi penyimpanan.
 */
export function validasi(baris: Partial<Record<KolomTemplate, unknown>>[], daftarUnit: readonly string[], info: Omit<HasilValidasi, "valid" | "errors" | "warnings" | "totalNilai" | "totalBaris">): HasilValidasi {
  const errors: Masalah[] = [];
  const warnings: Masalah[] = [];
  const valid: BarisImpor[] = [];
  const kodeTerpakai = new Map<string, number>();
  const wajib: KolomTemplate[] = ["tahun", "tahap", "nama_paket", "unit_kerja", "nilai"];
  const hilang = wajib.filter((k) => !info.kolomDikenali.includes(k));
  if (hilang.length) {
    errors.push({ baris: 0, kolom: hilang.join(", "), pesan: `Kolom wajib tidak ditemukan di header: ${hilang.join(", ")}. Unduh template untuk melihat format yang benar.` });
    return { ...info, totalBaris: baris.length, valid, errors, warnings, totalNilai: 0 };
  }

  baris.forEach((r, i) => {
    const no = i + 2; // baris Excel (header di baris 1)
    const semuaKosong = Object.values(r).every((v) => v === null || v === undefined || teks(v) === "");
    if (semuaKosong) return;
    const e = (kolom: string, pesan: string) => errors.push({ baris: no, kolom, pesan });
    const w = (kolom: string, pesan: string) => warnings.push({ baris: no, kolom, pesan });
    const errSebelum = errors.length;

    const tahun = keAngka(r.tahun);
    if (tahun === null || Number.isNaN(tahun) || !Number.isInteger(tahun) || tahun < 2000 || tahun > 2100) e("tahun", `Tahun harus 4 digit (2000–2100), ditemukan "${teks(r.tahun)}"`);

    const tahapTeks = teks(r.tahap);
    const tahap = TAHAP_URUT.find((t) => t.toLowerCase() === tahapTeks.toLowerCase().replace(/\s+/g, " "));
    if (!tahap) e("tahap", `Tahap harus salah satu dari: ${TAHAP_URUT.join(", ")}; ditemukan "${tahapTeks}"`);

    const jenisTeks = teks(r.jenis);
    const jenis = jenisTeks ? JENIS.find((j) => j.toLowerCase() === jenisTeks.toLowerCase() || (jenisTeks.toLowerCase().startsWith("modal") && j === "Pengadaan")) : "Pemeliharaan";
    if (!jenis) e("jenis", `Jenis harus Pemeliharaan atau Pengadaan; ditemukan "${jenisTeks}"`);

    const namaPaket = teks(r.nama_paket);
    if (!namaPaket) e("nama_paket", "Nama komponen kosong");

    const unitTeks = teks(r.unit_kerja);
    const cocok = cocokkanUnit(unitTeks, daftarUnit);
    if (!cocok) e("unit_kerja", `Unit kerja "${unitTeks}" tidak dikenal. Gunakan salah satu dari 28 unit pada sheet "unit_kerja" template.`);
    else if (!cocok.tepat) w("unit_kerja", `"${unitTeks}" dipetakan ke unit ${cocok.unit}`);

    const vol1 = keAngka(r.vol1) ?? 1, vol2 = keAngka(r.vol2) ?? 1;
    if (Number.isNaN(vol1) || vol1 < 0) e("vol1", `Vol 1 bukan angka: "${teks(r.vol1)}"`);
    if (Number.isNaN(vol2) || vol2 < 0) e("vol2", `Vol 2 bukan angka: "${teks(r.vol2)}"`);

    let harga = keAngka(r.harga_satuan);
    let nilai = keAngka(r.nilai);
    if (nilai !== null && (Number.isNaN(nilai) || nilai < 0)) e("nilai", `Nilai bukan angka ≥ 0: "${teks(r.nilai)}"`);
    if (harga !== null && (Number.isNaN(harga) || harga < 0)) e("harga_satuan", `Harga satuan bukan angka ≥ 0: "${teks(r.harga_satuan)}"`);
    const volOk = !Number.isNaN(vol1) && !Number.isNaN(vol2);
    if ((nilai === null || Number.isNaN(nilai)) && harga !== null && !Number.isNaN(harga) && volOk) {
      nilai = vol1 * vol2 * harga; w("nilai", `Nilai kosong, dihitung dari vol1 × vol2 × harga satuan = ${nilai}`);
    } else if (nilai === null) e("nilai", "Nilai kosong dan tidak bisa dihitung (harga satuan juga kosong)");
    if ((harga === null || Number.isNaN(harga)) && nilai !== null && !Number.isNaN(nilai) && volOk) {
      harga = vol1 * vol2 ? nilai / (vol1 * vol2) : nilai;
    } else if (harga !== null && nilai !== null && volOk && !Number.isNaN(harga) && !Number.isNaN(nilai) && harga > 0 && nilai > 0) {
      // Di kertas kerja RS, harga satuan sering belum termasuk PPN (11–12 %) sedangkan nilai sudah → rasio 1,00–1,13 dianggap wajar.
      const rasio = nilai / (vol1 * vol2 * harga);
      if (rasio < 0.99 || rasio > 1.13) w("nilai", `Nilai (${nilai}) tidak sesuai vol1 × vol2 × harga satuan (${vol1 * vol2 * harga}), selisih bukan PPN; kolom "nilai" yang dipakai`);
    }

    let serapan = keBoolean(r.serapan);
    if (serapan === null) {
      if (teks(r.serapan)) w("serapan", `Serapan "${teks(r.serapan)}" tidak dikenali, dianggap Tidak`);
      serapan = false;
    }

    const kode = opsional(r.kode);
    if (kode) {
      const dup = kodeTerpakai.get(kode);
      if (dup) e("kode", `Kode ${kode} juga dipakai di baris ${dup}`);
      kodeTerpakai.set(kode, no);
    }

    if (errors.length > errSebelum) return;
    const namaRekening = teks(r.nama_rekening);
    const uraian = opsional(r.uraian);
    valid.push({
      baris: no, kode, tahun: tahun as number, tahap: tahap as string, jenis: jenis as string, sumberDana: teks(r.sumber_dana) || "BLUD",
      namaRekening: namaRekening || "-", namaPaket, uraian, unitKerja: cocok!.unit,
      lokasiAsli: opsional(r.lokasi_asli) ?? (cocok!.tepat ? null : unitTeks), kodeBarang: opsional(r.kode_barang),
      vol1: vol1 || 1, satuan1: opsional(r.satuan1), vol2: vol2 || 1, satuan2: opsional(r.satuan2),
      hargaSatuan: Math.round((harga as number) * 100) / 100, nilai: Math.round((nilai as number) * 100) / 100, serapan,
      prioritas: opsional(r.prioritas), kategori: teks(r.kategori) || tebakKategori(namaRekening, uraian ?? "", namaPaket),
      keterangan: opsional(r.keterangan), linkHarga: opsional(r.link_harga),
    });
  });

  return { ...info, totalBaris: baris.length, valid, errors, warnings, totalNilai: valid.reduce((a, b) => a + b.nilai, 0) };
}
