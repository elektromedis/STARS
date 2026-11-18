import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sesiApi } from "@/lib/sesi";
import { unitTerkunci } from "@/lib/akses";
import { audit, ipDari } from "@/lib/audit";
import { alamatQr } from "@/lib/alamat";
import { pdfLabelQr, UKURAN_LABEL, type LogoLabel, type UkuranLabel } from "@/lib/label-qr";

/** Logo RSUD & STARS untuk label (public/label/*.png), dibaca sekali lalu disimpan di memori. */
let logoCache: LogoLabel | null = null;
async function logoLabel(): Promise<LogoLabel> {
  if (logoCache) return logoCache;
  const baca = async (f: string) => { try { return `data:image/png;base64,${(await readFile(join(process.cwd(), "public", "label", f))).toString("base64")}`; } catch { return null; } };
  logoCache = { rsud: await baca("logo-rsud.png"), stars: await baca("logo-stars.png"), paripurna: await baca("logo-paripurna.png"), penghargaan: await baca("logo-penghargaan.png") };
  return logoCache;
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAKS = 2000;

/** Alamat yang ditanam di QR: ?alamat= (dari formulir) → STARS_URL_PUBLIK → alamat permintaan ini. Hanya http/https. */
const alamatPublik = (req: NextRequest) => alamatQr(req.headers, req.nextUrl.searchParams.get("alamat"), req.nextUrl.origin);

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
    select: {
      kode: true, nama: true, merek: true, model: true, nomorSeri: true, lokasi: true, noUrutAset: true, kodeAspak: true, pendanaan: true, tahunPerolehan: true, tahunPembelian: true,
      unitKerja: { select: { nama: true } }, ruangan: { select: { nama: true } },
      kalibrasi: { orderBy: [{ tanggal: "desc" }, { id: "desc" }], take: 1, select: { berlakuSampai: true } },
    },
  });
  if (alat.length === 0) return NextResponse.json({ error: "Tidak ada alat aktif untuk pilihan ini." }, { status: 404 });
  if (alat.length > MAKS) return NextResponse.json({ error: `Terlalu banyak (lebih dari ${MAKS} label). Pilih per unit kerja.` }, { status: 400 });

  const alamat = alamatPublik(req);
  const buf = pdfLabelQr(
    alat.map((a) => ({
      kode: a.kode, nama: a.nama, merek: a.merek, model: a.model, nomorSeri: a.nomorSeri, unit: a.unitKerja.nama, ruangan: a.ruangan?.nama ?? a.lokasi,
      noAset: a.noUrutAset, tahun: a.tahunPerolehan ?? a.tahunPembelian, kalibrasiSampai: a.kalibrasi[0]?.berlakuSampai ?? null, lot: a.kodeAspak, pendanaan: a.pendanaan,
    })),
    { alamat, ukuran, mulai: Number(sp.get("mulai")) || 1, logo: await logoLabel() },
  );
  await audit("alat.label", { email: sesi.user.email, ip: ipDari(req.headers), objek: ids.length === 1 ? alat[0].kode : unit ?? kunci?.nama ?? "semua unit", detail: `${alat.length} label ${UKURAN_LABEL[ukuran].nama}; ${alamat}` });
  const nama = `STARS_label_QR_${ids.length === 1 ? alat[0].kode : (unit ?? kunci?.nama ?? "semua").replace(/[^\w-]+/g, "_")}.pdf`;
  return new NextResponse(new Uint8Array(buf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${nama}"`, "Cache-Control": "no-store" } });
}
