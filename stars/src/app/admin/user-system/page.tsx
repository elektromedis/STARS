import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { sesiHalaman } from "@/lib/sesi";
import { AKSI, MENU_AKSES, ROLE, bacaSemuaAkses, roleBawaan } from "@/lib/role";
import { PERAN, PERAN_KETERANGAN } from "@/lib/peran";
import { UserSystem } from "@/components/admin/user-system";

export const metadata: Metadata = { title: "User System" };
export const dynamic = "force-dynamic";

/** Tingkatan sistem + peran pengguna dengan sakelar ON/OFF akses & menu per peran (gaya TRILUX "User Menu Access"). */
export default async function UserSystemPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  await sesiHalaman("Admin");
  const sp = await searchParams;
  const [akses, pengguna] = await Promise.all([bacaSemuaAkses(), prisma.pengguna.findMany({ where: { menunggu: false }, select: { role: true, peran: true } })]);
  const jumlah: Record<string, number> = {};
  for (const p of pengguna) { const r = p.role ?? roleBawaan(p.peran); jumlah[r] = (jumlah[r] ?? 0) + 1; }
  const pilih = ROLE.some((r) => r.nama === sp.role) ? sp.role! : ROLE[1].nama;
  return (
    <UserSystem
      role={ROLE.map((r) => ({ ...r, jumlah: jumlah[r.nama] ?? 0 }))}
      pilih={pilih}
      akses={akses}
      aksi={AKSI.map((a) => ({ kode: a.kode, label: a.label }))}
      menu={MENU_AKSES}
      tingkatan={PERAN.map((p) => ({ nama: p, ket: PERAN_KETERANGAN[p] }))}
    />
  );
}
