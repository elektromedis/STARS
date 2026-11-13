import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sesiApi } from "@/lib/sesi";
import { unitTerkunci } from "@/lib/akses";
import { audit, ipDari } from "@/lib/audit";
import { asalPermintaan } from "@/lib/alamat";
import { pdfLabelQr, UKURAN_LABEL, type UkuranLabel } from "@/lib/label-qr";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAKS = 2000;

/** Alamat yang ditanam di QR: ?alamat= (dari formulir) → STARS_URL_PUBLIK → alamat permintaan ini. Hanya http/https. */
function alamatPublik(req: NextRequest) {
  for (const calon of [req.nextUrl.searchParams.get("alamat"), process.env.STARS_URL_PUBLIK]) {
    if (!calon) continue;
    try { const u = new URL(calon); if (u.protocol === "https:" || u.protocol === "http:") return `${u.origin}${u.pathname.replace(/\/+$/, "")}`; } catch { /* abaikan */ }
  }
  return asalPermintaan(req.headers, req.nextUrl.origin);
}

/**
 * GET /api/admin/alat/label?id=1,2 | unit=<nama>&ruangan=<id> & ukuran=kecil|besar & mulai=1 & alamat=https://…
 * PDF label QR alat (Viewer+; akun ber-unit hanya alat unitnya).
 */
export async function GET(req: NextRequest) {
  const { sesi, tolak } = await sesiApi("Viewer");
  if (tolak) return tolak;
  const sp = req.nextUrl.searchParams;
  const ukuran: UkuranLabel = sp.get("ukuran") === "besar" ? "besar" : "kecil";
  const ids = (sp.get("id") ?? "").split(",").map(Number).filter((n) => Number.isInteger(n) && n > 0);
  const unit = sp.get("unit") || null;
  const ruanganId = Number(sp.get("ruangan")) || null;
  const kunci = await unitTerkunci();

  const alat = await prisma.alat.findMany({
    where: {
      aktif: true,
      ...(ids.length ? { id: { in: ids } } : {}),
      ...(kunci ? { unitKerja: { nama: kunci.nama } } : unit ? { unitKerja: { nama: unit } } : {}),
      ...(ruanganId ? { ruanganId } : {}),
    },
    orderBy: [{ unitKerja: { urut: "asc" } }, { ruangan: { nama: "asc" } }, { nama: "asc" }, { kode: "asc" }],
    take: MAKS + 1,
    select: { kode: true, nama: true, merek: true, model: true, nomorSeri: true, lokasi: true, unitKerja: { select: { nama: true } }, ruangan: { select: { nama: true } } },
  });
  if (alat.length === 0) return NextResponse.json({ error: "Tidak ada alat aktif untuk pilihan ini." }, { status: 404 });
  if (alat.length > MAKS) return NextResponse.json({ error: `Terlalu banyak (lebih dari ${MAKS} label). Pilih per unit kerja.` }, { status: 400 });

  const alamat = alamatPublik(req);
  const buf = pdfLabelQr(
    alat.map((a) => ({ kode: a.kode, nama: a.nama, merek: a.merek, model: a.model, nomorSeri: a.nomorSeri, unit: a.unitKerja.nama, ruangan: a.ruangan?.nama ?? a.lokasi })),
    { alamat, ukuran, mulai: Number(sp.get("mulai")) || 1 },
  );
  await audit("alat.label", { email: sesi.user.email, ip: ipDari(req.headers), objek: ids.length === 1 ? alat[0].kode : unit ?? kunci?.nama ?? "semua unit", detail: `${alat.length} label ${UKURAN_LABEL[ukuran].nama}; ${alamat}` });
  const nama = `STARS_label_QR_${ids.length === 1 ? alat[0].kode : (unit ?? kunci?.nama ?? "semua").replace(/[^\w-]+/g, "_")}.pdf`;
  return new NextResponse(new Uint8Array(buf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${nama}"`, "Cache-Control": "no-store" } });
}
