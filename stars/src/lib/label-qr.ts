/**
 * Label QR alat siap cetak (PDF A4). Tiap QR berisi tautan STARS ke SATU alat:
 * <alamat publik>/lapor?alat=<kode> → dibuka kamera HP atau tombol Scan QR → formulir lapor terisi.
 * QR digambar vektor (kotak-kotak), bukan gambar, agar tajam di printer apa pun.
 */
import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { tautanLapor } from "./alamat";

/** Tata letak mengikuti lembar stiker A4 standar (setara Avery L7160 & L7165). Satuan mm. */
export const UKURAN_LABEL = {
  kecil: { nama: "Kecil 63,5 × 38,1 mm (21 per A4)", kolom: 3, baris: 7, w: 63.5, h: 38.1, kiri: 7.2, atas: 15.15, jarakX: 2.5, qr: 32 },
  besar: { nama: "Besar 99,1 × 67,7 mm (8 per A4)", kolom: 2, baris: 4, w: 99.1, h: 67.7, kiri: 4.65, atas: 13.1, jarakX: 2.5, qr: 50 },
} as const;
export type UkuranLabel = keyof typeof UKURAN_LABEL;

export type DataLabel = { kode: string; nama: string; merek: string | null; model: string | null; nomorSeri: string | null; unit: string; ruangan: string | null };

export const tautanLabel = tautanLapor;

function gambarQr(doc: jsPDF, isi: string, x: number, y: number, sisi: number) {
  const qr = QRCode.create(isi, { errorCorrectionLevel: "M" });
  const n = qr.modules.size;
  const tepi = 2; // zona hening (modul)
  const sel = sisi / (n + tepi * 2);
  doc.setFillColor(255, 255, 255).rect(x, y, sisi, sisi, "F");
  doc.setFillColor(0, 0, 0);
  for (let r = 0; r < n; r++) {
    let c = 0;
    while (c < n) {
      if (!qr.modules.get(r, c)) { c++; continue; }
      const awal = c;
      while (c < n && qr.modules.get(r, c)) c++;
      // sedikit tumpang-tindih agar tidak muncul garis rambut antar baris di sebagian penampil PDF
      doc.rect(x + (tepi + awal) * sel, y + (tepi + r) * sel, (c - awal) * sel + 0.02, sel + 0.02, "F");
    }
  }
}

function satuLabel(doc: jsPDF, d: DataLabel, alamat: string, x: number, y: number, u: (typeof UKURAN_LABEL)[UkuranLabel]) {
  const besar = u === UKURAN_LABEL.besar;
  // garis potong tipis (tidak mengganggu bila memakai kertas stiker berpotongan)
  doc.setDrawColor(203, 213, 225).setLineWidth(0.1).setLineDashPattern([1, 1], 0).roundedRect(x + 0.3, y + 0.3, u.w - 0.6, u.h - 0.6, 2, 2, "S").setLineDashPattern([], 0);
  const pad = besar ? 4 : 3;
  const sisi = Math.min(u.qr, u.h - pad * 2);
  gambarQr(doc, tautanLabel(alamat, d.kode), x + pad, y + (u.h - sisi) / 2, sisi);

  const tx = x + pad + sisi + (besar ? 3.5 : 2);
  const lebar = x + u.w - pad - tx;
  let ty = y + pad + (besar ? 3.5 : 2.6);
  const tulis = (teks: string, ukuran: number, gaya: "normal" | "bold", warna: [number, number, number], maksBaris: number, jarak = 1.12) => {
    doc.setFont("helvetica", gaya).setFontSize(ukuran).setTextColor(...warna);
    const baris = (doc.splitTextToSize(teks, lebar) as string[]).slice(0, maksBaris);
    if (baris.length === maksBaris && doc.splitTextToSize(teks, lebar).length > maksBaris) baris[maksBaris - 1] = baris[maksBaris - 1].replace(/.{0,2}$/, "…");
    doc.text(baris, tx, ty);
    ty += baris.length * ukuran * 0.3528 * jarak + (besar ? 1.4 : 0.8);
  };
  tulis("STARS • RSUD Cipayung", besar ? 8 : 5.6, "bold", [13, 148, 136], 1);
  tulis(d.nama, besar ? 13 : 8, "bold", [11, 37, 69], besar ? 3 : 2);
  const tipe = [d.merek, d.model].filter(Boolean).join(" ");
  if (tipe) tulis(tipe, besar ? 9 : 6, "normal", [71, 85, 105], 1);
  tulis(`Kode: ${d.kode}${d.nomorSeri && d.nomorSeri !== d.kode ? `  •  SN: ${d.nomorSeri}` : ""}`, besar ? 8.5 : 5.6, "normal", [51, 65, 85], 2);
  tulis([d.unit, d.ruangan].filter(Boolean).join(" • "), besar ? 8.5 : 5.6, "normal", [51, 65, 85], 2);
  // ajakan di dasar label, dilipat agar tetap di dalam lebar teks
  const ukuranAjak = besar ? 8.5 : 5.6;
  doc.setFont("helvetica", "bold").setFontSize(ukuranAjak).setTextColor(13, 148, 136);
  const ajak = doc.splitTextToSize("Scan QR untuk lapor kerusakan", lebar) as string[];
  doc.text(ajak, tx, y + u.h - pad - (besar ? 0.5 : 0.2) - (ajak.length - 1) * ukuranAjak * 0.3528 * 1.12);
}

/** PDF lembar label. `mulai` = posisi label pertama (1-based) agar lembar stiker yang sudah terpakai sebagian bisa dipakai lagi. */
export function pdfLabelQr(data: DataLabel[], opsi: { alamat: string; ukuran: UkuranLabel; mulai?: number }): Buffer {
  const u = UKURAN_LABEL[opsi.ukuran];
  const perLembar = u.kolom * u.baris;
  const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
  let pos = Math.min(Math.max((opsi.mulai ?? 1) - 1, 0), perLembar - 1);
  data.forEach((d, i) => {
    if (i > 0 && pos === 0) doc.addPage();
    const kolom = pos % u.kolom, baris = Math.floor(pos / u.kolom);
    satuLabel(doc, d, opsi.alamat, u.kiri + kolom * (u.w + u.jarakX), u.atas + baris * u.h, u);
    pos = (pos + 1) % perLembar;
  });
  return Buffer.from(doc.output("arraybuffer"));
}
