import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AMBANG_EM, fmtTgl, indikator, kerusakanPerAlat, hitungEm, PRIORITAS_WHO, batasSelesai } from "@/lib/imms";
import { Kartu, Lencana } from "@/components/imms/ui";
import { LogoEmas } from "@/components/imms/logo";
import { auth } from "@/auth";
import { sesiBacaBerlaku } from "@/lib/imms-sesi";

export default async function Beranda({ searchParams }: { searchParams: Promise<{ ditolak?: string }> }) {
  const { ditolak } = await searchParams;
  const sesi = await auth();
  const masuk = Boolean(sesi?.user) && (await sesiBacaBerlaku(sesi?.user?.peran)), dosen = sesi?.user?.peran === "Dosen"; // tanpa login: hanya angka ringkasan, tanpa nama alat / perintah kerja
  const kini = new Date(), awalBulan = new Date(kini.getFullYear(), kini.getMonth(), 1);
  const [alat, jatuhTempo, terlambat, keluhanBaru, woTerbuka, usulan, kpi, kor] = await Promise.all([
    prisma.alat.findMany({ where: { aktif: true, jenis: "Medik" }, select: { id: true, kondisi: true, statusOperasi: true, emFungsi: true, emRisiko: true, emPemeliharaan: true } }),
    prisma.jadwalPreventif.count({ where: { aktif: true, berikutnya: { lte: new Date(kini.getTime() + 30 * 86_400_000) } } }),
    prisma.jadwalPreventif.count({ where: { aktif: true, berikutnya: { lt: kini } } }),
    prisma.permintaanKerja.count({ where: { status: { in: ["Baru", "Ditinjau"] } } }),
    prisma.perintahKerja.count({ where: { status: { in: ["Terbuka", "Dikerjakan"] } } }),
    prisma.perintahKerja.count({ where: { usulanStatus: "Diajukan" } }),
    indikator(awalBulan, new Date(kini.getFullYear(), kini.getMonth() + 1, 1)),
    prisma.perintahKerja.findMany({ where: { jenis: "Korektif", status: { in: ["Terbuka", "Dikerjakan"] } }, orderBy: { createdAt: "asc" }, take: 8, include: { alat: { select: { nama: true, kode: true } } } }),
  ]);
  const rusak = await kerusakanPerAlat();
  const em = alat.map((a) => hitungEm(a, rusak.get(a.id) ?? 0));
  const dinilai = em.filter((e) => e.lengkap).length, program = em.filter((e) => (e.total ?? 0) >= AMBANG_EM).length;
  const tidakOperasi = alat.filter((a) => a.statusOperasi !== "Beroperasi").length;
  return (
    <div className="space-y-5">
      {ditolak && <div className="kaca panel text-[13px]" role="alert">Halaman itu memerlukan peran <b>{ditolak}</b>.</div>}
      <section className="kaca panel emas-panggung text-center" aria-label="EMASCARE">
        <LogoEmas ukuran={96} className="mx-auto mb-3 block" />
        {dosen && <p className="mb-1 text-[12px] font-bold tracking-[.18em]" style={{ color: "var(--aksen)" }}>DASHBOARD DOSEN PEMBIMBING</p>}
        <h1 className="emas-teks text-4xl font-bold tracking-[.06em] md:text-6xl">EMASCARE</h1>
        <p className="redup mt-2 text-[15px] md:text-lg">Electromedical Asset Management &amp; Service Care System</p>
        <p className="mt-1 text-[12px] font-semibold tracking-[.2em]" style={{ color: "var(--aksen)" }}>KENALI. RAWAT. KENDALIKAN.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {masuk ? (<>
            <Link href="/imms/inventaris" className="kapsul utama">Inventaris alat</Link>
            <Link href="/imms/keluhan" className="kapsul">Lapor keluhan ›</Link>
            <Link href="/imms/jadwal" className="kapsul">Jadwal pemeliharaan ›</Link>
            {dosen ? <Link href="/imms/laporan" className="kapsul">Laporan &amp; indikator ›</Link> : <a href="/admin" className="kapsul">Buka STARS ›</a>}
          </>) : (<>
            <Link href="/imms/lapor" className="kapsul utama">Lapor kerusakan ›</Link>
            <Link href="/imms/riwayat" className="kapsul">Lacak laporan ›</Link>
            <a href="/imms/login" className="kapsul">Masuk petugas ›</a>
          </>)}
        </div>
      </section>
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Ringkasan inventaris">
        <Kartu judul="Alat elektromedik aktif" nilai={alat.length} ket={`${tidakOperasi} tidak beroperasi`} href={masuk ? "/imms/inventaris" : undefined} />
        <Kartu judul={`Masuk program (EM ≥ ${AMBANG_EM})`} nilai={program} ket={`${dinilai} dari ${alat.length} sudah dinilai`} nada="biru" href={masuk ? "/imms/nilai-em" : undefined} />
        <Kartu judul="Jadwal ≤ 30 hari" nilai={jatuhTempo} ket={terlambat ? `⚠ ${terlambat} terlambat` : "Tidak ada yang terlambat"} nada={terlambat ? "merah" : undefined} href={masuk ? "/imms/jadwal" : undefined} />
        <Kartu judul="Keluhan & perintah kerja" nilai={`${keluhanBaru} / ${woTerbuka}`} ket={usulan ? `${usulan} usulan menunggu persetujuan` : "keluhan baru / WO terbuka"} nada={usulan ? "kuning" : undefined} href={masuk ? "/imms/keluhan" : undefined} />
      </section>
      <section aria-label="Indikator kinerja bulan ini">
        <h2 className="mb-2 text-[15px] font-semibold">Indikator kinerja bulan ini <span className="redup2 text-[12px] font-normal">(WHO IMMIS 2025)</span></h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Kartu judul="Kepatuhan PM" nilai={kpi.kepatuhanPm == null ? "—" : `${kpi.kepatuhanPm}%`} ket={`${kpi.terencanaSelesai}/${kpi.terencana} terencana & inspeksi`} />
          <Kartu judul="Waktu tanggap" nilai={kpi.tanggap == null ? "—" : `${kpi.tanggap} j`} ket="rata-rata keluhan → ditangani" />
          <Kartu judul="MTTR" nilai={kpi.mttr == null ? "—" : `${kpi.mttr} j`} ket="rata-rata waktu perbaikan" />
          <Kartu judul="Downtime" nilai={`${kpi.downtime} j`} ket={`${kpi.korektif} perbaikan`} />
          <Kartu judul="Selesai tepat waktu" nilai={kpi.tepatWaktu == null ? "—" : `${kpi.tepatWaktu}%`} ket="sesuai batas prioritas" />
        </div>
      </section>
      {masuk && <section className="kaca panel" aria-label="Perbaikan berjalan">
        <div className="mb-2 flex items-center"><h2 className="!mb-0">Perbaikan berjalan</h2><Link href="/imms/perbaikan" className="tautan ml-auto text-[13px]">Semua</Link></div>
        {kor.length === 0 ? <p className="redup text-[13px]">Tidak ada perbaikan terbuka.</p> : (
          <ul className="divide-y" style={{ borderColor: "var(--garis)" }}>
            {kor.map((w) => {
              const batas = batasSelesai(w.createdAt, w.prioritas), lewat = batas < kini;
              return (
                <li key={w.id} className="flex flex-wrap items-center gap-2 py-2 text-[13px]">
                  <Link href={`/imms/perbaikan/${w.nomor}`} className="tautan font-semibold">{w.nomor}</Link>
                  <span className="min-w-0 flex-1 truncate">{w.alat?.nama ?? w.deskripsi}</span>
                  <Lencana t={PRIORITAS_WHO[w.prioritas]?.label ?? w.prioritas} nada={w.prioritas === "Darurat" ? "merah" : w.prioritas === "Tinggi" ? "kuning" : "biru"} />
                  <span className={lewat ? "font-semibold" : "redup"} style={lewat ? { color: "var(--merah)" } : undefined}>{lewat ? "⚠ lewat batas " : "batas "}{fmtTgl(batas)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>}
    </div>
  );
}
