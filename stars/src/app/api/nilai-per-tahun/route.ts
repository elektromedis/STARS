import { NextRequest, NextResponse } from "next/server";
import { resolveFilter } from "@/lib/filter";
import { getNilaiPerTahun } from "@/lib/queries";

export const dynamic = "force-dynamic";

/** Total nilai per tahun × tahap (opsional ?unit=&kategori=). */
export async function GET(req: NextRequest) {
  const { filter } = await resolveFilter(Object.fromEntries(req.nextUrl.searchParams));
  return NextResponse.json(await getNilaiPerTahun(filter));
}
