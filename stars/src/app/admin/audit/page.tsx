import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { sesiHalaman } from "@/lib/sesi";
import { cukup } from "@/lib/peran";
import { unitTerkunci } from "@/lib/akses";
import { DaftarAudit, LembarAudit } from "@/components/admin/audit-manager";

export const metadata: Metadata = { title: "Audit Inventaris" };
export const dynamic = "force-dynamic";

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const s = await sesiHalaman("Viewer");
  const boleh = cukup(s.user.peran, "Operator") && process.env.STARS_MODE !== "internet";
  const kunci = await unitTerkunci();
  const whereAlat = { aktif: true, ...(kunci ? { unitKerja: { nama: kunci.nama } } : {}) };
  const total = await prisma.alat.count({ where: whereAlat });
  const id = Number((await searchParams).id) || null;
  if (id) {
    const a = await prisma.auditInventaris.findUnique({ where: { id } });
    if (a) {
      const [alat, item] = await Promise.all([
        prisma.alat.findMany({ where: whereAlat, orderBy: [{ unitKerja: { urut: "asc" } }, { ruangan: { nama: "asc" } }, { nama: "asc" }], select: { id: true, kode: true, nama: true, merek: true, unitKerja: { select: { nama: true } }, ruangan: { select: { nama: true } }, lokasi: true } }),
        prisma.auditItem.findMany({ where: { auditId: id } }),
      ]);
      const peta = new Map(item.map((i) => [i.alatId, i]));
      const baris = alat.map((x) => { const h = peta.get(x.id); return { id: x.id, kode: x.kode, nama: x.nama, merek: x.merek, unit: x.unitKerja.nama, ruangan: x.ruangan?.nama ?? x.lokasi, hasil: h ? { ditemukan: h.ditemukan, kondisiSesuai: h.kondisiSesuai, lokasiSesuai: h.lokasiSesuai, catatan: h.catatan } : null }; });
      const diperiksa = baris.filter((b) => b.hasil).length, ditemukan = baris.filter((b) => b.hasil?.ditemukan).length;
      return <LembarAudit boleh={boleh} baris={baris} audit={{ id: a.id, tahun: a.tahun, nama: a.nama, status: a.status, diperiksa, ditemukan, total: baris.length }} />;
    }
  }
  const daftar = await prisma.auditInventaris.findMany({ orderBy: { createdAt: "desc" }, include: { item: { select: { ditemukan: true } } } });
  return <DaftarAudit boleh={boleh} data={daftar.map((a) => ({ id: a.id, tahun: a.tahun, nama: a.nama, status: a.status, diperiksa: a.item.length, ditemukan: a.item.filter((i) => i.ditemukan).length, total }))} />;
}
