import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { nomorBerikut } from "@/lib/pemeliharaan";
import { tolakTanpaToken } from "@/lib/integrasi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PRIORITAS = ["Rendah", "Normal", "Tinggi", "Darurat"];
const penanda = (ref: string) => `[SMART MFK ${ref}]`;
const str = (v: unknown, maks: number) => (typeof v === "string" ? v.trim().slice(0, maks) : "");

/**
 * POST /api/integrasi/permintaan — SMART MFK meneruskan laporan kerusakan alat menjadi Permintaan Kerja (WR).
 * Body JSON: { ref, kodeAlat?, namaAlat, unit?, lokasi?, pelapor, kontak?, keluhan, prioritas? }. Idempoten per `ref`
 * (nomor laporan SMART MFK, disimpan sebagai penanda di awal keluhan). Balasan: { nomor }.
 */
export async function POST(req: NextRequest) {
  const tolak = tolakTanpaToken(req);
  if (tolak) return tolak;
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Body bukan JSON." }, { status: 400 }); }
  const ref = str(b.ref, 40), namaAlat = str(b.namaAlat, 200), pelapor = str(b.pelapor, 120), keluhan = str(b.keluhan, 2000);
  if (!ref || !namaAlat || !pelapor || !keluhan) return NextResponse.json({ error: "ref, namaAlat, pelapor, dan keluhan wajib diisi." }, { status: 400 });
  const ada = await prisma.permintaanKerja.findFirst({ where: { keluhan: { startsWith: penanda(ref) } }, select: { nomor: true } });
  if (ada) return NextResponse.json({ nomor: ada.nomor, sudahAda: true });
  const kode = str(b.kodeAlat, 60);
  const alat = kode ? await prisma.alat.findUnique({ where: { kode }, select: { id: true, unitKerjaId: true } }) : null;
  const namaUnit = str(b.unit, 80);
  const unit = !alat && namaUnit ? await prisma.unitKerja.findUnique({ where: { nama: namaUnit }, select: { id: true } }) : null;
  const prioritas = PRIORITAS.includes(str(b.prioritas, 20)) ? str(b.prioritas, 20) : "Normal";
  const nomor = await nomorBerikut("WR");
  await prisma.permintaanKerja.create({
    data: {
      nomor, alatId: alat?.id ?? null, namaAlat, unitKerjaId: alat?.unitKerjaId ?? unit?.id ?? null, lokasi: str(b.lokasi, 200) || null,
      pelapor, kontak: str(b.kontak, 120) || null, keluhan: `${penanda(ref)} ${keluhan}`, prioritas, kodeLacak: randomBytes(9).toString("base64url"), status: "Baru",
    },
  });
  await audit("permintaan.buat", { email: "SMART MFK", objek: nomor, detail: `dari laporan SMART MFK ${ref} — ${namaAlat} — ${prioritas}` });
  return NextResponse.json({ nomor });
}

/** GET /api/integrasi/permintaan?nomor=WR-…,WR-… — status permintaan & perintah kerja terkait (maks 100 nomor). */
export async function GET(req: NextRequest) {
  const tolak = tolakTanpaToken(req);
  if (tolak) return tolak;
  const nomor = (req.nextUrl.searchParams.get("nomor") ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 100);
  const data = await prisma.permintaanKerja.findMany({
    where: { nomor: { in: nomor } },
    select: { nomor: true, status: true, catatanPetugas: true, updatedAt: true, perintah: { select: { nomor: true, status: true } } },
  });
  return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store" } });
}
