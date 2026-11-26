import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sesiApi } from "@/lib/sesi";
import { folderDokumenAlat, POLA_DOKUMEN_ALAT } from "@/lib/alat-berkas";
import { TIPE_DOKUMEN } from "@/lib/dokumen";

/** Unduh berkas penerimaan alat (kontrak, BAP). Perlu login. */
export async function GET(_r: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tolak } = await sesiApi("Viewer");
  if (tolak) return tolak;
  const b = await prisma.berkasPenerimaan.findUnique({ where: { id: Number((await params).id) || 0 } });
  if (!b || !POLA_DOKUMEN_ALAT.test(b.berkas)) return NextResponse.json({ error: "Berkas tidak ditemukan." }, { status: 404 });
  try {
    const buf = await readFile(join(folderDokumenAlat(), b.berkas));
    const ext = b.berkas.split(".").pop() ?? "";
    return new NextResponse(new Uint8Array(buf), { headers: { "Content-Type": TIPE_DOKUMEN[ext]?.mime ?? "application/octet-stream", "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(b.nama)}`, "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store" } });
  } catch { return NextResponse.json({ error: "Berkas hilang dari penyimpanan." }, { status: 404 }); }
}
