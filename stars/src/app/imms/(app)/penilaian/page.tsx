import { sesiImms } from "@/lib/imms-sesi";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { fmtTgl } from "@/lib/imms";
import { bintang, HASIL_RUANGAN, unitBatas } from "@/lib/emascare";
import { nilaiPerbaikan } from "@/app/imms/actions-trilux";
import { Kosong, Lencana, Tabel } from "@/components/imms/ui";

export const metadata = { title: "Penilaian Perbaikan" };

export default async function Penilaian({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  await sesiImms();
  const sp = await searchParams; const s = await auth();
  const unit = s?.user ? unitBatas(s.user) : null;
  const dasar = { jenis: "Korektif", status: "Selesai", ...(unit ? { alat: { unitKerjaId: unit } } : {}) };
  const sertakan = { alat: { select: { nama: true, kode: true, ruangan: { select: { nama: true } } } }, permintaan: { select: { nomor: true, pelapor: true } }, teknisi: { select: { nama: true } } } as const;
  const [menunggu, sudah] = await Promise.all([
    prisma.perintahKerja.findMany({ where: { ...dasar, hasilRuangan: null }, orderBy: { tanggalSelesai: "desc" }, take: 100, include: sertakan }),
    prisma.perintahKerja.findMany({ where: { ...dasar, hasilRuangan: { not: null } }, orderBy: { hasilRuanganPada: "desc" }, take: 50, include: sertakan }),
  ]);
  return (
    <div className="space-y-4">
      {sp.ok && <p role="status" className="text-[13px]" style={{ color: "var(--hijau)" }}>✓ {sp.ok}</p>}
      <section className="kaca panel" aria-label="Menunggu konfirmasi ruangan">
        <h2>Menunggu konfirmasi ruangan ({menunggu.length})</h2>
        <p className="redup2 mb-3 text-[12px]">Setelah teknisi menyelesaikan perbaikan, ruangan mengonfirmasi apakah alat sudah berfungsi dan memberi penilaian layanan. Jika <b>belum berfungsi</b>, laporan tindak lanjut dibuat otomatis.</p>
        {menunggu.length === 0 ? <Kosong>Tidak ada perbaikan yang menunggu konfirmasi.</Kosong> : (
          <div className="grid gap-3 lg:grid-cols-2">{menunggu.map((w) => (
            <form key={w.id} action={nilaiPerbaikan} className="rounded-[14px] border p-3 text-[13px]" style={{ borderColor: "var(--garis, #0002)" }}>
              <input type="hidden" name="woId" value={w.id} />
              <div className="font-semibold">{w.alat?.nama ?? w.deskripsi} <span className="redup2 text-[11px]">{w.alat?.kode}{w.alat?.ruangan ? ` · ${w.alat.ruangan.nama}` : ""}</span></div>
              <div className="redup2 text-[12px]"><Link className="tautan" href={`/imms/perbaikan/${w.nomor}`}>{w.nomor}</Link> · selesai {fmtTgl(w.tanggalSelesai)}{w.teknisi ? ` · teknisi ${w.teknisi.nama}` : ""}</div>
              {w.tindakan && <div className="redup mt-1 line-clamp-2">Tindakan: {w.tindakan}</div>}
              <fieldset className="mt-2 flex flex-wrap gap-3"><legend className="lbl">Hasil menurut ruangan</legend>{HASIL_RUANGAN.map((h, i) => <label key={h} className="flex items-center gap-1.5"><input type="radio" name="hasil" value={h} required defaultChecked={i === 0} /> {h}</label>)}</fieldset>
              <div className="mt-2"><label className="lbl" htmlFor={`r${w.id}`}>Penilaian layanan</label>
                <select id={`r${w.id}`} name="rating" defaultValue="5" className="!w-auto">{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} — {bintang(n)}</option>)}</select></div>
              <div className="mt-2"><label className="lbl" htmlFor={`c${w.id}`}>Catatan (opsional)</label><input id={`c${w.id}`} name="catatan" maxLength={500} className="isian" /></div>
              <button className="kapsul utama mt-3">Kirim konfirmasi</button>
            </form>
          ))}</div>
        )}
      </section>
      <section className="space-y-2" aria-label="Sudah dikonfirmasi">
        <h2 className="text-[15px] font-bold">Sudah dikonfirmasi</h2>
        {sudah.length === 0 ? <div className="kaca panel"><Kosong>Belum ada.</Kosong></div> : (
          <Tabel><thead><tr><th>WO</th><th>Alat</th><th>Hasil</th><th>Penilaian</th><th>Catatan</th><th>Tanggal</th></tr></thead>
            <tbody>{sudah.map((w) => <tr key={w.id}><td className="whitespace-nowrap font-medium"><Link className="tautan" href={`/imms/perbaikan/${w.nomor}`}>{w.nomor}</Link></td><td>{w.alat?.nama ?? "—"}</td><td><Lencana t={w.hasilRuangan} nada={w.hasilRuangan === "Berfungsi" ? "hijau" : "merah"} /></td><td title={`${w.rating}/5`}>{bintang(w.rating)}</td><td className="redup">{w.ratingCatatan ?? "—"}<div className="redup2 text-[11px]">{w.ratingOleh}</div></td><td className="redup whitespace-nowrap">{fmtTgl(w.hasilRuanganPada)}</td></tr>)}</tbody></Tabel>
        )}
      </section>
    </div>
  );
}
