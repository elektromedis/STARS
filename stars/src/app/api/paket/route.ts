import { NextRequest, NextResponse } from "next/server";
import { resolveFilter } from "@/lib/filter";
import { adalahKolomUrut, getPaketList } from "@/lib/queries";

export const dynamic = "force-dynamic";

/** GET /api/paket?tahun=&tahap=&unit=&kategori=&q=&status=terserap|direncanakan&page=1&pageSize=25&urut=nilai&arah=desc */
export async function GET(req: NextRequest) {
  const sp = Object.fromEntries(req.nextUrl.searchParams);
  const { filter } = await resolveFilter(sp);
  const page = Math.max(1, Number(sp.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(sp.pageSize) || 25));
  const urut = adalahKolomUrut(sp.urut) ? sp.urut : undefined;
  const hasil = await getPaketList({ filter, q: sp.q?.trim() || undefined, status: sp.status, page, pageSize, urut, arah: sp.arah === "asc" ? "asc" : "desc" });
  return NextResponse.json({ filter, ...hasil });
}
