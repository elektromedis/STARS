import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { BingkaiAkun } from "@/components/akun/bingkai-akun";
import { FormDaftar } from "@/components/akun/form-akun";

export const metadata: Metadata = { title: "Daftar akun" };
export const dynamic = "force-dynamic";

export default async function DaftarPage() {
  if ((await auth())?.user) redirect("/admin");
  const units = await prisma.unitKerja.findMany({ where: { nama: { not: "TIDAK ADA" } }, orderBy: { urut: "asc" }, select: { id: true, nama: true } });
  return <BingkaiAkun catatan="Data pendaftaran hanya dipakai Admin STARS untuk memverifikasi akun."><FormDaftar units={units} /></BingkaiAkun>;
}
