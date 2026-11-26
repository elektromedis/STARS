import { NextResponse, type NextRequest } from "next/server";
import { signIn } from "@/auth";

export const dynamic = "force-dynamic";

/** GET /imms/tamu?t=<token> — masuk mode pratinjau (baca saja) lalu ke Beranda EMASCARE. */
export async function GET(req: NextRequest) {
  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? req.nextUrl.host).split(",")[0].trim();
  const proto = /:(443|8443)$/.test(host) ? "https" : (req.headers.get("x-forwarded-proto")?.split(",")[0].trim() ?? req.nextUrl.protocol.replace(":", ""));
  const dasar = `${proto}://${host}`;
  try {
    if (req.nextUrl.searchParams.get("dosen")) await signIn("dosen", { redirect: false });
    else await signIn("tamu", { token: req.nextUrl.searchParams.get("t") ?? "", redirect: false });
    return NextResponse.redirect(`${dasar}/imms`, 303);
  } catch {
    return NextResponse.redirect(`${dasar}/imms/login?tamu=gagal`, 303);
  }
}
