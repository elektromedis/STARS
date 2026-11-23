import type { Metadata } from "next";
import { unitTerkunci } from "@/lib/akses";
import { dataKantor } from "@/lib/allies-kantor";
import { sesiHalaman } from "@/lib/sesi";
import { Dashboard3D } from "@/components/dashboard/dashboard-3d";

export const metadata: Metadata = { title: "Dashboard 3D" };
export const dynamic = "force-dynamic";

export default async function Page() {
  await sesiHalaman("Viewer");
  const kunci = await unitTerkunci();
  return <Dashboard3D divisi={await dataKantor(kunci?.id ?? null)} />;
}
