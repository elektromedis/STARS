import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ipDari } from "@/lib/audit";
import { batasi } from "@/lib/rate-limit";
import { hashToken, normalkanMuatan, simpanBacaan } from "@/lib/monitoring-simpan";
import { statusLokasi } from "@/lib/monitoring";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAKS_BYTE = 1_000_000;
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });

/**
 * POST /api/iot/bacaan — data dari sensor / gateway IoT.
 * Header: `Authorization: Bearer <token sensor>` (atau `X-Api-Key: <token>`). Token dibuat di Admin → Monitoring → Sensor.
 * Badan JSON: { "suhu": 4.6, "lembap": 55, "waktu"?: ISO|epoch, "baterai"?: 0-100, "sinyal"?: dBm }
 *          atau { "bacaan": [ {...}, ... ] } untuk kiriman tertunda (maks 5.000).
 */
export async function POST(req: NextRequest) {
  if (process.env.STARS_MODE === "internet") return json({ error: "Server mode internet bersifat baca saja." }, 403);
  const ip = ipDari(req.headers) ?? "?";
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim() || (req.headers.get("x-api-key") ?? "").trim();
  const sensor = token.length >= 20 && token.length <= 200
    ? await prisma.sensorIot.findUnique({ where: { tokenHash: hashToken(token) }, include: { lokasi: true } })
    : null;
  if (!sensor) {
    const b = batasi(`iot-gagal:${ip}`, 30, 15 * 60_000);
    return json({ error: b.boleh ? "Token sensor tidak valid." : "Terlalu banyak percobaan dengan token salah." }, b.boleh ? 401 : 429);
  }
  if (!sensor.aktif) return json({ error: "Sensor dinonaktifkan di STARS." }, 403);
  if (!sensor.lokasi) return json({ error: "Sensor belum dipasang di lokasi pantau mana pun." }, 409);
  if (!sensor.lokasi.aktif) return json({ error: "Lokasi pantau sensor ini nonaktif." }, 409);
  const lj = batasi(`iot:${sensor.id}`, 240, 60_000);
  if (!lj.boleh) return json({ error: `Terlalu sering mengirim. Coba lagi dalam ${lj.sisaDetik} detik.` }, 429);

  const panjang = Number(req.headers.get("content-length") ?? 0);
  if (panjang > MAKS_BYTE) return json({ error: "Kiriman terlalu besar (maks 1 MB)." }, 413);
  const teks = await req.text();
  if (teks.length > MAKS_BYTE) return json({ error: "Kiriman terlalu besar (maks 1 MB)." }, 413);
  let muatan: unknown;
  try { muatan = JSON.parse(teks); } catch { return json({ error: "Badan permintaan harus JSON." }, 400); }
  const kini = Date.now();
  const n = normalkanMuatan(muatan, kini);
  if (n.galat) return json({ error: n.galat }, 400);

  const hasil = await simpanBacaan(sensor.lokasi.id, n.bacaan, { serial: sensor.serial, sumber: "api" });
  await prisma.sensorIot.update({
    where: { id: sensor.id },
    data: { terakhirTerhubung: new Date(kini), ...(n.baterai != null ? { baterai: n.baterai } : {}), ...(n.sinyal != null ? { sinyal: n.sinyal } : {}) },
  });
  const l = await prisma.lokasiPantau.findUnique({ where: { id: sensor.lokasi.id }, include: { _count: { select: { alarm: { where: { selesai: null, jenis: { not: "putus" } } } } } } });
  const st = l ? statusLokasi(l, l._count.alarm, kini) : null;
  return json({ ok: true, lokasi: sensor.lokasi.kode, diterima: hasil.diterima, duplikat: hasil.duplikat, status: st?.kunci ?? null });
}
