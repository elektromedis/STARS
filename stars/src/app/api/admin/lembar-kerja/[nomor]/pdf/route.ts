import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sesiApi } from "@/lib/sesi";
import { alamatQr } from "@/lib/alamat";
import { logoRsud } from "@/lib/data-p54";
import { urlVerifikasi } from "@/lib/tte";
import { pdfLembarKerja } from "@/lib/pdf-lk";
import type { IsiLK } from "@/lib/lembar-kerja";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ nomor: string }> }) {
  const { tolak } = await sesiApi("Viewer");
  if (tolak) return tolak;
  const l = await prisma.lembarKerja.findUnique({ where: { nomor: (await params).nomor } });
  if (!l) return NextResponse.json({ error: "Tidak ditemukan." }, { status: 404 });
  const a = await prisma.alat.findUnique({ where: { id: l.alatId }, include: { unitKerja: true, ruangan: true } });
  if (!a) return NextResponse.json({ error: "Alat tidak ditemukan." }, { status: 404 });
  const dasar = alamatQr(req.headers, null, req.nextUrl.origin);
  const tte = (await prisma.tandaTangan.findMany({ where: { nomor: l.nomor } })).map((t) => ({ ...t, url: urlVerifikasi(dasar, t.token) }));
  const buf = pdfLembarKerja(l, { ...a, unit: a.unitKerja.nama, ruangan: a.ruangan?.nama ?? a.lokasi }, JSON.parse(l.data) as IsiLK, tte, await logoRsud());
  return new NextResponse(new Uint8Array(buf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${l.nomor}.pdf"`, "Cache-Control": "no-store" } });
}
