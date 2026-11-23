import type { Metadata } from "next";
import { unitTerkunci } from "@/lib/akses";
import { jawabAllies, SARAN_PEMBUKA } from "@/lib/allies";
import { aiAktif } from "@/lib/allies-ai";
import { dataKantor } from "@/lib/allies-kantor";
import { sesiHalaman } from "@/lib/sesi";
import { KantorAI } from "@/components/allies/kantor-ai";

export const metadata: Metadata = { title: "Kantor AI ALLIES" };
export const dynamic = "force-dynamic";

export default async function Page() {
  await sesiHalaman("Viewer");
  const kunci = await unitTerkunci();
  const [divisi, pembuka] = await Promise.all([dataKantor(kunci?.id ?? null), jawabAllies("halo", kunci?.id ?? null)]);
  return <div className="mx-auto max-w-[96rem] px-4 py-6"><KantorAI divisi={divisi} pembuka={pembuka} saranAwal={SARAN_PEMBUKA} ai={aiAktif()} /></div>;
}
