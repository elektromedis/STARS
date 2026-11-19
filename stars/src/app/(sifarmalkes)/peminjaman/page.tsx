import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftRight, FileDown, Nfc, PenLine } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { cukup } from "@/lib/peran";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ajukanPeminjaman, langkahPeminjaman } from "./actions";

export const metadata: Metadata = { title: "Peminjaman Alat" };
export const dynamic = "force-dynamic";

const WARNA: Record<string, string> = { Diajukan: "bg-amber-100 text-amber-800", Disetujui: "bg-sky-100 text-sky-800", Dipinjam: "bg-blue-600 text-white", Dikembalikan: "bg-emerald-100 text-emerald-800", Ditolak: "bg-red-100 text-red-800" };
const fmt = (d: Date | null) => (d ? d.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric" }) : "—");
const inp = "h-9 w-full rounded-md border bg-white px-2 text-sm";

export default async function PeminjamanPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const s = await auth();
  const operator = cukup(s?.user?.peran, "Operator");
  const [unit, alat, daftar, ttd] = await Promise.all([
    prisma.unitKerja.findMany({ orderBy: [{ urut: "asc" }, { nama: "asc" }], select: { id: true, nama: true } }),
    s?.user ? prisma.alat.findMany({ where: { aktif: true }, orderBy: [{ nama: "asc" }], take: 3000, select: { id: true, kode: true, nama: true, unitKerja: { select: { nama: true } } } }) : [],
    prisma.peminjaman.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.tandaTangan.findMany({ where: { nomor: { startsWith: "PJ-" } }, select: { nomor: true, peran: true, nama: true } }),
  ]);
  const namaUnit = new Map(unit.map((u) => [u.id, u.nama]));
  const alatMap = new Map((await prisma.alat.findMany({ where: { id: { in: daftar.map((d) => d.alatId) } }, select: { id: true, kode: true, nama: true } })).map((a) => [a.id, a]));
  const hari = new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);

  return (
    <div className="grid gap-4">
      {sp.ok && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{sp.ok}</p>}
      {sp.error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{sp.error}</p>}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><ArrowLeftRight className="size-5 text-teal-700" /> Formulir peminjaman alat antar unit kerja</CardTitle>
          <CardDescription>Alur: Diajukan → Disetujui (TTE pemberi) → Dipinjam (TTE penerima) → Dikembalikan (TTE pengembalian + kondisi).</CardDescription></CardHeader>
        <CardContent>
          {!s?.user ? <p className="text-sm"><Link href="/login?callbackUrl=/peminjaman" className="font-medium text-teal-700 underline">Masuk</Link> untuk mengajukan peminjaman.</p> : (
            <form action={ajukanPeminjaman} className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm sm:col-span-2">Alat (unit pemilik)
                <select name="alatId" required className={inp} defaultValue=""><option value="" disabled>— pilih alat —</option>
                  {alat.map((a) => <option key={a.id} value={a.id}>{a.nama} · {a.kode} · {a.unitKerja.nama}</option>)}</select></label>
              <label className="grid gap-1 text-sm">Dipinjam oleh unit
                <select name="keUnitId" required className={inp} defaultValue={s.user.unitKerjaId ?? ""}><option value="" disabled>— pilih unit —</option>
                  {unit.map((u) => <option key={u.id} value={u.id}>{u.nama}</option>)}</select></label>
              <label className="grid gap-1 text-sm">Nama peminjam<input name="peminjam" required minLength={3} defaultValue={s.user.name ?? ""} className={inp} /></label>
              <label className="grid gap-1 text-sm">Tanggal pinjam<input type="date" name="tanggalPinjam" required min={hari} defaultValue={hari} className={inp} /></label>
              <label className="grid gap-1 text-sm">Rencana kembali<input type="date" name="rencanaKembali" required min={hari} className={inp} /></label>
              <label className="grid gap-1 text-sm sm:col-span-2">Keperluan<textarea name="keperluan" required minLength={3} rows={2} className="w-full rounded-md border px-2 py-1 text-sm" /></label>
              <fieldset disabled className="grid gap-1 rounded-lg border border-dashed p-3 text-sm text-muted-foreground sm:col-span-2">
                <legend className="flex items-center gap-1 px-1 text-xs font-semibold"><Nfc className="size-4" /> Tracking RFID <span className="rounded bg-amber-100 px-1.5 text-amber-800">Dalam pengembangan</span></legend>
                <input name="rfidTag" placeholder="ID tag RFID (otomatis dari pembaca RFID — segera hadir)" className={inp} />
                <span className="text-xs">Nantinya posisi alat terbaca otomatis oleh pembaca RFID di pintu ruangan.</span>
              </fieldset>
              <Button type="submit" variant="teal" className="sm:col-span-2 sm:justify-self-start">Ajukan peminjaman</Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Daftar peminjaman</CardTitle></CardHeader>
        <CardContent className="grid gap-2">
          {daftar.length === 0 && <p className="text-sm text-muted-foreground">Belum ada peminjaman.</p>}
          {daftar.map((p) => {
            const a = alatMap.get(p.alatId), tt = ttd.filter((t) => t.nomor === p.nomor);
            const bolehTerima = operator || (s?.user && (s.user.unitKerjaId === p.keUnitId || s.user.email === p.pemohonEmail));
            return (
              <details key={p.nomor} className="rounded-lg border p-3">
                <summary className="flex cursor-pointer flex-wrap items-center gap-2 text-sm">
                  <span className="font-mono font-semibold">{p.nomor}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${WARNA[p.status] ?? ""}`}>{p.status}</span>
                  <span className="font-medium text-navy-800">{a?.nama ?? "Alat"}</span>
                  <span className="text-muted-foreground">{namaUnit.get(p.dariUnitId)} → {namaUnit.get(p.keUnitId)} · {fmt(p.tanggalPinjam)}–{fmt(p.rencanaKembali)}</span>
                </summary>
                <div className="mt-2 grid gap-2 text-sm">
                  <p>Peminjam: {p.peminjam} · Keperluan: {p.keperluan}{a ? ` · Kode ${a.kode}` : ""}</p>
                  {p.tanggalKembali && <p>Dikembalikan {fmt(p.tanggalKembali)} — kondisi: {p.kondisiKembali}</p>}
                  {tt.length > 0 && <p className="flex flex-wrap gap-2">{tt.map((t) => <span key={t.peran} className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs"><PenLine className="size-3" /> TTE {t.peran}: {t.nama}</span>)}</p>}
                  <div className="flex flex-wrap items-end gap-2">
                    <Button size="sm" variant="outline" asChild><a href={`/api/peminjaman/${p.nomor}/pdf`} target="_blank" rel="noopener"><FileDown /> PDF formulir</a></Button>
                    {s?.user && p.status === "Diajukan" && operator && (
                      <form action={langkahPeminjaman} className="flex gap-2"><input type="hidden" name="nomor" value={p.nomor} />
                        <Button size="sm" variant="teal" name="aksi" value="setujui">Setujui & tandatangani</Button>
                        <Button size="sm" variant="outline" name="aksi" value="tolak">Tolak</Button></form>)}
                    {s?.user && p.status === "Disetujui" && bolehTerima && (
                      <form action={langkahPeminjaman}><input type="hidden" name="nomor" value={p.nomor} />
                        <Button size="sm" variant="teal" name="aksi" value="serahkan">Terima alat & tandatangani</Button></form>)}
                    {s?.user && p.status === "Dipinjam" && operator && (
                      <form action={langkahPeminjaman} className="flex flex-wrap items-end gap-2"><input type="hidden" name="nomor" value={p.nomor} />
                        <input name="kondisi" required placeholder="Kondisi saat kembali (mis. Baik, lengkap)" className="h-8 w-64 rounded-md border px-2 text-sm" aria-label="Kondisi kembali" />
                        <Button size="sm" variant="teal" name="aksi" value="kembalikan">Terima kembali & tandatangani</Button></form>)}
                  </div>
                </div>
              </details>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
