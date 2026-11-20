import type { IsiLK } from "@/lib/lembar-kerja";
import { HASIL_LK, JUDUL_HASIL } from "@/lib/lembar-kerja";
import { Button } from "@/components/ui/button";
import { simpanLK } from "./actions";

type AlatF = { id: number; kode: string; nama: string; merek: string | null; model: string | null; nomorSeri: string | null; unit: string; ruangan: string | null };
type Nilai = { nomor?: string; kegiatan: string; tipeInspeksi: string; tanggal: string; hasil: string; perhatian: string; catatan: string; template: string | null; isi: IsiLK; alasanTolak?: string | null };
const th = "border border-slate-300 bg-slate-100 px-2 py-1 text-left text-xs font-semibold italic";
const td = "border border-slate-300 px-2 py-1";
const inp = "h-8 w-full rounded border border-slate-300 bg-white px-1.5 text-sm";

/** Formulir lembar kerja IPM — tata letak mengikuti Pedoman Pengoperasian & Pemeliharaan Peralatan Kesehatan (Kemenkes 2021). */
export function FormulirLK({ alat, v, pemeriksa, fasilitas = "RSUD Cipayung" }: { alat: AlatF; v: Nilai; pemeriksa: string; fasilitas?: string }) {
  const isi = v.isi;
  const app = [...isi.apparatus, ...Array(Math.max(0, 3 - isi.apparatus.length)).fill({ nama: "", sn: "" })];
  return (
    <form action={simpanLK} className="grid gap-4 rounded-xl border bg-white p-4 text-sm text-navy-900 md:p-6">
      <input type="hidden" name="alatId" value={alat.id} />
      <input type="hidden" name="kegiatan" value={v.kegiatan} />
      {v.nomor && <input type="hidden" name="nomor" value={v.nomor} />}
      <input type="hidden" name="template" value={v.template ?? ""} />
      {v.alasanTolak && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-red-800"><b>Dikembalikan PJ Alkes:</b> {v.alasanTolak}</p>}

      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {["Acceptance", "Terjadwal"].map((t) => <label key={t} className="flex items-center gap-1.5"><input type="radio" name="tipeInspeksi" value={t} defaultChecked={v.tipeInspeksi === t} /> Inspeksi <i>{t === "Acceptance" ? "Acceptance" : "terjadwal"}</i></label>)}
      </div>
      <fieldset className="flex flex-wrap gap-x-5 gap-y-2"><legend className="mb-1 font-semibold">Status:</legend>
        {HASIL_LK.map((h) => <label key={h} className="flex items-center gap-1.5"><input type="radio" name="hasil" value={h} defaultChecked={v.hasil === h} /> {JUDUL_HASIL[h]}</label>)}
      </fieldset>

      <table className="w-full border-collapse"><tbody>
        <tr><td className={td}><b>Fasilitas:</b> {fasilitas}</td><td className={td} colSpan={2}><b>Departemen:</b> {alat.unit}{alat.ruangan ? ` / ${alat.ruangan}` : ""}</td></tr>
        <tr><td className={td}><b>Nama Alat:</b> {alat.nama}</td><td className={td}><label className="flex items-center gap-2"><b>Tanggal:</b><input type="date" name="tanggal" defaultValue={v.tanggal} required className={inp} /></label></td><td className={td}><b>Pemeriksa:</b> {pemeriksa}</td></tr>
        <tr><td className={td}><b>Kode Alat:</b> {alat.kode}</td><td className={td}><b>Model:</b> {[alat.merek, alat.model].filter(Boolean).join(" ") || "—"}</td><td className={td}><b>No. seri:</b> {alat.nomorSeri ?? "—"}</td></tr>
      </tbody></table>

      <label className="grid gap-1"><span className="rounded bg-slate-100 py-1 text-center font-semibold">PERHATIAN KHUSUS</span><textarea name="perhatian" defaultValue={v.perhatian} rows={2} className="rounded border border-slate-300 px-2 py-1" /></label>

      <div className="overflow-x-auto"><table className="w-full min-w-[28rem] border-collapse">
        <thead><tr><th className={th}>TEST APPARATUS</th><th className={th}>Control/Serial No.</th></tr></thead>
        <tbody>{app.map((a, i) => <tr key={i}><td className={td}><input name={`app_nama_${i}`} defaultValue={a.nama} placeholder={i === 0 ? "mis. Electrical safety analyzer" : ""} className={inp} /></td><td className={td}><input name={`app_sn_${i}`} defaultValue={a.sn} className={inp} /></td></tr>)}</tbody>
      </table><input type="hidden" name="nApp" value={app.length} /></div>

      <div className="overflow-x-auto"><table className="w-full min-w-[28rem] border-collapse">
        <thead><tr><th className={`${th} w-14 text-center`}>Pass</th><th className={`${th} w-14 text-center`}>Fail</th><th className={`${th} w-14 text-center`}>N.A.</th><th className={`${th} text-center`}>QUALITATIVE TASKS</th></tr></thead>
        <tbody>{isi.kualitatif.map((q, i) => (
          <tr key={i}>{(["pass", "fail", "na"] as const).map((h) => <td key={h} className={`${td} text-center`}><input type="radio" name={`q_${i}`} value={h} defaultChecked={q.hasil === h} aria-label={`${q.butir}: ${h}`} className="size-4" /></td>)}
            <td className={`${td} italic`}>{q.butir}<input type="hidden" name={`q_butir_${i}`} value={q.butir} /></td></tr>))}</tbody>
      </table><input type="hidden" name="nKual" value={isi.kualitatif.length} /></div>

      {isi.kuantitatif.length > 0 && <div className="overflow-x-auto"><table className="w-full min-w-[36rem] border-collapse">
        <thead><tr><th className={`${th} text-center`} colSpan={6}>QUANTITATIVE TASKS</th></tr><tr><th className={th}></th><th className={th}>Criteria</th><th className={th}>Set/Indicated</th><th className={th}>Measured</th><th className={`${th} text-center`}>Pass</th><th className={`${th} text-center`}>Fail</th></tr></thead>
        <tbody>{isi.kuantitatif.map((k, i) => (
          <tr key={i}><td className={`${td} italic`}>{k.parameter}<input type="hidden" name={`k_par_${i}`} value={k.parameter} /></td><td className={td}>{k.kriteria}<input type="hidden" name={`k_kri_${i}`} value={k.kriteria} /></td>
            <td className={td}><input name={`k_set_${i}`} defaultValue={k.set} className={inp} /></td><td className={td}><input name={`k_ukur_${i}`} defaultValue={k.ukur} className={inp} /></td>
            {(["pass", "fail"] as const).map((h) => <td key={h} className={`${td} text-center`}><input type="radio" name={`k_${i}`} value={h} defaultChecked={k.hasil === h} aria-label={`${k.parameter}: ${h}`} className="size-4" /></td>)}</tr>))}</tbody>
      </table><input type="hidden" name="nKuan" value={isi.kuantitatif.length} /></div>}

      <div className="overflow-x-auto"><table className="w-full min-w-[24rem] border-collapse">
        <thead><tr><th className={`${th} w-14`}>Done</th><th className={`${th} text-center`}>PREVENTIVE MAINTENANCE</th></tr></thead>
        <tbody>{isi.preventif.map((p, i) => <tr key={i}><td className={`${td} text-center`}><input type="checkbox" name={`p_${i}`} defaultChecked={p.done} aria-label={p.butir} className="size-4" /></td><td className={td}>{p.butir}<input type="hidden" name={`p_butir_${i}`} value={p.butir} /></td></tr>)}</tbody>
      </table><input type="hidden" name="nPm" value={isi.preventif.length} /></div>

      <label className="grid gap-1"><b>NOTE:</b><textarea name="catatan" defaultValue={v.catatan} rows={3} className="rounded border border-slate-300 px-2 py-1" /></label>

      <div className="grid gap-3 rounded-lg bg-teal-50 p-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
        <label className="grid gap-1 text-xs font-medium">Nama teknisi (untuk TTE)<input name="nama" defaultValue={pemeriksa} className={inp} /></label>
        <label className="grid gap-1 text-xs font-medium">NIP/NRK (opsional)<input name="nip" inputMode="numeric" className={inp} /></label>
        <Button variant="outline" name="aksi" value="draf">Simpan draf</Button>
        <Button variant="teal" name="aksi" value="ajukan">Tandatangani &amp; ajukan</Button>
      </div>
    </form>
  );
}
