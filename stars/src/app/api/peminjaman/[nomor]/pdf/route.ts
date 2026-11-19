import { NextRequest, NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import { prisma } from "@/lib/prisma";
import { sesiApi } from "@/lib/sesi";
import { gambarQr } from "@/lib/label-qr";
import { alamatQr } from "@/lib/alamat";
import { urlVerifikasi } from "@/lib/tte";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const fmt = (d: Date | null) => (d ? d.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "long", year: "numeric" }) : "—");

/** GET — formulir peminjaman alat (PDF) dengan kotak TTE ber-QR verifikasi. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ nomor: string }> }) {
  const { tolak } = await sesiApi("Viewer");
  if (tolak) return tolak;
  const { nomor } = await params;
  const p = await prisma.peminjaman.findUnique({ where: { nomor } });
  if (!p) return NextResponse.json({ error: "Tidak ditemukan." }, { status: 404 });
  const [alat, unit, tt] = await Promise.all([
    prisma.alat.findUnique({ where: { id: p.alatId }, select: { kode: true, nama: true, merek: true, model: true, nomorSeri: true } }),
    prisma.unitKerja.findMany({ where: { id: { in: [p.dariUnitId, p.keUnitId] } }, select: { id: true, nama: true } }),
    prisma.tandaTangan.findMany({ where: { nomor } }),
  ]);
  const un = (id: number) => unit.find((u) => u.id === id)?.nama ?? "—";
  const dasar = alamatQr(req.headers, null, req.nextUrl.origin);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setFont("helvetica", "bold").setFontSize(14).text("FORMULIR PEMINJAMAN ALAT ANTAR UNIT KERJA", 105, 18, { align: "center" });
  doc.setFont("helvetica", "normal").setFontSize(10).text(`RSUD Cipayung · STARS · Nomor ${p.nomor} · Status: ${p.status}`, 105, 25, { align: "center" });
  const baris: [string, string][] = [
    ["Alat", `${alat?.nama ?? "—"} (${alat?.kode ?? "—"})`], ["Merek / model / SN", [alat?.merek, alat?.model, alat?.nomorSeri].filter(Boolean).join(" / ") || "—"],
    ["Unit pemilik", un(p.dariUnitId)], ["Unit peminjam", un(p.keUnitId)], ["Nama peminjam", p.peminjam], ["Keperluan", p.keperluan],
    ["Tanggal pinjam", fmt(p.tanggalPinjam)], ["Rencana kembali", fmt(p.rencanaKembali)], ["Tanggal kembali", fmt(p.tanggalKembali)], ["Kondisi kembali", p.kondisiKembali ?? "—"],
    ["Tag RFID", "Dalam pengembangan"],
  ];
  let y = 36;
  for (const [k, v] of baris) {
    const t = doc.splitTextToSize(v, 125) as string[];
    doc.setFont("helvetica", "bold").text(k, 20, y); doc.setFont("helvetica", "normal").text(t, 65, y);
    y += 6.5 * t.length;
  }
  const kotak: [string, string][] = [["Pemberi", "Disetujui oleh (unit/elektromedis)"], ["Penerima", "Diterima oleh (unit peminjam)"], ["Pengembalian", "Diterima kembali oleh"]];
  y += 6;
  kotak.forEach(([peran, judul], i) => {
    const x = 15 + i * 61, t = tt.find((z) => z.peran === peran);
    doc.setDrawColor(150).roundedRect(x, y, 58, 62, 2, 2);
    doc.setFontSize(8.5).setFont("helvetica", "bold").text(judul, x + 29, y + 6, { align: "center" });
    if (t) {
      gambarQr(doc, urlVerifikasi(dasar, t.token), x + 16, y + 9, 26);
      doc.setFontSize(6.5).setFont("helvetica", "normal").text("DITANDATANGANI SECARA ELEKTRONIK", x + 29, y + 40, { align: "center" });
      doc.setFontSize(8.5).setFont("helvetica", "bold").text(doc.splitTextToSize(t.nama, 54) as string[], x + 29, y + 46, { align: "center" });
      doc.setFontSize(7).setFont("helvetica", "normal").text(t.waktu.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }), x + 29, y + 57, { align: "center" });
    } else doc.setFontSize(8).setFont("helvetica", "italic").text("(belum ditandatangani)", x + 29, y + 35, { align: "center" });
  });
  doc.setFontSize(7.5).setFont("helvetica", "normal").text("Pindai QR untuk memverifikasi keaslian tanda tangan elektronik di STARS.", 105, y + 70, { align: "center" });
  return new NextResponse(new Uint8Array(doc.output("arraybuffer")), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${p.nomor}.pdf"`, "Cache-Control": "no-store" } });
}
