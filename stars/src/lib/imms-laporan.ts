import { prisma } from "./prisma";

/** Periode laporan: bulan (YYYY-MM) atau tahun (YYYY). */
export function periode(p: string | undefined) {
  const kini = new Date();
  const m = /^(\d{4})(?:-(\d{2}))?$/.exec(p ?? "");
  const th = m ? Number(m[1]) : kini.getFullYear();
  const bl = m ? (m[2] ? Number(m[2]) - 1 : null) : kini.getMonth();
  const dari = new Date(th, bl ?? 0, 1), sampai = bl == null ? new Date(th + 1, 0, 1) : new Date(th, bl + 1, 1);
  const label = bl == null ? `Tahun ${th}` : new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(dari);
  return { dari, sampai, label, kode: bl == null ? String(th) : `${th}-${String(bl + 1).padStart(2, "0")}`, tahunan: bl == null };
}

/** Rekap pekerjaan per unit kerja (Permenkes 65/2016: laporan bulanan & rekap tahunan termasuk biaya per unit). */
export async function rekapUnit(dari: Date, sampai: Date) {
  const wo = await prisma.perintahKerja.findMany({
    where: { createdAt: { gte: dari, lt: sampai }, status: { not: "Batal" } },
    select: { nomor: true, jenis: true, status: true, biaya: true, ujiFungsi: true, createdAt: true, tanggalSelesai: true, alat: { select: { nama: true, kode: true, unitKerja: { select: { nama: true } } } } },
    orderBy: { createdAt: "asc" },
  });
  const unit = new Map<string, { terencana: number; inspeksi: number; perbaikan: number; selesai: number; biaya: number }>();
  for (const w of wo) {
    const k = w.alat?.unitKerja.nama ?? "Tanpa unit";
    const r = unit.get(k) ?? { terencana: 0, inspeksi: 0, perbaikan: 0, selesai: 0, biaya: 0 };
    if (w.jenis === "Preventif") r.terencana++; else if (w.jenis === "Inspeksi") r.inspeksi++; else r.perbaikan++;
    if (w.status === "Selesai") r.selesai++;
    r.biaya += w.biaya ?? 0;
    unit.set(k, r);
  }
  return { wo, unit: [...unit].sort((a, b) => a[0].localeCompare(b[0])) };
}
