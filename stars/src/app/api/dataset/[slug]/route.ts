import { tolakEkspor } from "@/lib/role";
import { NextRequest, NextResponse } from "next/server";
import { labelFilter, labelNilai, resolveFilter, SEMUA_TAHAP, type Filter } from "@/lib/filter";
import { getNilaiPerKategori, getNilaiPerUnit, getPaketForExport, getUnitKerjaRows } from "@/lib/queries";
import { keCsv, keXlsx, namaBerkas } from "@/lib/export";
import { formatRpPdf, kePdf, type KolomPdf } from "@/lib/pdf";
import { keDocx, kePptx } from "@/lib/dokumen-office";
import { JUDUL } from "@/lib/dataset-judul";
import { barisDataset } from "@/lib/dataset";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/dataset/{paket|nilai-per-unit|nilai-per-kategori|unit-kerja}?format=xlsx|csv|pdf&tahun=&tahap=&unit=
 * Mengembalikan berkas unduhan. PDF = laporan siap cetak (baca saja), XLSX/CSV = untuk diedit/diimpor ulang.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const tolakE = await tolakEkspor(); if (tolakE) return tolakE;
  const { slug } = await params;
  const sp = Object.fromEntries(req.nextUrl.searchParams);
  const format = sp.format === "csv" ? "csv" : sp.format === "pdf" ? "pdf" : sp.format === "docx" ? "docx" : sp.format === "pptx" ? "pptx" : "xlsx";
  const { filter } = await resolveFilter(sp);

  if (format === "pdf") return pdfDataset(slug, filter);

  const ds = await barisDataset(slug, filter);
  if (!ds) return NextResponse.json({ error: "Dataset tidak dikenal" }, { status: 404 });
  const { baris } = ds;
  const nama = namaBerkas([...ds.namaDasar], format);

  if (format === "docx" || format === "pptx") {
    const judul = JUDUL[slug] ?? slug;
    const sub = `${labelFilter(filter)}${filter.unit ? ` - ${filter.unit}` : ""}`;
    const buf = format === "docx" ? await keDocx(judul, sub, baris) : await kePptx(judul, sub, baris);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": format === "docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${nama}"`,
        "Content-Length": String(buf.byteLength),
      },
    });
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

function responsPdf(buf: Buffer, nama: string) {
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nama}"`,
      "Content-Length": String(buf.byteLength),
    },
  });
}

