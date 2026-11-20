import { NextRequest, NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import { BAB, DASAR_UMUM, VERSI_PEDOMAN } from "@/lib/pedoman";
import { logoRsud } from "@/lib/data-p54";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** GET ?format=pdf|doc — unduh Pedoman Penggunaan STARS. Publik (tanpa data pribadi). */
export async function GET(req: NextRequest) {
  const fmt = req.nextUrl.searchParams.get("format") === "doc" ? "doc" : "pdf";
  if (fmt === "doc") {
    const html = `<html><head><meta charset="utf-8"><title>Pedoman STARS</title><style>body{font-family:Calibri,Arial;font-size:11pt}h1{font-size:18pt}h2{font-size:14pt;color:#0f766e;margin-top:18pt}h3{font-size:11.5pt;margin-bottom:2pt}</style></head><body>
<h1>Pedoman Penggunaan STARS</h1><p>Sistem Terintegrasi Alat Kesehatan Rumah Sakit — RSUD Cipayung<br>${VERSI_PEDOMAN}</p>
<h2>Dasar Hukum Umum</h2><ol>${DASAR_UMUM.map((d) => `<li>${esc(d)}</li>`).join("")}</ol>
${BAB.map((b, i) => `<h2>${i + 1}. ${esc(b.judul)}</h2><p><b>Menu:</b> ${esc(b.menu)}<br><b>Tujuan:</b> ${esc(b.tujuan)}<br><b>Peran:</b> ${esc(b.peran)}</p>
<h3>Dasar hukum</h3><ul>${b.dasar.map((d) => `<li>${esc(d)}</li>`).join("")}</ul>
<h3>Standar prosedur operasional (alur penggunaan)</h3><ol>${b.sop.map((d) => `<li>${esc(d)}</li>`).join("")}</ol>
<h3>Referensi</h3><ul>${b.referensi.map((d) => `<li>${esc(d)}</li>`).join("")}</ul>`).join("")}
<h2>Daftar Pustaka</h2><ol>${[...new Set(BAB.flatMap((b) => b.referensi))].sort().map((d) => `<li>${esc(d)}</li>`).join("")}</ol>
<p><i>Nomor dan status peraturan agar diverifikasi berkala di JDIH (peraturan.bpk.go.id / jdih.kemkes.go.id).</i></p></body></html>`;
    return new NextResponse(html, { headers: { "Content-Type": "application/msword; charset=utf-8", "Content-Disposition": 'attachment; filename="Pedoman_STARS.doc"' } });
  }
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const L = 18, W = 174, BAWAH = 280;
  let y = 20;
  const baru = (h: number) => { if (y + h > BAWAH) { doc.addPage(); y = 20; } };
  const tulis = (t: string, o: { size?: number; bold?: boolean; indent?: number; warna?: [number, number, number]; jarak?: number } = {}) => {
    doc.setFont("helvetica", o.bold ? "bold" : "normal").setFontSize(o.size ?? 10).setTextColor(...(o.warna ?? [20, 20, 20]));
    const baris = doc.splitTextToSize(t, W - (o.indent ?? 0)) as string[];
    const tinggi = (o.size ?? 10) * 0.45;
    for (const b of baris) { baru(tinggi); doc.text(b, L + (o.indent ?? 0), y); y += tinggi; }
    y += o.jarak ?? 1.2;
  };
  const daftar = (xs: string[], bernomor: boolean) => xs.forEach((x, i) => tulis(`${bernomor ? `${i + 1}.` : "•"} ${x}`, { indent: 4 }));
  const logo = await logoRsud();
  if (logo) doc.addImage(logo, "PNG", 85, 40, 40, 24.3);
  y = 80; tulis("PEDOMAN PENGGUNAAN STARS", { size: 20, bold: true, warna: [10, 37, 64] });
  tulis("Sistem Terintegrasi Alat Kesehatan Rumah Sakit", { size: 12 });
  tulis("RSUD Cipayung — Instalasi Pemeliharaan Sarana (Elektromedis)", { size: 11 });
  tulis(VERSI_PEDOMAN, { size: 10, jarak: 8 });
  tulis("Isi: dasar hukum, standar prosedur operasional (alur penggunaan), dan referensi untuk setiap fitur STARS.", { size: 10 });
  doc.addPage(); y = 20;
  tulis("DAFTAR ISI", { size: 14, bold: true, jarak: 3 });
  tulis("Dasar Hukum Umum", {}); BAB.forEach((b, i) => tulis(`${i + 1}. ${b.judul}`)); tulis("Daftar Pustaka");
  doc.addPage(); y = 20;
  tulis("DASAR HUKUM UMUM", { size: 14, bold: true, jarak: 3 }); daftar(DASAR_UMUM, true);
  BAB.forEach((b, i) => {
    y += 4; baru(30);
    tulis(`${i + 1}. ${b.judul.toUpperCase()}`, { size: 13, bold: true, warna: [15, 118, 110], jarak: 2 });
    tulis(`Menu: ${b.menu}`); tulis(`Tujuan: ${b.tujuan}`); tulis(`Peran: ${b.peran}`, { jarak: 2 });
    tulis("Dasar hukum", { bold: true }); daftar(b.dasar, false);
    tulis("Standar prosedur operasional (alur penggunaan)", { bold: true }); daftar(b.sop, true);
    tulis("Referensi", { bold: true }); daftar(b.referensi, false);
  });
  doc.addPage(); y = 20;
  tulis("DAFTAR PUSTAKA", { size: 14, bold: true, jarak: 3 });
  daftar([...new Set(BAB.flatMap((b) => b.referensi))].sort(), true);
  y += 4; tulis("Nomor dan status peraturan agar diverifikasi berkala di JDIH (peraturan.bpk.go.id / jdih.kemkes.go.id).", { size: 8.5 });
  const n = doc.getNumberOfPages();
  for (let i = 2; i <= n; i++) { doc.setPage(i); doc.setFontSize(8).setTextColor(130).text(`Pedoman Penggunaan STARS · ${VERSI_PEDOMAN} · hal. ${i}/${n}`, 105, 290, { align: "center" }); }
  return new NextResponse(new Uint8Array(doc.output("arraybuffer")), { headers: { "Content-Type": "application/pdf", "Content-Disposition": 'inline; filename="Pedoman_STARS.pdf"' } });
}
