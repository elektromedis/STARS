import { sesiImms } from "@/lib/imms-sesi";
import { indikator, fmtRp } from "@/lib/imms";
import { periode, rekapUnit } from "@/lib/imms-laporan";
import { Kartu, Kosong, Tabel } from "@/components/imms/ui";
import { TombolCetak } from "@/components/imms/cetak";

export default async function Laporan({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  await sesiImms("Operator");
  const pr = periode((await searchParams).p);
  const [k, r] = await Promise.all([indikator(pr.dari, pr.sampai), rekapUnit(pr.dari, pr.sampai)]);
  const th = pr.dari.getFullYear();
  return (
    <div className="space-y-4">
      <form className="cetak-sembunyi flex flex-wrap items-end gap-2">
        <div><label className="lbl" htmlFor="p">Periode</label>
          <select id="p" name="p" defaultValue={pr.kode} className="!w-auto">
            {[th - 1, th].flatMap((y) => [<option key={y} value={y}>Rekap tahun {y}</option>, ...Array.from({ length: 12 }, (_, i) => <option key={`${y}-${i}`} value={`${y}-${String(i + 1).padStart(2, "0")}`}>{new Intl.DateTimeFormat("id-ID", { month: "long" }).format(new Date(y, i, 1))} {y}</option>)])}
          </select></div>
        <button className="kapsul">Tampilkan</button>
        <a className="kapsul" href={`/api/imms/laporan?p=${pr.kode}`}>Unduh CSV (Excel)</a>
        <TombolCetak label="Cetak / PDF" />
      </form>
      <h2 className="text-lg font-bold">Laporan {pr.tahunan ? "tahunan" : "bulanan"} pelayanan elektromedik — {pr.label}</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kartu judul="Pemeliharaan terencana & inspeksi" nilai={`${k.terencanaSelesai}/${k.terencana}`} ket={k.kepatuhanPm == null ? "—" : `kepatuhan ${k.kepatuhanPm}%`} />
        <Kartu judul="Perbaikan" nilai={`${k.korektifSelesai}/${k.korektif}`} ket={k.tepatWaktu == null ? "selesai / masuk" : `${k.tepatWaktu}% tepat waktu`} />
        <Kartu judul="MTTR · waktu tanggap" nilai={`${k.mttr ?? "—"} · ${k.tanggap ?? "—"} j`} ket={`downtime ${k.downtime} jam`} />
        <Kartu judul="Biaya" nilai={fmtRp(k.biaya)} ket={k.mtbf ? `MTBF ±${k.mtbf} jam` : "MTBF belum cukup data"} />
      </div>
      <section aria-label="Rekap per unit kerja">
        <h2 className="mb-2 text-[15px] font-semibold">Rekap per unit kerja</h2>
        {r.unit.length === 0 ? <div className="kaca panel"><Kosong>Tidak ada kegiatan pada periode ini.</Kosong></div> : (
          <Tabel><thead><tr><th>Unit kerja</th><th>Terencana</th><th>Inspeksi</th><th>Perbaikan</th><th>Selesai</th><th>Biaya</th></tr></thead>
            <tbody>{r.unit.map(([u, v]) => <tr key={u}><td>{u}</td><td>{v.terencana}</td><td>{v.inspeksi}</td><td>{v.perbaikan}</td><td>{v.selesai}</td><td>{fmtRp(v.biaya)}</td></tr>)}</tbody></Tabel>
        )}
      </section>
      <p className="redup2 text-[12px]">Definisi: MTTR = rata-rata mulai→selesai perbaikan; waktu tanggap = laporan→ditangani; downtime = total jam alat tidak berfungsi sejak dilaporkan; kepatuhan PM = terencana & inspeksi selesai ÷ dibuat; tepat waktu menurut batas prioritas WHO (2/7/30/90 hari).</p>
    </div>
  );
}
