/**
 * Lembar kerja Pemeliharaan Alat Kesehatan — Permenkes 15/2023 Pasal 3 (5 kegiatan) dengan format IPM
 * Pedoman Pengoperasian dan Pemeliharaan Peralatan Kesehatan (Kemenkes 2021): Inspeksi Acceptance/Terjadwal,
 * status, identitas, perhatian khusus, test apparatus, qualitative tasks (pass/fail), quantitative tasks
 * (keselamatan listrik), preventive maintenance, catatan.
 */
import { createHash } from "node:crypto";
import { prisma } from "./prisma";

export const KEGIATAN = [
  { kode: "inventarisasi", huruf: "a", judul: "Inventarisasi Alat Kesehatan", ayat: "Pasal 3 ayat (2)", ket: "Pencatatan data alat kesehatan yang akan dilakukan pemeliharaan.", href: "/alat" },
  { kode: "promotif", huruf: "b", judul: "Pemeliharaan Promotif", ayat: "Pasal 3 ayat (3)", ket: "Memberikan petunjuk penggunaan atau pengoperasian alat kesehatan.", href: "/admin/lembar-kerja?kegiatan=Promotif" },
  { kode: "inspeksi", huruf: "c", judul: "Pemantauan Fungsi / Inspeksi", ayat: "Pasal 3 ayat (4)", ket: "Pemantauan fungsi setiap alat yang akan digunakan atau dioperasionalkan.", href: "/admin/lembar-kerja?kegiatan=Inspeksi" },
  { kode: "preventif", huruf: "d", judul: "Pemeliharaan Preventif", ayat: "Pasal 3 ayat (5)", ket: "Pembersihan, pelumasan, penggantian suku cadang dan aksesoris yang masa waktunya harus diganti.", href: "/admin/lembar-kerja?kegiatan=Preventif" },
  { kode: "korektif", huruf: "e", judul: "Pemeliharaan Korektif / Perbaikan", ayat: "Pasal 3 ayat (6)", ket: "Perbaikan kerusakan ringan sampai berat (overhaul).", href: "/admin/pemeliharaan" },
] as const;

export const HASIL_LK = ["Lolos", "Memerlukan pemeliharaan", "Preventable problem", "KTD"] as const;
export const JUDUL_HASIL: Record<string, string> = { Lolos: "Lolos", "Memerlukan pemeliharaan": "Memerlukan pemeliharaan", "Preventable problem": "Preventable problem", KTD: "KTD (Kejadian Tidak Diharapkan)" };

export type IsiLK = {
  apparatus: { nama: string; sn: string }[];
  kualitatif: { butir: string; hasil: "pass" | "fail" | "na" | "" }[];
  kuantitatif: { parameter: string; kriteria: string; set: string; ukur: string; hasil: "pass" | "fail" | "" }[];
  preventif: { butir: string; done: boolean }[];
};

export const baris = (t: string | null | undefined) => (t ?? "").split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
export const kuantBaris = (t: string) => baris(t).map((b) => { const [p, k] = b.split("|").map((x) => x.trim()); return { parameter: p, kriteria: k ?? "" }; });

/** Cari template paling cocok untuk nama alat inventaris (kata kunci terpanjang menang). */
export async function cocokkanTemplate(namaAlat: string) {
  const n = namaAlat.toLowerCase();
  const semua = await prisma.templateLembarKerja.findMany({ where: { aktif: true } });
  let terbaik: (typeof semua)[number] | null = null, skor = 0;
  for (const t of semua) for (const k of [t.nama, ...(t.kataKunci ?? "").split(",")].map((x) => x.trim().toLowerCase()).filter((x) => x.length >= 3)) {
    const cocok = k.length <= 4 ? new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(n) : n.includes(k);
    if (cocok && k.length > skor) { terbaik = t; skor = k.length; }
  }
  return terbaik;
}

export async function nomorLKBaru() {
  const th = new Date().getFullYear();
  const akhir = await prisma.lembarKerja.findFirst({ where: { nomor: { startsWith: `LK-${th}-` } }, orderBy: { nomor: "desc" }, select: { nomor: true } });
  return `LK-${th}-${String((Number(akhir?.nomor.slice(8)) || 0) + 1).padStart(4, "0")}`;
}

/** Isi kanonik yang ditandatangani (TTE). */
export async function isiKanonikLK(nomor: string) {
  const l = await prisma.lembarKerja.findUnique({ where: { nomor } });
  if (!l) return null;
  return [l.nomor, l.kegiatan, l.tipeInspeksi, l.alatId, l.tanggal.toISOString(), l.hasil, l.perhatian ?? "", l.data, l.catatan ?? "", l.pemeriksa].join("␞");
}
export async function sidikLK(nomor: string) {
  const i = await isiKanonikLK(nomor);
  return i == null ? null : createHash("sha256").update(i, "utf8").digest("hex");
}
export const urlPedoman = "/admin/lembar-kerja/template";
