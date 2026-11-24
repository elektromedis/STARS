import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { cukup } from "@/lib/peran";
import { fmtTgl, NAMA_JADWAL } from "@/lib/imms";
import { buatPerintahJadwal } from "@/app/imms/actions";
import { Kosong, Lencana, Tabel } from "@/components/imms/ui";

export default async function Jadwal({ searchParams }: { searchParams: Promise<{ rentang?: string }> }) {
  const { rentang = "90" } = await searchParams;
  const s = await auth(); const teknisi = cukup(s?.user.peran, "Operator");
  const kini = new Date(), sampai = rentang === "semua" ? undefined : new Date(kini.getTime() + Number(rentang) * 86_400_000);
  const jadwal = await prisma.jadwalPreventif.findMany({
    where: { aktif: true, ...(sampai ? { berikutnya: { lte: sampai } } : {}), ...(s?.user.peran === "Viewer" && s.user.unitKerjaId ? { alat: { unitKerjaId: s.user.unitKerjaId } } : {}) },
    orderBy: { berikutnya: "asc" }, take: 500,
    include: { alat: { select: { kode: true, nama: true, unitKerja: { select: { nama: true } } } }, perintah: { where: { status: { in: ["Terbuka", "Dikerjakan"] } }, select: { nomor: true, jenis: true } } },
  });
  const bulan = new Map<string, typeof jadwal>();
  for (const j of jadwal) { const k = j.berikutnya ? new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(j.berikutnya) : "Tanpa tanggal"; bulan.set(k, [...(bulan.get(k) ?? []), j]); }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        {[["30", "30 hari"], ["90", "90 hari"], ["365", "1 tahun"], ["semua", "Semua"]].map(([v, l]) => <Link key={v} href={`/imms/jadwal?rentang=${v}`} className={`kapsul ${rentang === v ? "utama" : ""}`}>{l}</Link>)}
        <span className="redup ml-2">Jadwal otomatis dibuat untuk alat EM ≥ 12 ({NAMA_JADWAL}).</span>
      </div>
      {jadwal.length === 0 ? <div className="kaca panel"><Kosong>Tidak ada jadwal pada rentang ini. Nilai EM alat terlebih dahulu di menu Nilai EM.</Kosong></div> : [...bulan].map(([b, isi]) => (
        <section key={b}>
          <h2 className="mb-2 text-[15px] font-semibold">{b} <span className="redup2 text-[12px] font-normal">{isi.length} alat</span></h2>
          <Tabel><thead><tr><th>Tanggal</th><th>Alat</th><th>Unit</th><th>Kegiatan</th><th>Interval</th><th className="cetak-sembunyi">Tindakan</th></tr></thead>
            <tbody>{isi.map((j) => { const lewat = j.berikutnya && j.berikutnya < kini; return (
              <tr key={j.id}>
                <td className="whitespace-nowrap" style={lewat ? { color: "var(--merah)", fontWeight: 600 } : undefined}>{lewat ? "⚠ " : ""}{fmtTgl(j.berikutnya)}</td>
                <td><Link className="tautan" href={`/imms/inventaris/${encodeURIComponent(j.alat.kode)}`}>{j.alat.nama}</Link></td>
                <td className="redup">{j.alat.unitKerja.nama}</td><td className="redup">{j.nama}</td><td className="redup">{j.intervalHari} hari</td>
                <td className="cetak-sembunyi">
                  {j.perintah.length ? j.perintah.map((p) => <Link key={p.nomor} className="tautan mr-2" href={`/imms/perbaikan/${p.nomor}`}>{p.nomor} <Lencana t={p.jenis} /></Link>) : teknisi ? (
                    <div className="flex gap-1.5">
                      <form action={buatPerintahJadwal}><input type="hidden" name="id" value={j.id} /><input type="hidden" name="jenis" value="Preventif" /><button className="kapsul">Terencana</button></form>
                      <form action={buatPerintahJadwal}><input type="hidden" name="id" value={j.id} /><input type="hidden" name="jenis" value="Inspeksi" /><button className="kapsul">Inspeksi</button></form>
                    </div>
                  ) : "—"}
                </td>
              </tr>); })}</tbody></Tabel>
        </section>
      ))}
    </div>
  );
}
