import { sesiImms } from "@/lib/imms-sesi";
import Link from "next/link";
import { DaftarWo } from "@/components/imms/daftar-wo";

export default async function Inspeksi({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  await sesiImms("Operator");
  const { s = "buka" } = await searchParams;
  return (
    <div className="space-y-3">
      <p className="redup text-[13px]">Inspeksi menilai kelengkapan aksesoris, faktor fisik, keamanan (ESA), kinerja, dan fungsi alat. Temuan masalah alat otomatis menjadi laporan kerusakan; temuan aksesoris dicatat sebagai laporan kondisi aksesoris. Buat dari <Link className="tautan" href="/imms/jadwal">Jadwal</Link> atau tombol &ldquo;Inspeksi sekarang&rdquo; di kartu alat.</p>
      <div className="flex gap-2">{[["buka", "Berjalan"], ["selesai", "Selesai"]].map(([v, l]) => <Link key={v} href={`/imms/inspeksi?s=${v}`} className={`kapsul ${s === v ? "utama" : ""}`}>{l}</Link>)}</div>
      <DaftarWo where={{ jenis: "Inspeksi", status: s === "selesai" ? "Selesai" : { in: ["Terbuka", "Dikerjakan"] } }} kosong="Belum ada inspeksi." />
    </div>
  );
}
