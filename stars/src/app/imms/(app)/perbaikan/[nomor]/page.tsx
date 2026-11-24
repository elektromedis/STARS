import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { cukup } from "@/lib/peran";
import { urai } from "@/lib/pemeliharaan";
import { batasSelesai, fmtRp, fmtTgl, PRIORITAS_WHO, TAHAP_PERBAIKAN, tahapPerbaikan } from "@/lib/imms";
import { batalkanPerintah, mulaiPerbaikan, setujuiUsulan, tolakUsulan, selesaikanPerbaikan, selesaikanTerencana, simpanAnalisis, simpanInspeksi } from "@/app/imms/actions";
import { Lencana } from "@/components/imms/ui";
import { TombolCetak } from "@/components/imms/cetak";

type Inspeksi = Record<string, string>;

export default async function DetailWo({ params }: { params: Promise<{ nomor: string }> }) {
  const nomor = decodeURIComponent((await params).nomor);
  const s = await auth();
  const w = await prisma.perintahKerja.findUnique({ where: { nomor }, include: { alat: { include: { unitKerja: true, ruangan: true } }, permintaan: true, teknisi: { select: { nama: true } }, jadwal: true } });
  if (!w) notFound();
  if (s?.user.peran === "Viewer" && s.user.unitKerjaId && w.alat && s.user.unitKerjaId !== w.alat.unitKerjaId) notFound();
  const teknisi = cukup(s?.user.peran, "Operator"), pimpinan = cukup(s?.user.peran, "Admin");
  const tutup = w.status === "Selesai" || w.status === "Batal";
  const tahap = tahapPerbaikan(w);
  const batas = batasSelesai(w.createdAt, w.prioritas);
  const ins: Inspeksi = w.hasilInspeksi ? JSON.parse(w.hasilInspeksi) : {};
  const baris = (k: string, v: React.ReactNode) => <div className="flex gap-3 py-1.5 text-[13px]"><dt className="redup w-44 shrink-0">{k}</dt><dd className="min-w-0 flex-1 whitespace-pre-wrap">{v || "—"}</dd></div>;
  const pil = (name: string, opsi: string[], bawaan?: string) => (
    <div className="flex flex-wrap gap-3 text-[13px]">{opsi.map((o, i) => <label key={o} className="flex items-center gap-1.5"><input type="radio" name={name} value={o} defaultChecked={bawaan ? bawaan === o : i === 0} required /> {o}</label>)}</div>
  );
  const judulJenis = w.jenis === "Korektif" ? "Perbaikan" : w.jenis === "Preventif" ? "Pemeliharaan terencana" : "Inspeksi";
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link href={w.jenis === "Korektif" ? "/imms/perbaikan" : w.jenis === "Preventif" ? "/imms/terencana" : "/imms/inspeksi"} className="tautan cetak-sembunyi text-[13px]">‹ Kembali</Link>
        <h2 className="text-lg font-bold">{judulJenis} {w.nomor}</h2><Lencana t={w.status} />{w.ujiFungsi && <Lencana t={`Uji fungsi: ${w.ujiFungsi}`} nada={w.ujiFungsi === "Laik" ? "hijau" : "merah"} />}
        <div className="ml-auto flex gap-2"><TombolCetak label="Cetak lembar kerja" /></div>
      </div>
      {w.jenis === "Korektif" && w.status !== "Batal" && (
        <div className="langkah" aria-label="Tahap alur perbaikan">{TAHAP_PERBAIKAN.map((t, i) => <span key={t} className={i < tahap ? "lalu" : i === tahap ? "kini" : ""}>{i + 1}. {t}</span>)}</div>
      )}
      <section className="kaca panel" aria-label="Data perintah kerja">
        <dl className="grid md:grid-cols-2 md:gap-x-6">
          {baris("Alat", w.alat ? <Link className="tautan" href={`/imms/inventaris/${encodeURIComponent(w.alat.kode)}`}>{w.alat.nama} ({w.alat.kode})</Link> : w.deskripsi)}
          {baris("Merek / tipe / seri", w.alat && [w.alat.merek, w.alat.model, w.alat.nomorSeri].filter(Boolean).join(" · "))}
          {baris("Lokasi", w.alat && `${w.alat.unitKerja.nama}${w.alat.ruangan ? " — " + w.alat.ruangan.nama : ""}`)}
          {baris("Teknisi", w.teknisi?.nama)}
          {w.jenis === "Korektif" && baris("Prioritas", <>{PRIORITAS_WHO[w.prioritas]?.label ?? w.prioritas} · batas selesai <b style={!tutup && batas < new Date() ? { color: "var(--merah)" } : undefined}>{fmtTgl(batas)}</b></>)}
          {w.permintaan && baris("Laporan keluhan", <>{w.permintaan.nomor} oleh {w.permintaan.pelapor} — {w.permintaan.keluhan}</>)}
          {baris("Dibuat / ditanggapi", `${fmtTgl(w.createdAt)} / ${fmtTgl(w.tanggapanPada)}`)}
          {baris("Mulai / selesai", `${fmtTgl(w.tanggalMulai)} / ${fmtTgl(w.tanggalSelesai)}`)}
          {w.jadwal && baris("Jadwal", `${w.jadwal.nama} (tiap ${w.jadwal.intervalHari} hari)`)}
        </dl>
      </section>

      {w.jenis === "Korektif" && (
        <>
          {(w.analisis || w.pelaksana) && (
            <section className="kaca panel" aria-label="Analisis kerusakan">
              <h2>Analisis kerusakan & keputusan</h2>
              <dl>{baris("Analisis", w.analisis)}{baris("Dikerjakan oleh", w.pelaksana === "Pihak Ketiga" ? "Pihak ketiga (diawasi tenaga elektromedis internal)" : "Tenaga elektromedis internal")}{baris("Perlu suku cadang", w.perluSukuCadang ? "Ya" : "Tidak")}</dl>
              {w.usulanStatus && (
                <div className="mt-2 rounded-2xl p-3" style={{ background: "var(--kaca-kuat)", border: "1px solid var(--garis)" }}>
                  <div className="mb-1 flex items-center gap-2 text-[13px] font-semibold">Usulan kepada pimpinan <Lencana t={w.usulanStatus} /></div>
                  <dl>{baris("Isi usulan", w.usulan)}{baris("Perkiraan biaya", fmtRp(w.perkiraanBiaya))}{baris("Diajukan", `${w.usulanOleh ?? "—"}, ${fmtTgl(w.usulanPada)}`)}{w.usulanCatatan && baris("Keputusan", w.usulanCatatan)}</dl>
                  {w.usulanStatus === "Diajukan" && pimpinan && (
                    <form action={setujuiUsulan} className="cetak-sembunyi mt-2 flex flex-wrap items-end gap-2">
                      <input type="hidden" name="id" value={w.id} />
                      <div className="min-w-[220px] flex-1"><label className="lbl" htmlFor="catatan">Catatan pimpinan</label><input id="catatan" name="catatan" className="isian" placeholder="Wajib bila menolak" /></div>
                      <button className="kapsul utama" data-aksi="setuju">Setujui</button>
                      <button formAction={tolakUsulan} className="kapsul bahaya" data-aksi="tolak">Tolak</button>
                    </form>
                  )}
                  {w.usulanStatus === "Diajukan" && !pimpinan && <p className="redup2 mt-1 text-[12px]">Menunggu persetujuan pimpinan (peran Admin).</p>}
                </div>
              )}
            </section>
          )}
          {teknisi && !tutup && w.status === "Terbuka" && w.usulanStatus !== "Diajukan" && w.usulanStatus !== "Disetujui" && (
            <section className="kaca panel cetak-sembunyi" aria-label="Form analisis">
              <h2>{w.usulanStatus === "Ditolak" ? "Analisis ulang / usulan baru" : "Pengecekan kondisi & analisis kerusakan"}</h2>
              <form action={simpanAnalisis} className="grid gap-3 md:grid-cols-2">
                <input type="hidden" name="id" value={w.id} />
                <div className="md:col-span-2"><label className="lbl" htmlFor="analisis">Analisis kerusakan</label><textarea id="analisis" name="analisis" rows={3} required defaultValue={w.analisis ?? ""} placeholder="Hasil pengecekan kondisi alat dan penyebab kerusakan" /></div>
                <div><span className="lbl">Dapat diperbaiki internal?</span>{pil("pelaksana", ["Internal", "Pihak Ketiga"], w.pelaksana ?? undefined)}</div>
                <div><span className="lbl">Perlu suku cadang?</span><label className="flex items-center gap-2 text-[13px]"><input type="checkbox" name="perluSukuCadang" value="1" defaultChecked={w.perluSukuCadang} /> Ya, perlu suku cadang</label></div>
                <div className="md:col-span-2"><label className="lbl" htmlFor="usulan">Usulan (wajib bila pihak ketiga atau perlu suku cadang)</label><textarea id="usulan" name="usulan" rows={2} defaultValue={w.usulan ?? ""} placeholder="Suku cadang yang diperlukan; atau alasan tidak dapat diperbaiki internal & jasa pihak ketiga" /></div>
                <div><label className="lbl" htmlFor="perkiraanBiaya">Perkiraan harga / jasa (Rp)</label><input id="perkiraanBiaya" name="perkiraanBiaya" type="number" min={0} step={1000} className="isian" defaultValue={w.perkiraanBiaya ?? ""} /></div>
                <div className="flex items-end"><button className="kapsul utama w-full">Simpan analisis</button></div>
                <p className="redup2 text-[11px] md:col-span-2">Bila perlu suku cadang atau pihak ketiga, usulan otomatis diajukan ke pimpinan. Bila tidak, perbaikan internal langsung dimulai.</p>
              </form>
            </section>
          )}
          {teknisi && w.status === "Terbuka" && w.usulanStatus === "Disetujui" && (
            <form action={mulaiPerbaikan} className="cetak-sembunyi"><input type="hidden" name="id" value={w.id} /><button className="kapsul utama">Mulai perbaikan {w.pelaksana === "Pihak Ketiga" ? "(pihak ketiga, diawasi)" : ""}</button></form>
          )}
          {teknisi && w.status === "Dikerjakan" && (
            <section className="kaca panel cetak-sembunyi" aria-label="Laporan hasil perbaikan">
              <h2>Laporan hasil perbaikan & uji fungsi</h2>
              <form action={selesaikanPerbaikan} className="grid gap-3 md:grid-cols-2">
                <input type="hidden" name="id" value={w.id} />
                <div className="md:col-span-2"><label className="lbl" htmlFor="tindakan">Hasil perbaikan</label><textarea id="tindakan" name="tindakan" rows={3} required minLength={5} placeholder="Tindakan yang dilakukan, komponen yang diganti, hasil" /></div>
                <div><label className="lbl" htmlFor="sukuCadang">Suku cadang terpakai</label><input id="sukuCadang" name="sukuCadang" className="isian" defaultValue={w.sukuCadang ?? ""} /></div>
                <div><label className="lbl" htmlFor="biaya">Biaya aktual (Rp)</label><input id="biaya" name="biaya" type="number" min={0} step={1000} className="isian" defaultValue={w.perkiraanBiaya ?? 0} /></div>
                <div><span className="lbl">Hasil uji fungsi</span>{pil("ujiFungsi", ["Laik", "Tidak laik"])}</div>
                <div className="flex items-end"><button className="kapsul utama w-full">Selesai & kembalikan ke ruangan</button></div>
                <p className="redup2 text-[11px] md:col-span-2">Setelah disimpan, riwayat kerusakan diperbarui dan nilai EM alat dihitung ulang sehingga jadwal menyesuaikan.</p>
              </form>
            </section>
          )}
          {w.status === "Selesai" && <section className="kaca panel" aria-label="Hasil"><h2>Laporan hasil perbaikan</h2><dl>{baris("Hasil", w.tindakan)}{baris("Suku cadang", w.sukuCadang)}{baris("Biaya", fmtRp(w.biaya))}{baris("Uji fungsi", w.ujiFungsi)}</dl></section>}
        </>
      )}

      {w.jenis === "Preventif" && (
        <section className="kaca panel" aria-label="Lembar kerja pemeliharaan terencana">
          <h2>Lembar kerja pemeliharaan terencana</h2>
          {tutup ? (
            <>
              <ul className="mb-2 space-y-1 text-[13px]">{urai(w.checklist).map((b) => <li key={b.tugas}>{b.selesai ? "☑" : "☐"} {b.tugas}</li>)}</ul>
              <dl>{baris("Catatan", w.tindakan)}{baris("Bahan / suku cadang", w.sukuCadang)}{baris("Biaya", fmtRp(w.biaya))}{baris("Uji fungsi", w.ujiFungsi)}</dl>
            </>
          ) : teknisi ? (
            <form action={selesaikanTerencana} className="space-y-3">
              <input type="hidden" name="id" value={w.id} />
              <fieldset className="space-y-1.5 text-[13px]"><legend className="lbl">Butir pekerjaan</legend>
                {urai(w.checklist).map((b) => <label key={b.tugas} className="flex items-start gap-2"><input type="checkbox" name="butir" value={b.tugas} defaultChecked={b.selesai} className="mt-0.5" /> {b.tugas}</label>)}</fieldset>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="md:col-span-3"><label className="lbl" htmlFor="tindakan">Catatan pelaksanaan</label><textarea id="tindakan" name="tindakan" rows={2} /></div>
                <div><label className="lbl" htmlFor="sukuCadang">Bahan habis pakai / aksesoris diganti</label><input id="sukuCadang" name="sukuCadang" className="isian" /></div>
                <div><label className="lbl" htmlFor="biaya">Biaya (Rp)</label><input id="biaya" name="biaya" type="number" min={0} step={1000} className="isian" defaultValue={0} /></div>
                <div><span className="lbl">Uji fungsi</span>{pil("ujiFungsi", ["Laik", "Tidak laik"])}</div>
              </div>
              <button className="kapsul utama">Selesai — jadwal berikutnya dibuat otomatis</button>
            </form>
          ) : <p className="redup text-[13px]">Belum dikerjakan.</p>}
        </section>
      )}

      {w.jenis === "Inspeksi" && (
        <section className="kaca panel" aria-label="Lembar inspeksi">
          <h2>Lembar inspeksi</h2>
          {tutup ? (
            <dl className="grid md:grid-cols-2 md:gap-x-6">
              {baris("Kondisi fisik", ins.kondisi)}{baris("Kelengkapan aksesoris", ins.kelengkapan)}{baris("Keberadaan alat", ins.keberadaan)}
              {baris("Resistansi pembumian (Ω)", ins.pembumian)}{baris("Arus bocor (µA)", ins.arusBocor)}{baris("Uji keamanan", ins.keselamatan)}
              {baris("Uji unjuk kerja", ins.unjukKerja)}{baris("Alat ukur / ESA", ins.alatUkur)}{baris("Masalah ditemukan", ins.masalah)}{baris("Catatan", ins.catatan)}
            </dl>
          ) : teknisi ? (
            <form action={simpanInspeksi} className="grid gap-4 md:grid-cols-2">
              <input type="hidden" name="id" value={w.id} />
              <div><span className="lbl">1. Kondisi fisik</span>{pil("kondisi", ["Baik", "Bermasalah"])}</div>
              <div><span className="lbl">2. Keberadaan alat</span>{pil("keberadaan", ["Ada", "Tidak ada"])}</div>
              <div className="md:col-span-2"><label className="lbl" htmlFor="kelengkapan">Kelengkapan aksesoris</label><input id="kelengkapan" name="kelengkapan" className="isian" placeholder="Lengkap / sebutkan yang kurang atau rusak" /></div>
              <div><label className="lbl" htmlFor="pembumian">3. Resistansi pembumian (Ω)</label><input id="pembumian" name="pembumian" className="isian" inputMode="decimal" placeholder="mis. 0,12" /></div>
              <div><label className="lbl" htmlFor="arusBocor">Arus bocor (µA)</label><input id="arusBocor" name="arusBocor" className="isian" inputMode="decimal" placeholder="mis. 85" /></div>
              <div><span className="lbl">Uji keamanan (ESA)</span>{pil("keselamatan", ["Lolos", "Tidak lolos", "Tidak diuji"])}</div>
              <div><span className="lbl">4. Uji unjuk kerja</span>{pil("unjukKerja", ["Sesuai", "Tidak sesuai"])}</div>
              <div><label className="lbl" htmlFor="alatUkur">Alat ukur / simulator</label><input id="alatUkur" name="alatUkur" className="isian" placeholder="ESA, simulator, alat ukur standar" /></div>
              <div><span className="lbl">Masalah ditemukan?</span>{pil("masalah", ["Tidak ada", "Aksesoris", "Alat"])}</div>
              <div className="md:col-span-2"><label className="lbl" htmlFor="catatan">Catatan</label><textarea id="catatan" name="catatan" rows={2} /></div>
              <div className="md:col-span-2"><button className="kapsul utama">Simpan hasil inspeksi</button>
                <span className="redup2 ml-2 text-[11px]">Masalah alat → laporan kerusakan otomatis; masalah aksesoris → laporan kondisi aksesoris.</span></div>
            </form>
          ) : <p className="redup text-[13px]">Belum dikerjakan.</p>}
        </section>
      )}

      {pimpinan && !tutup && (
        <form action={batalkanPerintah} className="cetak-sembunyi flex flex-wrap gap-2"><input type="hidden" name="id" value={w.id} /><input name="alasan" placeholder="Alasan pembatalan" className="isian max-w-xs" aria-label="Alasan pembatalan" /><button className="kapsul bahaya">Batalkan perintah kerja</button></form>
      )}
      <div className="hidden print:grid grid-cols-2 gap-8 pt-10 text-center text-[13px]"><div>Pelaksana<br /><br /><br />( {w.teknisi?.nama ?? "………………"} )</div><div>Pengguna ruangan<br /><br /><br />( ……………… )</div></div>
    </div>
  );
}
