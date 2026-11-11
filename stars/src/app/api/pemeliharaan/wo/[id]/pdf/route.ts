import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sesiApi } from "@/lib/sesi";
import { lembarKerjaPdf } from "@/lib/pdf";
import { urai } from "@/lib/pemeliharaan";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/pemeliharaan/wo/<id>/pdf — lembar kerja PDF (Viewer+). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tolak } = await sesiApi("Viewer");
  if (tolak) return tolak;
  const { id } = await params;
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) return NextResponse.json({ error: "ID tidak valid." }, { status: 400 });
  const wo = await prisma.perintahKerja.findUnique({
    where: { id: n },
    include: { teknisi: { select: { nama: true } }, permintaan: { select: { nomor: true, pelapor: true, kontak: true } }, alat: { include: { unitKerja: { select: { nama: true } }, ruangan: { select: { nama: true } } } } },
  });
  if (!wo) return NextResponse.json({ error: "Perintah kerja tidak ditemukan." }, { status: 404 });
  const buf = lembarKerjaPdf({
    ...wo, teknisi: wo.teknisi?.nama ?? null, tugas: urai(wo.checklist),
    alat: wo.alat ? { kode: wo.alat.kode, nama: wo.alat.nama, merek: wo.alat.merek, model: wo.alat.model, nomorSeri: wo.alat.nomorSeri, unit: wo.alat.unitKerja.nama, ruangan: wo.alat.ruangan?.nama ?? null } : null,
  });
  return new NextResponse(new Uint8Array(buf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${wo.nomor}.pdf"` } });
}
