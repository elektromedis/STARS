import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { sesiApi } from "@/lib/sesi";
import { audit, ipDari } from "@/lib/audit";
import { buatTte, samarkan } from "@/lib/tte";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST { woId } — teknisi (Operator+) menandatangani penyelesaian perintah kerja yang berasal dari laporan kerusakan. */
export async function POST(req: NextRequest) {
  const { sesi, tolak } = await sesiApi("Operator");
  if (tolak) return tolak;
  if (process.env.STARS_MODE === "internet") return NextResponse.json({ error: "Server mode internet bersifat baca saja." }, { status: 403 });
  const b = (await req.json().catch(() => null)) as { woId?: unknown } | null;
  const id = Number(b?.woId);
  const wo = Number.isInteger(id) && id > 0 ? await prisma.perintahKerja.findUnique({ where: { id }, include: { permintaan: { select: { nomor: true } } } }) : null;
  if (!wo?.permintaan) return NextResponse.json({ error: "Perintah kerja tidak ditemukan atau tidak berasal dari laporan kerusakan." }, { status: 404 });
  if (wo.status !== "Selesai") return NextResponse.json({ error: "Tandai perintah kerja Selesai (isi tindakan) sebelum menandatangani." }, { status: 400 });
  if (!wo.tindakan?.trim()) return NextResponse.json({ error: "Isi kolom tindakan perbaikan terlebih dahulu." }, { status: 400 });
  const ada = await prisma.tandaTangan.findUnique({ where: { nomor_peran: { nomor: wo.permintaan.nomor, peran: "Teknisi" } } });
  if (ada) return NextResponse.json({ error: `Sudah ditandatangani oleh ${ada.nama}.` }, { status: 409 });
  const t = await buatTte({ nomor: wo.permintaan.nomor, peran: "Teknisi", nama: sesi.user.name ?? sesi.user.email ?? "Teknisi", identitas: samarkan(sesi.user.email), ip: ipDari(req.headers) });
  await audit("tte.teknisi", { email: sesi.user.email, ip: ipDari(req.headers), objek: wo.permintaan.nomor, detail: `${wo.nomor}; token …${t.token.slice(-6)}` });
  revalidatePath("/admin/pemeliharaan");
  return NextResponse.json({ ok: `Penyelesaian ${wo.permintaan.nomor} ditandatangani secara elektronik.` });
}
