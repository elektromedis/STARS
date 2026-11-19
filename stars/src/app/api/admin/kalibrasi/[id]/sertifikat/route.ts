import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sesiApi } from "@/lib/sesi";
import { unitTerkunci } from "@/lib/akses";
import { pdfSertifikat } from "@/lib/pdf-p54";
import { keDataUji, logoRsud, pilihUji } from "@/lib/data-p54";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET — sertifikat (laik) / surat keterangan (tidak laik) format Lampiran II Permenkes 54/2015. */
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { tolak } = await sesiApi("Viewer");
  if (tolak) return tolak;
  const k = await prisma.kalibrasi.findUnique({ where: { id: Number((await params).id) || 0 }, select: pilihUji });
  const kunci = await unitTerkunci();
  if (!k || (kunci && k.alat.unitKerja.nama !== kunci.nama)) return NextResponse.json({ error: "Tidak ditemukan." }, { status: 404 });
  const buf = pdfSertifikat(keDataUji(k), await logoRsud());
  return new NextResponse(new Uint8Array(buf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${k.laik ? "Sertifikat" : "Surat_Keterangan"}_${k.alat.nama.replace(/[^\w-]+/g, "_")}.pdf"`, "Cache-Control": "no-store" } });
}
