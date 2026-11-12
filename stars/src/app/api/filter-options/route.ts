import { NextResponse } from "next/server";
import { getFilterOptions } from "@/lib/filter";
import { unitTerkunci } from "@/lib/akses";

export const dynamic = "force-dynamic";

/** Pilihan filter yang tersedia: tahun → tahap, unit kerja, kategori (dibatasi unit untuk akun Viewer ber-unit). */
export async function GET() {
  const kunci = await unitTerkunci();
  return NextResponse.json(await getFilterOptions(kunci?.nama));
}
