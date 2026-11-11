import { NextRequest, NextResponse } from "next/server";
import { resolveFilter } from "@/lib/filter";
import { getRingkasan } from "@/lib/queries";

export const dynamic = "force-dynamic";

/** GET /api/ringkasan?tahun=2026&tahap=Perubahan&unit=IGD&kategori=... */
export async function GET(req: NextRequest) {
  const { filter } = await resolveFilter(Object.fromEntries(req.nextUrl.searchParams));
  const data = await getRingkasan(filter);
  return NextResponse.json({ filter, data });
}
