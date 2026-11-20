/** PDF lembar kerja IPM (format Pedoman Pengoperasian & Pemeliharaan Peralatan Kesehatan, Kemenkes 2021). */
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { gambarQr, ALAMAT_RS } from "./label-qr";
import type { IsiLK } from "./lembar-kerja";

type Lk = { nomor: string; kegiatan: string; tipeInspeksi: string; tanggal: Date; hasil: string; perhatian: string | null; catatan: string | null; pemeriksa: string; status: string; template: string | null };
type Al = { kode: string; nama: string; merek: string | null; model: string | null; nomorSeri: string | null; unit: string; ruangan: string | null };
const kotak = (b: boolean) => (b ? "[X]" : "[  ]");
/** Font standar PDF tidak memuat ≤ Ω µ — ganti padanan ASCII. */
const aman = (t: string) => t.replace(/≤/g, "<=").replace(/≥/g, ">=").replace(/Ω/g, "Ohm").replace(/µ/g, "u");

export function pdfLembarKerja(l: Lk, a: Al, isi: IsiLK, tte: { peran: string; nama: string; identitas: string | null; waktu: Date; url: string }[], logo: string | null) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  if (logo) doc.addImage(logo, "PNG", 15, 9, 25, 15.2);
  doc.setFont("helvetica", "bold").setFontSize(10.5).text("RSUD CIPAYUNG — INSTALASI PEMELIHARAAN SARANA (ELEKTROMEDIS)", 118, 14, { align: "center" });
  doc.setFont("helvetica", "normal").setFontSize(8).text(ALAMAT_RS, 118, 19, { align: "center" });
  doc.setLineWidth(0.6).line(15, 26, 195, 26);
  doc.setFont("helvetica", "bold").setFontSize(12).text(`LEMBAR KERJA ${l.kegiatan === "Inspeksi" ? "PEMANTAUAN FUNGSI / INSPEKSI" : "PEMELIHARAAN PREVENTIF"} ALAT KESEHATAN`, 105, 33, { align: "center" });
  doc.setFont("helvetica", "normal").setFontSize(8.5).text(`Nomor ${l.nomor} · ${l.template ?? ""} · Permenkes 15/2023 Pasal 3 · Format Pedoman Pengoperasian & Pemeliharaan Peralatan Kesehatan (Kemenkes 2021)`, 105, 38, { align: "center", maxWidth: 180 });
  doc.setFontSize(9).text(`${kotak(l.tipeInspeksi === "Acceptance")} Inspeksi Acceptance   /   ${kotak(l.tipeInspeksi === "Terjadwal")} Inspeksi terjadwal`, 15, 45);
  doc.text(`Status: ${kotak(l.hasil === "Lolos")} Lolos   ${kotak(l.hasil === "Memerlukan pemeliharaan")} Memerlukan pemeliharaan   ${kotak(l.hasil === "Preventable problem")} Preventable problem   ${kotak(l.hasil === "KTD")} KTD`, 15, 50);
  const tgl = l.tanggal.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "long", year: "numeric" });
  const gaya = { fontSize: 8.5, cellPadding: 1.4, lineColor: 120, lineWidth: 0.2, textColor: 20 } as const;
  const kepala = { fillColor: [225, 230, 235] as [number, number, number], textColor: 20, fontStyle: "bolditalic" as const };
  autoTable(doc, { startY: 53, theme: "grid", styles: gaya, body: [
    [`Fasilitas: RSUD Cipayung`, { content: `Departemen: ${a.unit}${a.ruangan ? ` / ${a.ruangan}` : ""}`, colSpan: 2 }],
    [`Nama Alat: ${a.nama}`, `Tanggal: ${tgl}`, `Pemeriksa: ${l.pemeriksa}`],
    [`Kode Alat: ${a.kode}`, `Model: ${[a.merek, a.model].filter(Boolean).join(" ") || "—"}`, `No. seri: ${a.nomorSeri ?? "—"}`],
  ] });
  let y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 2;
  autoTable(doc, { startY: y, theme: "grid", styles: gaya, headStyles: { ...kepala, halign: "center" }, head: [["PERHATIAN KHUSUS"]], body: [[l.perhatian || " "]] });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 2;
  const app = isi.apparatus.length ? isi.apparatus : [{ nama: " ", sn: " " }];
  autoTable(doc, { startY: y, theme: "grid", styles: gaya, headStyles: kepala, head: [["TEST APPARATUS", "Control/Serial No."]], body: app.map((x) => [x.nama, x.sn]) });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 2;
  const c = (b: boolean) => (b ? "X" : "");
  autoTable(doc, { startY: y, theme: "grid", styles: gaya, headStyles: kepala, columnStyles: { 0: { halign: "center", cellWidth: 12 }, 1: { halign: "center", cellWidth: 12 }, 2: { halign: "center", cellWidth: 12 }, 3: { fontStyle: "italic" } }, head: [["Pass", "Fail", "N.A.", "QUALITATIVE TASKS"]], body: isi.kualitatif.map((q) => [c(q.hasil === "pass"), c(q.hasil === "fail"), c(q.hasil === "na"), q.butir]) });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 2;
  if (isi.kuantitatif.length) {
    autoTable(doc, { startY: y, theme: "grid", styles: gaya, headStyles: kepala, columnStyles: { 0: { fontStyle: "italic" }, 4: { halign: "center", cellWidth: 12 }, 5: { halign: "center", cellWidth: 12 } }, head: [[{ content: "QUANTITATIVE TASKS", colSpan: 6, styles: { halign: "center" } }], ["", "Criteria", "Set/Indicated", "Measured", "Pass", "Fail"]], body: isi.kuantitatif.map((k) => [aman(k.parameter), aman(k.kriteria), k.set, k.ukur, c(k.hasil === "pass"), c(k.hasil === "fail")]) });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 2;
  }
  autoTable(doc, { startY: y, theme: "grid", styles: gaya, headStyles: kepala, columnStyles: { 0: { halign: "center", cellWidth: 14 } }, head: [["Done", { content: "PREVENTIVE MAINTENANCE", styles: { halign: "center" } }]], body: isi.preventif.map((p) => [c(p.done), p.butir]) });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
  doc.setFont("helvetica", "bold").setFontSize(9).text("NOTE:", 15, y); doc.setFont("helvetica", "normal").text(l.catatan || "-", 28, y, { maxWidth: 167 });
  y += 8;
  if (y > 235) { doc.addPage(); y = 20; }
  [["Teknisi", "Dikerjakan oleh,", "Teknisi Elektromedis"], ["PjAlkes", "Disetujui oleh,", "PJ Alat Kesehatan"]].forEach(([p, atas, jab], i) => {
    const x = 25 + i * 95, t = tte.find((z) => z.peran === p);
    doc.setFontSize(9).setFont("helvetica", "normal").text(atas, x + 30, y + 4, { align: "center" }); doc.text(jab, x + 30, y + 9, { align: "center" });
    if (t) { gambarQr(doc, t.url, x + 19, y + 11, 22); doc.setFontSize(6.5).text("DITANDATANGANI SECARA ELEKTRONIK", x + 30, y + 36, { align: "center" }); doc.setFontSize(9).setFont("helvetica", "bold").text(t.nama.slice(0, 40), x + 30, y + 41, { align: "center" }); doc.setFont("helvetica", "normal").setFontSize(7.5).text(`${t.identitas ?? ""} ${t.waktu.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}`.trim(), x + 30, y + 45, { align: "center" }); }
    else doc.setFont("helvetica", "italic").setFontSize(8).text("(belum ditandatangani)", x + 30, y + 26, { align: "center" });
  });
  return Buffer.from(doc.output("arraybuffer"));
}
