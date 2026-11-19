import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { acaraKalender, keIcs } from "@/lib/kalender";
import { normalAlamat } from "@/lib/alamat";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HARI = 86_400_000;

/** GET /api/kalender/<token>.ics — umpan iCalendar pribadi (untuk Google Calendar "Tambahkan dari URL"). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const token = (await params).token.replace(/\.ics$/, "").slice(0, 80);
  const u = token.length >= 20 ? await prisma.pengguna.findUnique({ where: { tokenKalender: token }, select: { aktif: true, peran: true, unitKerja: { select: { nama: true } } } }) : null;
  if (!u?.aktif) return new NextResponse("Tidak ditemukan", { status: 404 });
  const unit = u.peran === "Viewer" ? u.unitKerja?.nama ?? null : null;
  const kini = Date.now();
  const acara = await acaraKalender(new Date(kini - 60 * HARI), new Date(kini + 400 * HARI), unit);
  const dasar = normalAlamat(process.env.STARS_URL_PUBLIK) ?? req.nextUrl.origin;
  return new NextResponse(keIcs(acara, { nama: `STARS — Pemeliharaan${unit ? ` ${unit}` : ""}`, dasar }), {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'inline; filename="stars-pemeliharaan.ics"', "Cache-Control": "private, max-age=900" },
  });
}
