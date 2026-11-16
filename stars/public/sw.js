/* Service worker STARS (PWA).
 * - Aset build (/_next/static, ikon) : cache-first (nama berkas sudah ber-hash, aman disimpan lama).
 * - Halaman                          : selalu dari server; bila jaringan putus tampil halaman offline.
 *                                      Halaman TIDAK disimpan di perangkat (data RS tidak tertinggal di HP bersama).
 * - API, admin, login, unggahan      : tidak pernah di-cache (selalu langsung ke server, data sensitif tidak disimpan).
 */
const VERSI = "stars-v1";
const STATIS = `${VERSI}-statis`;
const OFFLINE = "/offline.html";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(STATIS).then((c) => c.addAll([OFFLINE, "/ikon-192.png", "/ikon-512.png"])).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => !k.startsWith(VERSI)).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

const tanpaCache = (p) => p.startsWith("/api/") || p.startsWith("/admin") || p.startsWith("/login") || p.startsWith("/akun") || p.startsWith("/setel-sandi") || p.startsWith("/uploads");

self.addEventListener("fetch", (e) => {
  const r = e.request;
  if (r.method !== "GET") return;
  const url = new URL(r.url);
  if (url.origin !== self.location.origin || tanpaCache(url.pathname)) return;

  if (url.pathname.startsWith("/_next/static/") || /\.(png|svg|ico|woff2?)$/.test(url.pathname)) {
    e.respondWith(
      caches.match(r).then((ada) => ada || fetch(r).then((res) => {
        if (res.ok) { const salin = res.clone(); caches.open(STATIS).then((c) => c.put(r, salin)); }
        return res;
      })),
    );
    return;
  }

  if (r.mode === "navigate") {
    e.respondWith(
      fetch(r).catch(() => caches.match(OFFLINE)),
    );
  }
});
