import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { cukup } from "@/lib/peran";
import { AMBANG_EM, hitungEm, kerusakanPerAlat, labelInterval } from "@/lib/imms";
import { hitungUlangSemua } from "@/app/imms/actions";
import { Cari, Kartu, Lencana, Tabel, Kosong } from "@/components/imms/ui";

export default async function NilaiEm({ searchParams }: { searchParams: Promise<{ q?: string; f?: string }> }) {
  const sp = await searchParams; const s = await auth();
  const q = (sp.q ?? "").trim();
  const unit = s?.user.peran === "Viewer" ? s.user.unitKerjaId : null;
  const alat = await prisma.alat.findMany({
    where: { aktif: true, jenis: "Medik", ...(unit ? { unitKerjaId: unit } : {}), ...(q ? { OR: [{ nama: { contains: q } }, { kode: { contains: q } }] } : {}) },
    orderBy: { nama: "asc" }, select: { id: true, kode: true, nama: true, emFungsi: true, emRisiko: true, emPemeliharaan: true, unitKerja: { select: { nama: true } } },
  });
  const rusak = await kerusakanPerAlat();
  const semua = alat.map((a) => ({ a, e: hitungEm(a, rusak.get(a.id) ?? 0) })).sort((x, y) => (y.e.total ?? -99) - (x.e.total ?? -99));
  const tampil = semua.filter(({ e }) => sp.f === "belum" ? !e.lengkap : sp.f === "program" ? (e.total ?? 0) >= AMBANG_EM : sp.f === "bawah" ? e.lengkap && e.total! < AMBANG_EM : true).slice(0, 500);
  const n = (f: (e: (typeof semua)[number]["e"]) => boolean) => semua.filter(({ e }) => f(e)).length;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kartu judul="Alat medik" nilai={semua.length} href="/imms/nilai-em" />
        <Kartu judul="Belum dinilai" nilai={n((e) => !e.lengkap)} nada="kuning" href="/imms/nilai-em?f=belum" />
        <Kartu judul={`EM ≥ ${AMBANG_EM} (dijadwalkan)`} nilai={n((e) => (e.total ?? 0) >= AMBANG_EM)} nada="biru" href="/imms/nilai-em?f=program" />
        <Kartu judul={`EM < ${AMBANG_EM}`} nilai={n((e) => e.lengkap && e.total! < AMBANG_EM)} href="/imms/nilai-em?f=bawah" />
      </div>
      <p className="redup text-[13px]">Skor F, A, M diisi teknisi pada kartu alat dan divalidasi kepala instalasi. H dihitung otomatis dari jumlah perbaikan 30 bulan terakhir (−2 s.d. +2). Frekuensi: EM 12–14 setahun sekali, 15–18 dua kali, ≥ 19 tiga kali setahun (dapat disesuaikan unit elektromedis).</p>
      <Cari q={q} placeholder="Cari alat…"><input type="hidden" name="f" value={sp.f ?? ""} /></Cari>
      {cukup(s?.user.peran, "Admin") && <form action={hitungUlangSemua}><button className="kapsul">Hitung ulang semua & perbarui jadwal</button></form>}
      {tampil.length === 0 ? <div className="kaca panel"><Kosong>Tidak ada data.</Kosong></div> : (
        <Tabel>
          <thead><tr><th>Alat</th><th>Unit</th><th>F</th><th>A</th><th>M</th><th>H</th><th>EM</th><th>Frekuensi</th></tr></thead>
          <tbody>{tampil.map(({ a, e }) => (
            <tr key={a.id}>
              <td><Link className="tautan" href={`/imms/inventaris/${encodeURIComponent(a.kode)}`}>{a.nama}</Link><div className="redup2 text-[11px]">{a.kode}</div></td>
              <td className="redup">{a.unitKerja.nama}</td><td>{e.f ?? "—"}</td><td>{e.a ?? "—"}</td><td>{e.m ?? "—"}</td><td>{e.h}</td>
              <td>{e.total == null ? <Lencana t="Belum" nada="kuning" /> : <b style={{ color: e.total >= AMBANG_EM ? "var(--aksen)" : undefined }}>{e.total}</b>}</td>
              <td className="redup">{e.total == null ? "—" : labelInterval(e.interval)}</td>
            </tr>
          ))}</tbody>
        </Tabel>
      )}
    </div>
  );
}
