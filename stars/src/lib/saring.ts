/** Menyamarkan email, NIK/NIP, dan nomor telepon sebelum teks disimpan ke basis pengetahuan atau keluar dari server. */
export function saring(t: string) {
  return t
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, "[email disaring]")
    .replace(/(?<!\d)\d{8}[ .-]\d{6}[ .-]\d[ .-]\d{3}(?!\d)/g, "[nomor identitas disaring]")
    .replace(/(?<!\d)\d{15,18}(?!\d)/g, "[nomor identitas disaring]")
    .replace(/(?<![\w])(?:\+?62|0)8\d(?:[ .-]?\d){7,11}(?!\d)/g, "[telepon disaring]");
}
