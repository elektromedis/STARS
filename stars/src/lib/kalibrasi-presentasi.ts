/**
 * Berkas presentasi Pengujian & Kalibrasi: .pptx (bisa diedit — teks, tabel, dan grafik asli PowerPoint)
 * dan .pdf (16:9). Isi sama dengan halaman /kalibrasi pada filter yang sedang dipakai.
 */
import PptxGenJS from "pptxgenjs";
import { jsPDF } from "jspdf";
import type { getDataKalibrasi } from "./kalibrasi-data";
import { STATUS_DATA } from "./kalibrasi-data";
import { tglIndo } from "./kalibrasi";

type Data = Awaited<ReturnType<typeof getDataKalibrasi>>;
const TEAL = "0F766E", NAVY = "0B1F3A", ABU = "64748B";
const WARNA_STATUS: Record<string, string> = { bermasalah: "DC2626", segera: "D97706", berlaku: "059669", "tanpa-batas": "0284C7", belum: "94A3B8" };
const angka = (n: number) => n.toLocaleString("id-ID");
const persen = (x: number) => `${(x * 100).toFixed(1).replace(".", ",")}%`;

/** Bahan slide yang dipakai bersama oleh PPTX dan PDF. */
function bahan(d: Data, keterangan: string) {
  const r = d.ringkasan;
  const tanggal = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" });
  return {
    tanggal, keterangan,
    kpi: [
      ["Alat wajib uji/kalibrasi", angka(r.total), "alat medik aktif & alat yang pernah diuji"],
      ["Cakupan berlaku", persen(r.cakupan), `${angka(r.hitung.berlaku + r.hitung.segera + r.hitung["tanpa-batas"])} alat masih berlaku`],
      ["Kedaluwarsa / tidak laik", angka(r.hitung.bermasalah), `${angka(r.tidakLaik)} tidak laik · ${angka(r.hitung.belum)} belum pernah`],
      ["Jatuh tempo ≤ 90 hari", angka(r.jatuhTempo90), `${angka(r.hitung.segera)} di antaranya ≤ 30 hari`],
    ] as [string, string, string][],
    status: STATUS_DATA.map((s) => ({ kode: s.kode, label: s.label, n: r.hitung[s.kode as keyof typeof r.hitung] ?? 0 })),
    unit: d.perUnit.map((u) => [u.nama, angka(u.total), angka(u.berlaku), angka(u.segera), angka(u.bermasalah), angka(u["tanpa-batas"]), angka(u.belum)]),
    prioritas: d.semuaBaris.filter((b) => b.st.kunci === "bermasalah" || b.st.kunci === "segera").slice(0, 14)
      .map((b) => [b.kode, b.nama, b.unit, b.kalibrator ?? "—", b.berlakuSampai ? tglIndo(b.berlakuSampai) : "—", b.st.label]),
  };
}

const KEPALA_UNIT = ["Unit kerja", "Alat", "Berlaku", "≤30 hari", "Bermasalah", "Tanpa batas", "Belum"];
const KEPALA_PRIORITAS = ["Kode", "Nama alat", "Unit", "Lembaga", "Berlaku s/d", "Status"];
const potong = <T,>(a: T[], n: number) => Array.from({ length: Math.max(1, Math.ceil(a.length / n)) }, (_, i) => a.slice(i * n, i * n + n));

