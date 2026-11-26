import { sesiImms } from "@/lib/imms-sesi";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { cukup } from "@/lib/peran";
import { fmtTgl, PRIORITAS_WHO } from "@/lib/imms";
import { buatKeluhan, hapusKeluhan, terimaKeluhan, tolakKeluhan } from "@/app/imms/actions";
import { HapusKonfirmasi } from "@/components/imms/hapus-konfirmasi";
import { Kosong, Lencana, Tabel } from "@/components/imms/ui";

export default async function Keluhan({ searchParams }: { searchParams: Promise<{ alat?: string; s?: string; dibuat?: string }> }) {
  await sesiImms();
  const sp = await searchParams; const s = await auth();
  const teknisi = cukup(s?.user.peran, "Operator"), admin = cukup(s?.user.peran, "Admin");
  const unit = s?.user.peran === "Viewer" ? s.user.unitKerjaId : null;
  const st = sp.s ?? "baru";
  const [alat, wr] = await Promise.all([
    prisma.alat.findMany({ where: { aktif: true, ...(unit ? { unitKerjaId: unit } : {}) }, orderBy: { nama: "asc" }, select: { id: true, nama: true, kode: true, ruangan: { select: { nama: true } } }, take: 3000 }),
    prisma.permintaanKerja.findMany({
      where: { ...(unit ? { unitKerjaId: unit } : {}), status: st === "baru" ? { in: ["Baru", "Ditinjau"] } : st === "proses" ? "Diproses" : { in: ["Selesai", "Ditolak"] } },
      orderBy: { createdAt: "desc" }, take: 300, include: { perintah: { select: { nomor: true, status: true } }, unitKerja: { select: { nama: true } } },
    }),
  ]);
  return (
    <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
      <section className="kaca panel h-fit" aria-label="Laporan keluhan baru">
        <h2>Laporan keluhan baru</h2>
        {sp.dibuat && <p className="mb-2 text-[13px]" role="status" style={{ color: "var(--hijau)" }}>✓ Laporan {sp.dibuat} terkirim ke unit elektromedis.</p>}
        <form action={buatKeluhan} className="space-y-3">
          <div><label className="lbl" htmlFor="alatId">Alat</label>
            <select id="alatId" name="alatId" required defaultValue={sp.alat ?? ""}><option value="" disabled>Pilih alat…</option>{alat.map((a) => <option key={a.id} value={a.id}>{a.nama} — {a.kode}{a.ruangan ? ` (${a.ruangan.nama})` : ""}</option>)}</select></div>
          <div><label className="lbl" htmlFor="keluhan">Keluhan</label><textarea id="keluhan" name="keluhan" rows={4} required minLength={5} placeholder="Gejala kerusakan yang terlihat, sejak kapan, pesan galat…" /></div>
          <div><label className="lbl" htmlFor="prioritas">Dampak pada pelayanan pasien</label>
            <select id="prioritas" name="prioritas" defaultValue="Normal">{Object.entries(PRIORITAS_WHO).map(([k, v]) => <option key={k} value={k}>{v.label} — selesai ≤ {v.hari} hari</option>)}</select></div>
          <button className="kapsul utama w-full">Kirim laporan</button>
          <p className="redup2 text-[11px]">Pelapor: {s?.user.nama}. Dengan mengirim, pelapor mengonfirmasi isi laporan keluhan.</p>
        </form>
      </section>
      <section className="space-y-3" aria-label="Daftar keluhan">
        <div className="flex gap-2">{[["baru", "Menunggu"], ["proses", "Diproses"], ["tutup", "Selesai / ditolak"]].map(([v, l]) => <Link key={v} href={`/imms/keluhan?s=${v}`} className={`kapsul ${st === v ? "utama" : ""}`}>{l}</Link>)}</div>
        {wr.length === 0 ? <div className="kaca panel"><Kosong>Tidak ada laporan.</Kosong></div> : (
          <Tabel><thead><tr><th>Nomor</th><th>Alat & keluhan</th><th>Prioritas</th><th>Status</th><th>Tanggal</th>{teknisi && st === "baru" && <th>Tindakan</th>}{admin && <th><span className="sr-only">Hapus</span></th>}</tr></thead>
            <tbody>{wr.map((w) => (
              <tr key={w.id}>
                <td className="whitespace-nowrap font-medium"><Link className="tautan" href={`/imms/keluhan/${w.nomor}`}>{w.nomor}</Link>{w.perintah && <div><Link className="tautan text-[12px]" href={`/imms/perbaikan/${w.perintah.nomor}`}>{w.perintah.nomor}</Link></div>}</td>
                <td><b>{w.namaAlat}</b> <span className="redup2 text-[11px]">{w.unitKerja?.nama}</span><div className="redup line-clamp-2 max-w-[420px]">{w.keluhan}</div><div className="redup2 text-[11px]">Pelapor: {w.pelapor}</div></td>
                <td><Lencana t={PRIORITAS_WHO[w.prioritas]?.label ?? w.prioritas} nada={w.prioritas === "Darurat" ? "merah" : w.prioritas === "Tinggi" ? "kuning" : "biru"} /></td>
                <td><Lencana t={w.status} /></td><td className="redup whitespace-nowrap">{fmtTgl(w.createdAt)}</td>
                {teknisi && st === "baru" && (
                  <td><div className="flex flex-col gap-1.5">
                    <form action={terimaKeluhan} className="flex gap-1"><input type="hidden" name="id" value={w.id} />
                      <select name="prioritas" defaultValue={w.prioritas} aria-label="Tetapkan prioritas" className="!w-auto !py-1 text-[12px]">{Object.entries(PRIORITAS_WHO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
                      <button className="kapsul utama">Terima</button></form>
                    <form action={tolakKeluhan} className="flex gap-1"><input type="hidden" name="id" value={w.id} /><input name="alasan" placeholder="Alasan tolak" className="isian !py-1 text-[12px]" aria-label="Alasan tolak" /><button className="kapsul bahaya">Tolak</button></form>
                  </div></td>
                )}
                {admin && <td>{w.perintah?.status !== "Selesai" && <HapusKonfirmasi aksi={hapusKeluhan} id={w.id} pesan={`Hapus laporan ${w.nomor}?${w.perintah ? ` Perintah kerja ${w.perintah.nomor} ikut dihapus.` : ""}\n\nTindakan ini tidak bisa dibatalkan.`} />}</td>}
              </tr>
            ))}</tbody></Tabel>
        )}
      </section>
    </div>
  );
}
