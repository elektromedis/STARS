import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { sesiHalaman } from "@/lib/sesi";
import { cukup } from "@/lib/peran";
import { JENIS_TUGAS } from "@/lib/tugas";
import { inp, rp } from "@/lib/aksi-admin";
import { SubTab } from "@/components/admin/sub-tab";
import { Flash } from "@/components/admin/flash";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { hapusSkp, hapusTugas, simpanSkp, simpanTugas } from "./actions";

export const metadata: Metadata = { title: "Master Tugas & SKP (Sistem Kredit Poin)" };
export const dynamic = "force-dynamic";

export default async function TugasPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const se = await sesiHalaman("Viewer");
  const sp = await searchParams;
  const bagian = sp.bagian === "skp" ? "skp" : "tugas";
  const op = cukup(se.user.peran, "Operator") && process.env.STARS_MODE !== "internet", adm = cukup(se.user.peran, "Admin");
  const [tugas, skp] = await Promise.all([
    prisma.masterTugas.findMany({ orderBy: [{ jenis: "asc" }, { nama: "asc" }], include: { skp: true, _count: { select: { jadwal: true } } } }),
    prisma.skp.findMany({ orderBy: { kode: "asc" }, include: { _count: { select: { tugas: true } } } }),
  ]);
  return (
    <div className="grid gap-4">
      <Flash ok={sp.ok} error={sp.error} />
      <SubTab aktif={bagian} item={[{ kode: "tugas", label: "Master Tugas", href: "/admin/tugas" }, { kode: "skp", label: "SKP (Sistem Kredit Poin)", href: "/admin/tugas?bagian=skp" }]} />
      {bagian === "tugas" ? (
        <Card>
          <CardHeader><CardTitle>Master Tugas Pemeliharaan</CardTitle><CardDescription>Tugas baku (durasi, periode, biaya, suku cadang, SKP) yang dipakai membuat <a className="text-teal-800 underline" href="/admin/jadwal-massal">jadwal massal</a> per ruangan/instalasi.</CardDescription></CardHeader>
          <CardContent className="grid gap-3">
            {op && <form action={simpanTugas} className="grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-4">
              <label className="grid gap-1 text-sm sm:col-span-2">Nama tugas<input name="nama" required placeholder="PM triwulan Infusion Pump" className={inp} /></label>
              <label className="grid gap-1 text-sm">Jenis<select name="jenis" className={inp}>{JENIS_TUGAS.map((j) => <option key={j}>{j}</option>)}</select></label>
              <label className="grid gap-1 text-sm">SKP<select name="skpId" className={inp}><option value="">—</option>{skp.map((k) => <option key={k.id} value={k.id}>{k.kode} · {k.nama} ({k.poin} poin)</option>)}</select></label>
              <label className="grid gap-1 text-sm">Periode (hari)<input type="number" min={1} name="periodeHari" defaultValue={90} className={inp} /></label>
              <label className="grid gap-1 text-sm">Durasi (menit)<input type="number" min={1} name="durasiMenit" defaultValue={60} className={inp} /></label>
              <label className="grid gap-1 text-sm">Biaya (Rp)<input type="number" min={0} step="any" name="biaya" defaultValue={0} className={inp} /></label>
              <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" name="kritis" /> Tugas kritis</label>
              <label className="grid gap-1 text-sm sm:col-span-4">Cocok untuk alat bernama (kata kunci, pisah koma; kosong = semua alat)<input name="kataKunci" placeholder="infusion, syringe pump" className={inp} /></label>
              <label className="grid gap-1 text-sm sm:col-span-2">Checklist (satu per baris)<textarea name="checklist" rows={3} className="rounded-md border bg-white p-2 text-sm" /></label>
              <label className="grid gap-1 text-sm sm:col-span-2">Suku cadang (satu per baris)<textarea name="sukuCadang" rows={3} className="rounded-md border bg-white p-2 text-sm" /></label>
              <Button variant="teal" className="w-fit">Simpan tugas</Button>
            </form>}
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-2">Tugas</th><th>Jenis</th><th>Periode</th><th>Durasi</th><th>Biaya</th><th>SKP / poin</th><th>Jadwal</th><th /></tr></thead>
              <tbody>{tugas.map((t) => <tr key={t.id} className="border-b"><td className="py-2 font-medium">{t.nama}{t.kritis && <span className="ml-1 rounded bg-red-100 px-1.5 text-xs text-red-800">kritis</span>}<div className="text-xs font-normal text-muted-foreground">{t.kataKunci ? `Alat: ${t.kataKunci}` : "Semua alat"}</div></td><td>{t.jenis}</td><td>{t.periodeHari} hari</td><td>{t.durasiMenit} mnt</td><td>{rp(t.biaya)}</td><td>{t.skp ? `${t.skp.kode} · ${t.skp.poin}` : "—"}</td><td>{t._count.jadwal}</td><td>{adm && <form action={hapusTugas}><input type="hidden" name="id" value={t.id} /><Button size="sm" variant="ghost">Hapus</Button></form>}</td></tr>)}
                {!tugas.length && <tr><td colSpan={8} className="py-6 text-center text-muted-foreground">Belum ada master tugas.</td></tr>}</tbody></table></div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader><CardTitle>SKP — Sistem Kredit Poin</CardTitle><CardDescription>Poin yang diperoleh teknisi bila tugas terkait diselesaikan (dipakai pada <a className="text-teal-800 underline" href="/admin/kinerja">Kinerja Pemeliharaan</a>).</CardDescription></CardHeader>
          <CardContent className="grid gap-3">
            {op && <form action={simpanSkp} className="grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-4">
              <label className="grid gap-1 text-sm">Kode SKP<input name="kode" required className={inp} /></label>
              <label className="grid gap-1 text-sm sm:col-span-2">Nama<input name="nama" required className={inp} /></label>
              <label className="grid gap-1 text-sm">Poin<input type="number" min={0} step="any" name="poin" defaultValue={0} className={inp} /></label>
              <label className="grid gap-1 text-sm sm:col-span-4">Uraian<input name="uraian" className={inp} /></label>
              <Button variant="teal" className="w-fit">Simpan SKP</Button>
            </form>}
            <div className="grid gap-2 md:grid-cols-2">{skp.map((k) => <div key={k.id} className="rounded-lg border p-3 text-sm"><div className="flex items-center justify-between font-semibold text-navy-900">{k.kode} · {k.nama}{adm && <form action={hapusSkp}><input type="hidden" name="id" value={k.id} /><button className="text-xs font-normal text-red-700 hover:underline">hapus</button></form>}</div>
              <p className="text-teal-800">{k.poin} poin</p>{k.uraian && <p className="text-muted-foreground">{k.uraian}</p>}<p className="mt-1 text-xs text-muted-foreground">Dipakai {k._count.tugas} tugas</p></div>)}
              {!skp.length && <p className="text-sm text-muted-foreground">Belum ada SKP.</p>}</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
