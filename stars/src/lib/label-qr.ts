/**
 * Label QR alat siap cetak (PDF A4). Tiap QR berisi tautan STARS ke SATU alat:
 * <alamat publik>/alat?kode=<kode> → dibuka kamera HP atau tombol Scan QR → detail inventaris alat + tombol Lapor Kerusakan.
 * (Label lama berisi /lapor?alat=<kode> tetap berfungsi.)
 * QR digambar vektor (kotak-kotak), bukan gambar, agar tajam di printer apa pun.
 */
import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { tautanAlat } from "./alamat";

/** Tata letak mengikuti lembar stiker A4 standar (setara Avery L7160 & L7165). Satuan mm. */
export const UKURAN_LABEL = {
  kecil: { nama: "Kecil 63,5 × 38,1 mm (21 per A4)", kolom: 3, baris: 7, w: 63.5, h: 38.1, kiri: 7.2, atas: 15.15, jarakX: 2.5, qr: 32 },
  besar: { nama: "Besar 99,1 × 67,7 mm (8 per A4)", kolom: 2, baris: 4, w: 99.1, h: 67.7, kiri: 4.65, atas: 13.1, jarakX: 2.5, qr: 50 },
} as const;
export type UkuranLabel = keyof typeof UKURAN_LABEL;

export type DataLabel = {
  kode: string; nama: string; merek: string | null; model: string | null; nomorSeri: string | null; unit: string; ruangan: string | null;
  noAset?: string | null; tahun?: number | null; kalibrasiSampai?: Date | null; lot?: string | null;
};

export const tautanLabel = tautanAlat;

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

export const ALAMAT_RS = "Jl. Mini III, RT.4/RW.3, Bambu Apus, Kec. Cipayung, Kota Jakarta Timur. 13890";
export type LogoLabel = { rsud: string | null; stars: string | null }; // data URL PNG
const HITAM: [number, number, number] = [17, 24, 39];
const tglPendek = (d: Date | null | undefined) => (d ? `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}` : "-");

/** Tulis teks satu baris yang dikecilkan sampai muat (min `kecil` pt), lalu dipotong "…" bila tetap kepanjangan. */
function pas(doc: jsPDF, teks: string, x: number, y: number, maksW: number, pt: number, gaya: "normal" | "bold" = "normal", kecil = pt * 0.7, opsi: { align?: "left" | "center" | "right" } = {}) {
  let u = pt;
  doc.setFont("helvetica", gaya).setFontSize(u);
  while (doc.getTextWidth(teks) > maksW && u > kecil) { u -= 0.25; doc.setFontSize(u); }
  let t = teks;
  while (doc.getTextWidth(t) > maksW && t.length > 1) t = t.slice(0, -2) + "…";
  doc.text(t, x, y, opsi);
}
/** Teks multi-baris dalam kotak; kembalikan tinggi terpakai. */
function paragraf(doc: jsPDF, teks: string, x: number, y: number, maksW: number, pt: number, maksBaris: number, gaya: "normal" | "bold" = "normal") {
  doc.setFont("helvetica", gaya).setFontSize(pt);
  const b = (doc.splitTextToSize(teks, maksW) as string[]);
  const tampil = b.slice(0, maksBaris);
  if (b.length > maksBaris) tampil[maksBaris - 1] = tampil[maksBaris - 1].replace(/.{0,2}$/, "…");
  doc.text(tampil, x, y);
  return tampil.length * pt * 0.3528 * 1.15;
}
/** Kotak simbol berbingkai seperti REF / SN / LOT / MD pada label alat kesehatan. */
function kotakSimbol(doc: jsPDF, teks: string, x: number, y: number, pt: number) {
  doc.setFont("helvetica", "bold").setFontSize(pt);
  const w = doc.getTextWidth(teks) + 1.4, h = pt * 0.3528 + 1.2;
  doc.setDrawColor(...HITAM).setLineWidth(0.25).rect(x, y - h + 0.75, w, h);
  doc.text(teks, x + 0.7, y);
  return w;
}
function gambarLogo(doc: jsPDF, data: string | null, alias: string, x: number, y: number, maksW: number, maksH: number, rasio: number) {
  if (!data) return;
  let w = maksW, h = w / rasio;
  if (h > maksH) { h = maksH; w = h * rasio; }
  doc.addImage(data, "PNG", x + (maksW - w) / 2, y + (maksH - h) / 2, w, h, alias, "FAST");
}
/** Ikon kecil: jam pasir (tanggal), payung (jaga kering), segitiga NON STERILE, gelas (mudah pecah). */
function ikonJamPasir(doc: jsPDF, x: number, y: number, s: number) {
  doc.setDrawColor(...HITAM).setLineWidth(0.22);
  doc.line(x, y, x + s, y); doc.line(x, y + s, x + s, y + s);
  doc.line(x + s * 0.15, y, x + s * 0.85, y + s); doc.line(x + s * 0.85, y, x + s * 0.15, y + s);
}
function ikonSimbol(doc: jsPDF, x: number, y: number, s: number) {
  doc.setDrawColor(...HITAM).setLineWidth(0.22);
  // gelas (fragile)
  doc.line(x, y, x + s * 0.5, y); doc.line(x, y, x + s * 0.12, y + s * 0.45); doc.line(x + s * 0.5, y, x + s * 0.38, y + s * 0.45);
  doc.line(x + s * 0.12, y + s * 0.45, x + s * 0.38, y + s * 0.45); doc.line(x + s * 0.25, y + s * 0.45, x + s * 0.25, y + s * 0.9); doc.line(x + s * 0.08, y + s * 0.9, x + s * 0.42, y + s * 0.9);
  // segitiga NON STERILE
  const tx = x + s * 0.75;
  doc.triangle(tx, y + s, tx + s * 1.1, y + s, tx + s * 0.55, y - s * 0.05, "S");
  doc.setFont("helvetica", "bold").setFontSize(2.6).text("NON", tx + s * 0.55, y + s * 0.62, { align: "center" }).text("STERILE", tx + s * 0.55, y + s * 0.88, { align: "center" });
  // payung (keep dry)
  const px = x + s * 2.2, pr = s * 0.42;
  doc.lines([[pr * 2, 0]], px - pr, y + s * 0.45);
  for (let i = 0; i < 8; i++) { const a1 = Math.PI + (i * Math.PI) / 8, a2 = Math.PI + ((i + 1) * Math.PI) / 8; doc.line(px + pr * Math.cos(a1), y + s * 0.45 + pr * Math.sin(a1), px + pr * Math.cos(a2), y + s * 0.45 + pr * Math.sin(a2)); }
  doc.line(px, y + s * 0.45, px, y + s * 0.9); doc.line(px, y + s * 0.9, px - s * 0.12, y + s * 0.9);
  [-0.35, 0, 0.35].forEach((dx) => doc.line(px + dx * s, y - s * 0.15, px + dx * s - 0.15, y + s * 0.05));
}

