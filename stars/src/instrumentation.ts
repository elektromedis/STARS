/**
 * Dijalankan sekali saat server Next.js mulai (runtime Node).
 * Menjamin master 28 unit kerja ada dan akun Super Admin pertama tersedia (dari env), sehingga
 * server baru (Docker) langsung bisa dipakai tanpa langkah seed manual.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { bootstrap } = await import("./lib/bootstrap");
  await bootstrap().catch((e) => console.error("[bootstrap] gagal:", e));
}
