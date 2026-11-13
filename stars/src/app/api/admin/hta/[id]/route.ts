import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sesiApi } from "@/lib/sesi";
import { audit, ipDari } from "@/lib/audit";
import { hapusFotoAlat } from "@/lib/alat-berkas";
import { idSubjek } from "@/lib/hta";
import { dataProdukHta, pesanZodHta, skemaProdukHta } from "@/lib/hta-simpan";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function siapkan(params: Promise<{ id: string }>) {
  const { sesi, tolak } = await sesiApi("Operator");
  if (tolak) return { tolak };
  if (process.env.STARS_MODE === "internet") return { tolak: NextResponse.json({ error: "Server mode internet bersifat baca saja." }, { status: 403 }) };
  const id = Number((await params).id);
  const p = Number.isInteger(id) && id > 0 ? await prisma.produkHta.findUnique({ where: { id } }) : null;
  if (!p) return { tolak: NextResponse.json({ error: "Data HTA tidak ditemukan." }, { status: 404 }) };
  return { sesi: sesi!, p };
}

/** PUT /api/admin/hta/<id> (JSON) — ubah data HTA produk. */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = await siapkan(params);
  if (s.tolak) return s.tolak;
  const parsed = skemaProdukHta.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: pesanZodHta(parsed.error) }, { status: 400 });
  const data = dataProdukHta(parsed.data);
  if (data.kunci !== s.p.kunci && (await prisma.produkHta.findUnique({ where: { kunci: data.kunci }, select: { id: true } }))) {
    return NextResponse.json({ error: "Sudah ada data HTA lain dengan merek & tipe yang sama." }, { status: 409 });
  }
  const p = await prisma.produkHta.update({ where: { id: s.p.id }, data: { ...data, diubahOleh: s.sesi.user.email ?? null } });
  await audit("hta.ubah", { email: s.sesi.user.email, ip: ipDari(req.headers), objek: [p.merek, p.model].filter(Boolean).join(" ") || p.nama });
  revalidatePath("/hta", "layout");
  return NextResponse.json({ ok: "Data HTA diperbarui.", id: p.id, subjek: idSubjek(p.kunci) });
}

/** DELETE /api/admin/hta/<id> — hapus data HTA (unit di inventaris tidak terhapus). */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = await siapkan(params);
  if (s.tolak) return s.tolak;
  await prisma.produkHta.delete({ where: { id: s.p.id } });
  await hapusFotoAlat(s.p.foto);
  await audit("hta.hapus", { email: s.sesi.user.email, ip: ipDari(req.headers), objek: [s.p.merek, s.p.model].filter(Boolean).join(" ") || s.p.nama });
  revalidatePath("/hta", "layout");
  return NextResponse.json({ ok: "Data HTA dihapus." });
}
