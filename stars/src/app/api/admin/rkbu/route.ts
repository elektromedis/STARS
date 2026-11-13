import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sesiApi } from "@/lib/sesi";
import { audit, ipDari } from "@/lib/audit";
import { bersihkanGambarRkbu, gambarAda, pesanZod, ringkasRkbu, skemaSimpanRkbu } from "@/lib/rkbu-simpan";
import type { IsiRkbu } from "@/lib/rkbu";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST /api/admin/rkbu (JSON {judul, isi}) — simpan dokumen RKBU baru. Operator+. */
export async function POST(req: NextRequest) {
  const { sesi, tolak } = await sesiApi("Operator");
  if (tolak) return tolak;
  if (process.env.STARS_MODE === "internet") return NextResponse.json({ error: "Server mode internet bersifat baca saja." }, { status: 403 });
  const parsed = skemaSimpanRkbu.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: pesanZod(parsed.error) }, { status: 400 });
  const isi = parsed.data.isi as IsiRkbu;
  const salah = await gambarAda(isi);
  if (salah) return NextResponse.json({ error: salah }, { status: 400 });
  const email = sesi!.user.email ?? null;
  const d = await prisma.dokumenRkbu.create({ data: { ...ringkasRkbu(parsed.data.judul, isi), dibuatOleh: email, diubahOleh: email } });
  await audit("rkbu.buat", { email, ip: ipDari(req.headers), objek: d.judul, detail: `${isi.baris.length} baris; ${isi.jenis} ${isi.tahap} ${isi.tahun}` });
  await bersihkanGambarRkbu();
  revalidatePath("/rkbu");
  return NextResponse.json({ ok: "Dokumen tersimpan.", id: d.id, diperbarui: d.updatedAt.toISOString() });
}
