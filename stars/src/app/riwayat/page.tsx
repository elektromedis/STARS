import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/dashboard/page-header";
import { RiwayatKlien, type Aktivitas } from "./riwayat-klien";

export const metadata: Metadata = { title: "Riwayat" };
export const dynamic = "force-dynamic";

export default async function RiwayatPage() {
  const s = await auth();
  const aktivitas: Aktivitas[] = s?.user?.email
    ? (await prisma.auditLog.findMany({ where: { email: s.user.email }, orderBy: { waktu: "desc" }, take: 40, select: { id: true, waktu: true, aksi: true, objek: true, detail: true } }))
      .map((a) => ({ ...a, waktu: a.waktu.toISOString() }))
    : [];
  return (
    <>
      <PageHeader title="Riwayat" description="Laporan kerusakan yang Anda kirim dari perangkat ini beserta statusnya, alat yang pernah Anda pindai, dan aktivitas akun Anda." />
      <RiwayatKlien aktivitas={aktivitas} masuk={Boolean(s?.user)} />
    </>
  );
}
