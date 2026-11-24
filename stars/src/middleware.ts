import NextAuth from "next-auth";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { authConfig } from "./auth.config";

/**
 * 1) Domain IMMS (IMMS_HOST, atau host berawalan "imms."/"cmms."): semua halaman dipetakan ke /imms/* sehingga
 *    aplikasi Inventaris & Pemeliharaan tampil mandiri di domainnya sendiri, tetapi tetap memakai basis data & akun STARS.
 * 2) Melindungi /admin dan /api/admin: tanpa sesi → /login (halaman) atau 401 (API).
 *    Pemeriksaan PERAN dilakukan di setiap halaman/route lewat src/lib/sesi.ts, bukan di sini.
 */
const lindungi = NextAuth(authConfig).auth as unknown as (req: NextRequest, ev: NextFetchEvent) => Promise<Response>;

export function hostImms(host: string | null) {
  const h = (host ?? "").split(",")[0].trim().split(":")[0].toLowerCase();
  const env = (process.env.IMMS_HOST ?? "").trim().toLowerCase();
  return (env !== "" && h === env) || /^(imms|cmms)\./.test(h);
}

export default async function middleware(req: NextRequest, ev: NextFetchEvent) {
  const p = req.nextUrl.pathname;
  if (hostImms(req.headers.get("x-forwarded-host") ?? req.headers.get("host")) && !/^\/(imms|api|admin|login|_next)(\/|$)/.test(p) && !/\.[a-z0-9]+$/i.test(p)) {
    const u = req.nextUrl.clone();
    u.pathname = "/imms" + (p === "/" ? "" : p);
    return NextResponse.rewrite(u);
  }
  if (p.startsWith("/admin") || p.startsWith("/api/admin")) return lindungi(req, ev);
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
