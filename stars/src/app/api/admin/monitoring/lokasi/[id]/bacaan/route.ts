import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit, ipDari } from "@/lib/audit";
import { galat, idDari, penjagaMonitoring } from "@/lib/monitoring-akses";
import { evaluasiAlarm, perbaruiTerakhir } from "@/lib/monitoring-simpan";
import { awalHariWib, HARI_MS } from "@/lib/monitoring";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const TGL = /^\d{4}-\d{2}-\d{2}$/;

/** DELETE ?sumber=uji|semua&dari=YYYY-MM-DD&sampai=YYYY-MM-DD — hapus bacaan (Admin+), mis. data uji coba. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await penjagaMonitoring("Admin");
  if (g.tolak) return g.tolak;
  const id = idDari((await params).id);
  const l = id ? await prisma.lokasiPantau.findUnique({ where: { id } }) : null;
  if (!l) return galat("Lokasi tidak ditemukan.", 404);
  const sp = req.nextUrl.searchParams;
  const sumber = sp.get("sumber") === "semua" ? null : "uji";
  const dari = TGL.test(sp.get("dari") ?? "") ? awalHariWib(sp.get("dari")!) : 0;
  const sampai = TGL.test(sp.get("sampai") ?? "") ? awalHariWib(sp.get("sampai")!) + HARI_MS : Date.now() + HARI_MS;
  if (!sumber && !TGL.test(sp.get("dari") ?? "")) return galat("Menghapus semua sumber data wajib memakai rentang tanggal.");
  const where = { lokasiId: l.id, waktu: { gte: new Date(dari), lt: new Date(sampai) }, ...(sumber ? { sumber } : {}) };
  const r = await prisma.bacaanSensor.deleteMany({ where });
  // alarm yang belum diakui & bertumpang-tindih dengan rentang dihitung ulang
  await prisma.alarmPantau.deleteMany({ where: { lokasiId: l.id, diakuiPada: null, mulai: { lt: new Date(sampai) }, OR: [{ selesai: null }, { selesai: { gte: new Date(dari) } }] } });
  await perbaruiTerakhir(l.id);
  await evaluasiAlarm(l.id, dari);
  await audit("monitoring.bacaan.hapus", { email: g.sesi.user.email, ip: ipDari(req.headers), objek: l.kode, detail: `${r.count} bacaan ${sumber ? "uji " : ""}${sp.get("dari") ?? "awal"} s.d. ${sp.get("sampai") ?? "akhir"}` });
  return NextResponse.json({ ok: `${r.count.toLocaleString("id-ID")} bacaan dihapus.` });
}
