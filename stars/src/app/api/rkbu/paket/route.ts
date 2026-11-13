import { NextRequest, NextResponse } from "next/server";
import { sesiApi } from "@/lib/sesi";
import { unitTerkunci } from "@/lib/akses";
import { barisDariPaket } from "@/lib/rkbu-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/rkbu/paket?tahun=&tahap=&jenis=&unit=&rekening=&kategori= — baris Paket untuk tabel RKBU. Perlu login. */
export async function GET(req: NextRequest) {
  const { tolak } = await sesiApi("Viewer");
  if (tolak) return tolak;
  const sp = req.nextUrl.searchParams;
  const tahun = Number(sp.get("tahun"));
  const tahap = sp.get("tahap") ?? "";
  if (!Number.isInteger(tahun) || !tahap) return NextResponse.json({ error: "Tahun dan tahap wajib dipilih." }, { status: 400 });
  const kunci = await unitTerkunci();
  const r = await barisDariPaket({ tahun, tahap, jenis: sp.get("jenis") || null, unit: sp.get("unit") || null, rekening: sp.get("rekening") || null, kategori: sp.get("kategori") || null }, kunci?.nama);
  return NextResponse.json(r);
}
