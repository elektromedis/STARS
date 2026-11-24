import { sesiImms } from "@/lib/imms-sesi";
import Link from "next/link";
import { DaftarWo } from "@/components/imms/daftar-wo";

export default async function Persetujuan({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  await sesiImms("Operator");
  const { s = "menunggu" } = await searchParams;
  return (
    <div className="space-y-3">
      <p className="redup text-[13px]">Usulan suku cadang dan perbaikan pihak ketiga memuat analisis kerusakan, kebutuhan, dan perkiraan biaya. Pimpinan (peran Admin) menyetujui atau menolak di halaman perintah kerja; persetujuan digital tercatat di jejak audit.</p>
      <div className="flex gap-2">{[["menunggu", "Menunggu"], ["Disetujui", "Disetujui"], ["Ditolak", "Ditolak"]].map(([v, l]) => <Link key={v} href={`/imms/persetujuan?s=${v}`} className={`kapsul ${s === v ? "utama" : ""}`}>{l}</Link>)}</div>
      <DaftarWo where={{ usulanStatus: s === "menunggu" ? "Diajukan" : s }} kosong="Tidak ada usulan." />
    </div>
  );
}