export async function buatPptx(d: Data, keterangan: string): Promise<Buffer> {
  const b = bahan(d, keterangan);
  const p = new PptxGenJS();
  p.layout = "LAYOUT_WIDE"; // 13,33 × 7,5 inci
  p.title = "Pengujian dan Kalibrasi Alat Kesehatan"; p.company = "RSUD Cipayung"; p.author = "STARS";
  const kaki = (s: PptxGenJS.Slide) => s.addText(`STARS · RSUD Cipayung · ${b.tanggal}`, { x: 0.5, y: 7.05, w: 8, h: 0.3, fontSize: 9, color: ABU });
  let no = 0;
  const slide = (judul: string, sub = "") => {
    const s = p.addSlide(); no++;
    s.addShape(p.ShapeType.rect, { x: 0, y: 1.05, w: 13.33, h: 0.06, fill: { color: TEAL }, line: { color: TEAL } });
    s.addText("PENGUJIAN & KALIBRASI", { x: 0.5, y: 0.2, w: 9, h: 0.3, fontSize: 11, bold: true, color: TEAL, charSpacing: 2 });
    s.addText(judul, { x: 0.5, y: 0.45, w: 12.3, h: 0.55, fontSize: 26, bold: true, color: NAVY });
    if (sub) s.addText(sub, { x: 0.5, y: 1.2, w: 12.3, h: 0.35, fontSize: 12, color: ABU });
    s.addText(String(no), { x: 12.2, y: 7.05, w: 0.6, h: 0.3, fontSize: 9, color: ABU, align: "right" });
    kaki(s);
    return s;
  };

  // Sampul
  const s0 = p.addSlide(); no++;
  s0.background = { color: TEAL };
  s0.addText("LAPORAN", { x: 0.8, y: 2.0, w: 11, h: 0.4, fontSize: 16, bold: true, color: "A7F3D0", charSpacing: 4 });
  s0.addText("Pengujian dan Kalibrasi Alat Kesehatan", { x: 0.8, y: 2.45, w: 11.5, h: 1.4, fontSize: 44, bold: true, color: "FFFFFF" });
  s0.addText(`RSUD Cipayung${b.keterangan ? ` · ${b.keterangan}` : ""}`, { x: 0.8, y: 3.95, w: 11.5, h: 0.5, fontSize: 20, color: "E0F2F1" });
  s0.addText(b.tanggal, { x: 0.8, y: 6.4, w: 8, h: 0.4, fontSize: 14, color: "E0F2F1" });

  // Indikator
  const s1 = slide("Indikator utama", "Status alat dihitung dari catatan pengujian/kalibrasi terbarunya.");
  b.kpi.forEach(([l, v, h], i) => {
    const x = 0.5 + i * 3.1;
    s1.addShape(p.ShapeType.roundRect, { x, y: 2.0, w: 2.9, h: 3.2, fill: { color: "F0FDFA" }, line: { color: "99F6E4" }, rectRadius: 0.12 });
    s1.addText(l, { x: x + 0.2, y: 2.2, w: 2.5, h: 0.7, fontSize: 14, color: ABU, bold: true, valign: "top" });
    s1.addText(v, { x: x + 0.2, y: 3.0, w: 2.5, h: 1.0, fontSize: 40, bold: true, color: NAVY });
    s1.addText(h, { x: x + 0.2, y: 4.1, w: 2.5, h: 0.9, fontSize: 11, color: ABU, valign: "top" });
  });

  // Status
  const s2 = slide("Status kalibrasi alat", `${angka(d.ringkasan.total)} alat · ${angka(d.ringkasan.catatan)} catatan (${angka(d.ringkasan.pengujian)} pengujian) · ${angka(d.ringkasan.sertifikat)} bersertifikat digital`);
  s2.addChart(p.ChartType.bar, [{ name: "Jumlah alat", labels: [...b.status].reverse().map((x) => x.label), values: [...b.status].reverse().map((x) => x.n) }], {
    x: 0.5, y: 1.7, w: 12.3, h: 5.2, barDir: "bar", chartColors: [...b.status].reverse().map((x) => WARNA_STATUS[x.kode]), showValue: true, dataLabelFontSize: 12,
    catAxisLabelFontSize: 13, valAxisHidden: true, valGridLine: { style: "none" }, barGapWidthPct: 60, showLegend: false,
  });

  // Jatuh tempo
  const s3 = slide("Jatuh tempo 12 bulan ke depan", "Jumlah alat yang masa berlakunya habis per bulan — dasar rencana anggaran & jadwal kalibrasi.");
  s3.addChart(p.ChartType.bar, [{ name: "Alat jatuh tempo", labels: d.bulan.map((x) => x.label), values: d.bulan.map((x) => x.jumlah) }], {
    x: 0.5, y: 1.7, w: 12.3, h: 5.2, barDir: "col", chartColors: [TEAL], showValue: true, dataLabelFontSize: 11, catAxisLabelFontSize: 12,
    valAxisLabelFontSize: 10, valGridLine: { color: "E2E8F0", size: 0.5 }, barGapWidthPct: 50, showLegend: false,
  });

  // Lembaga & per tahun
  const s4 = slide("Lembaga penguji & catatan per tahun");
  if (d.lembaga.length) s4.addChart(p.ChartType.bar, [{ name: "Catatan", labels: [...d.lembaga].reverse().map((x) => x.nama), values: [...d.lembaga].reverse().map((x) => x.jumlah) }], {
    x: 0.4, y: 1.5, w: 6.5, h: 5.4, barDir: "bar", chartColors: [TEAL], showValue: true, catAxisLabelFontSize: 10,
    valAxisHidden: true, valGridLine: { style: "none" }, showTitle: true, title: "Jumlah catatan per lembaga", titleFontSize: 13, showLegend: false,
  });
  if (d.perTahun.length) s4.addChart(p.ChartType.bar, [
    { name: "Kalibrasi", labels: d.perTahun.map((x) => String(x.tahun)), values: d.perTahun.map((x) => x.Kalibrasi) },
    { name: "Pengujian", labels: d.perTahun.map((x) => String(x.tahun)), values: d.perTahun.map((x) => x.Pengujian) },
  ], {
    x: 7.1, y: 1.5, w: 5.8, h: 5.4, barDir: "col", barGrouping: "clustered", chartColors: [TEAL, "F59E0B"], showValue: true, dataLabelFontSize: 10,
    showLegend: true, legendPos: "b", valGridLine: { color: "E2E8F0", size: 0.5 }, showTitle: true, title: "Catatan per tahun", titleFontSize: 13,
  });

  // Per unit (tabel, dipecah per 12 baris)
  const gayaKepala = { bold: true, color: "FFFFFF", fill: { color: TEAL } };
  potong(b.unit, 12).forEach((h, i, semua) => {
    const s = slide(`Per unit kerja${semua.length > 1 ? ` (${i + 1}/${semua.length})` : ""}`);
    s.addTable([KEPALA_UNIT.map((t) => ({ text: t, options: gayaKepala })), ...h.map((r) => r.map((t) => ({ text: t })))], {
      x: 0.5, y: 1.5, w: 12.3, colW: [4.3, 1.2, 1.3, 1.3, 1.5, 1.4, 1.3], fontSize: 12, border: { type: "solid", pt: 0.5, color: "CBD5E1" }, autoPage: false,
    });
  });

  // Prioritas
  const s6 = slide("Prioritas tindakan", "Alat kedaluwarsa / tidak laik dan yang habis ≤ 30 hari (maks. 14 teratas).");
  if (b.prioritas.length) s6.addTable([KEPALA_PRIORITAS.map((t) => ({ text: t, options: gayaKepala })), ...b.prioritas.map((r) => r.map((t) => ({ text: t })))], {
    x: 0.5, y: 1.7, w: 12.3, colW: [1.6, 3.4, 2.2, 2.4, 1.3, 1.4], fontSize: 10, border: { type: "solid", pt: 0.5, color: "CBD5E1" }, autoPage: false,
  });
  else s6.addText("Tidak ada alat bermasalah atau jatuh tempo ≤ 30 hari.", { x: 0.5, y: 3, w: 12.3, h: 1, fontSize: 20, color: "059669", align: "center" });

  // Penutup
  const s7 = p.addSlide();
  s7.background = { color: TEAL };
  s7.addText("Terima kasih", { x: 0.8, y: 2.6, w: 11.5, h: 1.2, fontSize: 48, bold: true, color: "FFFFFF" });
  s7.addText("Data bersumber dari STARS — menu Pengujian dan Kalibrasi.", { x: 0.8, y: 3.8, w: 11.5, h: 0.5, fontSize: 18, color: "E0F2F1" });

  return (await p.write({ outputType: "nodebuffer" })) as Buffer;
}

