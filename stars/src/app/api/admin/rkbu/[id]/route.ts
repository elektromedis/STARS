import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sesiApi } from "@/lib/sesi";
import { audit, ipDari } from "@/lib/audit";
import { bersihkanGambarRkbu, gambarAda, pesanZod, ringkasRkbu, skemaSimpanRkbu } from "@/lib/rkbu-simpan";
import type { IsiRkbu } from "@/lib/rkbu";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function siapkan(params: Promise<{ id: string }>) {
  const { sesi, tolak } = await sesiApi("Operator");
  if (tolak) return { tolak };
  if (process.env.STARS_MODE === "internet") return { tolak: NextResponse.json({ error: "Server mode internet bersifat baca saja." }, { status: 403 }) };
  const id = Number((await params).id);
  const d = Number.isInteger(id) && id > 0 ? await prisma.dokumenRkbu.findUnique({ where: { id }, select: { id: true, judul: true, updatedAt: true } }) : null;
  if (!d) return { tolak: NextResponse.json({ error: "Dokumen tidak ditemukan." }, { status: 404 }) };
  return { sesi: sesi!, d };
}

/** PUT /api/admin/rkbu/<id> (JSON {judul, isi, versi?}) — simpan perubahan. `versi` = updatedAt saat dibuka (cegah menimpa perubahan orang lain). */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = await siapkan(params);
  if (s.tolak) return s.tolak;
  const body = (await req.json().catch(() => null)) as { versi?: string; paksa?: boolean } | null;
  const parsed = skemaSimpanRkbu.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: pesanZod(parsed.error) }, { status: 400 });
  if (body?.versi && !body.paksa && new Date(body.versi).getTime() !== s.d.updatedAt.getTime()) {
    return NextResponse.json({ error: "Dokumen ini sudah diubah orang lain sejak Anda membukanya.", konflik: true }, { status: 409 });
  }
  const isi = parsed.data.isi as IsiRkbu;
  const salah = await gambarAda(isi);
  if (salah) return NextResponse.json({ error: salah }, { status: 400 });
  const d = await prisma.dokumenRkbu.update({ where: { id: s.d.id }, data: { ...ringkasRkbu(parsed.data.judul, isi), diubahOleh: s.sesi.user.email ?? null } });
  await audit("rkbu.ubah", { email: s.sesi.user.email, ip: ipDari(req.headers), objek: d.judul, detail: `${isi.baris.length} baris` });
  await bersihkanGambarRkbu();
  revalidatePath("/rkbu");
  return NextResponse.json({ ok: "Perubahan tersimpan.", id: d.id, diperbarui: d.updatedAt.toISOString() });
}

/** DELETE /api/admin/rkbu/<id> — hapus dokumen (data Paket tidak berubah). */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = await siapkan(params);
  if (s.tolak) return s.tolak;
  await prisma.dokumenRkbu.delete({ where: { id: s.d.id } });
  await audit("rkbu.hapus", { email: s.sesi.user.email, ip: ipDari(req.headers), objek: s.d.judul });
  await bersihkanGambarRkbu();
  revalidatePath("/rkbu");
  return NextResponse.json({ ok: "Dokumen dihapus." });
}
