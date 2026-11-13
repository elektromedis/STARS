/** Perkecil gambar di browser (canvas) → JPEG. `persegi` = potong tengah menjadi bujur sangkar (untuk gambar kecil). */
export async function perkecilGambar(f: Blob, sisi: number, kualitas = 0.85, persegi = false): Promise<Blob> {
  const bmp = await createImageBitmap(f, { imageOrientation: "from-image" });
  try {
    let sx = 0, sy = 0, sw = bmp.width, sh = bmp.height;
    if (persegi) { const s = Math.min(sw, sh); sx = (sw - s) / 2; sy = (sh - s) / 2; sw = sh = s; }
    const skala = Math.min(1, sisi / Math.max(sw, sh));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(sw * skala)); c.height = Math.max(1, Math.round(sh * skala));
    const ctx = c.getContext("2d");
    if (!ctx) throw new Error("Kanvas tidak tersedia");
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, c.width, c.height); // PNG transparan → latar putih
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bmp, sx, sy, sw, sh, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", kualitas));
    if (!blob) throw new Error("Gagal memproses gambar");
    return blob;
  } finally { bmp.close(); }
}

/** Unggah FormData dengan kemajuan (XMLHttpRequest). Mengembalikan status + JSON balasan. */
export function unggahDenganKemajuan(url: string, fd: FormData, kemajuan?: (persen: number) => void, metode = "POST"): Promise<{ status: number; data: Record<string, unknown> }> {
  return new Promise((selesai) => {
    const xhr = new XMLHttpRequest();
    xhr.open(metode, url);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) kemajuan?.(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => { let data: Record<string, unknown> = {}; try { data = JSON.parse(xhr.responseText); } catch { /* bukan JSON */ } selesai({ status: xhr.status, data }); };
    xhr.onerror = () => selesai({ status: 0, data: { error: "Koneksi terputus. Periksa jaringan lalu coba lagi." } });
    xhr.send(fd);
  });
}
