/**
 * Dijalankan sekali saat server Next.js mulai.
 * Menjamin master 28 unit kerja ada dan akun Super Admin pertama tersedia (dari env), sehingga
 * server baru (Docker) langsung bisa dipakai tanpa langkah seed manual; juga menyalakan sinkron TRILUX berkala.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") await (await import("./instrumentation-node")).mulai();
}
