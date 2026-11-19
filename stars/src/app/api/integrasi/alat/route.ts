import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * API bridging (baca saja) untuk aplikasi lain — mis. SMART MFK, SIMRS, atau penyusunan data ASPAK.
 * GET /api/integrasi/alat[?format=csv][&unit=NAMA][&sejak=YYYY-MM-DD]
 * Header: Authorization: Bearer <INTEGRASI_TOKEN> (env server). Tanpa token di server → API nonaktif.
 * Tidak memuat data pribadi (kontak, pelapor).
 */
export async function GET(req: NextRequest) {
  const token = process.env.INTEGRASI_TOKEN ?? "";
  const kiriman = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (token.length < 16) return NextResponse.json({ error: "API integrasi belum diaktifkan (INTEGRASI_TOKEN)." }, { status: 503 });
  const a = Buffer.from(kiriman), b = Buffer.from(token);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return NextResponse.json({ error: "Token tidak valid." }, { status: 401 });
  const sp = req.nextUrl.searchParams;
  const sejak = sp.get("sejak") ? new Date(`${sp.get("sejak")}T00:00:00+07:00`) : null;
  const alat = await prisma.alat.findMany({
    where: { ...(sp.get("unit") ? { unitKerja: { nama: sp.get("unit")! } } : {}), ...(sejak && !Number.isNaN(sejak.getTime()) ? { updatedAt: { gte: sejak } } : {}) },
    orderBy: { id: "asc" }, take: 20000,
    select: { kode: true, nama: true, merek: true, model: true, nomorSeri: true, kodeAspak: true, akl: true, emdnKode: true, gmdnKode: true, udi: true, tahunPerolehan: true, hargaPerolehan: true, pendanaan: true,
      kondisi: true, statusOperasi: true, aktif: true, kelasRisiko: true, ikatemiRisiko: true, updatedAt: true, unitKerja: { select: { nama: true } }, ruangan: { select: { nama: true } },
      kalibrasi: { orderBy: { tanggal: "desc" }, take: 1, select: { tanggal: true, berlakuSampai: true, laik: true } } },
  });
  const rows = alat.map((x) => ({
    kode: x.kode, nama: x.nama, merek: x.merek, model: x.model, nomorSeri: x.nomorSeri, kodeAspak: x.kodeAspak, akl: x.akl, emdn: x.emdnKode, gmdn: x.gmdnKode, udi: x.udi,
    unit: x.unitKerja.nama, ruangan: x.ruangan?.nama ?? null, tahunPerolehan: x.tahunPerolehan, hargaPerolehan: x.hargaPerolehan, sumberDana: x.pendanaan,
    kondisi: x.kondisi, statusOperasi: x.statusOperasi, aktif: x.aktif, kelasRisiko: x.kelasRisiko ?? x.ikatemiRisiko,
    kalibrasiTerakhir: x.kalibrasi[0]?.tanggal.toISOString().slice(0, 10) ?? null, kalibrasiBerlakuSampai: x.kalibrasi[0]?.berlakuSampai?.toISOString().slice(0, 10) ?? null, laikPakai: x.kalibrasi[0]?.laik ?? null,
    diperbarui: x.updatedAt.toISOString(),
  }));
  if (sp.get("format") === "csv") {
    const kol = Object.keys(rows[0] ?? { kode: "" });
    const esc = (v: unknown) => (v == null ? "" : /[",;\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
    const csv = "﻿" + [kol.join(";"), ...rows.map((r) => kol.map((k) => esc((r as Record<string, unknown>)[k])).join(";"))].join("\r\n");
    return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="STARS_alat.csv"', "Cache-Control": "no-store" } });
  }
  return NextResponse.json({ sumber: "STARS RSUD Cipayung", jumlah: rows.length, data: rows }, { headers: { "Cache-Control": "no-store" } });
}
