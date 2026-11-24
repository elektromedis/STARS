import { NextRequest, NextResponse } from "next/server";
import { sesiApi } from "@/lib/sesi";
import { periode, rekapUnit } from "@/lib/imms-laporan";

export const dynamic = "force-dynamic";

const sel = (v: unknown) => { let t = String(v ?? ""); if (/^[=+\-@\t\r]/.test(t)) t = "'" + t; return `"${t.replace(/"/g, '""')}"`; };

/** GET /api/imms/laporan?p=YYYY-MM|YYYY — CSV perintah kerja periode (Operator+). */
export async function GET(req: NextRequest) {
  const { tolak } = await sesiApi("Operator");
  if (tolak) return tolak;
  const pr = periode(req.nextUrl.searchParams.get("p") ?? undefined);
  const { wo } = await rekapUnit(pr.dari, pr.sampai);
  const tgl = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");
  const baris = [["Nomor", "Jenis", "Alat", "Kode", "Unit kerja", "Status", "Uji fungsi", "Dibuat", "Selesai", "Biaya"].map(sel).join(";"),
    ...wo.map((w) => [w.nomor, w.jenis === "Preventif" ? "Terencana" : w.jenis, w.alat?.nama, w.alat?.kode, w.alat?.unitKerja.nama, w.status, w.ujiFungsi, tgl(w.createdAt), tgl(w.tanggalSelesai), w.biaya].map(sel).join(";"))];
  return new NextResponse("﻿" + baris.join("\r\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="laporan-imms-${pr.kode}.csv"` } });
}
