import { NextRequest, NextResponse } from "next/server";
import { sesiApi } from "@/lib/sesi";
import { unitTerkunci } from "@/lib/akses";
import { daftarSubjek, saringSubjek } from "@/lib/hta";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/hta/cari?q= — cari produk (model alat di inventaris + kandidat) untuk dibandingkan. Perlu login. */
export async function GET(req: NextRequest) {
  const { tolak } = await sesiApi("Viewer");
  if (tolak) return tolak;
  const q = (req.nextUrl.searchParams.get("q") ?? "").slice(0, 100);
  if (q.trim().length < 2) return NextResponse.json({ hasil: [] });
  const kunci = await unitTerkunci();
  return NextResponse.json({ hasil: saringSubjek(await daftarSubjek(kunci?.id), q) });
}
