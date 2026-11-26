import { sesiImms } from "@/lib/imms-sesi";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { cukup } from "@/lib/peran";
import { fmtTgl, PRIORITAS_WHO } from "@/lib/imms";
import { bintang, unitBatas } from "@/lib/emascare";
import { kirimPesanKeluhan } from "@/app/imms/actions-trilux";
import { Lencana } from "@/components/imms/ui";

export const dynamic = "force-dynamic";
const waktu = (d: Date) => new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(d);

export default async function PercakapanKeluhan({ params }: { params: Promise<{ nomor: string }> }) {
  await sesiImms();
  const nomor = decodeURIComponent((await params).nomor);
  const s = await auth();
  const wr = await prisma.permintaanKerja.findUnique({ where: { nomor }, include: { pesan: { orderBy: { createdAt: "asc" }, take: 500 }, perintah: { select: { nomor: true, status: true, rating: true, hasilRuangan: true } }, unitKerja: { select: { nama: true } } } });
  if (!wr) notFound();
  const batas = s?.user ? unitBatas(s.user) : null;
  if (batas && wr.unitKerjaId !== batas) notFound();
  const baca = s?.user.peran === "Tamu" || s?.user.peran === "Dosen";
  const staf = cukup(s?.user.peran, "Operator");
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2"><Link href="/imms/keluhan" className="tautan text-[13px]">‹ Laporan keluhan</Link><h2 className="text-lg font-bold">{wr.nomor}</h2><Lencana t={wr.status} /></div>
      <section className="kaca panel" aria-label="Ringkasan laporan">
        <div className="text-[13px]"><b>{wr.namaAlat}</b> <span className="redup2">{wr.unitKerja?.nama}{wr.lokasi ? ` · ${wr.lokasi}` : ""}</span></div>
        <p className="mt-1 whitespace-pre-wrap text-[13px]">{wr.keluhan}</p>
        <div className="redup2 mt-1 text-[12px]">Pelapor {wr.pelapor} · {fmtTgl(wr.createdAt)} · prioritas {PRIORITAS_WHO[wr.prioritas]?.label ?? wr.prioritas}{wr.perintah && <> · <Link className="tautan" href={`/imms/perbaikan/${wr.perintah.nomor}`}>{wr.perintah.nomor}</Link> ({wr.perintah.status}){wr.perintah.rating ? ` · ${bintang(wr.perintah.rating)}` : ""}</>}</div>
        {wr.catatanPetugas && <div className="mt-1 text-[12px]"><b>Catatan petugas:</b> {wr.catatanPetugas}</div>}
      </section>
      <section className="kaca panel" aria-label="Percakapan">
        <h2>Percakapan ({wr.pesan.length})</h2>
        <ol className="my-3 grid gap-2">{wr.pesan.map((p) => { const saya = p.email && p.email === s?.user.email; return (
          <li key={p.id} className="max-w-[640px] rounded-[14px] px-3 py-2 text-[13px]" style={{ background: saya ? "var(--aksen-lembut, #1d9bf022)" : "var(--kaca-2, #0001)", marginLeft: saya ? "auto" : 0 }}>
            <div className="redup2 text-[11px]"><b>{p.nama}</b> · {p.peran === "Viewer" ? "Ruangan" : p.peran === "Operator" ? "Teknisi" : p.peran} · {waktu(p.createdAt)}</div>
            <div className="whitespace-pre-wrap">{p.isi}</div></li>); })}
          {wr.pesan.length === 0 && <li className="redup text-[13px]">Belum ada pesan. Tanyakan perkembangan atau tambahkan informasi kepada {staf ? "pelapor" : "teknisi"}.</li>}</ol>
        {baca ? <p className="redup2 text-[12px]">Mode pratinjau hanya untuk melihat.</p> : (
          <form action={kirimPesanKeluhan} className="flex gap-2"><input type="hidden" name="permintaanId" value={wr.id} /><input name="isi" required minLength={2} maxLength={1000} className="isian flex-1" placeholder="Tulis pesan…" aria-label="Pesan" autoComplete="off" /><button className="kapsul utama">Kirim</button></form>)}
      </section>
    </div>
  );
}
