import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { unitTerkunci } from "@/lib/akses";
import { urlLogin } from "@/lib/alamat";
import { TIPE_DOKUMEN } from "@/lib/dokumen";
import { folderDokumenAlat, POLA_DOKUMEN_ALAT } from "@/lib/alat-berkas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/alat/dokumen/<id> — buka dokumen alat. Wajib login; Viewer ber-unit hanya dokumen alat unitnya. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await auth();
  if (!s?.user) return NextResponse.redirect(urlLogin(req.headers, `/api/alat/dokumen/${encodeURIComponent(id)}`, req.nextUrl.origin));
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) return NextResponse.json({ error: "ID tidak valid." }, { status: 400 });
  const dok = await prisma.dokumenAlat.findUnique({ where: { id: n }, include: { alat: { select: { unitKerja: { select: { nama: true } } } } } });
  if (!dok) return NextResponse.json({ error: "Dokumen tidak ditemukan." }, { status: 404 });
  const kunci = await unitTerkunci();
  if (kunci && dok.alat.unitKerja.nama !== kunci.nama) return NextResponse.json({ error: "Dokumen ini bukan milik unit kerja Anda." }, { status: 403 });
  const tipe = TIPE_DOKUMEN[dok.berkas.split(".").pop()?.toLowerCase() ?? ""];
  if (!tipe || !POLA_DOKUMEN_ALAT.test(dok.berkas)) return NextResponse.json({ error: "Berkas tidak valid." }, { status: 400 });
  try {
    const buf = await readFile(join(folderDokumenAlat(), dok.berkas));
    const nama = dok.namaBerkas.replace(/[\r\n"]/g, "_");
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": tipe.mime,
        "Content-Length": String(buf.byteLength),
        "Content-Disposition": `${tipe.tampil ? "inline" : "attachment"}; filename="${nama.replace(/[^\x20-\x7e]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(nama)}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Berkas dokumen tidak ditemukan di server." }, { status: 404 });
  }
}