export function buatPdf(d: Data, keterangan: string): Buffer {
  const b = bahan(d, keterangan);
  const W = 338.7, H = 190.5; // 16:9 dalam mm (sama dengan LAYOUT_WIDE)
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: [W, H] });
  const hex = (h: string) => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)] as const;
  const isi = (h: string) => doc.setFillColor(...hex(h));
  const tinta = (h: string) => doc.setTextColor(...hex(h));
  // jsPDF (helvetica) tidak punya glyph "≤" / "·"
  const t = (s: string) => s.replace(/≤/g, "<=").replace(/·/g, "-").replace(/—/g, "-");
  let no = 0;
  const halaman = (judul: string, sub = "") => {
    if (no++) doc.addPage([W, H], "landscape");
    tinta(TEAL); doc.setFont("helvetica", "bold").setFontSize(10).text("PENGUJIAN & KALIBRASI", 13, 10);
    tinta(NAVY); doc.setFontSize(22).text(t(judul), 13, 21);
    isi(TEAL); doc.rect(0, 26, W, 1.4, "F");
    if (sub) { tinta(ABU); doc.setFont("helvetica", "normal").setFontSize(11).text(t(sub), 13, 34); }
    tinta(ABU); doc.setFont("helvetica", "normal").setFontSize(8).text(t(`STARS - RSUD Cipayung - ${b.tanggal}`), 13, H - 6);
    doc.text(String(no), W - 13, H - 6, { align: "right" });
  };
  const sampul = (judul: string, sub: string) => {
    if (no++) doc.addPage([W, H], "landscape");
    isi(TEAL); doc.rect(0, 0, W, H, "F");
    tinta("FFFFFF"); doc.setFont("helvetica", "bold").setFontSize(40).text(doc.splitTextToSize(t(judul), W - 40), 20, 80);
    doc.setFont("helvetica", "normal").setFontSize(16).text(t(sub), 20, 125);
  };
  /** Batang mendatar sederhana. */
  const batangH = (data: { label: string; n: number; warna: string }[], x: number, y: number, w: number, h: number) => {
    const maks = Math.max(1, ...data.map((d) => d.n)), lab = w * 0.32, tinggi = Math.min(16, h / Math.max(data.length, 1));
    data.forEach((dd, i) => {
      const yy = y + i * tinggi;
      tinta(NAVY); doc.setFontSize(10).text(doc.splitTextToSize(t(dd.label), lab - 3).slice(0, 2), x, yy + tinggi / 2);
      isi(dd.warna); doc.roundedRect(x + lab, yy + tinggi * 0.2, Math.max(0.5, ((w - lab - 18) * dd.n) / maks), tinggi * 0.6, 1, 1, "F");
      tinta(NAVY); doc.setFont("helvetica", "bold").text(angka(dd.n), x + lab + ((w - lab - 18) * dd.n) / maks + 2, yy + tinggi / 2 + 1.2); doc.setFont("helvetica", "normal");
    });
  };
  const kolom = (data: { label: string; n: number }[], x: number, y: number, w: number, h: number) => {
    const maks = Math.max(1, ...data.map((d) => d.n)), lb = w / Math.max(data.length, 1);
    doc.setDrawColor(203, 213, 225).line(x, y + h, x + w, y + h);
    data.forEach((dd, i) => {
      const tg = ((h - 10) * dd.n) / maks, xx = x + i * lb;
      isi(TEAL); if (dd.n) doc.roundedRect(xx + lb * 0.2, y + h - tg, lb * 0.6, tg, 1, 1, "F");
      tinta(NAVY); doc.setFontSize(10).text(angka(dd.n), xx + lb / 2, y + h - tg - 2, { align: "center" });
      tinta(ABU); doc.setFontSize(9).text(t(dd.label), xx + lb / 2, y + h + 6, { align: "center" });
    });
  };
  const tabel = (kepala: string[], baris: string[][], lebar: number[], y: number) => {
    let x = 13; const tg = 9;
    isi(TEAL); doc.rect(13, y, lebar.reduce((a, b) => a + b, 0), tg, "F");
    tinta("FFFFFF"); doc.setFont("helvetica", "bold").setFontSize(10);
    kepala.forEach((k, i) => { doc.text(t(k), x + 2, y + 6); x += lebar[i]; });
    doc.setFont("helvetica", "normal").setFontSize(9.5);
    baris.forEach((r, j) => {
      const yy = y + tg * (j + 1); x = 13;
      if (j % 2) { isi("F1F5F9"); doc.rect(13, yy, lebar.reduce((a, b) => a + b, 0), tg, "F"); }
      tinta(NAVY); r.forEach((c, i) => { const s = doc.splitTextToSize(t(c), lebar[i] - 3)[0] ?? ""; doc.text(s, x + 2, yy + 6); x += lebar[i]; });
    });
  };

  sampul("Pengujian dan Kalibrasi Alat Kesehatan", `RSUD Cipayung${b.keterangan ? ` - ${b.keterangan}` : ""} - ${b.tanggal}`);

  halaman("Indikator utama", "Status alat dihitung dari catatan pengujian/kalibrasi terbarunya.");
  b.kpi.forEach(([l, v, h], i) => {
    const x = 13 + i * 79;
    isi("F0FDFA"); doc.setDrawColor(153, 246, 228).roundedRect(x, 50, 74, 80, 3, 3, "FD");
    tinta(ABU); doc.setFont("helvetica", "bold").setFontSize(12).text(doc.splitTextToSize(t(l), 66), x + 5, 60);
    tinta(NAVY); doc.setFontSize(34).text(v, x + 5, 95);
    tinta(ABU); doc.setFont("helvetica", "normal").setFontSize(10).text(doc.splitTextToSize(t(h), 66), x + 5, 110);
  });

  halaman("Status kalibrasi alat", `${angka(d.ringkasan.total)} alat - ${angka(d.ringkasan.catatan)} catatan (${angka(d.ringkasan.pengujian)} pengujian) - ${angka(d.ringkasan.sertifikat)} bersertifikat digital`);
  batangH(b.status.map((s) => ({ label: s.label, n: s.n, warna: WARNA_STATUS[s.kode] })), 13, 48, W - 26, 120);

  halaman("Jatuh tempo 12 bulan ke depan", "Jumlah alat yang masa berlakunya habis per bulan.");
  kolom(d.bulan.map((x) => ({ label: x.label, n: x.jumlah })), 13, 45, W - 26, 120);

  halaman("Lembaga penguji / kalibrator", "Jumlah catatan per lembaga (seluruh riwayat).");
  batangH(d.lembaga.map((x) => ({ label: x.nama, n: x.jumlah, warna: TEAL })), 13, 45, W - 26, 130);

  if (d.perTahun.length) {
    halaman("Catatan per tahun", "Kalibrasi + pengujian menurut tahun pelaksanaan.");
    kolom(d.perTahun.map((x) => ({ label: `${x.tahun} (K ${x.Kalibrasi} / P ${x.Pengujian})`, n: x.Kalibrasi + x.Pengujian })), 13, 45, W - 26, 120);
  }

  potong(b.unit, 13).forEach((h, i, semua) => {
    halaman(`Per unit kerja${semua.length > 1 ? ` (${i + 1}/${semua.length})` : ""}`);
    tabel(KEPALA_UNIT, h, [110, 30, 32, 32, 36, 36, 36], 34);
  });

  halaman("Prioritas tindakan", "Alat kedaluwarsa / tidak laik dan yang habis <= 30 hari (maks. 14 teratas).");
  if (b.prioritas.length) tabel(KEPALA_PRIORITAS, b.prioritas, [40, 90, 55, 62, 33, 32], 40);
  else { tinta("059669"); doc.setFontSize(18).text("Tidak ada alat bermasalah atau jatuh tempo <= 30 hari.", W / 2, 100, { align: "center" }); }

  sampul("Terima kasih", "Data bersumber dari STARS - menu Pengujian dan Kalibrasi.");
  return Buffer.from(doc.output("arraybuffer"));
}
