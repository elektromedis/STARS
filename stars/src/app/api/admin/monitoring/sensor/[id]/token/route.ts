import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit, ipDari } from "@/lib/audit";
import { galat, idDari, penjagaMonitoring } from "@/lib/monitoring-akses";
import { buatToken } from "@/lib/monitoring-simpan";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST — buat token baru (token lama langsung tidak berlaku). Token dikembalikan sekali. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await penjagaMonitoring("Operator");
  if (g.tolak) return g.tolak;
  const id = idDari((await params).id);
  const s = id ? await prisma.sensorIot.findUnique({ where: { id } }) : null;
  if (!s) return galat("Sensor tidak ditemukan.", 404);
  const t = buatToken();
  await prisma.sensorIot.update({ where: { id: s.id }, data: { tokenHash: t.hash, tokenPetunjuk: t.petunjuk } });
  await audit("monitoring.sensor.token", { email: g.sesi.user.email, ip: ipDari(req.headers), objek: s.serial, detail: "token API diganti" });
  return NextResponse.json({ ok: `Token baru untuk ${s.serial} dibuat. Token lama tidak berlaku lagi.`, token: t.token });
}
