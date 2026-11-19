import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sesiApi } from "@/lib/sesi";
import { unitTerkunci } from "@/lib/akses";
import { pdfLabelP54 } from "@/lib/pdf-p54";
import { keDataUji, pilihUji, RADIASI } from "@/lib/data-p54";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET ?id=<kalibrasiId,...> | unit=<nama> — label hijau/merah Lampiran II.III (unit: hasil uji TERBARU tiap alat). */
export async function GET(req: NextRequest) {
  const { tolak } = await sesiApi("Viewer");
  if (tolak) return tolak;
  const sp = req.nextUrl.searchParams, kunci = await unitTerkunci();
  const ids = (sp.get("id") ?? "").split(",").map(Number).filter((n) => n > 0);
  const unit = kunci?.nama ?? (sp.get("unit") || null);
  const rows = await prisma.kalibrasi.findMany({
    where: { ...(ids.length ? { id: { in: ids } } : {}), alat: { aktif: true, ...(unit ? { unitKerja: { nama: unit } } : {}) } },
    orderBy: [{ tanggal: "desc" }, { id: "desc" }], take: 5000, select: { ...pilihUji, alatId: true },
  });
  const pakai = ids.length ? rows : (() => { const m = new Map<number, (typeof rows)[number]>(); for (const r of rows) if (!m.has(r.alatId)) m.set(r.alatId, r); return [...m.values()]; })();
  if (!pakai.length) return NextResponse.json({ error: "Belum ada data uji/kalibrasi untuk pilihan ini." }, { status: 404 });
  const buf = pdfLabelP54(pakai.map(keDataUji), (n) => RADIASI.test(n));
  return new NextResponse(new Uint8Array(buf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="Label_Laik_Pakai.pdf"`, "Cache-Control": "no-store" } });
}
