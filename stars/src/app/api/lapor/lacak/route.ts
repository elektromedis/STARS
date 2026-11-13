import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ipDari } from "@/lib/audit";
import { batasi } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const skema = z.object({ daftar: z.array(z.object({ nomor: z.string().max(40), kode: z.string().min(8).max(40) })).max(50) });

/**
 * POST /api/lapor/lacak { daftar: [{ nomor, kode }] } — status laporan milik pelapor (tanpa akun).
 * Butuh kode lacak acak yang hanya diterima pelapor saat mengirim, sehingga nomor WR yang berurutan tidak bisa ditebak.
 * Tidak mengembalikan data pelapor, keluhan, ataupun catatan petugas.
 */
export async function POST(req: NextRequest) {
  const b = batasi(`lacak:${ipDari(req.headers) ?? "lokal"}`, 120, 10 * 60 * 1000);
  if (!b.boleh) return NextResponse.json({ error: "Terlalu sering. Coba lagi sebentar." }, { status: 429 });
  const parsed = skema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  const { daftar } = parsed.data;
  if (daftar.length === 0) return NextResponse.json({ laporan: [] });
  const rows = await prisma.permintaanKerja.findMany({
    where: { nomor: { in: daftar.map((d) => d.nomor) } },
    select: {
      nomor: true, kodeLacak: true, namaAlat: true, status: true, prioritas: true, createdAt: true, updatedAt: true,
      unitKerja: { select: { nama: true } }, alat: { select: { kode: true } },
      perintah: { select: { nomor: true, status: true, updatedAt: true, tanggalSelesai: true } },
    },
  });
  const kodeDari = new Map(daftar.map((d) => [d.nomor, d.kode]));
  const laporan = rows
    .filter((r) => r.kodeLacak && r.kodeLacak === kodeDari.get(r.nomor))
    .map((r) => {
      const terakhir = r.perintah && r.perintah.updatedAt > r.updatedAt ? r.perintah.updatedAt : r.updatedAt;
      return {
        nomor: r.nomor, namaAlat: r.namaAlat, status: r.status, prioritas: r.prioritas, unit: r.unitKerja?.nama ?? null, kodeAlat: r.alat?.kode ?? null,
        dibuat: r.createdAt.toISOString(), diperbarui: terakhir.toISOString(),
        perintah: r.perintah ? { nomor: r.perintah.nomor, status: r.perintah.status } : null,
      };
    });
  return NextResponse.json({ laporan }, { headers: { "Cache-Control": "no-store" } });
}
