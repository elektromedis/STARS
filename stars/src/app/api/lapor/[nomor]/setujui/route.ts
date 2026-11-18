import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit, ipDari } from "@/lib/audit";
import { batasi } from "@/lib/rate-limit";
import { buatTte, samarkan } from "@/lib/tte";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const sama = (a: string, b: string) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };

/** POST { kode, nama } — pelapor menyetujui hasil perbaikan (serah terima) dengan TTE. Butuh kode lacak & TTE teknisi. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ nomor: string }> }) {
  const ip = ipDari(req.headers);
  if (!batasi(`setujui:${ip ?? "?"}`, 20, 10 * 60 * 1000).boleh) return NextResponse.json({ error: "Terlalu sering. Coba lagi sebentar." }, { status: 429 });
  if (process.env.STARS_MODE === "internet") return NextResponse.json({ error: "Server mode internet bersifat baca saja." }, { status: 403 });
  const nomor = decodeURIComponent((await params).nomor).slice(0, 40);
  const b = (await req.json().catch(() => null)) as { kode?: unknown; nama?: unknown } | null;
  const kode = String(b?.kode ?? ""), nama = String(b?.nama ?? "").trim().slice(0, 120);
  const wr = await prisma.permintaanKerja.findUnique({ where: { nomor }, select: { nomor: true, kodeLacak: true, pelapor: true, kontak: true } });
  if (!wr?.kodeLacak || !kode || !sama(wr.kodeLacak, kode)) return NextResponse.json({ error: "Laporan tidak ditemukan atau kode tidak cocok." }, { status: 404 });
  if (nama.length < 2) return NextResponse.json({ error: "Tulis nama lengkap Anda sebagai tanda tangan." }, { status: 400 });
  const ttd = await prisma.tandaTangan.findMany({ where: { nomor } });
  if (!ttd.some((t) => t.peran === "Teknisi")) return NextResponse.json({ error: "Teknisi belum menandatangani penyelesaian perbaikan." }, { status: 400 });
  if (ttd.some((t) => t.peran === "Pelapor")) return NextResponse.json({ error: "Laporan ini sudah Anda setujui." }, { status: 409 });
  await buatTte({ nomor, peran: "Pelapor", nama, identitas: samarkan(wr.kontak), ip });
  await audit("tte.pelapor", { ip, objek: nomor, detail: `disetujui oleh ${nama}` });
  return NextResponse.json({ ok: "Terima kasih. Hasil perbaikan telah Anda setujui dan ditandatangani secara elektronik." });
}
