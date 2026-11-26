import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { sesiHalaman } from "@/lib/sesi";
import { cukup } from "@/lib/peran";
import { JENIS_BARANG } from "@/lib/stok";
import { RingkasInventaris } from "@/components/pemeliharaan/ringkas-inventaris";
import { StokManager } from "@/components/admin/stok-manager";

export const metadata: Metadata = { title: "Sparepart & BHP-BMHP" };
export const dynamic = "force-dynamic";

export default async function StokPage({ searchParams }: { searchParams: Promise<{ jenis?: string }> }) {
  const { jenis } = await searchParams;
  const s = await sesiHalaman("Viewer");
  const boleh = cukup(s.user.peran, "Operator") && process.env.STARS_MODE !== "internet";
  const data = await prisma.barangStok.findMany({ where: { aktif: true, ...(jenis && JENIS_BARANG.includes(jenis as never) ? { jenis } : {}) }, orderBy: [{ jenis: "asc" }, { nama: "asc" }], include: { mutasi: { orderBy: { waktu: "desc" }, take: 8 } } });
  const iso = (d: Date | null) => d?.toISOString() ?? null;
  return (
    <div className="grid gap-4">
    <RingkasInventaris aktif={jenis} />
    <StokManager boleh={boleh} data={data.map((b) => ({
      ...b, kedaluwarsa: iso(b.kedaluwarsa), kalibrasiSampai: iso(b.kalibrasiSampai),
      mutasi: b.mutasi.map((m) => ({ id: m.id, jenis: m.jenis, jumlah: m.jumlah, stokSetelah: m.stokSetelah, keterangan: m.keterangan, oleh: m.oleh, waktu: m.waktu.toISOString() })),
    }))} />
    </div>
  );
}
