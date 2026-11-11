import { NextRequest, NextResponse } from "next/server";
import { resolveFilter } from "@/lib/filter";
import { getNilaiPerKategori, getNilaiPerUnit, getPaketForExport, getUnitKerjaRows } from "@/lib/queries";
import { keCsv, keXlsx, namaBerkas } from "@/lib/export";

export const dynamic = "force-dynamic";

/**
 * GET /api/dataset/{paket|nilai-per-unit|nilai-per-kategori|unit-kerja}?format=xlsx|csv&tahun=&tahap=&unit=
 * Mengembalikan berkas unduhan.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sp = Object.fromEntries(req.nextUrl.searchParams);
  const format = sp.format === "csv" ? "csv" : "xlsx";
  const { filter } = await resolveFilter(sp);

  let baris: Record<string, unknown>[];
  let nama: string;
  switch (slug) {
    case "paket":
      baris = await getPaketForExport(filter);
      nama = namaBerkas(["paket", filter.tahun, filter.tahap, filter.unit], format);
      break;
    case "nilai-per-unit":
      baris = (await getNilaiPerUnit(filter)).map((r, i) => ({ no: i + 1, unit_kerja: r.name, jumlah_paket: r.paket, nilai: r.value }));
      nama = namaBerkas(["nilai_per_unit", filter.tahun, filter.tahap], format);
      break;
    case "nilai-per-kategori":
      baris = (await getNilaiPerKategori(filter)).map((r, i) => ({ no: i + 1, kategori: r.name, jumlah_paket: r.paket, nilai: r.value }));
      nama = namaBerkas(["nilai_per_kategori", filter.tahun, filter.tahap, filter.unit], format);
      break;
    case "unit-kerja":
      baris = await getUnitKerjaRows();
      nama = namaBerkas(["unit_kerja"], format);
      break;
    default:
      return NextResponse.json({ error: "Dataset tidak dikenal" }, { status: 404 });
  }

  if (format === "csv") {
    return new NextResponse(keCsv(baris), {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${nama}"` },
    });
  }
  const buf = keXlsx([{ nama: slug, baris }]);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nama}"`,
      "Content-Length": String(buf.byteLength),
    },
  });
}
