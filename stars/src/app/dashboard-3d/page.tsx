import type { Metadata } from "next";
import { auth } from "@/auth";
import { unitTerkunci } from "@/lib/akses";
import { dataKantor, divisiPublik } from "@/lib/allies-kantor";
import { Dashboard3D } from "@/components/dashboard/dashboard-3d";

export const metadata: Metadata = { title: "Dashboard 3D" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const sesi = await auth();
  if (!sesi?.user) return <Dashboard3D divisi={divisiPublik(await dataKantor(null))} publik />;
  const kunci = await unitTerkunci();
  return <Dashboard3D divisi={await dataKantor(kunci?.id ?? null)} />;
}
