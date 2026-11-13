import type { NextAuthConfig } from "next-auth";
import { urlLogin } from "./lib/alamat";

/**
 * Konfigurasi Auth.js yang AMAN untuk Edge (dipakai middleware): tanpa Prisma, tanpa bcrypt.
 * Provider Credentials yang menyentuh basis data ada di src/auth.ts.
 */
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 }, // 8 jam, lalu login ulang
  trustHost: true, // diakses lewat localhost, IP intranet, maupun alamat publik (Tailscale/domain) sekaligus — JANGAN set AUTH_URL
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const masuk = Boolean(auth?.user);
      const { pathname } = request.nextUrl;
      if (pathname.startsWith("/api/admin")) {
        return masuk ? true : Response.json({ error: "Autentikasi diperlukan. Masuk lewat /login." }, { status: 401 });
      }
      // Belum login → /login di alamat yang SEDANG dipakai (localhost, IP LAN, atau https Tailscale), bukan
      // AUTH_URL/0.0.0.0. Bawaan Auth.js memakai request.nextUrl yang di Docker berisi 0.0.0.0:3000.
      if (pathname.startsWith("/admin") && !masuk) return Response.redirect(urlLogin(request.headers, pathname + request.nextUrl.search, request.nextUrl.origin), 307);
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.nama = user.nama;
        token.peran = user.peran;
        token.unitKerjaId = user.unitKerjaId;
        token.unitKerja = user.unitKerja;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = String(token.uid ?? "");
      session.user.nama = String(token.nama ?? "");
      session.user.peran = String(token.peran ?? "Viewer");
      session.user.unitKerjaId = (token.unitKerjaId as number | null | undefined) ?? null;
      session.user.unitKerja = (token.unitKerja as string | null | undefined) ?? null;
      return session;
    },
  },
} satisfies NextAuthConfig;
