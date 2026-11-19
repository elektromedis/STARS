import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sesiApi } from "@/lib/sesi";
import { unitTerkunci } from "@/lib/akses";
import { audit, ipDari } from "@/lib/audit";
import { alamatQr, tautanAlat } from "@/lib/alamat";
import { hitungSkor, intervalWho } from "@/lib/risiko-who";
import { pdfLabelInspeksi, JENIS_LABEL_INSPEKSI, type JenisLabelInspeksi } from "@/lib/label-inspeksi";
import type { LogoLabel } from "@/lib/label-qr";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

let logo: LogoLabel | null = null;
async function muatLogo(): Promise<LogoLabel> {
  if (logo) return logo;
  const baca = async (f: string) => { try { return `data:image/png;base64,${(await readFile(join(process.cwd(), "public", "label", f))).toString("base64")}`; } catch { return null; } };
  logo = { rsud: await baca("logo-rsud.png"), stars: await baca("logo-stars.png") };
  return logo;
}

/** GET ?jenis=inspeksi|uji|rusak|baterai & unit= & id=1,2 & tanggal=YYYY-MM-DD — PDF label inspeksi WHO Lampiran E. */
export async function GET(req: NextRequest) {
  const { sesi, tolak } = await sesiApi("Viewer");
  if (tolak) return tolak;
  const sp = req.nextUrl.searchParams;
  const jenis = (sp.get("jenis") ?? "inspeksi") as JenisLabelInspeksi;
  if (!(jenis in JENIS_LABEL_INSPEKSI)) return NextResponse.json({ error: "Jenis label tidak dikenal." }, { status: 400 });
  const ids = (sp.get("id") ?? "").split(",").map(Number).filter((n) => Number.isInteger(n) && n > 0);
  const unit = sp.get("unit") || null, kunci = await unitTerkunci();
  const tgl = new Date(`${sp.get("tanggal") || new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10)}T08:00:00+07:00`);
  if (Number.isNaN(tgl.getTime())) return NextResponse.json({ error: "Tanggal tidak valid." }, { status: 400 });
  const alat = await prisma.alat.findMany({
    where: { aktif: true, ...(ids.length ? { id: { in: ids } } : {}), ...(kunci ? { unitKerja: { nama: kunci.nama } } : unit ? { unitKerja: { nama: unit } } : {}) },
    orderBy: [{ unitKerja: { urut: "asc" } }, { nama: "asc" }], take: 1001,
    select: { kode: true, nama: true, merek: true, lokasi: true, emFungsi: true, emRisiko: true, emPemeliharaan: true, emrMisiKritis: true, emrUtilisasi: true, unitKerja: { select: { nama: true } }, ruangan: { select: { nama: true } } },
  });
  if (!alat.length) return NextResponse.json({ error: "Tidak ada alat untuk pilihan ini." }, { status: 404 });
  if (alat.length > 1000) return NextResponse.json({ error: "Terlalu banyak (maks. 1000). Pilih per unit kerja." }, { status: 400 });
  const dasar = alamatQr(req.headers, null, req.nextUrl.origin);
  const buf = pdfLabelInspeksi(alat.map((a) => ({
    kode: a.kode, nama: a.nama, merek: a.merek, unit: a.unitKerja.nama, ruangan: a.ruangan?.nama ?? a.lokasi, url: tautanAlat(dasar, a.kode),
    ulangBulan: intervalWho(hitungSkor(a).em, a.emPemeliharaan)?.inspeksiBulan ?? null,
  })), { jenis, tanggal: tgl, logo: await muatLogo() });
  await audit("alat.label-inspeksi", { email: sesi.user.email, ip: ipDari(req.headers), objek: unit ?? kunci?.nama ?? "semua unit", detail: `${alat.length} label ${jenis}` });
  return new NextResponse(new Uint8Array(buf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="STARS_label_${jenis}.pdf"`, "Cache-Control": "no-store" } });
}
