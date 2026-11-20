import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { tolakTanpaToken } from "@/lib/integrasi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * API bridging (baca saja): riwayat pengujian & kalibrasi dan perintah kerja SELESAI per alat — bukti MFK 7 di SMART MFK.
 * GET /api/integrasi/kegiatan[?sejak=YYYY-MM-DD]   Header: Authorization: Bearer <INTEGRASI_TOKEN>
 */
export async function GET(req: NextRequest) {
  const tolak = tolakTanpaToken(req);
  if (tolak) return tolak;
  const s = req.nextUrl.searchParams.get("sejak");
  const t = s ? new Date(`${s}T00:00:00+07:00`) : null;
  const sejak = t && !Number.isNaN(t.getTime()) ? t : null;
  const [kalibrasi, perintah] = await Promise.all([
    prisma.kalibrasi.findMany({
      where: sejak ? { createdAt: { gte: sejak } } : {}, orderBy: { id: "asc" }, take: 50000,
      select: { id: true, jenis: true, tanggal: true, kalibrator: true, laik: true, berlakuSampai: true, nomorSertifikat: true, keterangan: true, alat: { select: { kode: true } } },
    }),
    prisma.perintahKerja.findMany({
      where: { status: "Selesai", alatId: { not: null }, ...(sejak ? { updatedAt: { gte: sejak } } : {}) }, orderBy: { id: "asc" }, take: 50000,
      select: { id: true, nomor: true, jenis: true, deskripsi: true, tindakan: true, biaya: true, tanggalSelesai: true, updatedAt: true, alat: { select: { kode: true } }, teknisi: { select: { nama: true } } },
    }),
  ]);
  const iso = (d: Date | null) => (d ? d.toISOString() : null);
  return NextResponse.json({
    sumber: "STARS RSUD Cipayung",
    kalibrasi: kalibrasi.map((k) => ({ id: k.id, kodeAlat: k.alat.kode, jenis: k.jenis, tanggal: iso(k.tanggal), kalibrator: k.kalibrator, laik: k.laik, berlakuSampai: iso(k.berlakuSampai), nomorSertifikat: k.nomorSertifikat, keterangan: k.keterangan })),
    perintah: perintah.filter((w) => w.alat).map((w) => ({ id: w.id, nomor: w.nomor, kodeAlat: w.alat!.kode, jenis: w.jenis, deskripsi: w.deskripsi, tindakan: w.tindakan, biaya: w.biaya, teknisi: w.teknisi?.nama ?? null, tanggalSelesai: iso(w.tanggalSelesai ?? w.updatedAt) })),
  }, { headers: { "Cache-Control": "no-store" } });
}
