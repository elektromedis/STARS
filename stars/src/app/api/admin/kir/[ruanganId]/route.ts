import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sesiApi } from "@/lib/sesi";
import { unitTerkunci } from "@/lib/akses";
import { alamatQr } from "@/lib/alamat";
import { urlVerifikasi } from "@/lib/tte";
import { dataKir, nomorKir, pdfKir } from "@/lib/kir";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET ?tahun=2026 — PDF KIR satu ruangan (A4 lanskap, kop Pemprov DKI Jakarta, TTE ber-QR). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ ruanganId: string }> }) {
  const { tolak } = await sesiApi("Viewer");
  if (tolak) return tolak;
  const r = await dataKir(Number((await params).ruanganId) || 0);
  if (!r) return NextResponse.json({ error: "Ruangan tidak ditemukan." }, { status: 404 });
  const kunci = await unitTerkunci();
  if (kunci && kunci.nama !== r.unitKerja.nama) return NextResponse.json({ error: "Bukan ruangan unit Anda." }, { status: 403 });
  const tahun = Number(req.nextUrl.searchParams.get("tahun")) || new Date().getFullYear();
  const dasar = alamatQr(req.headers, null, req.nextUrl.origin);
  const tte = await prisma.tandaTangan.findMany({ where: { nomor: nomorKir(r.id, tahun) } });
  const buf = await pdfKir(r, { tahun, tte: tte.map((t) => ({ peran: t.peran, nama: t.nama, identitas: t.identitas, waktu: t.waktu, url: urlVerifikasi(dasar, t.token) })) });
  const nama = `KIR_${r.nama.replace(/[^\w-]+/g, "_")}_${tahun}.pdf`;
  return new NextResponse(new Uint8Array(buf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${nama}"`, "Cache-Control": "no-store" } });
}
