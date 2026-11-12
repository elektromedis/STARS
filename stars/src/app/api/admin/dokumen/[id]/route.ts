import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sesiApi } from "@/lib/sesi";
import { audit, ipDari } from "@/lib/audit";
import { labelJenis } from "@/lib/dokumen";
import { folderDokumen } from "@/lib/dokumen-data";
import { aksesKelolaPaket } from "@/lib/dokumen-akses";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** DELETE /api/admin/dokumen/<id> — hapus dokumen paket beserta berkasnya (Operator+). */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { sesi, tolak } = await sesiApi("Operator");
  if (tolak) return tolak;
  const n = Number((await params).id);
  if (!Number.isInteger(n) || n <= 0) return NextResponse.json({ error: "ID tidak valid." }, { status: 400 });
  const dok = await prisma.dokumenPaket.findUnique({ where: { id: n } });
  if (!dok) return NextResponse.json({ error: "Dokumen tidak ditemukan." }, { status: 404 });
  const { paket, pesan } = await aksesKelolaPaket(sesi, dok.paketKode);
  if (!paket) return NextResponse.json({ error: pesan }, { status: 403 });
  await prisma.dokumenPaket.delete({ where: { id: n } });
  await unlink(join(folderDokumen(), dok.berkas)).catch(() => {});
  await audit("dokumen.hapus", { email: sesi.user.email, ip: ipDari(req.headers), objek: dok.paketKode, detail: `${labelJenis(dok.jenis)}: ${dok.namaBerkas}` });
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: "Dokumen dihapus." });
}
