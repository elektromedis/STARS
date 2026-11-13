import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sesiApi } from "@/lib/sesi";
import { audit, ipDari } from "@/lib/audit";
import { hapusFotoAlat, simpanFotoAlat } from "@/lib/alat-berkas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function siapkan(params: Promise<{ id: string }>) {
  const { sesi, tolak } = await sesiApi("Operator");
  if (tolak) return { tolak };
  if (process.env.STARS_MODE === "internet") return { tolak: NextResponse.json({ error: "Server mode internet bersifat baca saja." }, { status: 403 }) };
  const id = Number((await params).id);
  const alat = Number.isInteger(id) && id > 0 ? await prisma.alat.findUnique({ where: { id }, select: { id: true, kode: true, foto: true } }) : null;
  if (!alat) return { tolak: NextResponse.json({ error: "Alat tidak ditemukan." }, { status: 404 }) };
  return { sesi: sesi!, alat };
}

/** POST /api/admin/alat/<id>/foto (multipart: foto, kecil) — pasang/ganti foto alat (Operator+). Foto sudah diperkecil di browser. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = await siapkan(params);
  if (s.tolak) return s.tolak;
  const fd = await req.formData();
  const besar = fd.get("foto");
  const kecil = fd.get("kecil");
  if (!(besar instanceof File)) return NextResponse.json({ error: "Pilih foto terlebih dahulu." }, { status: 400 });
  const r = await simpanFotoAlat(besar, kecil instanceof File ? kecil : null);
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: 400 });
  try {
    await prisma.alat.update({ where: { id: s.alat.id }, data: { foto: r.foto } });
  } catch (err) {
    await hapusFotoAlat(r.foto);
    return NextResponse.json({ error: `Gagal menyimpan: ${err instanceof Error ? err.message : String(err)}` }, { status: 500 });
  }
  await hapusFotoAlat(s.alat.foto);
  await audit("alat.foto", { email: s.sesi.user.email, ip: ipDari(req.headers), objek: s.alat.kode, detail: s.alat.foto ? "ganti foto" : "pasang foto" });
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: "Foto alat tersimpan.", foto: r.foto });
}

/** DELETE /api/admin/alat/<id>/foto — hapus foto alat. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = await siapkan(params);
  if (s.tolak) return s.tolak;
  if (!s.alat.foto) return NextResponse.json({ ok: "Alat ini belum punya foto." });
  await prisma.alat.update({ where: { id: s.alat.id }, data: { foto: null } });
  await hapusFotoAlat(s.alat.foto);
  await audit("alat.foto", { email: s.sesi.user.email, ip: ipDari(req.headers), objek: s.alat.kode, detail: "hapus foto" });
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: "Foto alat dihapus." });
}
