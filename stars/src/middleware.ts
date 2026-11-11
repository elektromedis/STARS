import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

/**
 * Melindungi /admin dan /api/admin: pengunjung tanpa sesi dialihkan ke /login (halaman) atau mendapat 401 (API).
 * Pemeriksaan PERAN dilakukan di setiap halaman/route lewat src/lib/sesi.ts, bukan di sini.
 * /api/sync memakai token terpisah (lihat route-nya) sehingga tidak masuk matcher.
 */
export default NextAuth(authConfig).auth;

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };
