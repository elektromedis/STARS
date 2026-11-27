/** Logika modul gaya ASPAK: daftar bawaan, validasi, impor standar (CSV), dan perhitungan pemenuhan alat. */
import { z } from "zod";

/** Strata kompetensi RS sesuai SIRS RS Online (Kemenkes). */
export const STRATA = ["Dasar", "Madya", "Utama", "Paripurna"] as const;
export const KELOMPOK_IZIN = ["Perizinan", "Mutu"] as const;
export const JENIS_PRASARANA = ["Genset", "UPS", "Listrik PLN"] as const;

/** Butir isian baku (struktur saja — isi/nilainya diisi sendiri oleh rumah sakit). */
export const IZIN_BAWAAN: Record<string, string[]> = {
  Perizinan: [
    "Surat Izin Operasional (SIO)", "Sertifikat Izin Operasional dari Bapeten", "Sertifikat Izin Pelayanan Radiologi", "Sertifikat Izin Pelayanan Radioterapi",
    "Sertifikat Izin IPAL", "Surat Izin/MoU Pengangkutan Limbah", "Sertifikat Izin Incinerator", "Surat Izin/MoU Pengolahan Limbah B3",
    "Surat Izin Pemanfaatan Air Tanah (SIPA)", "Sertifikat Izin Prasarana Listrik", "Sertifikat Izin Genset", "Sertifikat Izin Lift/Eskalator", "Sertifikat Izin Mesin Boiler", "Sertifikat Izin Sprinkler",
  ],
  Mutu: [
    "Komite/PJ/Tim Mutu", "Komite/PJ/Tim Keselamatan Pasien", "Komite/PJ/Tim PPI", "Pra Construction Risk Assessment (PCRA)", "Komite/PJ/Unit K3",
    "Infection Control Risk Assessment (ICRA)", "Security pada ruang berisiko", "Hospital Disaster Team", "Hasil uji baku mutu air limbah domestik", "Hasil uji baku mutu air limbah B3", "Hasil uji baku mutu air bersih",
  ],
};
export const PRASARANA_BAWAAN: { jenis: string; uraian: string; satuan: string }[] = [
  { jenis: "Genset", uraian: "Jumlah genset keseluruhan", satuan: "unit" }, { jenis: "Genset", uraian: "Total kapasitas genset berfungsi", satuan: "KVA" },
  { jenis: "Genset", uraian: "Jumlah genset berfungsi", satuan: "unit" }, { jenis: "Genset", uraian: "Operator genset bersertifikat", satuan: "orang" },
  { jenis: "UPS", uraian: "Jumlah UPS keseluruhan", satuan: "unit" }, { jenis: "UPS", uraian: "Total kapasitas UPS berfungsi", satuan: "KVA" }, { jenis: "UPS", uraian: "Jumlah UPS berfungsi", satuan: "unit" },
  { jenis: "Listrik PLN", uraian: "Daya terpasang", satuan: "KVA" },
];

export const skemaProfil = z.object({ kodeFaskes: z.string().max(40).optional(), strata: z.enum(STRATA).nullable().optional(), kelas: z.string().max(20).optional() });
export const skemaIzin = z.object({ kelompok: z.enum(KELOMPOK_IZIN), nama: z.string().min(2, "Nama butir wajib").max(200), ada: z.boolean(), nomor: z.string().max(100).optional(), selamanya: z.boolean(), berlakuSampai: z.date().nullable(), catatan: z.string().max(300).optional() });
export const skemaPrasarana = z.object({ id: z.coerce.number().int().positive(), ada: z.boolean(), jumlah: z.coerce.number().min(0, "Jumlah tidak boleh negatif"), berfungsi: z.boolean() });
const n0 = z.coerce.number().int().min(0, "Angka tidak boleh negatif");
export const skemaNakes = z.object({ jenis: z.string().min(2, "Jenis ketenagaan wajib").max(120), kelompok: z.string().max(120).optional(), jumlah: n0, strMemiliki: n0, strAktif: n0, sipMemiliki: n0, sipAktif: n0 })
  .refine((v) => v.strMemiliki <= v.jumlah && v.sipMemiliki <= v.jumlah, { message: "STR/SIP tidak boleh melebihi jumlah tenaga" })
  .refine((v) => v.strAktif <= v.strMemiliki && v.sipAktif <= v.sipMemiliki, { message: "Yang aktif tidak boleh melebihi yang memiliki" });

export type BarisStandar = { kodeRuangan?: string; namaRuangan: string; namaAlat: string; jumlah: number };
/** Format per baris: ruangan;alat;jumlah  atau  kode;ruangan;alat;jumlah (pemisah ; , atau tab). */
export function parseStandar(teks: string): { baris: BarisStandar[]; galat: string[] } {
  const baris: BarisStandar[] = [], galat: string[] = [];
  teks.split(/\r?\n/).forEach((raw, i) => {
    const l = raw.trim(); if (!l || l.startsWith("#")) return;
    const k = l.split(/[;\t]|,(?=\s*\d+\s*$)/).map((x) => x.trim());
    const [kode, ruang, alat, jml] = k.length >= 4 ? k : ["", ...k];
    const j = Number(jml);
    if (k.length < 3 || !ruang || !alat || !Number.isInteger(j) || j < 1) galat.push(`Baris ${i + 1}: format ruangan;alat;jumlah tidak valid`);
    else baris.push({ kodeRuangan: kode || undefined, namaRuangan: ruang, namaAlat: alat, jumlah: j });
  });
  return { baris, galat };
}

const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
export type AlatMini = { nama: string; ruangan: string; unit: string };
export type HasilBaris = { namaRuangan: string; namaAlat: string; standar: number; ada: number; persen: number };
/** Pemenuhan = min(ada, standar) / standar. Alat dicocokkan lewat kata dalam nama alat dan nama ruangan/unit kerja. */
export function hitungPemenuhan(standar: BarisStandar[], alat: AlatMini[]): { baris: HasilBaris[]; total: number } {
  const a = alat.map((x) => ({ nama: norm(x.nama), lok: norm(`${x.ruangan} ${x.unit}`) }));
  const baris = standar.map((s) => {
    const na = norm(s.namaAlat), nr = norm(s.namaRuangan);
    const ada = a.filter((x) => x.nama.includes(na) && (x.lok.includes(nr) || (x.lok.trim() !== "" && nr.includes(x.lok.trim())))).length;
    return { namaRuangan: s.namaRuangan, namaAlat: s.namaAlat, standar: s.jumlah, ada, persen: Math.round((Math.min(ada, s.jumlah) / s.jumlah) * 100) };
  });
  const st = baris.reduce((n, b) => n + b.standar, 0), ok = baris.reduce((n, b) => n + Math.min(b.ada, b.standar), 0);
  return { baris, total: st ? Math.round((ok / st) * 100) : 0 };
}
export const sisaHari = (d: Date | null | undefined, now = new Date()) => (d ? Math.ceil((d.getTime() - now.getTime()) / 86400000) : null);
