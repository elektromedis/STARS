import { NextResponse } from "next/server";
import { waktuSinkron } from "@/lib/sinkron";

export const dynamic = "force-dynamic";

/** Cap waktu data terakhir berubah (publik, tanpa isi data) untuk lencana "Data Tersinkron". */
export async function GET() {
  const w = await waktuSinkron();
  return NextResponse.json({ waktu: w?.toISOString() ?? null, cek: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
}