/** Label BESAR: tata letak lengkap ala label alat kesehatan (logo RS | nama & model / alamat | STARS | merek / unit kerja, REF, SN, tanggal, LOT, QR eIFU). */
function labelBesar(doc: jsPDF, d: DataLabel, alamat: string, x0: number, y0: number, u: (typeof UKURAN_LABEL)["besar"], logo: LogoLabel) {
  const m = 2.2, X = x0 + m, Y = y0 + m, W = u.w - m * 2, H = u.h - m * 2;
  doc.setDrawColor(...HITAM).setLineWidth(0.35).roundedRect(X, Y, W, H, 2.2, 2.2, "S");
  doc.setTextColor(...HITAM);
  // Baris 1: logo RSUD | NAMA ALAT | MODEL
  const r1 = 10.5, logoW = 19;
  gambarLogo(doc, logo.rsud, "logo-rsud", X + 1.2, Y + 1, logoW - 2, r1 - 2, 606 / 367);
  doc.setLineWidth(0.3).line(X + logoW, Y + 1.5, X + logoW, Y + r1 - 1.5);
  pas(doc, `${d.nama.toUpperCase()} | MODEL: ${(d.model || "-").toUpperCase()}`, X + logoW + 2, Y + r1 / 2 + 1.4, W - logoW - 3.5, 9.5, "bold", 5.5);
  doc.setLineWidth(0.35).line(X, Y + r1, X + W, Y + r1);
  // Baris 2: alamat | logo STARS | MEREK
  const y2 = Y + r1, r2 = 12.5, c1 = 33, c2 = 27;
  doc.setTextColor(...HITAM);
  paragraf(doc, ALAMAT_RS, X + 1.8, y2 + 3.2, c1 - 3, 5.6, 4);
  doc.setLineWidth(0.3).line(X + c1, y2 + 1.2, X + c1, y2 + r2 - 1.2);
  gambarLogo(doc, logo.stars, "logo-stars", X + c1 + 1.2, y2 + 1.5, c2 - 2.4, r2 - 3, 900 / 329);
  doc.line(X + c1 + c2, y2 + 1.2, X + c1 + c2, y2 + r2 - 1.2);
  doc.setFont("helvetica", "bold").setFontSize(8.5).text("MEREK", X + c1 + c2 + 2, y2 + 4.6);
  pas(doc, (d.merek || "-").toUpperCase(), X + c1 + c2 + 2, y2 + 9.2, W - c1 - c2 - 3.5, 9.5, "bold", 5.5);
  doc.setLineWidth(0.35).line(X, y2 + r2, X + W, y2 + r2);
  // Area bawah: kiri (UDI, unit kerja, REF/SN, tanggal, LOT) | kanan (QR eIFU)
  const y3 = y2 + r2, kiriW = W * 0.64, kanX = X + kiriW;
  doc.setLineWidth(0.3).line(kanX, y3 + 1.2, kanX, Y + H - 1.2);
  let ty = y3 + 3.6;
  doc.setFont("helvetica", "bold").setFontSize(6.6).text("UDI:", X + 1.8, ty);
  pas(doc, `${d.kode}${d.noAset && d.noAset !== d.kode ? `  •  ${d.noAset}` : ""}`, X + 7.6, ty, kiriW - 9.5, 6.6, "normal", 4.5);
  // pengganti barcode: UNIT KERJA (besar) + ruangan, dan kotak kode kecil
  const qrKecil = 9.6, bx = X + 1.8, bw = kiriW - qrKecil - 5.2;
  ty += 1.6;
  doc.setFillColor(241, 245, 249).rect(bx, ty, bw, 8.2, "F");
  pas(doc, d.unit.toUpperCase(), bx + bw / 2, ty + 4.6, bw - 2, 9, "bold", 5.2, { align: "center" });
  doc.setFont("helvetica", "normal").setFontSize(5);
  pas(doc, d.ruangan ? `UNIT KERJA • ${d.ruangan}` : "UNIT KERJA", bx + bw / 2, ty + 7.4, bw - 2, 4.6, "normal", 3.6, { align: "center" });
  gambarQr(doc, d.kode, X + kiriW - qrKecil - 1.6, ty - 1.4, qrKecil);
  doc.setFont("helvetica", "normal").setFontSize(3.8).text("KODE ALAT", X + kiriW - qrKecil / 2 - 1.6, ty + qrKecil - 0.6, { align: "center" });
  ty += 12.2;
  // REF + SN
  let wx = X + 1.8;
  wx += kotakSimbol(doc, "REF", wx, ty, 6.2) + 1.2;
  const snX = X + kiriW * 0.5;
  pas(doc, d.noAset || d.kode, wx, ty, snX - wx - 1.2, 6.6, "normal", 4);
  wx = snX;
  wx += kotakSimbol(doc, "SN", wx, ty, 6.2) + 1.2;
  pas(doc, d.nomorSeri || "-", wx, ty, kiriW - (wx - X) - 1.5, 6.6, "normal", 4.6);
  // Tanggal + simbol
  ty += 3.4;
  ikonJamPasir(doc, X + 1.9, ty - 0.2, 2.4);
  doc.setFont("helvetica", "normal").setFontSize(4.8);
  doc.text(`Tahun Perolehan: ${d.tahun ?? "-"}`, X + 5.2, ty + 0.8);
  doc.text(`Kalibrasi s/d: ${tglPendek(d.kalibrasiSampai)}`, X + 5.2, ty + 2.8);
  ikonSimbol(doc, X + kiriW - 13.5, ty - 0.3, 3.2);
  // LOT, QTY, MD
  ty += 6.4;
  wx = X + 1.8;
  wx += kotakSimbol(doc, "LOT", wx, ty, 6.2) + 1.2;
  pas(doc, d.lot || "-", wx, ty, 14, 6.6, "normal", 4.6);
  doc.setFont("helvetica", "normal").setFontSize(6.2).text("QTY: 1", X + 25, ty);
  wx = X + 34.5;
  wx += kotakSimbol(doc, "MD", wx, ty, 6.2) + 1.2;
  doc.setFont("helvetica", "normal").setFontSize(6.6).text("Medical Device", wx, ty);
  // Kanan: QR besar + SCAN FOR eIFU
  const kanW = W - kiriW, sisi = Math.min(kanW - 4, Y + H - y3 - 12);
  const tautan = tautanLabel(alamat, d.kode);
  gambarQr(doc, tautan, kanX + (kanW - sisi) / 2, y3 + 1.2, sisi);
  const cx = kanX + kanW / 2;
  doc.setFont("helvetica", "bold").setFontSize(7.4).text("SCAN FOR eIFU", cx, y3 + sisi + 4, { align: "center" });
  doc.setFont("helvetica", "normal").setFontSize(4.4).text("Electronic Instructions for Use", cx, y3 + sisi + 6.3, { align: "center" });
  pas(doc, tautan.replace(/^https?:\/\//, ""), cx, y3 + sisi + 8.4, kanW - 2, 4, "normal", 2.8, { align: "center" });
}

/** Label KECIL: versi ringkas dengan gaya yang sama. */
function labelKecil(doc: jsPDF, d: DataLabel, alamat: string, x0: number, y0: number, u: (typeof UKURAN_LABEL)["kecil"], logo: LogoLabel) {
  const m = 1.6, X = x0 + m, Y = y0 + m, W = u.w - m * 2, H = u.h - m * 2;
  doc.setDrawColor(...HITAM).setLineWidth(0.3).roundedRect(X, Y, W, H, 1.8, 1.8, "S");
  doc.setTextColor(...HITAM);
  const r1 = 7, logoW = 11.5;
  gambarLogo(doc, logo.rsud, "logo-rsud", X + 0.8, Y + 0.7, logoW - 1.4, r1 - 1.4, 606 / 367);
  doc.setLineWidth(0.25).line(X + logoW, Y + 1, X + logoW, Y + r1 - 1);
  pas(doc, d.nama.toUpperCase(), X + logoW + 1.3, Y + 3.1, W - logoW - 2.2, 6.6, "bold", 4.2);
  pas(doc, `MODEL: ${(d.model || "-").toUpperCase()}`, X + logoW + 1.3, Y + 5.8, W - logoW - 2.2, 4.6, "normal", 3.4);
  doc.setLineWidth(0.3).line(X, Y + r1, X + W, Y + r1);
  const sisi = H - r1 - 5.2, kanX = X + W - sisi - 1.6, kiriW = kanX - X - 1;
  const tautan = tautanLabel(alamat, d.kode);
  gambarQr(doc, tautan, kanX, Y + r1 + 0.8, sisi);
  doc.setFont("helvetica", "bold").setFontSize(4.6).text("SCAN FOR eIFU", kanX + sisi / 2, Y + H - 1.6, { align: "center" });
  let ty = Y + r1 + 3.2;
  doc.setFont("helvetica", "bold").setFontSize(4.6).text("MEREK", X + 1.4, ty);
  pas(doc, (d.merek || "-").toUpperCase(), X + 8.4, ty, kiriW - 8, 4.8, "bold", 3.4);
  ty += 1.4;
  doc.setFillColor(241, 245, 249).rect(X + 1.4, ty, kiriW - 1.6, 5.4, "F");
  pas(doc, d.unit.toUpperCase(), X + 1.4 + (kiriW - 1.6) / 2, ty + 3.2, kiriW - 2.6, 6, "bold", 3.6, { align: "center" });
  pas(doc, d.ruangan ? `UNIT KERJA • ${d.ruangan}` : "UNIT KERJA", X + 1.4 + (kiriW - 1.6) / 2, ty + 4.9, kiriW - 2.6, 3.2, "normal", 2.6, { align: "center" });
  ty += 8.4;
  let wx = X + 1.4;
  wx += kotakSimbol(doc, "SN", wx, ty, 4.4) + 0.8;
  pas(doc, d.nomorSeri || "-", wx, ty, kiriW - (wx - X) - 0.6, 4.6, "normal", 3.2);
  ty += 3;
  wx = X + 1.4;
  wx += kotakSimbol(doc, "REF", wx, ty, 4.4) + 0.8;
  pas(doc, d.noAset || d.kode, wx, ty, kiriW - (wx - X) - 0.6, 4.6, "normal", 3.2);
  ty += 2.9;
  doc.setFont("helvetica", "normal").setFontSize(3.6).text(`Kalibrasi s/d: ${tglPendek(d.kalibrasiSampai)}`, X + 1.4, ty);
  gambarLogo(doc, logo.stars, "logo-stars", X + kiriW - 12, Y + H - 4.4, 11.5, 3.6, 900 / 329);
}

/** PDF lembar label. `mulai` = posisi label pertama (1-based) agar lembar stiker yang sudah terpakai sebagian bisa dipakai lagi. */
export function pdfLabelQr(data: DataLabel[], opsi: { alamat: string; ukuran: UkuranLabel; mulai?: number; logo?: LogoLabel }): Buffer {
  const u = UKURAN_LABEL[opsi.ukuran];
  const perLembar = u.kolom * u.baris;
  const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
  let pos = Math.min(Math.max((opsi.mulai ?? 1) - 1, 0), perLembar - 1);
  data.forEach((d, i) => {
    if (i > 0 && pos === 0) doc.addPage();
    const kolom = pos % u.kolom, baris = Math.floor(pos / u.kolom);
    const lx = u.kiri + kolom * (u.w + u.jarakX), ly = u.atas + baris * u.h, logo = opsi.logo ?? { rsud: null, stars: null };
    if (opsi.ukuran === "besar") labelBesar(doc, d, opsi.alamat, lx, ly, UKURAN_LABEL.besar, logo);
    else labelKecil(doc, d, opsi.alamat, lx, ly, UKURAN_LABEL.kecil, logo);
    pos = (pos + 1) % perLembar;
  });
  return Buffer.from(doc.output("arraybuffer"));
}
