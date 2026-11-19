/**
 * Label inspeksi siap cetak — mengacu WHO Medical equipment maintenance programme overview, Lampiran E
 * (contoh label: catatan inspeksi, catatan hasil uji, pemberitahuan cacat/rusak, cek baterai).
 * A4, 2 kolom × 5 baris (95 × 54 mm). Warna pita berganti tiap tahun agar label kedaluwarsa mudah terlihat.
 */
import { jsPDF } from "jspdf";
import { gambarQr, type LogoLabel } from "./label-qr";

export type JenisLabelInspeksi = "inspeksi" | "uji" | "rusak" | "baterai";
export const JENIS_LABEL_INSPEKSI: Record<JenisLabelInspeksi, string> = {
  inspeksi: "Catatan inspeksi (Telah diperiksa)", uji: "Catatan hasil uji (pembacaan keluaran)", rusak: "Pemberitahuan cacat — JANGAN DIPAKAI", baterai: "Cek baterai",
};
/** Warna pita per tahun (siklus 4 tahun). */
const WARNA_TAHUN: [number, number, number][] = [[13, 148, 136], [37, 99, 235], [217, 119, 6], [124, 58, 237]];
export const warnaTahun = (th: number) => WARNA_TAHUN[((th % 4) + 4) % 4];

export type DataLabelInspeksi = { kode: string; nama: string; merek: string | null; unit: string; ruangan: string | null; url: string; ulangBulan: number | null };
const fmt = (d: Date) => d.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "2-digit", year: "numeric" });

export function pdfLabelInspeksi(data: DataLabelInspeksi[], o: { jenis: JenisLabelInspeksi; tanggal: Date; logo: LogoLabel }): Buffer {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 95, H = 54, X0 = 10, Y0 = 13.5;
  const th = Number(o.tanggal.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" }).slice(0, 4));
  const rusak = o.jenis === "rusak";
  const warna: [number, number, number] = rusak ? [208, 59, 59] : warnaTahun(th);
  data.forEach((a, i) => {
    if (i > 0 && i % 10 === 0) doc.addPage();
    const x = X0 + (i % 2) * W, y = Y0 + Math.floor((i % 10) / 2) * H;
    doc.setDrawColor(170).setLineWidth(0.2).roundedRect(x + 1, y + 1, W - 2, H - 2, 2, 2);
    // kepala: logo + pita warna
    doc.setFillColor(...warna).rect(x + 1, y + 1, W - 2, 9, "F");
    doc.setTextColor(255).setFont("helvetica", "bold").setFontSize(rusak ? 10 : 9);
    const judul = { inspeksi: `TELAH DIPERIKSA · ${th}`, uji: `HASIL UJI · ${th}`, rusak: "RUSAK — JANGAN DIPAKAI", baterai: `CEK BATERAI · ${th}` }[o.jenis];
    doc.text(judul, x + W / 2, y + 7, { align: "center" });
    doc.setTextColor(20);
    let lx = x + 3;
    for (const [src, w, h] of [[o.logo.rsud, 13, 7.9], [o.logo.stars, 17, 6.2]] as const) if (src) { doc.addImage(src, "PNG", lx, y + 11.5, w, h); lx += w + 2; }
    doc.setFont("helvetica", "bold").setFontSize(8).text(doc.splitTextToSize(a.nama, 55)[0] as string, x + 3, y + 23);
    doc.setFont("helvetica", "normal").setFontSize(6.5).text([`${a.kode}${a.merek ? " · " + a.merek : ""}`, `${a.unit}${a.ruangan ? " · " + a.ruangan : ""}`].map((t) => (doc.splitTextToSize(t, 58) as string[])[0]), x + 3, y + 26.5);
    gambarQr(doc, a.url, x + W - 21, y + 11.5, 18);
    doc.setFontSize(7);
    const garis = (lbl: string, dy: number, isi = "") => { const yy = y + dy; doc.text(lbl, x + 3, yy); doc.setDrawColor(120).line(x + 26, yy + 0.6, x + W - 4, yy + 0.6); if (isi) doc.setFont("helvetica", "bold").text(isi, x + 27, yy - 0.3).setFont("helvetica", "normal"); };
    if (o.jenis === "inspeksi") {
      const ulang = new Date(o.tanggal); ulang.setMonth(ulang.getMonth() + (a.ulangBulan ?? 12));
      garis("Tgl. inspeksi", 34, fmt(o.tanggal)); garis("Inspeksi berikut", 39.5, `${fmt(ulang)} (${a.ulangBulan ?? 12} bln, WHO)`);
      garis("Hasil", 45, "[  ] Lulus   [  ] Lulus bersyarat"); garis("Petugas / paraf", 50.5);
    } else if (o.jenis === "uji") {
      garis("Tgl. uji", 34, fmt(o.tanggal));
      doc.setFontSize(6.3);
      const kol = ["Parameter", "Setelan", "Terukur", "Batas"], cx = [3, 30, 50, 70];
      kol.forEach((k, j) => doc.setFont("helvetica", "bold").text(k, x + cx[j], y + 38.5)); doc.setFont("helvetica", "normal");
      for (let r = 0; r < 3; r++) doc.line(x + 3, y + 41.5 + r * 3.6, x + W - 4, y + 41.5 + r * 3.6);
      garis("Petugas / paraf", 51.5);
    } else if (o.jenis === "rusak") {
      doc.setTextColor(208, 59, 59).setFont("helvetica", "bold").setFontSize(8).text("DIKELUARKAN DARI LAYANAN", x + 3, y + 33).setTextColor(20).setFont("helvetica", "normal").setFontSize(7);
      garis("Tanggal", 38.5, fmt(o.tanggal)); garis("Kerusakan", 44); garis("Dilaporkan oleh", 50.5);
    } else {
      garis("Tgl. cek", 34, fmt(o.tanggal)); garis("Tegangan / %", 39.5); garis("Tgl. ganti baterai", 45); garis("Petugas / paraf", 50.5);
    }
  });
  return Buffer.from(doc.output("arraybuffer"));
}
