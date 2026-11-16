/**
 * Pembuat PDF sisi server (jsPDF + autotable): laporan tabel siap cetak
 * dengan kop STARS, tanggal cetak, dan nomor halaman.
 */
import { jsPDF } from "jspdf";
import autoTable, { type CellDef, type RowInput } from "jspdf-autotable";

export type KolomPdf = { kunci: string; label: string; lebar?: number; rata?: "left" | "right" | "center" };

const NAVY: [number, number, number] = [23, 37, 84];
const TEAL: [number, number, number] = [13, 148, 136];

import { formatRupiah } from "./utils";

export const formatRpPdf = formatRupiah;

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
  doc.text("STARS - Sistem Terintegrasi Alat Kesehatan Rumah Sakit - RSUD Cipayung", margin, 22);
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

/** Lembar kerja (work order) siap cetak: info, checklist tugas dengan kotak centang, tindakan, tanda tangan. */
export function lembarKerjaPdf(wo: {
  nomor: string; jenis: string; status: string; prioritas: string; deskripsi: string; checklist?: string | null; tindakan?: string | null;
  sukuCadang?: string | null; biaya?: number | null; tanggalMulai?: Date | null; tanggalSelesai?: Date | null; createdAt: Date;
  teknisi?: string | null; permintaan?: { nomor: string; pelapor: string; kontak?: string | null } | null;
  alat?: { kode: string; nama: string; merek?: string | null; model?: string | null; nomorSeri?: string | null; unit: string; ruangan?: string | null } | null;
  tugas: { selesai: boolean; tugas: string }[];
}): Buffer {
  const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const m = 14;
  const tglId = (d?: Date | null) => (d ? d.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }) : "-");

  doc.setFont("helvetica", "bold").setFontSize(15).setTextColor(...NAVY).text("LEMBAR KERJA PEMELIHARAAN", m, 17);
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(90).text("STARS - RSUD Cipayung - Unit Elektromedik / IPSRS", m, 22);
  doc.setFont("helvetica", "bold").setFontSize(12).setTextColor(...NAVY).text(wo.nomor, W - m, 17, { align: "right" });
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(90).text(`${wo.jenis} - ${wo.prioritas} - ${wo.status}`, W - m, 22, { align: "right" });
  doc.setDrawColor(...TEAL).setLineWidth(0.6).line(m, 25, W - m, 25);

  const info: [string, string][] = [
    ["Alat", wo.alat ? `${wo.alat.nama} (${wo.alat.kode})` : "-"],
    ["Merek / Model / No. seri", wo.alat ? [wo.alat.merek, wo.alat.model, wo.alat.nomorSeri].filter(Boolean).join(" / ") || "-" : "-"],
    ["Unit / Ruangan", wo.alat ? `${wo.alat.unit}${wo.alat.ruangan ? ` / ${wo.alat.ruangan}` : ""}` : "-"],
    ["Dibuat", tglId(wo.createdAt)], ["Teknisi", wo.teknisi ?? "-"],
    ["Mulai / Selesai", `${tglId(wo.tanggalMulai)} / ${tglId(wo.tanggalSelesai)}`],
    ["Laporan asal", wo.permintaan ? `${wo.permintaan.nomor} - ${wo.permintaan.pelapor}${wo.permintaan.kontak ? ` (${wo.permintaan.kontak})` : ""}` : "-"],
  ];
  autoTable(doc, {
    startY: 28, margin: { left: m, right: m }, theme: "grid", body: info,
    styles: { font: "helvetica", fontSize: 8.5, cellPadding: 1.8, lineColor: [203, 213, 225], lineWidth: 0.15, textColor: 30 },
    columnStyles: { 0: { cellWidth: 48, fontStyle: "bold", fillColor: [241, 245, 249] } },
  });
  let y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;

  doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(...NAVY).text("Uraian pekerjaan", m, y); y += 4;
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(30);
  const uraian = doc.splitTextToSize(wo.deskripsi, W - m * 2) as string[];
  doc.text(uraian, m, y); y += uraian.length * 4 + 4;

  doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(...NAVY).text("Checklist tugas", m, y); y += 2;
  const baris = wo.tugas.length ? wo.tugas.map((t, i) => [String(i + 1), t.selesai ? "[X]" : "[  ]", t.tugas, ""]) : [["1", "[  ]", "", ""], ["2", "[  ]", "", ""], ["3", "[  ]", "", ""], ["4", "[  ]", "", ""], ["5", "[  ]", "", ""]];
  autoTable(doc, {
    startY: y, margin: { left: m, right: m }, head: [["No", "OK", "Tugas / item pemeriksaan", "Hasil / catatan"]], body: baris,
    styles: { font: "helvetica", fontSize: 8.5, cellPadding: 2, lineColor: [203, 213, 225], lineWidth: 0.15, textColor: 30, minCellHeight: 8 },
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 10, halign: "center" }, 1: { cellWidth: 12, halign: "center", font: "courier", fontStyle: "bold" }, 3: { cellWidth: 55 } },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;

  const kotak = (judul: string, isi: string, tinggi: number) => {
    if (y + tinggi + 8 > doc.internal.pageSize.getHeight() - 40) { doc.addPage(); y = 18; }
    doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(...NAVY).text(judul, m, y); y += 2;
    doc.setDrawColor(203, 213, 225).setLineWidth(0.2).rect(m, y, W - m * 2, tinggi);
    doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(30);
    if (isi) doc.text(doc.splitTextToSize(isi, W - m * 2 - 4) as string[], m + 2, y + 4.5);
    y += tinggi + 5;
  };
  kotak("Tindakan yang dilakukan", wo.tindakan ?? "", 24);
  kotak("Suku cadang / biaya", `${wo.sukuCadang ?? ""}${wo.biaya ? `${wo.sukuCadang ? "  -  " : ""}Biaya: ${formatRpPdf(wo.biaya)}` : ""}`, 12);

  if (y + 32 > doc.internal.pageSize.getHeight() - 10) { doc.addPage(); y = 18; }
  const kolom = (W - m * 2) / 3;
  ["Teknisi pelaksana", "Kepala unit / ruangan", "Verifikasi Elektromedik"].forEach((j, i) => {
    const x = m + kolom * i;
    doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(60).text(j, x + kolom / 2, y + 2, { align: "center" });
    doc.setDrawColor(120).setLineWidth(0.2).line(x + 8, y + 22, x + kolom - 8, y + 22);
    doc.setFontSize(7.5).setTextColor(130).text("Nama & tanda tangan", x + kolom / 2, y + 26, { align: "center" });
  });
  doc.setFontSize(7.5).setTextColor(130).text(`Dicetak ${tanggalCetak()} - STARS`, m, doc.internal.pageSize.getHeight() - 6);
  return Buffer.from(doc.output("arraybuffer"));
}

