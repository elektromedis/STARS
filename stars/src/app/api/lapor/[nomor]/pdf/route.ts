import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ipDari } from "@/lib/audit";
import { batasi } from "@/lib/rate-limit";
import { sesiApi } from "@/lib/sesi";
import { laporanKerusakanPdf } from "@/lib/pdf";
import { folderPermintaan } from "@/lib/lapor-simpan";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const sama = (a: string, b: string) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };

/**
 * GET /api/lapor/<nomor>/pdf?kode=<kodeLacak> — PDF bukti laporan kerusakan.
 * Akses: pemegang kode lacak (pelapor & penerima pesan WhatsApp-nya) atau petugas yang login (Viewer ke atas).
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ nomor: string }> }) {
  const b = batasi(`lapor-pdf:${ipDari(req.headers) ?? "lokal"}`, 60, 10 * 60 * 1000);
  if (!b.boleh) return NextResponse.json({ error: "Terlalu sering. Coba lagi sebentar." }, { status: 429 });
  const nomor = decodeURIComponent((await params).nomor).slice(0, 40);
  const kode = req.nextUrl.searchParams.get("kode")?.slice(0, 40) ?? "";
  const l = await prisma.permintaanKerja.findUnique({
    where: { nomor },
    include: { unitKerja: { select: { nama: true } }, alat: { select: { kode: true, nomorSeri: true } } },
  });
  const bolehKode = !!(l?.kodeLacak && kode && sama(l.kodeLacak, kode));
  if (!l || !(bolehKode || !(await sesiApi("Viewer")).tolak)) return NextResponse.json({ error: "Laporan tidak ditemukan atau kode tidak cocok." }, { status: 404 });

  let foto: { data: Buffer; jenis: "JPEG" | "PNG" } | null = null;
  if (l.foto && /\.(jpe?g|png)$/i.test(l.foto) && !l.foto.includes("/") && !l.foto.includes("\\")) {
    try { foto = { data: await readFile(join(folderPermintaan(), l.foto)), jenis: /\.png$/i.test(l.foto) ? "PNG" : "JPEG" }; } catch { foto = null; }
  }
  const pdf = laporanKerusakanPdf({
    nomor: l.nomor, createdAt: l.createdAt, status: l.status, prioritas: l.prioritas, namaAlat: l.namaAlat,
    kodeAlat: l.alat?.kode ?? null, nomorSeri: l.alat?.nomorSeri ?? null, unit: l.unitKerja?.nama ?? null, lokasi: l.lokasi,
    pelapor: l.pelapor, kontak: l.kontak, keluhan: l.keluhan, adaVideo: !!l.video, foto, alamatLacak: `${req.nextUrl.origin}/riwayat`,
  });
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${req.nextUrl.searchParams.get("unduh") === "1" ? "attachment" : "inline"}; filename="Laporan-${l.nomor}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
