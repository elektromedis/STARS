import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { audit, ipDari } from "@/lib/audit";
import { galat, penjagaMonitoring } from "@/lib/monitoring-akses";
import { cekRelasi, kodeLokasiBaru, pesanZod, skemaLokasi } from "@/lib/monitoring-simpan";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST — tambah lokasi pantau (Operator+). */
export async function POST(req: NextRequest) {
  const g = await penjagaMonitoring("Operator");
  if (g.tolak) return g.tolak;
  const p = skemaLokasi.safeParse(await req.json().catch(() => null));
  if (!p.success) return galat(pesanZod(p.error));
  const salah = await cekRelasi(p.data);
  if (salah) return galat(salah);
  for (let coba = 0; coba < 3; coba++) {
    const kode = await kodeLokasiBaru();
    try {
      const l = await prisma.lokasiPantau.create({ data: { ...p.data, kode, dibuatOleh: g.sesi.user.email ?? null, diubahOleh: g.sesi.user.email ?? null } });
      await audit("monitoring.lokasi.tambah", { email: g.sesi.user.email, ip: ipDari(req.headers), objek: kode, detail: `${l.nama} (${l.jenis})` });
      return NextResponse.json({ ok: `Lokasi ${kode} — ${l.nama} ditambahkan.`, id: l.id, kode });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue;
      throw e;
    }
  }
  return galat("Gagal membuat kode lokasi, coba lagi.", 409);
}
