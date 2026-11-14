import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit, ipDari } from "@/lib/audit";
import { galat, idDari, penjagaMonitoring } from "@/lib/monitoring-akses";
import { pesanZod, skemaSensor } from "@/lib/monitoring-simpan";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** PUT — ubah / pindahkan sensor (Operator+). Memasang ke lokasi yang sudah bersensor = mengganti sensor lama. */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await penjagaMonitoring("Operator");
  if (g.tolak) return g.tolak;
  const id = idDari((await params).id);
  const lama = id ? await prisma.sensorIot.findUnique({ where: { id }, include: { lokasi: { select: { kode: true } } } }) : null;
  if (!lama) return galat("Sensor tidak ditemukan.", 404);
  const p = skemaSensor.safeParse(await req.json().catch(() => null));
  if (!p.success) return galat(pesanZod(p.error));
  if (p.data.serial !== lama.serial && (await prisma.sensorIot.findUnique({ where: { serial: p.data.serial }, select: { id: true } }))) return galat(`Sensor ${p.data.serial} sudah terdaftar.`, 409);
  const tujuan = p.data.lokasiId ? await prisma.lokasiPantau.findUnique({ where: { id: p.data.lokasiId }, include: { sensor: true } }) : null;
  if (p.data.lokasiId && !tujuan) return galat("Lokasi tidak dikenal.");
  const diganti = tujuan?.sensor && tujuan.sensor.id !== lama.id ? tujuan.sensor : null;
  await prisma.$transaction(async (tx) => {
    if (diganti) await tx.sensorIot.update({ where: { id: diganti.id }, data: { lokasiId: null } });
    await tx.sensorIot.update({ where: { id: lama.id }, data: p.data });
  });
  await audit("monitoring.sensor.ubah", {
    email: g.sesi.user.email, ip: ipDari(req.headers), objek: p.data.serial,
    detail: `${lama.lokasi?.kode ?? "-"} → ${tujuan?.kode ?? "-"}${diganti ? `; menggantikan ${diganti.serial}` : ""}${lama.aktif !== p.data.aktif ? `; ${p.data.aktif ? "diaktifkan" : "dinonaktifkan"}` : ""}`,
  });
  return NextResponse.json({ ok: `Sensor ${p.data.serial} diperbarui.` });
}

/** DELETE — hapus sensor (Operator+). Bacaan yang sudah tersimpan tetap milik lokasinya. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await penjagaMonitoring("Operator");
  if (g.tolak) return g.tolak;
  const id = idDari((await params).id);
  const s = id ? await prisma.sensorIot.findUnique({ where: { id }, include: { lokasi: { select: { kode: true } } } }) : null;
  if (!s) return galat("Sensor tidak ditemukan.", 404);
  await prisma.sensorIot.delete({ where: { id: s.id } });
  await audit("monitoring.sensor.hapus", { email: g.sesi.user.email, ip: ipDari(req.headers), objek: s.serial, detail: s.lokasi ? `dilepas dari ${s.lokasi.kode}` : null });
  return NextResponse.json({ ok: `Sensor ${s.serial} dihapus. Token lamanya tidak berlaku lagi.` });
}
