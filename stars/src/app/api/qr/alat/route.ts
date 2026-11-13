import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { alamatQr, tautanAlat } from "@/lib/alamat";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/qr/alat?kode=<kode>[&alamat=https://…] — gambar QR (SVG) satu alat, PUBLIK.
 * Isinya sama dengan label cetak: <alamat STARS>/alat?kode=<kode> (detail inventaris alat + tombol Lapor Kerusakan).
 * Hanya untuk alat aktif yang terdaftar, sehingga tidak bisa dipakai sebagai pembuat QR sembarang.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const kode = sp.get("kode")?.trim().slice(0, 120);
  if (!kode) return NextResponse.json({ error: "Parameter kode wajib." }, { status: 400 });
  const alat = await prisma.alat.findFirst({ where: { kode, aktif: true }, select: { kode: true } });
  if (!alat) return NextResponse.json({ error: "Alat tidak ditemukan." }, { status: 404 });
  const isi = tautanAlat(alamatQr(req.headers, sp.get("alamat"), req.nextUrl.origin), alat.kode);
  const svg = await QRCode.toString(isi, { type: "svg", errorCorrectionLevel: "M", margin: 2, color: { dark: "#000000", light: "#ffffff" } });
  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
