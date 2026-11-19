import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sesiApi } from "@/lib/sesi";
import { alamatQr, tautanAlat } from "@/lib/alamat";
import { logoRsud } from "@/lib/data-p54";
import { pdfUjiTerima } from "@/lib/pdf-htm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { tolak } = await sesiApi("Viewer");
  if (tolak) return tolak;
  const a = await prisma.alat.findUnique({ where: { id: Number((await params).id) || 0 }, include: { unitKerja: true, ruangan: true } });
  if (!a) return NextResponse.json({ error: "Alat tidak ditemukan." }, { status: 404 });
  const buf = pdfUjiTerima({ ...a, unit: a.unitKerja.nama, ruangan: a.ruangan?.nama ?? a.lokasi }, await logoRsud(), tautanAlat(alamatQr(req.headers, null, req.nextUrl.origin), a.kode));
  return new NextResponse(new Uint8Array(buf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="Uji_Terima_${a.kode}.pdf"`, "Cache-Control": "no-store" } });
}
