import type { Metadata } from "next";
import { Info } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { sesiHalaman } from "@/lib/sesi";
import { unitTerkunci } from "@/lib/akses";
import { cukup } from "@/lib/peran";
import { AlatManager } from "@/components/pemeliharaan/alat-manager";

export const metadata: Metadata = { title: "Daftar Alat" };
export const dynamic = "force-dynamic";

export default async function AlatPage() {
  const s = await sesiHalaman("Viewer");
  const bolehKelola = cukup(s.user.peran, "Operator") && process.env.STARS_MODE !== "internet";
  const kunci = await unitTerkunci();
  const u = kunci ? { unitKerja: { nama: kunci.nama } } : {};
  const [data, units, ruangan] = await Promise.all([
    prisma.alat.findMany({ where: u, orderBy: [{ unitKerja: { urut: "asc" } }, { nama: "asc" }], include: { unitKerja: { select: { nama: true } }, ruangan: { select: { nama: true } }, _count: { select: { permintaan: true, perintah: true } } } }),
    prisma.unitKerja.findMany({ where: kunci ? { nama: kunci.nama } : { NOT: { nama: "TIDAK ADA" } }, orderBy: { urut: "asc" }, select: { id: true, nama: true } }),
    prisma.ruangan.findMany({ where: { ...u, aktif: true }, orderBy: [{ unitKerja: { urut: "asc" } }, { nama: "asc" }], select: { id: true, nama: true, gedung: true, unitKerjaId: true, unitKerja: { select: { nama: true } } } }),
  ]);
  return (
    <div className="grid gap-4">
      {!bolehKelola && (
        <p className="flex items-start gap-2 rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm text-teal-900">
          <Info className="mt-0.5 size-4 shrink-0" />
          <span>{process.env.STARS_MODE === "internet" ? "Server ini mode internet (baca saja)." : <>Peran <strong>{s.user.peran}</strong> hanya dapat melihat. Menambah/mengubah alat memerlukan peran Operator.</>}</span>
        </p>
      )}
      <AlatManager data={data} units={units} ruangan={ruangan} bolehKelola={bolehKelola} alamatPublik={process.env.STARS_URL_PUBLIK ?? ""} />
    </div>
  );
}
