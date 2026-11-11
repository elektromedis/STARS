import type { Metadata } from "next";
import { Wrench } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { LaporForm } from "./lapor-form";

export const metadata: Metadata = { title: "Lapor Kerusakan Alat" };
export const dynamic = "force-dynamic";

export default async function LaporPage() {
  const units = await prisma.unitKerja.findMany({ where: { NOT: { nama: "TIDAK ADA" } }, orderBy: { urut: "asc" }, select: { id: true, nama: true } });
  return (
    <div className="mx-auto max-w-3xl">
      <section className="mb-6 flex items-start gap-4 rounded-2xl bg-gradient-to-br from-navy-800 to-teal-800 p-6 text-white shadow-card">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white/15"><Wrench className="size-6" aria-hidden /></div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-100">RSUD Cipayung</p>
          <h1 className="text-2xl font-bold">Lapor Kerusakan Alat</h1>
          <p className="mt-1 text-sm text-navy-100">Laporkan alat kesehatan atau sarana yang rusak/bermasalah. Tidak perlu akun — cukup isi formulir di bawah.</p>
        </div>
      </section>
      <LaporForm units={units} />
    </div>
  );
}