/** Laporan PDF siap cetak per dataset (kolom dipilih agar muat dan terbaca di kertas A4). */
async function pdfDataset(slug: string, filter: Filter) {
  const sub = `${labelFilter(filter)}${filter.unit ? ` - ${filter.unit}` : ""}`;
  const subNilai = `${labelNilai(filter)}${filter.unit ? ` - ${filter.unit}` : ""}`;

  if (slug === "paket") {
    const rows = await getPaketForExport(filter);
    const gabungan = filter.tahap === SEMUA_TAHAP;
    // Saat semua tahap: total = pagu final saja (tiap tahap revisi anggaran), subtotal per tahap di catatan.
    const perTahap = new Map<string, { n: number; nilai: number }>();
    for (const r of rows) { const t = perTahap.get(r.tahap) ?? { n: 0, nilai: 0 }; t.n++; t.nilai += Number(r.nilai || 0); perTahap.set(r.tahap, t); }
    const totalNilai = gabungan ? perTahap.get(filter.tahapFinal ?? "")?.nilai ?? 0 : rows.reduce((a, b) => a + Number(b.nilai || 0), 0);
    const baris = rows.map((p, i) => ({
      no: i + 1, kode: gabungan ? `${p.kode}\n${p.tahap}` : p.kode, nama_paket: p.nama_paket, unit: p.unit_kerja, kategori: p.kategori,
      vol: `${p.vol1} ${p.satuan1} x ${p.vol2} ${p.satuan2}`.replace(/\s+/g, " ").trim(),
      harga: formatRpPdf(Number(p.harga_satuan || 0)), nilai: formatRpPdf(Number(p.nilai || 0)), serapan: p.serapan,
    }));
    const kolom: KolomPdf[] = [
      { kunci: "no", label: "No", lebar: 9, rata: "center" },
      { kunci: "kode", label: gabungan ? "Kode / Tahap" : "Kode", lebar: 27 },
      { kunci: "nama_paket", label: "Nama Komponen" },
      { kunci: "unit", label: "Unit", lebar: 24 },
      { kunci: "kategori", label: "Kategori", lebar: 30 },
      { kunci: "vol", label: "Volume", lebar: 24 },
      { kunci: "harga", label: "Harga Satuan", lebar: 29, rata: "right" },
      { kunci: "nilai", label: "Nilai", lebar: 32, rata: "right" },
      { kunci: "serapan", label: "Serapan", lebar: 15, rata: "center" },
    ];
    const buf = kePdf({
      judul: "Daftar Paket Perencanaan-Pengadaan", subjudul: `${sub} - ${rows.length} paket`, kolom, baris, orientasi: "l",
      kaki: ["", "", gabungan ? `TOTAL PAGU FINAL (${filter.tahapFinal}, ${perTahap.get(filter.tahapFinal ?? "")?.n ?? 0} paket)` : `TOTAL ${rows.length} paket`, "", "", "", "", formatRpPdf(totalNilai), ""],
      ...(gabungan ? { catatan: [
        "Semua Tahapan: tiap tahap adalah revisi anggaran, jadi nilainya tidak dijumlahkan. Total di atas = pagu final (tahap terakhir).",
        ...[...perTahap.entries()].map(([t, v]) => `${t}: ${v.n} paket, ${formatRpPdf(v.nilai)}${t === filter.tahapFinal ? " (pagu final)" : ""}`),
      ] } : {}),
    });
    return responsPdf(buf, namaBerkas(["paket", filter.tahun, filter.tahap, filter.unit], "pdf"));
  }

  if (slug === "nilai-per-unit" || slug === "nilai-per-kategori") {
    const data = slug === "nilai-per-unit" ? await getNilaiPerUnit(filter) : await getNilaiPerKategori(filter);
    const judul = slug === "nilai-per-unit" ? "Rekap Nilai per Unit Kerja" : "Rekap Nilai per Kategori";
    const label = slug === "nilai-per-unit" ? "Unit Kerja" : "Kategori";
    const totalNilai = data.reduce((a, b) => a + b.value, 0);
    const totalPaket = data.reduce((a, b) => a + b.paket, 0);
    const kolom: KolomPdf[] = [
      { kunci: "no", label: "No", lebar: 10, rata: "center" },
      { kunci: "nama", label },
      { kunci: "paket", label: "Jumlah Paket", lebar: 30, rata: "right" },
      { kunci: "nilai", label: "Nilai", lebar: 45, rata: "right" },
    ];
    const buf = kePdf({
      judul, subjudul: subNilai, orientasi: "p", kolom,
      baris: data.map((r, i) => ({ no: i + 1, nama: r.name, paket: r.paket, nilai: formatRpPdf(r.value) })),
      kaki: ["", "TOTAL", String(totalPaket), formatRpPdf(totalNilai)],
    });
    return responsPdf(buf, namaBerkas([slug.replace(/-/g, "_"), filter.tahun, filter.tahap, filter.unit], "pdf"));
  }

  if (slug === "unit-kerja") {
    const rows = await getUnitKerjaRows(filter.unitTerkunci ? filter.unit : null);
    const kolom: KolomPdf[] = [
      { kunci: "no", label: "No", lebar: 10, rata: "center" },
      { kunci: "nama_unit_kerja", label: "Unit Kerja" },
      { kunci: "jumlah_paket_tercatat", label: "Paket Tercatat", lebar: 35, rata: "right" },
    ];
    const buf = kePdf({ judul: "Daftar Unit Kerja", kolom, baris: rows, orientasi: "p" });
    return responsPdf(buf, namaBerkas(["unit_kerja"], "pdf"));
  }

  return NextResponse.json({ error: "Dataset tidak dikenal" }, { status: 404 });
}
