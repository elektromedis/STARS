import { NextRequest, NextResponse } from "next/server";
import { resolveFilter } from "@/lib/filter";
import { getNilaiPerKategori } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { filter } = await resolveFilter(Object.fromEntries(req.nextUrl.searchParams));
  return NextResponse.json({ filter, data: await getNilaiPerKategori(filter) });
}
