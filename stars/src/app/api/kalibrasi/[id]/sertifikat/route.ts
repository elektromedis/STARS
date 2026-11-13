import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { unitTerkunci } from "@/lib/akses";
import { urlLogin } from "@/lib/alamat";
import { tipeSertifikat } from "@/lib/kalibrasi";
import { folderKalibrasi, POLA_BERKAS } from "@/lib/kalibrasi-berkas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/kalibrasi/<id>/sertifikat — buka sertifikat kalibrasi. Wajib login; Viewer ber-unit hanya alat unitnya. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await auth();
  if (!s?.user) return NextResponse.redirect(urlLogin(req.headers, `/api/kalibrasi/${encodeURIComponent(id)}/sertifikat`, req.nextUrl.origin));
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) return NextResponse.json({ error: "ID tidak valid." }, { status: 400 });
  const k = await prisma.kalibrasi.findUnique({ where: { id: n }, select: { berkas: true, namaBerkas: true, alat: { select: { unitKerja: { select: { nama: true } } } } } });
  if (!k?.berkas) return NextResponse.json({ error: "Sertifikat tidak ditemukan." }, { status: 404 });
  const kunci = await unitTerkunci();
  if (kunci && k.alat.unitKerja.nama !== kunci.nama) return NextResponse.json({ error: "Sertifikat ini bukan milik unit kerja Anda." }, { status: 403 });
  const ext = k.berkas.split(".").pop()?.toLowerCase() ?? "";
  const tipe = tipeSertifikat(ext);
  if (!tipe || !POLA_BERKAS.test(k.berkas)) return NextResponse.json({ error: "Berkas tidak valid." }, { status: 400 });
  try {
    const buf = await readFile(join(folderKalibrasi(), k.berkas));
    const nama = (k.namaBerkas ?? `sertifikat.${ext}`).replace(/[\r\n"]/g, "_");
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": tipe.mime,
        "Content-Length": String(buf.byteLength),
        "Content-Disposition": `inline; filename="${nama.replace(/[^\x20-\x7e]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(nama)}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Berkas sertifikat tidak ditemukan di server." }, { status: 404 });
  }
}
