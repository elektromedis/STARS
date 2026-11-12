import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { sesiApi } from "@/lib/sesi";
import { prisma } from "@/lib/prisma";
import { unitTerkunci } from "@/lib/akses";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TIPE: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

/** GET /api/pemeliharaan/foto/<nama> — foto laporan kerusakan, hanya untuk petugas (Viewer+). */
export async function GET(_req: Request, { params }: { params: Promise<{ nama: string }> }) {
  const { tolak } = await sesiApi("Viewer");
  if (tolak) return tolak;
  const { nama } = await params;
  // Hanya izinkan nama berkas aman: uuid.ext (tanpa path traversal)
  const m = /^[0-9a-f-]{36}\.(jpg|png|webp)$/i.exec(nama);
  if (!m) return NextResponse.json({ error: "Nama berkas tidak valid." }, { status: 400 });
  const kunci = await unitTerkunci();
  if (kunci && !(await prisma.permintaanKerja.findFirst({ where: { foto: nama, unitKerja: { nama: kunci.nama } }, select: { id: true } }))) {
    return NextResponse.json({ error: "Foto ini bukan milik unit kerja Anda." }, { status: 403 });
  }
  try {
    const dir = join(process.env.UPLOAD_DIR || join(process.cwd(), "uploads"), "permintaan");
    const buf = await readFile(join(dir, nama));
    return new NextResponse(new Uint8Array(buf), { headers: { "Content-Type": TIPE[m[1].toLowerCase()], "Cache-Control": "private, max-age=3600" } });
  } catch {
    return NextResponse.json({ error: "Foto tidak ditemukan." }, { status: 404 });
  }
}
