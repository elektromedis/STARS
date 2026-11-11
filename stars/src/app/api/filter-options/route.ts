import { NextResponse } from "next/server";
import { getFilterOptions } from "@/lib/filter";

export const dynamic = "force-dynamic";

/** Pilihan filter yang tersedia: tahun → tahap, unit kerja, kategori. */
export async function GET() {
  return NextResponse.json(await getFilterOptions());
}
