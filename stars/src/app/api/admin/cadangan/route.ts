import { readFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sesiApi } from "@/lib/sesi";
import { audit, ipDari } from "@/lib/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/admin/cadangan (Admin+) → salinan konsisten basis data SQLite (.db) lewat `VACUUM INTO`.
 * Simpan berkas ini di lokasi lain (drive RS / cloud) secara berkala. Pulihkan: ganti prisma/dev.db (atau /app/data/stars.db).
 */
export async function GET(req: NextRequest) {
  const { sesi, tolak } = await sesiApi("Admin");
  if (tolak) return tolak;
  const url = process.env.DATABASE_URL ?? "";
  if (!url.startsWith("file:")) return NextResponse.json({ error: "Cadangan lewat tombol hanya untuk SQLite. Untuk PostgreSQL gunakan pg_dump (lihat docs)." }, { status: 400 });

  const stempel = new Date().toISOString().replace(/[:.]/g, "-");
  const tmp = resolve(join(tmpdir(), `stars-cadangan-${stempel}.db`));
  try {
    await prisma.$executeRawUnsafe(`VACUUM INTO '${tmp.replace(/\\/g, "/").replace(/'/g, "''")}'`);
    const data = await readFile(tmp);
    await unlink(tmp).catch(() => {});
    await audit("cadangan.unduh", { email: sesi.user.email, ip: ipDari(req.headers), detail: `${data.byteLength} byte` });
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": "application/vnd.sqlite3",
        "Content-Disposition": `attachment; filename="STARS_cadangan_${stempel}.db"`,
        "Content-Length": String(data.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    await unlink(tmp).catch(() => {});
    return NextResponse.json({ error: `Gagal membuat cadangan: ${err instanceof Error ? err.message : String(err)}` }, { status: 500 });
  }
}
