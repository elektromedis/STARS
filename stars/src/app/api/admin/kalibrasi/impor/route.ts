import { NextRequest, NextResponse } from "next/server";
import { sesiApi } from "@/lib/sesi";
import { unitTerkunci } from "@/lib/akses";
import { bacaImporKalibrasi, templatImporKalibrasi } from "@/lib/kalibrasi-impor";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET — unduh templat Excel impor sertifikat kalibrasi. */
export async function GET() {
  const { tolak } = await sesiApi("Viewer");
  if (tolak) return tolak;
  return new NextResponse(new Uint8Array(templatImporKalibrasi()), {
    headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": 'attachment; filename="Templat-Impor-Sertifikat-Kalibrasi.xlsx"' },
  });
}

/** POST (multipart: excel) — Operator+. Baca & validasi baris; TIDAK menyimpan (penyimpanan per kelompok berkas lewat POST /api/admin/kalibrasi). */
export async function POST(req: NextRequest) {
  const { tolak } = await sesiApi("Operator");
  if (tolak) return tolak;
  if (process.env.STARS_MODE === "internet") return NextResponse.json({ error: "Server mode internet bersifat baca saja." }, { status: 403 });
  const f = (await req.formData()).get("excel");
  if (!(f instanceof File) || f.size === 0) return NextResponse.json({ error: "Pilih berkas Excel." }, { status: 400 });
  if (f.size > 10 * 1024 * 1024) return NextResponse.json({ error: "Berkas Excel melebihi 10 MB." }, { status: 413 });
  const kunci = await unitTerkunci();
  const r = await bacaImporKalibrasi(Buffer.from(await f.arrayBuffer()), kunci?.id ?? null);
  if ("error" in r) return NextResponse.json(r, { status: 400 });
  return NextResponse.json(r);
}
