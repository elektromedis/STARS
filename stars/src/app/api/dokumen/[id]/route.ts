import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { unitTerkunci } from "@/lib/akses";
import { urlLogin } from "@/lib/alamat";
import { TIPE_DOKUMEN } from "@/lib/dokumen";
import { folderDokumen } from "@/lib/dokumen-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/dokumen/<id> — buka dokumen paket. Wajib login (pengunjung dialihkan ke /login lalu kembali ke sini).
 * Viewer ber-unit hanya boleh membuka dokumen paket unitnya. PDF/gambar tampil di browser, lainnya diunduh.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await auth();
  if (!s?.user) return NextResponse.redirect(urlLogin(req.headers, `/api/dokumen/${encodeURIComponent(id)}`, req.nextUrl.origin));
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) return NextResponse.json({ error: "ID tidak valid." }, { status: 400 });
  const dok = await prisma.dokumenPaket.findUnique({ where: { id: n } });
  if (!dok) return NextResponse.json({ error: "Dokumen tidak ditemukan." }, { status: 404 });

  const kunci = await unitTerkunci();
  if (kunci) {
    const paket = await prisma.paket.findUnique({ where: { kode: dok.paketKode }, select: { unitKerja: { select: { nama: true } } } });
    if (paket?.unitKerja.nama !== kunci.nama) return NextResponse.json({ error: "Dokumen ini bukan milik unit kerja Anda." }, { status: 403 });
  }

  const ext = dok.berkas.split(".").pop()?.toLowerCase() ?? "";
  const tipe = TIPE_DOKUMEN[ext];
  if (!tipe || !/^[0-9a-f-]{36}\.[a-z]+$/i.test(dok.berkas)) return NextResponse.json({ error: "Berkas tidak valid." }, { status: 400 });
  try {
    const buf = await readFile(join(folderDokumen(), dok.berkas));
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
