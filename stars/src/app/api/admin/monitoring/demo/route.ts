import { NextRequest, NextResponse } from "next/server";
import { audit, ipDari } from "@/lib/audit";
import { galat, penjagaMonitoring } from "@/lib/monitoring-akses";
import { hapusDemo, isiDemo } from "@/lib/monitoring-demo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST { aksi: "isi" | "hapus" } — data simulasi SI-LOGGER (Admin). */
export async function POST(req: NextRequest) {
  const g = await penjagaMonitoring("Admin");
  if (g.tolak) return g.tolak;
  if (process.env.STARS_MODE === "internet") return galat("Server mode internet (baca saja).", 403);
  const b = (await req.json().catch(() => null)) as { aksi?: unknown; diam?: unknown } | null;
  if (b?.aksi === "isi") {
    const h = await isiDemo(g.sesi.user.email ?? "admin");
    if (!b.diam) await audit("monitoring.demo.isi", { email: g.sesi.user.email, ip: ipDari(req.headers), detail: `${h.lokasi} lokasi, ${h.bacaan} bacaan` });
    return NextResponse.json({ ok: `Data demo diperbarui: ${h.lokasi} lokasi, ${h.bacaan.toLocaleString("id-ID")} bacaan baru.` });
  }
  if (b?.aksi === "hapus") {
    const h = await hapusDemo();
    await audit("monitoring.demo.hapus", { email: g.sesi.user.email, ip: ipDari(req.headers), detail: `${h.lokasi} lokasi, ${h.sensor} sensor` });
    return NextResponse.json({ ok: `Data demo dihapus: ${h.lokasi} lokasi, ${h.sensor} sensor.` });
  }
  return galat("Aksi tidak dikenal.");
}
