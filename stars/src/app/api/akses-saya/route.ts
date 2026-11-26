import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { aksesPengguna } from "@/lib/role";

export const dynamic = "force-dynamic";

/** GET — menu yang DIMATIKAN untuk peran pengguna yang login (dipakai menu samping & penjaga halaman). */
export async function GET() {
  const s = await auth();
  const a = await aksesPengguna(s?.user?.id);
  return NextResponse.json({ role: a?.role ?? null, tutup: a ? Object.entries(a.menu).filter(([, v]) => v === false).map(([h]) => h) : [] }, { headers: { "Cache-Control": "no-store" } });
}
