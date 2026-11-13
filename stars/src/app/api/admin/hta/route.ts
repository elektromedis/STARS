import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sesiApi } from "@/lib/sesi";
import { audit, ipDari } from "@/lib/audit";
import { idSubjek } from "@/lib/hta";
import { dataProdukHta, pesanZodHta, skemaProdukHta } from "@/lib/hta-simpan";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST /api/admin/hta (JSON) — tambah data HTA produk (kandidat baru atau melengkapi model alat di inventaris). Operator+. */
export async function POST(req: NextRequest) {
  const { sesi, tolak } = await sesiApi("Operator");
  if (tolak) return tolak;
  if (process.env.STARS_MODE === "internet") return NextResponse.json({ error: "Server mode internet bersifat baca saja." }, { status: 403 });
  const parsed = skemaProdukHta.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: pesanZodHta(parsed.error) }, { status: 400 });
  const data = dataProdukHta(parsed.data);
  if (await prisma.produkHta.findUnique({ where: { kunci: data.kunci }, select: { id: true } })) return NextResponse.json({ error: "Data HTA untuk merek & tipe ini sudah ada — buka produknya lalu pilih Ubah." }, { status: 409 });
  const p = await prisma.produkHta.create({ data: { ...data, dibuatOleh: sesi!.user.email ?? null, diubahOleh: sesi!.user.email ?? null } });
  await audit("hta.tambah", { email: sesi!.user.email, ip: ipDari(req.headers), objek: [p.merek, p.model].filter(Boolean).join(" ") || p.nama, detail: p.nama });
  revalidatePath("/hta", "layout");
  return NextResponse.json({ ok: "Data HTA tersimpan.", id: p.id, subjek: idSubjek(p.kunci) });
}
