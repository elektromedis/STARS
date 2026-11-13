import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { sesiApi } from "@/lib/sesi";
import { POLA_GAMBAR_RKBU } from "@/lib/rkbu";
import { folderRkbu, mimeGambarRkbu } from "@/lib/rkbu-simpan";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/rkbu/gambar/<uuid>.jpg — logo kop / lampiran dokumen RKBU (perlu login). */
export async function GET(_req: Request, { params }: { params: Promise<{ nama: string }> }) {
  const { tolak } = await sesiApi("Viewer");
  if (tolak) return tolak;
  const { nama } = await params;
  if (!POLA_GAMBAR_RKBU.test(nama)) return NextResponse.json({ error: "Nama berkas tidak valid." }, { status: 400 });
  try {
    const buf = await readFile(join(folderRkbu(), nama));
    return new NextResponse(new Uint8Array(buf), { headers: { "Content-Type": mimeGambarRkbu(nama), "Content-Length": String(buf.byteLength), "Cache-Control": "private, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return NextResponse.json({ error: "Gambar tidak ditemukan." }, { status: 404 });
  }
}
