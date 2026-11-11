import type { Metadata } from "next";
import { Info } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { sesiHalaman } from "@/lib/sesi";
import { cukup } from "@/lib/peran";
import { StatCard } from "@/components/dashboard/stat-card";
import { PermintaanPanel } from "@/components/pemeliharaan/permintaan-panel";
import { PerintahPanel } from "@/components/pemeliharaan/perintah-panel";
import { formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Pemeliharaan" };
export const dynamic = "force-dynamic";

export default async function PemeliharaanPage() {
  const s = await sesiHalaman("Viewer");
  const bolehKelola = cukup(s.user.peran, "Operator") && process.env.STARS_MODE !== "internet";

  const [permintaan, perintah, teknisi, cBaru, cProses, cTerbuka, cSelesai] = await Promise.all([
    prisma.permintaanKerja.findMany({ orderBy: [{ createdAt: "desc" }], take: 100, include: { unitKerja: { select: { nama: true } }, perintah: { select: { nomor: true } } } }),
    prisma.perintahKerja.findMany({ orderBy: [{ createdAt: "desc" }], take: 100, include: { teknisi: { select: { nama: true } }, permintaan: { select: { nomor: true } }, alat: { select: { kode: true, nama: true } } } }),
    prisma.pengguna.findMany({ where: { aktif: true, peran: { in: ["Operator", "Admin", "Super Admin"] } }, orderBy: { nama: "asc" }, select: { id: true, nama: true } }),
    prisma.permintaanKerja.count({ where: { status: "Baru" } }),
    prisma.permintaanKerja.count({ where: { status: { in: ["Ditinjau", "Diproses"] } } }),
    prisma.perintahKerja.count({ where: { status: { in: ["Terbuka", "Dikerjakan"] } } }),
    prisma.perintahKerja.count({ where: { status: "Selesai" } }),
  ]);

  return (
    <div className="grid gap-6">
      {!bolehKelola && (
        <p className="flex items-start gap-2 rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm text-teal-900">
          <Info className="mt-0.5 size-4 shrink-0" />
          <span>{process.env.STARS_MODE === "internet" ? "Server ini mode internet (baca saja): triase dilakukan di server intranet RS." : <>Peran <strong>{s.user.peran}</strong> hanya dapat melihat. Pengelolaan memerlukan peran Operator.</>}</span>
        </p>
      )}

      <section aria-label="Ringkasan" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Laporan baru" value={formatNumber(cBaru)} hint="belum ditinjau" />
        <StatCard label="Dalam proses" value={formatNumber(cProses)} hint="ditinjau / diproses" />
        <StatCard label="Perintah kerja aktif" value={formatNumber(cTerbuka)} hint="terbuka / dikerjakan" />
        <StatCard label="Perintah kerja selesai" value={formatNumber(cSelesai)} hint="total tercatat" />
      </section>

      <PermintaanPanel data={permintaan} teknisi={teknisi} bolehKelola={bolehKelola} />
      <PerintahPanel data={perintah} teknisi={teknisi} bolehKelola={bolehKelola} />
    </div>
  );
}
