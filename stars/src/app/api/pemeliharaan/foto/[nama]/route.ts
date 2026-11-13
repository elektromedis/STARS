import { open, stat } from "node:fs/promises";
import { join } from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { sesiApi } from "@/lib/sesi";
import { prisma } from "@/lib/prisma";
import { unitTerkunci } from "@/lib/akses";
import { folderPermintaan } from "@/lib/lapor-simpan";
import { MIME_MEDIA_LAPOR, POLA_MEDIA_LAPOR } from "@/lib/lapor-media";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/pemeliharaan/foto/<nama> — foto/video laporan kerusakan, hanya untuk petugas (Viewer+).
 * Mendukung header Range agar video bisa diputar & digeser (wajib untuk Safari/iPhone).
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ nama: string }> }) {
  const { tolak } = await sesiApi("Viewer");
  if (tolak) return tolak;
  const { nama } = await params;
  const m = POLA_MEDIA_LAPOR.exec(nama);
  if (!m) return NextResponse.json({ error: "Nama berkas tidak valid." }, { status: 400 });
  const kunci = await unitTerkunci();
  if (kunci && !(await prisma.permintaanKerja.findFirst({ where: { OR: [{ foto: nama }, { video: nama }], unitKerja: { nama: kunci.nama } }, select: { id: true } }))) {
    return NextResponse.json({ error: "Berkas ini bukan milik unit kerja Anda." }, { status: 403 });
  }
  const jalur = join(folderPermintaan(), nama);
  let ukuran: number;
  try { ukuran = (await stat(jalur)).size; } catch { return NextResponse.json({ error: "Berkas tidak ditemukan." }, { status: 404 }); }

  const mime = MIME_MEDIA_LAPOR[m[1].toLowerCase()];
  const dasar = { "Content-Type": mime, "Accept-Ranges": "bytes", "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" };
  const r = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range") ?? "");
  let awal = 0, akhir = ukuran - 1, status = 200;
  if (r && (r[1] || r[2])) {
    if (r[1]) { awal = Number(r[1]); if (r[2]) akhir = Math.min(Number(r[2]), ukuran - 1); }
    else { awal = Math.max(0, ukuran - Number(r[2])); }
    if (awal > akhir || awal >= ukuran) return new NextResponse(null, { status: 416, headers: { ...dasar, "Content-Range": `bytes */${ukuran}` } });
    status = 206;
  }
  const panjang = akhir - awal + 1;
  const fh = await open(jalur, "r");
  try {
    const buf = Buffer.alloc(panjang);
    await fh.read(buf, 0, panjang, awal);
    return new NextResponse(new Uint8Array(buf), {
      status,
      headers: { ...dasar, "Content-Length": String(panjang), ...(status === 206 ? { "Content-Range": `bytes ${awal}-${akhir}/${ukuran}` } : {}) },
    });
  } finally { await fh.close(); }
}
