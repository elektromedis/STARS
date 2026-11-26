import { tolakEkspor } from "@/lib/role";
import { NextRequest, NextResponse } from "next/server";
import { unitTerkunci } from "@/lib/akses";
import { getDataKalibrasi, JENIS_UJI, STATUS_DATA, type FilterKalibrasi } from "@/lib/kalibrasi-data";
import { buatPdf, buatPptx } from "@/lib/kalibrasi-presentasi";
import { namaBerkas } from "@/lib/export";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/kalibrasi/presentasi?format=pptx|pdf&… (filter sama dengan halaman) — berkas presentasi. Publik, sama seperti halaman /kalibrasi. */
export async function GET(req: NextRequest) {
  const tolakE = await tolakEkspor(); if (tolakE) return tolakE;
  const sp = req.nextUrl.searchParams;
  const g = (k: string) => sp.get(k)?.trim() ?? "";
  const format = g("format") === "pdf" ? "pdf" : "pptx";
  const f: FilterKalibrasi = {
    q: g("q").slice(0, 100), unit: g("unit").slice(0, 120), lembaga: g("lembaga").slice(0, 160), tahun: /^\d{4}$/.test(g("tahun")) ? g("tahun") : "",
    status: STATUS_DATA.some((s) => s.kode === g("status")) ? g("status") : "", jenis: (JENIS_UJI as readonly string[]).includes(g("jenis")) ? g("jenis") : "",
    mode: "alat",
  };
  const kunci = await unitTerkunci();
  const d = await getDataKalibrasi({ kunci: kunci?.nama ?? null, f: kunci ? { ...f, unit: "" } : f, page: 1, pageSize: 1 });
  const ket = [kunci?.nama ?? f.unit, f.jenis, f.lembaga, f.tahun && `Tahun ${f.tahun}`, f.q && `"${f.q}"`].filter(Boolean).join(" · ");
  const buf = format === "pdf" ? buatPdf(d, ket) : await buatPptx(d, ket);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="${namaBerkas(["Presentasi_Pengujian_Kalibrasi", kunci?.nama ?? f.unit, new Date().toISOString().slice(0, 10)], format)}"`,
      "Cache-Control": "no-store",
    },
  });
}
