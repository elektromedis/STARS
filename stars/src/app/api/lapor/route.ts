import { NextRequest, NextResponse } from "next/server";
import { ipDari } from "@/lib/audit";
import { simpanLaporan } from "@/lib/lapor-simpan";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/lapor — laporan kerusakan PUBLIK (multipart): namaAlat, alatId?, unitKerjaId?, lokasi?, pelapor, kontak?,
 * keluhan, prioritas, foto? (≤5 MB), video? (≤20 MB). Balasan: { nomor, kodeLacak } untuk melacak status tanpa akun.
 */
export async function POST(req: NextRequest) {
  let fd: FormData;
  try { fd = await req.formData(); } catch { return NextResponse.json({ error: "Formulir tidak terbaca. Ukuran lampiran mungkin terlalu besar." }, { status: 400 }); }
  const r = await simpanLaporan(fd, ipDari(req.headers));
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json(r);
}
