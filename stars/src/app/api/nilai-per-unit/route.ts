import { NextRequest, NextResponse } from "next/server";
import { resolveFilter } from "@/lib/filter";
import { getNilaiPerUnit } from "@/lib/queries";

export const dynamic = "force-dynamic";

/** GET /api/nilai-per-unit?tahun=&tahap=&limit=8 */
export async function GET(req: NextRequest) {
  const sp = Object.fromEntries(req.nextUrl.searchParams);
  const { filter } = await resolveFilter(sp);
  const limit = sp.limit ? Math.max(1, Math.min(50, Number(sp.limit))) : undefined;
  return NextResponse.json({ filter, data: await getNilaiPerUnit(filter, limit) });
}
