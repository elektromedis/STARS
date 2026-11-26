import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { sesiHalaman } from "@/lib/sesi";
import { cukup } from "@/lib/peran";
import { inp } from "@/lib/aksi-admin";
import { Flash } from "@/components/admin/flash";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { jadwalkanMassal } from "./actions";

export const metadata: Metadata = { title: "Jadwal Preventif Massal" };
export const dynamic = "force-dynamic";

export default async function JadwalMassalPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const se = await sesiHalaman("Viewer");
  const sp = await searchParams;
  const op = cukup(se.user.peran, "Operator") && process.env.STARS_MODE !== "internet";
  const [tugas, unit, ruangan, instalasi] = await Promise.all([
    prisma.masterTugas.findMany({ where: { aktif: true }, orderBy: { nama: "asc" } }),
    prisma.unitKerja.findMany({ orderBy: [{ urut: "asc" }, { nama: "asc" }] }),
    prisma.ruangan.findMany({ where: { aktif: true }, orderBy: [{ unitKerjaId: "asc" }, { nama: "asc" }], include: { unitKerja: { select: { nama: true } } } }),
    prisma.alat.findMany({ where: { aktif: true, instalasi: { not: null } }, distinct: ["instalasi"], select: { instalasi: true }, orderBy: { instalasi: "asc" } }),
  ]);
  return (
    <div className="grid gap-4">
      <Flash ok={sp.ok} error={sp.error} />
      <Card>
        <CardHeader><CardTitle>Jadwal Preventif Massal</CardTitle><CardDescription>Pilih tugas dan cakupan; STARS membuat jadwal untuk semua alat aktif yang namanya cocok dengan kata kunci tugas. Alat yang sudah punya jadwal tugas yang sama dilewati. Gunakan <strong>Pratinjau</strong> dulu.</CardDescription></CardHeader>
        <CardContent>
          {!tugas.length && <p className="mb-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Belum ada master tugas aktif — buat dulu di <a className="underline" href="/admin/tugas">Master Tugas &amp; SKP</a>.</p>}
          {op ? <form action={jadwalkanMassal} className="grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-3">
            <label className="grid gap-1 text-sm sm:col-span-3">Master tugas<select name="tugasId" required defaultValue={sp.tugasId} className={inp}><option value="">— pilih —</option>{tugas.map((t) => <option key={t.id} value={t.id}>{t.nama} · tiap {t.periodeHari} hari{t.kataKunci ? ` · ${t.kataKunci}` : ""}</option>)}</select></label>
            <label className="grid gap-1 text-sm">Unit kerja<select name="unitId" defaultValue={sp.unitId} className={inp}><option value="">semua / tidak dibatasi</option>{unit.map((u) => <option key={u.id} value={u.id}>{u.nama}</option>)}</select></label>
            <label className="grid gap-1 text-sm">Ruangan<select name="ruanganId" defaultValue={sp.ruanganId} className={inp}><option value="">semua / tidak dibatasi</option>{ruangan.map((r) => <option key={r.id} value={r.id}>{r.unitKerja.nama} — {r.nama}</option>)}</select></label>
            <label className="grid gap-1 text-sm">Instalasi (teks)<input list="daftar-instalasi" name="instalasi" defaultValue={sp.instalasi} className={inp} /><datalist id="daftar-instalasi">{instalasi.map((i) => <option key={i.instalasi!} value={i.instalasi!} />)}</datalist></label>
            <label className="grid gap-1 text-sm">Jadwal pertama<input type="date" name="mulai" defaultValue={sp.mulai || new Date().toISOString().slice(0, 10)} className={inp} /></label>
            <div className="flex items-end gap-2 sm:col-span-2"><Button name="aksi" value="pratinjau" variant="outline">Pratinjau</Button><Button name="aksi" value="buat" variant="teal">Buat jadwal</Button></div>
          </form> : <p className="text-sm text-muted-foreground">Memerlukan peran Operator atau lebih tinggi.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
