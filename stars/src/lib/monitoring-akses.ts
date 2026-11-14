import { NextResponse } from "next/server";
import { sesiApi } from "@/lib/sesi";
import type { Peran } from "@/lib/peran";

/** Penjaga rute CMS monitoring: login + peran minimal + server bukan mode internet (baca saja). */
export async function penjagaMonitoring(minimal: Peran = "Operator") {
  const { sesi, tolak } = await sesiApi(minimal);
  if (tolak) return { tolak } as const;
  if (process.env.STARS_MODE === "internet") return { tolak: NextResponse.json({ error: "Server mode internet bersifat baca saja." }, { status: 403 }) } as const;
  return { sesi: sesi!, tolak: null } as const;
}
export const idDari = (t: string) => { const n = Number(t); return Number.isInteger(n) && n > 0 ? n : null; };
export const galat = (pesan: string, status = 400) => NextResponse.json({ error: pesan }, { status });
