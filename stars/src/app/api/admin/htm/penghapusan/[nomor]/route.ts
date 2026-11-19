import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sesiApi } from "@/lib/sesi";
import { alamatQr } from "@/lib/alamat";
import { urlVerifikasi } from "@/lib/tte";
import { logoRsud } from "@/lib/data-p54";
import { pdfPenghapusan } from "@/lib/pdf-htm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ nomor: string }> }) {
  const { tolak } = await sesiApi("Viewer");
  if (tolak) return tolak;
  const h = await prisma.penghapusan.findUnique({ where: { nomor: (await params).nomor } });
  const a = h ? await prisma.alat.findUnique({ where: { id: h.alatId }, include: { unitKerja: true, ruangan: true } }) : null;
  if (!h || !a) return NextResponse.json({ error: "Tidak ditemukan." }, { status: 404 });
  const dasar = alamatQr(req.headers, null, req.nextUrl.origin);
  const tte = (await prisma.tandaTangan.findMany({ where: { nomor: h.nomor } })).map((t) => ({ peran: t.peran, nama: t.nama, waktu: t.waktu, url: urlVerifikasi(dasar, t.token) }));
  const buf = pdfPenghapusan({ ...a, unit: a.unitKerja.nama, ruangan: a.ruangan?.nama ?? a.lokasi }, h, tte, await logoRsud());
  return new NextResponse(new Uint8Array(buf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${h.nomor}.pdf"`, "Cache-Control": "no-store" } });
}
