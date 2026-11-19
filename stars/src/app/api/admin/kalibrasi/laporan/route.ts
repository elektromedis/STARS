import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sesiApi } from "@/lib/sesi";
import { pdfLaporanTriwulan } from "@/lib/pdf-p54";
import { keDataUji, pilihUji } from "@/lib/data-p54";
import { klasifikasiP54 } from "@/lib/permenkes54";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET ?tahun=2026&tw=1..4 — laporan triwulan Pasal 36. */
export async function GET(req: NextRequest) {
  const { tolak } = await sesiApi("Operator");
  if (tolak) return tolak;
  const sp = req.nextUrl.searchParams;
  const tahun = Number(sp.get("tahun")) || new Date().getFullYear(), tw = Math.min(4, Math.max(1, Number(sp.get("tw")) || 1));
  const dari = new Date(`${tahun}-${String((tw - 1) * 3 + 1).padStart(2, "0")}-01T00:00:00+07:00`), sampai = new Date(tw === 4 ? `${tahun + 1}-01-01T00:00:00+07:00` : `${tahun}-${String(tw * 3 + 1).padStart(2, "0")}-01T00:00:00+07:00`);
  const [data, alat] = await Promise.all([
    prisma.kalibrasi.findMany({ where: { tanggal: { gte: dari, lt: sampai } }, orderBy: { tanggal: "asc" }, select: pilihUji }),
    prisma.alat.findMany({ where: { aktif: true }, select: { nama: true, kalibrasi: { orderBy: { tanggal: "desc" }, take: 1, select: { laik: true, berlakuSampai: true, tanggal: true } } } }),
  ]);
  const wajib = alat.filter((a) => klasifikasiP54(a.nama));
  const tercakup = wajib.filter((a) => { const k = a.kalibrasi[0]; return k?.laik && (k.berlakuSampai ?? new Date(k.tanggal.getTime() + 365 * 864e5)) >= sampai; }).length;
  const buf = pdfLaporanTriwulan({ tahun, tw, data: data.map(keDataUji), wajib: wajib.length, tercakup });
  return new NextResponse(new Uint8Array(buf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="Laporan_Kalibrasi_TW${tw}_${tahun}.pdf"`, "Cache-Control": "no-store" } });
}
