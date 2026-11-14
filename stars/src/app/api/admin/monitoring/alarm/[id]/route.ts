import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit, ipDari } from "@/lib/audit";
import { galat, idDari, penjagaMonitoring } from "@/lib/monitoring-akses";
import { pesanZod, skemaAkui } from "@/lib/monitoring-simpan";
import { LABEL_ALARM, type JenisAlarm } from "@/lib/monitoring";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST — akui alarm + catatan insiden (tindakan, dampak, pencegahan). Mengubah catatan tidak mengganti pengakuan pertama. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await penjagaMonitoring("Operator");
  if (g.tolak) return g.tolak;
  const id = idDari((await params).id);
  const a = id ? await prisma.alarmPantau.findUnique({ where: { id }, include: { lokasi: { select: { kode: true } } } }) : null;
  if (!a) return galat("Alarm tidak ditemukan.", 404);
  const p = skemaAkui.safeParse(await req.json().catch(() => null));
  if (!p.success) return galat(pesanZod(p.error));
  const nama = g.sesi.user.nama ?? g.sesi.user.email ?? "Pengguna";
  await prisma.alarmPantau.update({ where: { id: a.id }, data: { ...p.data, ...(a.diakuiPada ? {} : { diakuiOleh: nama, diakuiPada: new Date() }) } });
  await audit(a.diakuiPada ? "monitoring.alarm.catatan" : "monitoring.alarm.akui", { email: g.sesi.user.email, ip: ipDari(req.headers), objek: a.lokasi.kode, detail: `#${a.id} ${LABEL_ALARM[a.jenis as JenisAlarm] ?? a.jenis}` });
  return NextResponse.json({ ok: a.diakuiPada ? "Catatan insiden diperbarui." : "Alarm diakui." });
}
