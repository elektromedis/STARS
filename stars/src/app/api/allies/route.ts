import { NextResponse, type NextRequest } from "next/server";
import { unitTerkunci } from "@/lib/akses";
import { jawabAllies } from "@/lib/allies";
import { ipDari } from "@/lib/audit";
import { batasi } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Tanya ALLIES: { pesan } → { blok, saran }. Tanpa AI eksternal; pesan tidak disimpan dan tidak dikirim ke mana pun. */
export async function POST(req: NextRequest) {
  const ip = ipDari(req.headers) ?? "lokal";
  if (!batasi(`allies:${ip}`, 40, 60_000).boleh) return NextResponse.json({ error: "Terlalu banyak pertanyaan; tunggu sebentar." }, { status: 429 });
  let pesan = "";
  try {
    const j = (await req.json()) as { pesan?: unknown };
    pesan = typeof j.pesan === "string" ? j.pesan.slice(0, 500) : "";
  } catch {
    return NextResponse.json({ error: "Format salah." }, { status: 400 });
  }
  const kunci = await unitTerkunci();
  const jawab = await jawabAllies(pesan, kunci?.id ?? null);
  return NextResponse.json(jawab, { headers: { "Cache-Control": "no-store" } });
}
