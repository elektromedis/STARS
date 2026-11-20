import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { folderSitus, POLA_GAMBAR_SITUS } from "@/lib/situs-server";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ nama: string }> }) {
  const { nama } = await params;
  if (!POLA_GAMBAR_SITUS.test(nama)) return new NextResponse("Tidak ditemukan", { status: 404 });
  try {
    const buf = await readFile(join(folderSitus(), nama));
    const mime = nama.endsWith(".png") ? "image/png" : nama.endsWith(".webp") ? "image/webp" : "image/jpeg";
    return new NextResponse(new Uint8Array(buf), { headers: { "Content-Type": mime, "Cache-Control": "public, max-age=31536000, immutable" } });
  } catch { return new NextResponse("Tidak ditemukan", { status: 404 }); }
}
