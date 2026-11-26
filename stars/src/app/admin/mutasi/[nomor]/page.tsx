import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { sesiHalaman } from "@/lib/sesi";
import { TombolCetak } from "@/components/admin/tombol-cetak";

export const metadata: Metadata = { title: "Berita Acara Relokasi/Mutasi" };
export const dynamic = "force-dynamic";

const tgl = (d: Date | null) => (d ? d.toLocaleDateString("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" }) : "……………………");

/** Berita acara serah terima relokasi/mutasi alat (siap cetak A4). */
export default async function BeritaAcara({ params }: { params: Promise<{ nomor: string }> }) {
  await sesiHalaman("Viewer");
  const { nomor } = await params;
  const m = await prisma.mutasiAlat.findUnique({ where: { nomor }, include: { alat: true } });
  if (!m) notFound();
  const baris: [string, string][] = [
    ["Nomor", m.nomor], ["Jenis", `${m.jenis} (${m.jenis === "Relokasi" ? "pindah ruangan dalam unit yang sama" : "pindah unit kerja"})`], ["Status", m.status],
    ["Kode inventaris", m.alat.kode], ["Nama alat", m.alat.nama], ["Merek / tipe", [m.alat.merek, m.alat.model].filter(Boolean).join(" / ") || "-"],
    ["Nomor seri", m.alat.nomorSeri ?? "-"], ["Kode ASPAK", m.alat.kodeAspak ?? "-"],
    ["Asal", `${m.dariUnit}${m.dariRuangan ? ` / ${m.dariRuangan}` : ""}`], ["Tujuan", `${m.keUnit}${m.keRuangan ? ` / ${m.keRuangan}` : ""}`],
    ["Alasan", m.alasan], ["Kondisi saat diterima", m.kondisi ?? "-"],
    ["Diajukan", `${m.diajukanOleh ?? "-"} · ${tgl(m.createdAt)}`], ["Diputuskan", m.diputuskanOleh ? `${m.diputuskanOleh} · ${tgl(m.diputuskanPada)}${m.catatanKeputusan ? ` · ${m.catatanKeputusan}` : ""}` : "-"],
    ["Diterima", m.diterimaOleh ? `${m.diterimaOleh} · ${tgl(m.diterimaPada)}` : "-"],
  ];
  return (
    <article className="mx-auto max-w-3xl rounded-xl border bg-white p-8 text-slate-900 shadow-card print:border-0 print:p-0 print:shadow-none">
      <div className="mb-4 flex justify-end print:hidden"><TombolCetak /></div>
      <header className="border-b-2 border-slate-900 pb-3 text-center">
        <p className="text-sm font-semibold uppercase">Pemerintah Provinsi DKI Jakarta · RSUD Cipayung</p>
        <h1 className="mt-1 text-lg font-bold uppercase">Berita Acara Serah Terima {m.jenis} Alat Kesehatan</h1>
        <p className="text-sm">Nomor: {m.nomor}</p>
      </header>
      <table className="mt-4 w-full text-sm"><tbody>{baris.map(([k, v]) => <tr key={k} className="align-top"><td className="w-48 py-1 pr-2 text-slate-600">{k}</td><td className="py-1">: {v}</td></tr>)}</tbody></table>
      <p className="mt-4 text-sm">Dengan ini alat tersebut di atas telah diserahterimakan dari unit/ruangan asal kepada unit/ruangan tujuan dalam keadaan sebagaimana tercantum, dan dicatat pada Kartu Inventaris Ruangan masing-masing.</p>
      <div className="mt-10 grid grid-cols-3 gap-4 text-center text-sm">
        {["Yang menyerahkan\n(Kepala Ruangan/PJ Unit asal)", "Yang menerima\n(Kepala Ruangan/PJ Unit tujuan)", "Mengetahui\n(PJ Alat Kesehatan / Pengurus Barang)"].map((t) => (
          <div key={t}><p className="whitespace-pre-line">{t}</p><p className="mt-20 border-t border-slate-500 pt-1">NIP. ……………………</p></div>
        ))}
      </div>
    </article>
  );
}
