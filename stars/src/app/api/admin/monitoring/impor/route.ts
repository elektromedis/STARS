import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit, ipDari } from "@/lib/audit";
import { galat, penjagaMonitoring } from "@/lib/monitoring-akses";
import { simpanBacaan } from "@/lib/monitoring-simpan";
import { bacaBerkasLogger, type UrutanTanggal } from "@/lib/monitoring-impor";
import { HARI_MS } from "@/lib/monitoring";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const MAKS_BYTE = 25 * 1024 * 1024;
const URUTAN: UrutanTanggal[] = ["auto", "DMY", "MDY", "YMD"];

/**
 * POST (multipart: lokasiId, file, urutan=auto|DMY|MDY|YMD, simpan=1?) — impor berkas ekspor data logger.
 * Tanpa `simpan=1` hanya mengembalikan pratinjau (kolom terbaca, rentang, min/maks, peringatan).
 */
export async function POST(req: NextRequest) {
  const g = await penjagaMonitoring("Operator");
  if (g.tolak) return g.tolak;
  const fd = await req.formData().catch(() => null);
  if (!fd) return galat("Formulir tidak valid.");
  const lokasiId = Number(fd.get("lokasiId"));
  const l = Number.isInteger(lokasiId) && lokasiId > 0 ? await prisma.lokasiPantau.findUnique({ where: { id: lokasiId } }) : null;
  if (!l) return galat("Pilih lokasi tujuan impor.");
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return galat("Pilih berkas CSV/TXT/Excel hasil ekspor data logger.");
  if (file.size > MAKS_BYTE) return galat("Berkas terlalu besar (maks 25 MB).", 413);
  if (!/\.(csv|txt|tsv|xlsx|xlsm|xls|ods)$/i.test(file.name)) return galat("Format berkas harus CSV, TXT, atau Excel.");
  const u = String(fd.get("urutan") ?? "auto") as UrutanTanggal;
  const h = bacaBerkasLogger(Buffer.from(await file.arrayBuffer()), file.name, URUTAN.includes(u) ? u : "auto");
  if ("galat" in h) return galat(h.galat);
  const kini = Date.now();
  const sah = h.bacaan.filter((b) => b.waktu <= kini + 5 * 60_000 && b.waktu >= kini - 5 * 365 * HARI_MS);
  const dibuang = h.bacaan.length - sah.length;
  const peringatan = [...h.peringatan, ...(dibuang ? [`${dibuang.toLocaleString("id-ID")} bacaan di luar rentang wajar (masa depan / > 5 tahun lalu) tidak diimpor.`] : [])];
  if (sah.length === 0) return galat("Tidak ada bacaan dengan waktu yang wajar di berkas ini.");
  const suhu = sah.map((b) => b.suhu).filter((x): x is number => x != null);
  const lembap = sah.map((b) => b.lembap).filter((x): x is number => x != null);
  const ringkas = {
    berkas: file.name, serial: h.serial, model: h.model, kolom: h.kolom, urutan: h.urutan, urutanPasti: h.urutanPasti, peringatan,
    jumlah: sah.length, awal: new Date(sah[0].waktu).toISOString(), akhir: new Date(sah[sah.length - 1].waktu).toISOString(),
    suhu: suhu.length ? { min: Math.min(...suhu), maks: Math.max(...suhu) } : null,
    lembap: lembap.length ? { min: Math.min(...lembap), maks: Math.max(...lembap) } : null,
    contoh: sah.slice(0, 5).map((b) => ({ ...b, waktu: new Date(b.waktu).toISOString() })),
  };
  if (fd.get("simpan") !== "1") return NextResponse.json({ pratinjau: ringkas });
  const r = await simpanBacaan(l.id, sah, { serial: h.serial, sumber: "impor" });
  await audit("monitoring.impor", { email: g.sesi.user.email, ip: ipDari(req.headers), objek: l.kode, detail: `${file.name}: ${r.diterima} baru, ${r.duplikat} sudah ada${h.serial ? `; logger ${h.serial}` : ""}` });
  return NextResponse.json({ ok: `${r.diterima.toLocaleString("id-ID")} bacaan diimpor ke ${l.kode}${r.duplikat ? ` (${r.duplikat.toLocaleString("id-ID")} sudah ada, dilewati)` : ""}.`, ...r });
}
