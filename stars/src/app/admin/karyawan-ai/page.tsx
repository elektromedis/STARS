import type { Metadata } from "next";
import { sesiHalaman } from "@/lib/sesi";
import { KARYAWAN } from "@/lib/allies-karyawan";
import { bacaJadwal, bacaLog, TUGAS } from "@/lib/karyawan-ai";
import { KaryawanAiPanel } from "@/components/admin/karyawan-ai";

export const metadata: Metadata = { title: "Karyawan AI" };
export const dynamic = "force-dynamic";

/** Karyawan AI otomatis: sakelar ON/OFF, jam kerja, jalankan sekarang, dan catatan hasil kerja. */
export default async function KaryawanAiPage() {
  await sesiHalaman("Admin");
  const [jadwal, log] = await Promise.all([bacaJadwal(), bacaLog()]);
  return (
    <KaryawanAiPanel
      karyawan={KARYAWAN.map((k) => ({ id: k.id, nama: k.nama, bidang: k.bidang, tugas: TUGAS[k.id], jadwal: jadwal[k.id], terakhir: log.find((c) => c.karyawan === k.id)?.waktu ?? null }))}
      log={log.slice(0, 60)}
      ai={Boolean(process.env.ANTHROPIC_API_KEY || process.env.ALLIES_LLM_URL)}
    />
  );
}
