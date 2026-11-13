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
  const p = Number.isInteger(id) && id > 0 ? await prisma.produkHta.findUnique({ where: { id }, select: { id: true, nama: true, merek: true, model: true, foto: true } }) : null;
  if (!p) return { tolak: NextResponse.json({ error: "Data HTA tidak ditemukan." }, { status: 404 }) };
  return { sesi: sesi!, p };
}
const label = (p: { nama: string; merek: string | null; model: string | null }) => [p.merek, p.model].filter(Boolean).join(" ") || p.nama;

/** POST /api/admin/hta/<id>/foto (multipart: foto, kecil) — foto produk (sudah diperkecil di browser). */
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
    await prisma.produkHta.update({ where: { id: s.p.id }, data: { foto: r.foto } });
  } catch (err) {
    await hapusFotoAlat(r.foto);
    return NextResponse.json({ error: `Gagal menyimpan: ${err instanceof Error ? err.message : String(err)}` }, { status: 500 });
  }
  await hapusFotoAlat(s.p.foto);
  await audit("hta.foto", { email: s.sesi.user.email, ip: ipDari(req.headers), objek: label(s.p), detail: s.p.foto ? "ganti foto" : "pasang foto" });
  revalidatePath("/hta", "layout");
  return NextResponse.json({ ok: "Foto produk tersimpan.", foto: r.foto });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = await siapkan(params);
  if (s.tolak) return s.tolak;
  if (!s.p.foto) return NextResponse.json({ ok: "Produk ini belum punya foto." });
  await prisma.produkHta.update({ where: { id: s.p.id }, data: { foto: null } });
  await hapusFotoAlat(s.p.foto);
  await audit("hta.foto", { email: s.sesi.user.email, ip: ipDari(req.headers), objek: label(s.p), detail: "hapus foto" });
  revalidatePath("/hta", "layout");
  return NextResponse.json({ ok: "Foto produk dihapus." });
}
