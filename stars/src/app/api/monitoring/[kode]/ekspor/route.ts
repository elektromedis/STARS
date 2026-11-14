import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { unitTerkunci } from "@/lib/akses";
import { bacaRentang } from "@/lib/monitoring-data";
import { OFFSET_WIB_MS } from "@/lib/monitoring";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const MAKS_CSV = 600_000, MAKS_XLSX = 200_000;
const wib = (d: Date) => new Date(d.getTime() + OFFSET_WIB_MS).toISOString().slice(0, 19).replace("T", " ");
/** Cegah injeksi rumus spreadsheet pada teks. */
const aman = (s: string) => (/^[=+\-@\t\r]/.test(s) ? `'${s}` : s);
const csvSel = (v: string | number | null) => (v == null ? "" : typeof v === "number" ? String(v) : `"${aman(v).replace(/"/g, '""')}"`);

/** GET ?format=csv|xlsx&r=24j|7h|30h|1t|&dari&sampai — unduh data bacaan satu lokasi (waktu WIB). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ kode: string }> }) {
  const kode = (await params).kode;
  const kunci = await unitTerkunci();
  const l = /^[\w-]{1,30}$/.test(kode) ? await prisma.lokasiPantau.findUnique({ where: { kode }, include: { unitKerja: { select: { nama: true } } } }) : null;
  if (!l || (kunci && l.unitKerjaId !== kunci.id)) return NextResponse.json({ error: "Lokasi tidak ditemukan." }, { status: 404 });
  const sp = req.nextUrl.searchParams;
  const rg = bacaRentang({ r: sp.get("r") ?? undefined, dari: sp.get("dari") ?? undefined, sampai: sp.get("sampai") ?? undefined });
  const xlsx = sp.get("format") === "xlsx";
  const baris = await prisma.bacaanSensor.findMany({
    where: { lokasiId: l.id, waktu: { gte: new Date(rg.dari), lt: new Date(rg.sampai) } }, orderBy: { waktu: "asc" }, take: (xlsx ? MAKS_XLSX : MAKS_CSV) + 1,
    select: { waktu: true, suhu: true, lembap: true, serial: true, sumber: true },
  });
  const terpotong = baris.length > (xlsx ? MAKS_XLSX : MAKS_CSV);
  if (terpotong) baris.pop();
  const nama = `STARS_monitoring_${l.kode}_${rg.kode === "kustom" ? rg.label.replace(/ s\.d\. /, "_") : rg.kode}`.replace(/[^\w.-]+/g, "_");
  const judul = ["Waktu (WIB)", "Suhu (°C)", "Kelembapan (%RH)", "Sensor", "Sumber"];
  if (xlsx) {
    const ws = XLSX.utils.aoa_to_sheet([
      [`${l.kode} — ${l.nama}`], [`Unit: ${l.unitKerja?.nama ?? "-"} · Rentang: ${rg.label}${terpotong ? ` · DIPOTONG ${MAKS_XLSX} baris pertama — pakai CSV` : ""}`], [],
      judul, ...baris.map((b) => [wib(b.waktu), b.suhu, b.lembap, b.serial ?? "", b.sumber]),
    ].map((r) => r.map((v) => (typeof v === "string" ? aman(v) : v))));
    ws["!cols"] = [{ wch: 20 }, { wch: 10 }, { wch: 16 }, { wch: 18 }, { wch: 8 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
    return new NextResponse(new Uint8Array(buf), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${nama}.xlsx"`, "Cache-Control": "no-store" } });
  }
  const teks = "﻿" + [judul.map(csvSel).join(","), ...baris.map((b) => [wib(b.waktu), b.suhu, b.lembap, b.serial, b.sumber].map(csvSel).join(","))].join("\r\n") + "\r\n";
  return new NextResponse(teks, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${nama}.csv"`, "Cache-Control": "no-store", ...(terpotong ? { "X-Stars-Terpotong": "1" } : {}) } });
}
