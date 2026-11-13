import { NextRequest, NextResponse } from "next/server";
import { sesiApi } from "@/lib/sesi";
import { simpanGambarRkbu } from "@/lib/rkbu-simpan";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST /api/admin/rkbu/gambar (multipart: gambar) — logo kop / gambar lampiran (sudah diperkecil di browser). Operator+. */
export async function POST(req: NextRequest) {
  const { tolak } = await sesiApi("Operator");
  if (tolak) return tolak;
  if (process.env.STARS_MODE === "internet") return NextResponse.json({ error: "Server mode internet bersifat baca saja." }, { status: 403 });
  const f = (await req.formData()).get("gambar");
  if (!(f instanceof File)) return NextResponse.json({ error: "Pilih gambar terlebih dahulu." }, { status: 400 });
  const r = await simpanGambarRkbu(f);
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ ok: "Gambar terunggah.", gambar: r.gambar });
}
