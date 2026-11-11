/**
 * Pembuat PDF sisi server (jsPDF + autotable): laporan tabel siap cetak
 * dengan kop STARS, tanggal cetak, dan nomor halaman.
 */
import { jsPDF } from "jspdf";
import autoTable, { type CellDef, type RowInput } from "jspdf-autotable";

export type KolomPdf = { kunci: string; label: string; lebar?: number; rata?: "left" | "right" | "center" };

const NAVY: [number, number, number] = [23, 37, 84];
const TEAL: [number, number, number] = [13, 148, 136];

export const formatRpPdf = (n: number) => "Rp " + Math.round(n).toLocaleString("id-ID");

function tanggalCetak() {
  return new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

/**
 * Buat PDF tabel. `barisKosong` menambah baris kosong bergaris (formulir isian manual);
 * `kaki` menjadi baris total tebal di akhir tabel; `catatan` dicetak setelah tabel.
 */
export function kePdf(opsi: {
  judul: string;
  subjudul?: string;
  kolom: KolomPdf[];
  baris: Record<string, unknown>[];
  orientasi?: "p" | "l";
  kaki?: (string | number)[];
  catatan?: string[];
  barisKosong?: number;
}): Buffer {
  const { judul, subjudul, kolom, baris, orientasi = "l", kaki, catatan, barisKosong = 0 } = opsi;
  const doc = new jsPDF({ orientation: orientasi, unit: "mm", format: "a4" });
  const lebarHal = doc.internal.pageSize.getWidth();
  const margin = 12;

  // Kop
  doc.setFont("helvetica", "bold").setFontSize(14).setTextColor(...NAVY);
  doc.text(judul, margin, 16);
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(90);
  doc.text("STARS - Profil Perencanaan & Pengadaan Alat Kesehatan, RSUD Cipayung", margin, 22);
  const infoKanan = `Dicetak: ${tanggalCetak()}`;
  doc.text(infoKanan, lebarHal - margin, 16, { align: "right" });
  if (subjudul) {
    doc.setFontSize(10).setTextColor(60);
    doc.text(subjudul, margin, 28);
  }
  doc.setDrawColor(...TEAL).setLineWidth(0.6);
  doc.line(margin, 31, lebarHal - margin, 31);

  const body: RowInput[] = baris.map((b) => kolom.map((k) => String(b[k.kunci] ?? "")));
  for (let i = 0; i < barisKosong; i++) body.push(kolom.map(() => ({ content: "", styles: { minCellHeight: 9 } }) as CellDef));

  autoTable(doc, {
    startY: 34,
    margin: { left: margin, right: margin, top: 34 },
    head: [kolom.map((k) => k.label)],
    body,
    foot: kaki ? [kaki.map((v) => String(v))] : undefined,
    showFoot: "lastPage",
    styles: { font: "helvetica", fontSize: 7.5, cellPadding: 1.6, lineColor: [203, 213, 225], lineWidth: 0.15, textColor: 30, overflow: "linebreak" },
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: "bold", fontSize: 7.5 },
    footStyles: { fillColor: [224, 242, 241], textColor: NAVY, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: Object.fromEntries(kolom.map((k, i) => [i, { ...(k.lebar ? { cellWidth: k.lebar } : {}), halign: k.rata ?? "left" }])),
    didDrawPage: () => {
      const hal = doc.getNumberOfPages();
      doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(130);
      doc.text(`Halaman ${hal}`, lebarHal - margin, doc.internal.pageSize.getHeight() - 6, { align: "right" });
      doc.text("Dibuat otomatis oleh STARS", margin, doc.internal.pageSize.getHeight() - 6);
    },
  });

  if (catatan?.length) {
    const akhir = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 34;
    let y = akhir + 7;
    doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(...NAVY);
    if (y > doc.internal.pageSize.getHeight() - 30) { doc.addPage(); y = 20; }
    doc.text("Catatan", margin, y);
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(60);
    y += 5;
    for (const c of catatan) {
      const potong = doc.splitTextToSize(`• ${c}`, lebarHal - margin * 2) as string[];
      if (y + potong.length * 3.8 > doc.internal.pageSize.getHeight() - 12) { doc.addPage(); y = 20; }
      doc.text(potong, margin, y);
      y += potong.length * 3.8 + 1.5;
    }
  }

  return Buffer.from(doc.output("arraybuffer"));
}
