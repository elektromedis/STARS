/** Dokumen Permenkes 54/2015 Lampiran II: sertifikat / surat keterangan, label laik (hijau) / tidak laik (merah), laporan triwulan (Pasal 36). */
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { ALAMAT_RS } from "./label-qr";

export type DataUji = {
  nomorSertifikat: string | null; tanggal: Date; berlakuSampai: Date | null; laik: boolean; kalibrator: string; petugas: string | null; metode: string | null; keterangan: string | null; jenis: string;
  alat: { nama: string; merek: string | null; model: string | null; nomorSeri: string | null; kodeAspak: string | null; akl: string | null; ruangan: string | null; unit: string };
};
const tgl = (d: Date | null) => (d ? d.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "long", year: "numeric" }) : "—");
const titik = (s: string | null | undefined) => s?.trim() || "—";

/** Lampiran II.I (laik) / II.II (tidak laik). */
export function pdfSertifikat(d: DataUji, logoRsud: string | null) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setLineWidth(0.5).rect(15, 15, 180, 200);
  if (logoRsud) doc.addImage(logoRsud, "PNG", 20, 19, 22, 13.3);
  doc.setFont("times", "bold").setFontSize(12).text(d.kalibrator.toUpperCase(), 110, 24, { align: "center", maxWidth: 120 });
  doc.setFont("times", "normal").setFontSize(9).text("Institusi Penguji / Kalibrasi Alat Kesehatan", 110, 30, { align: "center" });
  doc.line(15, 36, 195, 36);
  const judul = d.laik ? `SERTIFIKAT ${d.jenis === "Pengujian" ? "PENGUJIAN" : "KALIBRASI"}` : `SURAT KETERANGAN ${d.jenis === "Pengujian" ? "PENGUJIAN" : "KALIBRASI"}`;
  doc.setFont("times", "bold").setFontSize(13).text(judul, 105, 46, { align: "center" });
  const lebarJ = doc.getTextWidth(judul); doc.setLineWidth(0.3).line(105 - lebarJ / 2, 47, 105 + lebarJ / 2, 47);
  doc.setFont("times", "normal").setFontSize(10.5).text(`Nomor : ${titik(d.nomorSertifikat)}`, 105, 53, { align: "center" });
  const kotak = (y: number, a: string, b: string) => { doc.rect(22, y, 83, 12).rect(105, y, 83, 12); doc.text(a, 24, y + 7.5); doc.text(b, 107, y + 7.5); };
  kotak(60, `Nama Alat : ${d.alat.nama}`.slice(0, 48), `Nomor Registrasi : ${titik(d.alat.akl ?? d.alat.kodeAspak)}`.slice(0, 48));
  [["Merek", d.alat.merek], ["Model / Tipe", d.alat.model], ["Nomor Seri", d.alat.nomorSeri]].forEach(([k, v], i) => { doc.text(String(k), 22, 80 + i * 6); doc.text(`: ${titik(v)}`, 55, 80 + i * 6); });
  kotak(100, "Nama Pemilik : RSUD Cipayung", `Identitas Pemilik : ${d.alat.unit}`.slice(0, 48));
  const baris: [string, string][] = [
    ["Alamat Pemilik", ALAMAT_RS], ["Tanggal Pelaksanaan Uji/Kalibrasi", tgl(d.tanggal)], ["Penanggung Jawab Pengujian", titik(d.petugas)],
    ["Hasil Pengujian", d.laik ? `Laik Pakai, berlaku s/d ${tgl(d.berlakuSampai)}` : "Tidak Laik Pakai"], ["Tingkat Ketelitian", titik(d.keterangan)], ["Metode Pengujian", titik(d.metode)],
  ];
  let y = 122;
  for (const [k, v] of baris) { const t = doc.splitTextToSize(`: ${v}`, 100) as string[]; doc.text(k, 22, y); doc.text(t, 85, y); y += 6 * t.length; }
  doc.text("Jakarta, " + tgl(d.tanggal), 150, 172, { align: "center" }); doc.text("Kepala Institusi Penguji", 150, 178, { align: "center" });
  doc.setFontSize(8.5).setTextColor(120).text("Ttd dan Stempel Institusi Penguji", 150, 192, { align: "center" }).setTextColor(0);
  doc.setFontSize(10.5).text("( ............................................ )", 150, 206, { align: "center" });
  doc.setFontSize(7.5).setTextColor(110).text("Format Lampiran II Permenkes No. 54 Tahun 2015. Dokumen asli diterbitkan & ditandatangani institusi penguji (Pasal 10); cetakan ini adalah salinan dari STARS.", 105, 222, { align: "center", maxWidth: 175 }).setTextColor(0);
  return Buffer.from(doc.output("arraybuffer"));
}

