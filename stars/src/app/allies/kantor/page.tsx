import type { Metadata } from "next";
import { unitTerkunci } from "@/lib/akses";
import { dataKantor } from "@/lib/allies-kantor";
import { sesiHalaman } from "@/lib/sesi";
import { KantorAI } from "@/components/allies/kantor-ai";

export const metadata: Metadata = { title: "Kantor AI ALLIES" };
export const dynamic = "force-dynamic";

export default async function Page() {
  await sesiHalaman("Viewer");
  const kunci = await unitTerkunci();
  const divisi = await dataKantor(kunci?.id ?? null);
  return <div className="mx-auto max-w-7xl px-4 py-6"><KantorAI divisi={divisi} /></div>;
}
