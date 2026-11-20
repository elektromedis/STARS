import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { folderJdih, namaPeraturan, POLA_BERKAS_JDIH } from "@/lib/jdih";

export const runtime = "nodejs";

/** GET — unduh/tampilkan PDF peraturan (publik). ?unduh=1 untuk mengunduh. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const p = await prisma.peraturan.findFirst({ where: { id: Number((await params).id) || 0, aktif: true } });
  if (!p?.berkas || !POLA_BERKAS_JDIH.test(p.berkas)) return new NextResponse("Tidak ditemukan", { status: 404 });
  try {
    const buf = await readFile(join(folderJdih(), p.berkas));
    const nama = namaPeraturan(p).replace(/[^\w.-]+/g, "_") + ".pdf";
    const unduh = new URL(req.url).searchParams.has("unduh");
    return new NextResponse(new Uint8Array(buf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `${unduh ? "attachment" : "inline"}; filename="${nama}"`, "X-Content-Type-Options": "nosniff", "Cache-Control": "public, max-age=3600" } });
  } catch { return new NextResponse("Tidak ditemukan", { status: 404 }); }
}
