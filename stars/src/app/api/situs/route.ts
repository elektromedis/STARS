import { NextResponse } from "next/server";
import { bacaInfoSitus, pengumumanAktif } from "@/lib/situs-server";

export const dynamic = "force-dynamic";

/** GET — konten publik bilah situs + pengumuman pop-up aktif. */
export async function GET() {
  const [info, pengumuman] = await Promise.all([bacaInfoSitus(), pengumumanAktif()]);
  return NextResponse.json({ info, pengumuman }, { headers: { "Cache-Control": "public, max-age=60" } });
}
