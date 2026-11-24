import { sesiImms } from "@/lib/imms-sesi";
import Link from "next/link";
import { DaftarWo } from "@/components/imms/daftar-wo";

export default async function Terencana({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  await sesiImms("Operator");
  const { s = "buka" } = await searchParams;
  return (
    <div className="space-y-3">
      <p className="redup text-[13px]">Alur Permenkes 65/2016: pendataan alat → penyiapan kebutuhan (bahan habis pakai, prosedur, aksesoris) → jadwal dari nilai EM → pelaksanaan (pembersihan, pelumasan, penggantian aksesoris). Perintah kerja dibuat dari menu <Link className="tautan" href="/imms/jadwal">Jadwal</Link>.</p>
      <div className="flex gap-2">{[["buka", "Berjalan"], ["selesai", "Selesai"]].map(([v, l]) => <Link key={v} href={`/imms/terencana?s=${v}`} className={`kapsul ${s === v ? "utama" : ""}`}>{l}</Link>)}</div>
      <DaftarWo where={{ jenis: "Preventif", status: s === "selesai" ? "Selesai" : { in: ["Terbuka", "Dikerjakan"] } }} kosong="Belum ada pemeliharaan terencana. Buat dari menu Jadwal." />
    </div>
  );
}
