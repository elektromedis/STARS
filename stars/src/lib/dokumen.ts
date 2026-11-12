/**
 * Jenis dokumen pendukung paket. Berkas aman diimpor dari komponen klien (tanpa Prisma).
 */
export const JENIS_DOKUMEN = [
  { kode: "RKPBU", label: "RKPBU", judulKolom: "RKPBU" },
  { kode: "AKPA", label: "AKPA", judulKolom: "AKPA" },
  { kode: "NOTA_DINAS", label: "Nota Dinas", judulKolom: "NOTA DINAS" },
  { kode: "SP_SPK", label: "SP/SPK", judulKolom: "SP/SPK" },
  { kode: "INVOICE", label: "Invoice/Faktur", judulKolom: "INVOICE/ FAKTUR" },
] as const;

export type JenisDokumen = (typeof JENIS_DOKUMEN)[number]["kode"];
export const KODE_JENIS = JENIS_DOKUMEN.map((j) => j.kode) as JenisDokumen[];
export const adalahJenis = (v: unknown): v is JenisDokumen => typeof v === "string" && (KODE_JENIS as string[]).includes(v);
export const labelJenis = (k: string) => JENIS_DOKUMEN.find((j) => j.kode === k)?.label ?? k;

/** Ringkasan dokumen satu paket: per jenis, id dokumen terbaru + jumlah berkas. */
export type StatusDokumen = Partial<Record<JenisDokumen, { id: number; jumlah: number }>>;

export const MAKS_DOKUMEN = 15 * 1024 * 1024;
/** Ekstensi → MIME yang diizinkan, beserta tanda awal berkas (magic bytes) untuk memastikan isinya cocok. */
export const TIPE_DOKUMEN: Record<string, { mime: string; tanda: number[][]; tampil: boolean }> = {
  pdf: { mime: "application/pdf", tanda: [[0x25, 0x50, 0x44, 0x46]], tampil: true },
  jpg: { mime: "image/jpeg", tanda: [[0xff, 0xd8, 0xff]], tampil: true },
  jpeg: { mime: "image/jpeg", tanda: [[0xff, 0xd8, 0xff]], tampil: true },
  png: { mime: "image/png", tanda: [[0x89, 0x50, 0x4e, 0x47]], tampil: true },
  docx: { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", tanda: [[0x50, 0x4b, 0x03, 0x04]], tampil: false },
  xlsx: { mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", tanda: [[0x50, 0x4b, 0x03, 0x04]], tampil: false },
};
export const TERIMA_DOKUMEN = ".pdf,.jpg,.jpeg,.png,.docx,.xlsx";
