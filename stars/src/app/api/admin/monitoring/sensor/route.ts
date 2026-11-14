import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit, ipDari } from "@/lib/audit";
import { galat, penjagaMonitoring } from "@/lib/monitoring-akses";
import { buatToken, pesanZod, skemaSensor } from "@/lib/monitoring-simpan";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST — daftarkan sensor (Operator+). Token API dikembalikan SEKALI di respons ini. */
export async function POST(req: NextRequest) {
  const g = await penjagaMonitoring("Operator");
  if (g.tolak) return g.tolak;
  const p = skemaSensor.safeParse(await req.json().catch(() => null));
  if (!p.success) return galat(pesanZod(p.error));
  if (await prisma.sensorIot.findUnique({ where: { serial: p.data.serial }, select: { id: true } })) return galat(`Sensor ${p.data.serial} sudah terdaftar.`, 409);
  const lokasi = p.data.lokasiId ? await prisma.lokasiPantau.findUnique({ where: { id: p.data.lokasiId }, include: { sensor: true } }) : null;
  if (p.data.lokasiId && !lokasi) return galat("Lokasi tidak dikenal.");
  const t = buatToken();
  const s = await prisma.$transaction(async (tx) => {
    if (lokasi?.sensor) await tx.sensorIot.update({ where: { id: lokasi.sensor.id }, data: { lokasiId: null } }); // ganti sensor: riwayat tetap milik lokasi
    return tx.sensorIot.create({ data: { ...p.data, tokenHash: t.hash, tokenPetunjuk: t.petunjuk, dibuatOleh: g.sesi.user.email ?? null } });
  });
  await audit("monitoring.sensor.tambah", { email: g.sesi.user.email, ip: ipDari(req.headers), objek: s.serial, detail: `${lokasi ? `dipasang di ${lokasi.kode}` : "belum dipasang"}${lokasi?.sensor ? `; menggantikan ${lokasi.sensor.serial}` : ""}` });
  return NextResponse.json({ ok: `Sensor ${s.serial} didaftarkan.`, id: s.id, token: t.token });
}
