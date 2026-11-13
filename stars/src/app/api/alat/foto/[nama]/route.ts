import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { folderFotoAlat, mimeFotoAlat, POLA_FOTO_ALAT } from "@/lib/alat-berkas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/alat/foto/<uuid>.jpg | <uuid>-kecil.jpg — foto alat, PUBLIK (tampil di Inventaris & detail alat).
 * Nama berkas berganti setiap foto diganti, sehingga boleh di-cache lama oleh browser.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ nama: string }> }) {
  const { nama } = await params;
  if (!POLA_FOTO_ALAT.test(nama)) return NextResponse.json({ error: "Nama berkas tidak valid." }, { status: 400 });
  const utama = nama.replace(/-kecil(\.\w+)$/, "$1");
  if (!(await prisma.alat.findFirst({ where: { foto: utama }, select: { id: true } }))) return NextResponse.json({ error: "Foto tidak ditemukan." }, { status: 404 });
  try {
    const buf = await readFile(join(folderFotoAlat(), nama));
    return new NextResponse(new Uint8Array(buf), {
      headers: { "Content-Type": mimeFotoAlat(nama), "Content-Length": String(buf.byteLength), "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return NextResponse.json({ error: "Foto tidak ditemukan." }, { status: 404 });
  }
}