/** Bukti laporan kerusakan (A4 tegak): identitas laporan, alat, pelapor, uraian keluhan, foto (bila JPG/PNG), dan status. */
export function laporanKerusakanPdf(l: {
  nomor: string; createdAt: Date; status: string; prioritas: string; namaAlat: string; kodeAlat?: string | null; nomorSeri?: string | null;
  unit?: string | null; lokasi?: string | null; pelapor: string; kontak?: string | null; keluhan: string; adaVideo?: boolean;
  foto?: { data: Buffer; jenis: "JPEG" | "PNG" } | null; alamatLacak?: string | null;
}): Buffer {
  const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
  const m = 14;
  const waktu = l.createdAt.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).replace(/\./g, ":");

  doc.setFont("helvetica", "bold").setFontSize(15).setTextColor(...NAVY).text("LAPORAN KERUSAKAN ALAT", m, 17);
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(90).text("STARS - RSUD Cipayung - Instalasi Elektromedik / IPSRS", m, 22);
  doc.setFont("helvetica", "bold").setFontSize(13).setTextColor(...NAVY).text(l.nomor, W - m, 17, { align: "right" });
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(90).text(`${waktu} WIB`, W - m, 22, { align: "right" });
  doc.setDrawColor(...TEAL).setLineWidth(0.6).line(m, 25, W - m, 25);

  const info: [string, string][] = [
    ["Nomor laporan", l.nomor],
    ["Tanggal & jam lapor", `${waktu} WIB`],
    ["Prioritas", l.prioritas],
    ["Status saat ini", l.status],
    ["Nama alat", l.namaAlat],
    ["Kode alat / No. seri", [l.kodeAlat, l.nomorSeri ? `SN ${l.nomorSeri}` : null].filter(Boolean).join(" / ") || "-"],
    ["Unit kerja", l.unit ?? "-"],
    ["Lokasi / ruangan", l.lokasi ?? "-"],
    ["Nama pelapor", l.pelapor],
    ["Kontak pelapor", l.kontak ?? "-"],
    ["Lampiran", [l.foto ? "foto" : null, l.adaVideo ? "video (lihat di STARS)" : null].filter(Boolean).join(", ") || "-"],
  ];
  autoTable(doc, {
    startY: 29, margin: { left: m, right: m }, theme: "grid", body: info,
    styles: { font: "helvetica", fontSize: 9.5, cellPadding: 2.2, lineColor: [203, 213, 225], lineWidth: 0.15, textColor: 30 },
    columnStyles: { 0: { cellWidth: 50, fontStyle: "bold", fillColor: [241, 245, 249] } },
  });
  let y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7;

  doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(...NAVY).text("Uraian keluhan / kerusakan", m, y); y += 5;
  doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(30);
  const uraian = doc.splitTextToSize(l.keluhan, W - m * 2) as string[];
  doc.text(uraian, m, y); y += uraian.length * 4.6 + 6;

  if (l.foto) {
    try {
      const p = doc.getImageProperties(l.foto.data);
      const maksL = W - m * 2, maksT = Math.max(40, Math.min(110, H - y - 40));
      const s = Math.min(maksL / p.width, maksT / p.height);
      if (y + p.height * s > H - 30) { doc.addPage(); y = 20; }
      doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(...NAVY).text("Foto kerusakan", m, y); y += 3;
      doc.addImage(l.foto.data, l.foto.jenis, m, y, p.width * s, p.height * s); y += p.height * s + 6;
    } catch { /* foto rusak/tak terbaca: lewati */ }
  }

  if (y > H - 45) { doc.addPage(); y = 20; }
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(60);
  const tt = (x: number, label: string) => { doc.text(label, x, y); doc.line(x, y + 22, x + 60, y + 22); };
  doc.setDrawColor(120).setLineWidth(0.2);
  tt(m, "Pelapor,"); tt(W - m - 60, "Diterima petugas elektromedik,");
  doc.text(l.pelapor, m, y + 27);

  doc.setFontSize(8).setTextColor(120);
  doc.text(`Dokumen dibuat otomatis oleh STARS${l.alamatLacak ? ` - pantau status: ${l.alamatLacak}` : ""}`, m, H - 10);
  return Buffer.from(doc.output("arraybuffer"));
}
