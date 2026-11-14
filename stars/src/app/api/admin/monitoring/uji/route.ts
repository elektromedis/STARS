import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit, ipDari } from "@/lib/audit";
import { galat, penjagaMonitoring } from "@/lib/monitoring-akses";
import { normalkanMuatan, simpanBacaan } from "@/lib/monitoring-simpan";
import { fLembap, fSuhu } from "@/lib/monitoring";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST { lokasiId, suhu?, lembap? } — kirim satu bacaan uji (sumber "uji", bisa dihapus massal). */
export async function POST(req: NextRequest) {
  const g = await penjagaMonitoring("Operator");
  if (g.tolak) return g.tolak;
  const b = (await req.json().catch(() => null)) as { lokasiId?: unknown; suhu?: unknown; lembap?: unknown } | null;
  const lokasiId = Number(b?.lokasiId);
  const l = Number.isInteger(lokasiId) && lokasiId > 0 ? await prisma.lokasiPantau.findUnique({ where: { id: lokasiId } }) : null;
  if (!l) return galat("Lokasi tidak ditemukan.", 404);
  const n = normalkanMuatan({ suhu: b?.suhu, lembap: b?.lembap });
  if (n.galat) return galat(n.galat);
  await simpanBacaan(l.id, n.bacaan, { serial: "uji-manual", sumber: "uji" });
  const x = n.bacaan[0];
  await audit("monitoring.uji", { email: g.sesi.user.email, ip: ipDari(req.headers), objek: l.kode, detail: [x.suhu != null ? fSuhu(x.suhu) : null, x.lembap != null ? fLembap(x.lembap) : null].filter(Boolean).join(", ") });
  return NextResponse.json({ ok: `Bacaan uji tersimpan untuk ${l.kode}.` });
}
