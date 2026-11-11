import type { Metadata } from "next";
import { Info } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { sesiHalaman } from "@/lib/sesi";
import { cukup } from "@/lib/peran";
import { JadwalManager } from "@/components/pemeliharaan/jadwal-manager";

export const metadata: Metadata = { title: "Jadwal Preventif" };
export const dynamic = "force-dynamic";

export default async function JadwalPage() {
  const s = await sesiHalaman("Viewer");
  const bolehKelola = cukup(s.user.peran, "Operator") && process.env.STARS_MODE !== "internet";
  const [jadwal, alat] = await Promise.all([
    prisma.jadwalPreventif.findMany({ orderBy: [{ aktif: "desc" }, { berikutnya: "asc" }], include: { alat: { select: { kode: true, nama: true, unitKerja: { select: { nama: true } } } }, perintah: { where: { status: { in: ["Terbuka", "Dikerjakan"] } }, select: { nomor: true } } } }),
    prisma.alat.findMany({ where: { aktif: true }, orderBy: [{ unitKerja: { urut: "asc" } }, { nama: "asc" }], select: { id: true, kode: true, nama: true, unitKerja: { select: { nama: true } } } }),
  ]);
  return (
    <div className="grid gap-4">
      {!bolehKelola && (
        <p className="flex items-start gap-2 rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm text-teal-900"><Info className="mt-0.5 size-4 shrink-0" />
          <span>{process.env.STARS_MODE === "internet" ? "Server ini mode internet (baca saja)." : <>Peran <strong>{s.user.peran}</strong> hanya dapat melihat. Mengelola jadwal memerlukan peran Operator.</>}</span></p>
      )}
      <JadwalManager data={jadwal} alat={alat} bolehKelola={bolehKelola} />
    </div>
  );
}
