import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { audit, ipDari } from "@/lib/audit";
import { galat, penjagaMonitoring } from "@/lib/monitoring-akses";
import { fLembap, fSuhu, hariWib, sesiSekarang } from "@/lib/monitoring";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const skema = z.object({ lokasiId: z.number().int().positive(), catatan: z.string().trim().max(1000).optional().nullable() });

/** POST — catat inspeksi harian (Pagi < 12.00 WIB ≤ Sore) memakai bacaan sensor terbaru (≤ 60 menit). */
export async function POST(req: NextRequest) {
  const g = await penjagaMonitoring("Operator");
  if (g.tolak) return g.tolak;
  const p = skema.safeParse(await req.json().catch(() => null));
  if (!p.success) return galat("Data inspeksi tidak valid.");
  const l = await prisma.lokasiPantau.findUnique({ where: { id: p.data.lokasiId } });
  if (!l) return galat("Lokasi tidak ditemukan.", 404);
  const kini = Date.now();
  if (!l.terakhirWaktu || kini - l.terakhirWaktu.getTime() > 60 * 60_000) return galat("Tidak ada bacaan sensor dalam 60 menit terakhir — periksa sensor sebelum mencatat inspeksi.", 409);
  const tanggal = hariWib(kini), sesi = sesiSekarang(kini);
  const nama = g.sesi.user.nama ?? g.sesi.user.email ?? "Pengguna";
  try {
    await prisma.inspeksiPantau.create({ data: { lokasiId: l.id, tanggal, sesi, suhu: l.terakhirSuhu, lembap: l.terakhirLembap, waktuBaca: l.terakhirWaktu, oleh: nama, catatan: p.data.catatan || null } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const ada = await prisma.inspeksiPantau.findUnique({ where: { lokasiId_tanggal_sesi: { lokasiId: l.id, tanggal, sesi } } });
      return galat(`Inspeksi ${sesi.toLowerCase()} hari ini sudah dicatat oleh ${ada?.oleh ?? "pengguna lain"}.`, 409);
    }
    throw e;
  }
  await audit("monitoring.inspeksi", { email: g.sesi.user.email, ip: ipDari(req.headers), objek: l.kode, detail: `${sesi} ${tanggal}: ${fSuhu(l.terakhirSuhu)}${l.terakhirLembap != null ? `, ${fLembap(l.terakhirLembap)}` : ""}` });
  return NextResponse.json({ ok: `Inspeksi ${sesi.toLowerCase()} dicatat (${fSuhu(l.terakhirSuhu)}).` });
}
