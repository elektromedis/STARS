/**
 * Alamat (origin) STARS yang sedang dipakai browser — localhost, IP LAN, atau alamat https Tailscale/domain.
 *
 * Di Docker server mendengarkan di 0.0.0.0:3000, sehingga `req.url`/`req.nextUrl.origin` berisi
 * `http(s)://0.0.0.0:3000` dan tidak bisa dibuka browser. Alamat asli dibaca dari header
 * `x-forwarded-host`/`x-forwarded-proto` (diisi Tailscale Funnel/Caddy, atau oleh Next.js sendiri dari
 * header Host bila diakses langsung). Aman dipakai di middleware (Edge) maupun route handler.
 */
const POLA_HOST = /^(?:[a-z0-9-]+(?:\.[a-z0-9-]+)*|\[[0-9a-f:.]+\])(?::\d{1,5})?$/i;

export function asalPermintaan(h: Headers, cadangan?: string): string {
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "").split(",")[0].trim();
  const proto = (h.get("x-forwarded-proto") ?? "").split(",")[0].trim().toLowerCase();
  if (host && POLA_HOST.test(host) && !/^0\.0\.0\.0(?::|$)/.test(host)) return `${proto === "https" ? "https" : "http"}://${host}`;
  return cadangan ?? "http://localhost:3000";
}

/** Path tujuan setelah login: hanya path relatif di situs ini (mencegah open redirect), selain itu /admin. */
export function tujuanAman(callbackUrl: unknown, bawaan = "/admin"): string {
  const t = typeof callbackUrl === "string" ? callbackUrl.trim() : "";
  return t.startsWith("/") && !t.startsWith("//") && !t.startsWith("/\\") ? t : bawaan;
}

/** URL halaman login lengkap (di alamat yang sedang dipakai) yang kembali ke `kembaliKe` setelah berhasil masuk. */
export function urlLogin(h: Headers, kembaliKe: string, cadangan?: string): URL {
  const u = new URL("/login", asalPermintaan(h, cadangan));
  u.searchParams.set("callbackUrl", tujuanAman(kembaliKe));
  return u;
}
