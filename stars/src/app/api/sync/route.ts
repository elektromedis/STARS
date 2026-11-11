import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { audit, ipDari } from "@/lib/audit";
import { TAHAP_URUT } from "@/lib/filter";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Sinkronisasi server intranet → server internet (Tahap 3).
 * Dilindungi token bersama SYNC_TOKEN (header Authorization: Bearer <token>), bukan sesi pengguna.
 *   GET  /api/sync  → status (jumlah paket, sinkron terakhir)
 *   POST /api/sync  → { paket: [...] } (format sama dengan ekspor/seed) → upsert semua, hapus kode yang hilang per (tahun, tahap)
 * Dijalankan dari intranet oleh `npm run sync` (scripts/sinkron.ts).
 */
const skemaPaket = z.object({
  kode: z.string().min(1), tahun: z.number().int(), tahap: z.enum(TAHAP_URUT), jenis: z.string(), sumberDana: z.string().default("BLUD"),
  namaRekening: z.string(), namaPaket: z.string().min(1), uraian: z.string().nullable(), unitKerja: z.string(), lokasiAsli: z.string().nullable(),
  kodeBarang: z.string().nullable(), vol1: z.number(), satuan1: z.string().nullable(), vol2: z.number(), satuan2: z.string().nullable(),
  hargaSatuan: z.number(), nilai: z.number(), serapan: z.boolean(), prioritas: z.string().nullable(), linkHarga: z.string().nullable(),
  keterangan: z.string().nullable(), kategori: z.string(),
});
const skemaBody = z.object({ paket: z.array(skemaPaket).max(50_000), sumber: z.string().optional() });

function tokenValid(req: NextRequest) {
  const rahasia = process.env.SYNC_TOKEN;
  if (!rahasia || rahasia.length < 16) return false;
  const kirim = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(kirim), b = Buffer.from(rahasia);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: NextRequest) {
  if (!tokenValid(req)) return NextResponse.json({ error: "Token tidak valid." }, { status: 401 });
  const [jumlah, terakhir] = await Promise.all([prisma.paket.count(), prisma.logImpor.findFirst({ where: { pengguna: "sinkron" }, orderBy: { waktu: "desc" } })]);
  return NextResponse.json({ mode: process.env.STARS_MODE ?? "intranet", jumlahPaket: jumlah, sinkronTerakhir: terakhir?.waktu ?? null });
}

export async function POST(req: NextRequest) {
  const ip = ipDari(req.headers);
  if (!tokenValid(req)) {
    await audit("sinkron.ditolak", { ip, detail: "token tidak valid" });
    return NextResponse.json({ error: "Token tidak valid." }, { status: 401 });
  }
  const parsed = skemaBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Payload tidak valid", detail: parsed.error.issues.slice(0, 10) }, { status: 400 });
  const { paket, sumber } = parsed.data;

  const units = new Map((await prisma.unitKerja.findMany()).map((u) => [u.nama, u.id]));
  const fallback = units.get("TIDAK ADA");
  if (!fallback) return NextResponse.json({ error: "Master unit kerja belum ada di server ini." }, { status: 500 });
  const grup = [...new Set(paket.map((p) => `${p.tahun}|${p.tahap}`))].map((g) => { const [t, th] = g.split("|"); return { tahun: Number(t), tahap: th }; });
  const kodeMasuk = new Set(paket.map((p) => p.kode));

  let dihapus = 0;
  await prisma.$transaction(async (tx) => {
    for (const { unitKerja, ...p } of paket) {
      const data = { ...p, unitKerjaId: units.get(unitKerja) ?? fallback };
      await tx.paket.upsert({ where: { kode: p.kode }, update: data, create: data });
    }
    if (grup.length) {
      const lama = await tx.paket.findMany({ where: { OR: grup }, select: { kode: true } });
      const hapus = lama.filter((l) => !kodeMasuk.has(l.kode)).map((l) => l.kode);
      if (hapus.length) dihapus = (await tx.paket.deleteMany({ where: { kode: { in: hapus } } })).count;
    }
  }, { timeout: 300_000 });

  const totalNilai = paket.reduce((a, b) => a + b.nilai, 0);
  await prisma.logImpor.create({ data: { namaBerkas: `sinkron dari ${sumber ?? ip ?? "?"}`, ukuranByte: 0, pengguna: "sinkron", totalBaris: paket.length, barisBaru: 0, barisDiperbarui: paket.length, totalNilai, status: "Berhasil", pesan: `${dihapus} dihapus` } });
  await audit("sinkron.terima", { ip, detail: `${paket.length} paket, ${dihapus} dihapus, dari ${sumber ?? "?"}` });
  return NextResponse.json({ ok: true, diterima: paket.length, dihapus, totalNilai });
}
