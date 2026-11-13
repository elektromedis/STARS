import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sesiApi } from "@/lib/sesi";
import { audit, ipDari } from "@/lib/audit";
import { infoJenisDokumenAlat } from "@/lib/dokumen-alat";
import { hapusDokumenAlatJikaYatim } from "@/lib/alat-berkas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** DELETE /api/admin/alat/dokumen/<id>[?semua=1] — lepas dokumen dari alat ini (atau dari semua alat yang memakai berkas sama). */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { sesi, tolak } = await sesiApi("Operator");
  if (tolak) return tolak;
  if (process.env.STARS_MODE === "internet") return NextResponse.json({ error: "Server mode internet bersifat baca saja." }, { status: 403 });
  const id = Number((await params).id);
  const dok = Number.isInteger(id) && id > 0 ? await prisma.dokumenAlat.findUnique({ where: { id }, include: { alat: { select: { kode: true } } } }) : null;
  if (!dok) return NextResponse.json({ error: "Dokumen tidak ditemukan." }, { status: 404 });
  const semua = req.nextUrl.searchParams.get("semua") === "1";
  const r = semua ? await prisma.dokumenAlat.deleteMany({ where: { berkas: dok.berkas } }) : await prisma.dokumenAlat.deleteMany({ where: { id } });
  await hapusDokumenAlatJikaYatim(dok.berkas);
  await audit("alat.dokumen.hapus", { email: sesi.user.email, ip: ipDari(req.headers), objek: dok.alat.kode, detail: `${infoJenisDokumenAlat(dok.jenis)?.label ?? dok.jenis}: ${dok.namaBerkas}${r.count > 1 ? ` (dari ${r.count} alat)` : ""}` });
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: r.count > 1 ? `Dokumen dilepas dari ${r.count} alat.` : "Dokumen dihapus." });
}
