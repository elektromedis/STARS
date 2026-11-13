/** Batas & format lampiran Lapor Kerusakan (foto + video). Aman diimpor komponen klien. */
export const MAKS_FOTO_LAPOR = 5 * 1024 * 1024;
export const MAKS_VIDEO_LAPOR = 20 * 1024 * 1024;
export const TERIMA_FOTO_LAPOR = "image/jpeg,image/png,image/webp";
export const TERIMA_VIDEO_LAPOR = "video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm";
/** Ekstensi berkas lampiran laporan → MIME (untuk melayani berkas ke petugas). */
export const MIME_MEDIA_LAPOR: Record<string, string> = {
  jpg: "image/jpeg", png: "image/png", webp: "image/webp", mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm",
};
export const POLA_MEDIA_LAPOR = /^[0-9a-f-]{36}\.(jpg|png|webp|mp4|mov|webm)$/i;
export const adalahVideoLapor = (nama: string) => /\.(mp4|mov|webm)$/i.test(nama);
export const ukuranMb = (b: number) => `${(b / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