/** Lampiran II.III label hijau (laik) / merah (tidak laik), 2 kolom × 4 baris di A4. */
export function pdfLabelP54(data: DataUji[], radiasi: (nama: string) => boolean) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 95, H = 68, X0 = 10, Y0 = 12;
  data.forEach((d, i) => {
    if (i > 0 && i % 8 === 0) doc.addPage();
    const x = X0 + (i % 2) * W, y = Y0 + Math.floor((i % 8) / 2) * H;
    doc.setDrawColor(60).setLineWidth(0.3).rect(x + 1, y + 1, W - 2, H - 2);
    doc.setFillColor(...((d.laik ? [84, 130, 53] : [230, 0, 0]) as [number, number, number])).rect(x + 1, y + 1, W - 2, 8, "F");
    doc.setTextColor(255).setFont("helvetica", "bold").setFontSize(7.5).text(d.kalibrator.slice(0, 60), x + W / 2, y + 6.2, { align: "center" }).setTextColor(20);
    doc.setFont("helvetica", "normal").setFontSize(6.6);
    const br: [string, string][] = [
      ["Telah dilakukan pengujian/kalibrasi", ""],
      ["Tanggal", tgl(d.tanggal)], ...(d.laik ? [["Laik Pakai s/d", tgl(d.berlakuSampai)] as [string, string]] : []),
      [d.laik ? "Nomor Sertifikat Pengujian/Kalibrasi" : "Nomor Surat Keterangan", titik(d.nomorSertifikat)],
      ["No / Nama Ruangan", titik(d.alat.ruangan ?? d.alat.unit)], ["Nama Alat", d.alat.nama], ["Merek", titik(d.alat.merek)], ["Model / Tipe", titik(d.alat.model)], ["Nomor Seri", titik(d.alat.nomorSeri)],
      ["Keterangan", `${radiasi(d.alat.nama) ? "Alat kesehatan radiasi" : "Alat kesehatan non radiasi"}${d.keterangan ? "; " + d.keterangan : ""}`],
    ];
    br.forEach(([k, v], j) => { doc.text(k, x + 3, y + 13 + j * 4.1); doc.text(`: ${v}`.slice(0, 48), x + 43, y + 13 + j * 4.1); });
    doc.line(x + 1, y + H - 11, x + W - 1, y + H - 11);
    doc.setFont("helvetica", "bold").setFontSize(6.6).text(d.laik ? "DINYATAKAN AMAN BAGI PEKERJA, PENDERITA, DAN LINGKUNGAN" : "DINYATAKAN TIDAK AMAN BAGI PEKERJA, PENDERITA, DAN LINGKUNGAN", x + W / 2, y + H - 5, { align: "center" });
  });
  return Buffer.from(doc.output("arraybuffer"));
}

/** Pasal 36: laporan pelaksanaan pengujian/kalibrasi per triwulan (cakupan & hasil). */
export function pdfLaporanTriwulan(o: { tahun: number; tw: number; data: DataUji[]; wajib: number; tercakup: number }) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  doc.setFont("times", "bold").setFontSize(13).text(`LAPORAN PELAKSANAAN PENGUJIAN DAN/ATAU KALIBRASI ALAT KESEHATAN`, 148.5, 16, { align: "center" });
  doc.setFont("times", "normal").setFontSize(10.5).text(`RSUD Cipayung · Triwulan ${["I", "II", "III", "IV"][o.tw - 1]} Tahun ${o.tahun} · Pasal 36 Permenkes No. 54 Tahun 2015`, 148.5, 22, { align: "center" });
  const laik = o.data.filter((d) => d.laik).length;
  doc.setFontSize(10).text(`Cakupan: ${o.tercakup} dari ${o.wajib} alat wajib uji (Lampiran I) memiliki uji/kalibrasi berlaku (${o.wajib ? Math.round((o.tercakup / o.wajib) * 100) : 0}%).  Pelaksanaan triwulan ini: ${o.data.length} alat — laik ${laik}, tidak laik ${o.data.length - laik}.`, 14, 30);
  autoTable(doc, {
    startY: 35, theme: "grid", styles: { fontSize: 7.5, cellPadding: 1.2 }, headStyles: { fillColor: [235, 238, 243], textColor: 10 },
    head: [["No", "Tanggal", "Nama Alat", "Merek / Model", "No. Seri", "Unit / Ruangan", "Jenis", "Institusi Penguji", "No. Sertifikat/SK", "Hasil", "Berlaku s/d"]],
    body: o.data.map((d, i) => [i + 1, tgl(d.tanggal), d.alat.nama, [d.alat.merek, d.alat.model].filter(Boolean).join(" / "), titik(d.alat.nomorSeri), [d.alat.unit, d.alat.ruangan].filter(Boolean).join(" / "), d.jenis, d.kalibrator, titik(d.nomorSertifikat), d.laik ? "Laik pakai" : "Tidak laik", tgl(d.berlakuSampai)]),
  });
  const y = Math.min((doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10, 180);
  doc.setFontSize(9).text("Tembusan: Direktur Jenderal; Dinas Kesehatan Provinsi DKI Jakarta; Suku Dinas Kesehatan Kota Adm. Jakarta Timur; BPFK pengampu.", 14, y);
  return Buffer.from(doc.output("arraybuffer"));
}
