import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit, ipDari } from "@/lib/audit";
import { galat, idDari, penjagaMonitoring } from "@/lib/monitoring-akses";
import { cekRelasi, evaluasiAlarm, pesanZod, skemaLokasi } from "@/lib/monitoring-simpan";
import { fRentang } from "@/lib/monitoring";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** PUT — ubah lokasi (Operator+). Perubahan batas berlaku ke depan; status alarm yang sedang berjalan disesuaikan. */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await penjagaMonitoring("Operator");
  if (g.tolak) return g.tolak;
  const id = idDari((await params).id);
  const lama = id ? await prisma.lokasiPantau.findUnique({ where: { id } }) : null;
  if (!lama) return galat("Lokasi tidak ditemukan.", 404);
  const p = skemaLokasi.safeParse(await req.json().catch(() => null));
  if (!p.success) return galat(pesanZod(p.error));
  const salah = await cekRelasi(p.data);
  if (salah) return galat(salah);
  const l = await prisma.lokasiPantau.update({ where: { id: lama.id }, data: { ...p.data, diubahOleh: g.sesi.user.email ?? null } });
  const batasBerubah = (["suhuMin", "suhuMaks", "lembapMin", "lembapMaks", "tundaAlarm", "batasPutusMenit"] as const).some((k) => lama[k] !== l[k]);
  if (batasBerubah && l.terakhirWaktu) await evaluasiAlarm(l.id, l.terakhirWaktu.getTime());
  await audit("monitoring.lokasi.ubah", {
    email: g.sesi.user.email, ip: ipDari(req.headers), objek: l.kode,
    detail: `${l.nama}${batasBerubah ? `; batas suhu ${fRentang(l.suhuMin, l.suhuMaks, "suhu")}, lembap ${fRentang(l.lembapMin, l.lembapMaks, "lembap")}, tunda ${l.tundaAlarm}, putus ${l.batasPutusMenit} mnt` : ""}${lama.aktif !== l.aktif ? `; ${l.aktif ? "diaktifkan" : "dinonaktifkan"}` : ""}`,
  });
  return NextResponse.json({ ok: `Lokasi ${l.kode} diperbarui.` });
}

/** DELETE — hapus lokasi beserta seluruh bacaan, alarm, dan inspeksinya (Admin+). */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await penjagaMonitoring("Admin");
  if (g.tolak) return g.tolak;
  const id = idDari((await params).id);
  const l = id ? await prisma.lokasiPantau.findUnique({ where: { id }, include: { _count: { select: { bacaan: true, alarm: true } } } }) : null;
  if (!l) return galat("Lokasi tidak ditemukan.", 404);
  await prisma.lokasiPantau.delete({ where: { id: l.id } });
  await audit("monitoring.lokasi.hapus", { email: g.sesi.user.email, ip: ipDari(req.headers), objek: l.kode, detail: `${l.nama}; ${l._count.bacaan} bacaan, ${l._count.alarm} alarm ikut terhapus` });
  return NextResponse.json({ ok: `Lokasi ${l.kode} dihapus.` });
}
