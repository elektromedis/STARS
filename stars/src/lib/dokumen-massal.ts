import type { PrismaClient } from "@prisma/client";

/** Pencocokan nama berkas → alat untuk unggah massal dokumen (nomor seri › tipe › nama alat). */
export type KunciCocok = "otomatis" | "seri" | "tipe" | "nama";
export type HasilCocok = { berkas: string; dasar: "seri" | "tipe" | "nama" | null; kata: string | null; alat: { id: number; kode: string; nama: string; model: string | null; nomorSeri: string | null }[]; jenis: string };

export const norm = (s: string | null | undefined) => String(s ?? "").toLowerCase().replace(/\.[a-z0-9]+$/, "").replace(/[^a-z0-9]+/g, "");

const KATA_JENIS: [RegExp, string][] = [
  [/service\s*manual|servicemanual|\bsm\b/i, "SERVICE_MANUAL"], [/user\s*manual|usermanual|manual\s*book|\bum\b|buku\s*panduan/i, "USER_MANUAL"],
  [/\bsop\b|spo/i, "SOP"], [/akd|akl|izin\s*edar/i, "AKD_AKL"], [/kontrak/i, "KONTRAK"], [/garansi|warranty/i, "GARANSI"],
  [/ba[\s_-]*penerimaan|bast|serah\s*terima/i, "BA_PENERIMAAN"], [/uji[\s_-]*fungsi/i, "BA_UJI_FUNGSI"], [/uji[\s_-]*coba/i, "BA_UJI_COBA"],
  [/sp[\s_-]*pemeliharaan/i, "SP_PEMELIHARAAN"], [/sp[\s_-]*perbaikan/i, "SP_PERBAIKAN"],
];
/** Tebak jenis dokumen dari nama berkas; fallback ke `bawaan`. */
export const tebakJenis = (nama: string, bawaan: string) => KATA_JENIS.find(([r]) => r.test(nama.replace(/[_-]/g, " ")))?.[1] ?? bawaan;

type AlatRingkas = HasilCocok["alat"][number];

export async function muatAlatCocok(db: PrismaClient) {
  return db.alat.findMany({ where: { aktif: true }, select: { id: true, kode: true, nama: true, model: true, nomorSeri: true } });
}

export function cocokkan(namaBerkas: string, semua: AlatRingkas[], kunci: KunciCocok, jenisBawaan: string): HasilCocok {
  const n = norm(namaBerkas);
  const jenis = jenisBawaan === "OTOMATIS" ? tebakJenis(namaBerkas, "LAINNYA") : jenisBawaan;
  const coba = (dasar: "seri" | "tipe" | "nama", ambil: (a: AlatRingkas) => string | null, min: number): HasilCocok | null => {
    let kata: string | null = null;
    for (const a of semua) { const k = norm(ambil(a)); if (k.length >= min && n.includes(k) && (!kata || k.length > kata.length)) kata = k; }
    if (!kata) return null;
    const alat = semua.filter((a) => norm(ambil(a)) === kata);
    return { berkas: namaBerkas, dasar, kata, alat, jenis };
  };
  const urutan: ("seri" | "tipe" | "nama")[] = kunci === "otomatis" ? ["seri", "tipe", "nama"] : [kunci];
  for (const d of urutan) {
    const h = d === "seri" ? coba("seri", (a) => a.nomorSeri, 4) : d === "tipe" ? coba("tipe", (a) => a.model, 3) : coba("nama", (a) => a.nama, 4);
    if (h) return h;
  }
  return { berkas: namaBerkas, dasar: null, kata: null, alat: [], jenis };
}
