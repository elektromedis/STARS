/** Bagian instrumentation yang hanya berjalan di runtime Node (dipisah agar tidak ikut dibundel untuk edge). */
export async function mulai() {
  const { bootstrap } = await import("./lib/bootstrap");
  await bootstrap().catch((e) => console.error("[bootstrap] gagal:", e));
  // Sinkron TRILUX berkala (hanya bila TRILUX_DB_URL diisi). Menit diatur lewat TRILUX_SINKRON_MENIT (0 = manual saja).
  const menit = Number(process.env.TRILUX_SINKRON_MENIT ?? 15);
  if (process.env.TRILUX_DB_URL && menit > 0) {
    const { sinkronTrilux } = await import("./lib/sinkron-trilux");
    const putar = () => sinkronTrilux().catch((e) => console.error("[sinkron TRILUX] gagal:", (e as Error).message));
    setTimeout(putar, 60_000);
    setInterval(putar, menit * 60_000);
  }
  // Kirim ringkasan perubahan data ke email/WA petugas (NOTIF_KIRIM_MENIT, bawaan 10; 0 = mati).
  const mNotif = Number(process.env.NOTIF_KIRIM_MENIT ?? 10);
  if (mNotif > 0) {
    const { kirimNotifPerubahan } = await import("./lib/notif-kirim");
    setInterval(() => { kirimNotifPerubahan().catch((e) => console.error("[notif] gagal:", (e as Error).message)); }, mNotif * 60_000);
  }
}
