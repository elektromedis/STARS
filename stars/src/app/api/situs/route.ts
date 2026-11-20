import { NextResponse } from "next/server";
import { bacaInfoSitus, pengumumanAktif, etalaseAktif } from "@/lib/situs-server";

export const dynamic = "force-dynamic";

/** GET — konten publik bilah situs + pengumuman pop-up aktif. */
export async function GET() {
  const [info, pengumuman, etalase] = await Promise.all([bacaInfoSitus(), pengumumanAktif(), etalaseAktif()]);
  return NextResponse.json({ info, pengumuman, etalase }, { headers: { "Cache-Control": "public, max-age=60" } });
}
