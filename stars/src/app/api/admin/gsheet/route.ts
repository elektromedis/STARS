import { NextRequest, NextResponse } from "next/server";
import { sesiApi } from "@/lib/sesi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET ?url=<tautan Google Sheets> → isi spreadsheet sebagai .xlsx (diekspor oleh Google).
 * Hanya docs.google.com/spreadsheets/d/<id>; spreadsheet harus dibagikan "Siapa saja yang memiliki link: Pelihat".
 */
export async function GET(req: NextRequest) {
  const { tolak } = await sesiApi("Operator");
  if (tolak) return tolak;
  const m = /^https:\/\/docs\.google\.com\/spreadsheets\/d\/([A-Za-z0-9_-]{20,80})/.exec(req.nextUrl.searchParams.get("url") ?? "");
  if (!m) return NextResponse.json({ error: "Tautan harus berupa https://docs.google.com/spreadsheets/d/…" }, { status: 400 });
  const r = await fetch(`https://docs.google.com/spreadsheets/d/${m[1]}/export?format=xlsx`, { redirect: "follow", cache: "no-store", signal: AbortSignal.timeout(30_000) }).catch(() => null);
  const jenis = r?.headers.get("content-type") ?? "";
  if (!r || !r.ok || !jenis.includes("spreadsheetml")) return NextResponse.json({ error: "Spreadsheet tidak dapat dibaca. Pastikan dibagikan: Siapa saja yang memiliki link → Pelihat." }, { status: 502 });
  const buf = await r.arrayBuffer();
  if (buf.byteLength > 15 * 1024 * 1024) return NextResponse.json({ error: "Spreadsheet melebihi 15 MB." }, { status: 413 });
  return new NextResponse(buf, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Cache-Control": "no-store" } });
}
