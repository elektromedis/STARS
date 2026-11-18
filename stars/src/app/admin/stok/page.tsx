import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { sesiHalaman } from "@/lib/sesi";
import { cukup } from "@/lib/peran";
import { StokManager } from "@/components/admin/stok-manager";

export const metadata: Metadata = { title: "Stok & BHP" };
export const dynamic = "force-dynamic";

export default async function StokPage() {
  const s = await sesiHalaman("Viewer");
  const boleh = cukup(s.user.peran, "Operator") && process.env.STARS_MODE !== "internet";
  const data = await prisma.barangStok.findMany({ where: { aktif: true }, orderBy: [{ jenis: "asc" }, { nama: "asc" }], include: { mutasi: { orderBy: { waktu: "desc" }, take: 8 } } });
  const iso = (d: Date | null) => d?.toISOString() ?? null;
  return (
    <StokManager boleh={boleh} data={data.map((b) => ({
      ...b, kedaluwarsa: iso(b.kedaluwarsa), kalibrasiSampai: iso(b.kalibrasiSampai),
      mutasi: b.mutasi.map((m) => ({ id: m.id, jenis: m.jenis, jumlah: m.jumlah, stokSetelah: m.stokSetelah, keterangan: m.keterangan, oleh: m.oleh, waktu: m.waktu.toISOString() })),
    }))} />
  );
}
