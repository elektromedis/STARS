/**
 * Jenis dokumen alat ala Trilux CAMS (File Penerimaan & File Pendukung). Aman diimpor komponen klien.
 * "Sertifikat Kalibrasi" tidak diunggah di sini: diambil dari catatan terbaru CMS Kalibrasi.
 */
export const KELOMPOK_DOKUMEN_ALAT = [
  { kode: "penerimaan", judul: "File Penerimaan" },
  { kode: "pendukung", judul: "File Pendukung" },
  { kode: "lainnya", judul: "File Lainnya" },
] as const;
export type KelompokDokumenAlat = (typeof KELOMPOK_DOKUMEN_ALAT)[number]["kode"];

export type JenisDokumenAlatInfo = {
  kode: string; label: string; singkat: string; kelompok: KelompokDokumenAlat;
  /** Diambil dari tabel Kalibrasi, bukan diunggah di slot ini. */
  dariKalibrasi?: boolean;
  /** Lazim berlaku untuk semua alat bermerek & tipe sama (tawarkan "terapkan ke alat sejenis"). */
  samaModel?: boolean;
};

export const JENIS_DOKUMEN_ALAT: readonly JenisDokumenAlatInfo[] = [
  { kode: "KONTRAK", label: "Kontrak", singkat: "Kontrak", kelompok: "penerimaan" },
  { kode: "BA_PENERIMAAN", label: "BA Penerimaan", singkat: "BA Penerimaan", kelompok: "penerimaan" },
  { kode: "AKD_AKL", label: "Dokumen AKD/AKL", singkat: "AKD/AKL", kelompok: "penerimaan", samaModel: true },
  { kode: "BA_UJI_FUNGSI", label: "BA Uji Fungsi", singkat: "BA Uji Fungsi", kelompok: "penerimaan" },
  { kode: "BA_UJI_COBA", label: "BA Uji Coba", singkat: "BA Uji Coba", kelompok: "penerimaan" },
  { kode: "GARANSI", label: "Surat Garansi", singkat: "S. Garansi", kelompok: "pendukung" },
  { kode: "SERTIFIKAT_KALIBRASI", label: "Sertifikat Kalibrasi", singkat: "Sertifikat Kalibrasi", kelompok: "pendukung", dariKalibrasi: true },
  { kode: "SOP", label: "Standard Operating Procedure", singkat: "SOP", kelompok: "pendukung", samaModel: true },
  { kode: "USER_MANUAL", label: "User Manual", singkat: "User Manual", kelompok: "pendukung", samaModel: true },
  { kode: "SERVICE_MANUAL", label: "Service Manual", singkat: "Service Manual", kelompok: "pendukung", samaModel: true },
  { kode: "SP_PEMELIHARAAN", label: "SP Pemeliharaan", singkat: "SP Pemeliharaan", kelompok: "pendukung" },
  { kode: "SP_PERBAIKAN", label: "SP Perbaikan", singkat: "SP Perbaikan", kelompok: "pendukung" },
  { kode: "LAINNYA", label: "Dokumen lainnya", singkat: "Lainnya", kelompok: "lainnya" },
];

/** Jenis yang bisa diunggah lewat CMS dokumen alat (tanpa Sertifikat Kalibrasi). */
export const JENIS_UNGGAH_ALAT = JENIS_DOKUMEN_ALAT.filter((j) => !j.dariKalibrasi);
export const adalahJenisDokumenAlat = (v: unknown): v is string => typeof v === "string" && JENIS_UNGGAH_ALAT.some((j) => j.kode === v);
export const infoJenisDokumenAlat = (k: string) => JENIS_DOKUMEN_ALAT.find((j) => j.kode === k);
/** Jumlah slot dokumen (untuk "n/13" di Inventaris). */
export const JUMLAH_SLOT_DOKUMEN = JENIS_DOKUMEN_ALAT.filter((j) => j.kelompok !== "lainnya").length;

export const MAKS_DOKUMEN_ALAT = 30 * 1024 * 1024;
export const TERIMA_DOKUMEN_ALAT = ".pdf,.jpg,.jpeg,.png,.docx,.xlsx";

/** Foto alat: diperkecil di browser sebelum diunggah. */
export const FOTO_ALAT = { sisiBesar: 1280, sisiKecil: 160, kualitas: 0.85, maksAsli: 25 * 1024 * 1024, maksUnggah: 3 * 1024 * 1024 } as const;
/** Nama berkas gambar kecil dari nama foto utama. */
export const namaFotoKecil = (foto: string) => foto.replace(/\.(\w+)$/, "-kecil.$1");
export const urlFotoAlat = (foto: string | null | undefined, kecil = false) => (foto ? `/api/alat/foto/${kecil ? namaFotoKecil(foto) : foto}` : null);
/** Halaman detail inventaris satu alat (tujuan QR baru). */
export const urlDetailAlat = (kode: string) => `/alat?kode=${encodeURIComponent(kode)}`;
