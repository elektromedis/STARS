import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { sesiHalaman } from "@/lib/sesi";
import { cukup } from "@/lib/peran";
import { unitTerkunci } from "@/lib/akses";
import { inp, rp } from "@/lib/aksi-admin";
import { KONDISI_GANTI, SIFAT, SUMBER_DANA } from "@/lib/perencanaan";
import { SubTab } from "@/components/admin/sub-tab";
import { Flash } from "@/components/admin/flash";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ajukanUsulan, batalkanUsulan, simpanPagu, verifikasiUsulan } from "./actions";

export const metadata: Metadata = { title: "Perencanaan Pengadaan Alat" };
export const dynamic = "force-dynamic";

const BAGIAN = [["usulan", "Usulan"], ["nominasi", "Verifikasi & Nominasi"], ["pagu", "Pagu & Ringkasan"]] as const;
const STATUS_WARNA: Record<string, string> = { Diajukan: "bg-amber-100 text-amber-800", Disetujui: "bg-emerald-100 text-emerald-800", Ditolak: "bg-red-100 text-red-800" };
const skor = (n: string, d = 3) => <select name={n} defaultValue={d} className={inp}>{[1, 2, 3, 4, 5].map((x) => <option key={x}>{x}</option>)}</select>;

export default async function PengadaanPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const se = await sesiHalaman("Viewer");
  const sp = await searchParams;
  const bagian = BAGIAN.find((b) => b[0] === sp.bagian)?.[0] ?? "usulan";
  const tahun = Number(sp.tahun) || new Date().getFullYear() + 1;
  const ro = process.env.STARS_MODE === "internet";
  const adm = cukup(se.user.peran, "Admin") && !ro;
  const kunci = await unitTerkunci();
  const [unit, usulan, pagu] = await Promise.all([
    prisma.unitKerja.findMany({ where: kunci?.id ? { id: kunci.id } : {}, orderBy: { nama: "asc" } }),
    prisma.usulanPengadaan.findMany({ where: { tahun, ...(kunci?.id ? { unitKerjaId: kunci.id } : {}) }, orderBy: [{ skorFinal: "desc" }, { id: "asc" }] }),
    prisma.paguBelanja.findMany({ where: { tahun }, orderBy: { sumberDana: "asc" } }),
  ]);
  const un = new Map(unit.map((u) => [u.id, u.nama]));
  const total = (u: (typeof usulan)[number], j: number) => j * u.hargaSatuan;
  const nav = BAGIAN.map(([kode, label]) => ({ kode, label, href: `/admin/pengadaan?bagian=${kode}&tahun=${tahun}` }));
  const pilihTahun = <form className="flex items-end gap-2 text-sm"><input type="hidden" name="bagian" value={bagian} /><label className="grid gap-1">Tahun anggaran<input type="number" name="tahun" defaultValue={tahun} className={`${inp} w-28`} /></label><Button size="sm" variant="outline">Tampilkan</Button></form>;
  let isi: React.ReactNode;
  if (bagian === "usulan") {
    isi = (
      <Card>
        <CardHeader><CardTitle>Usulan Pengadaan Alat {tahun}</CardTitle><CardDescription>Ruangan/instalasi mengusulkan alat baru, tambahan, atau pengganti beserta penilaian sendiri (skor 1–5). Usulan diverifikasi di tab berikutnya.</CardDescription></CardHeader>
        <CardContent className="grid gap-3">
          {pilihTahun}
          {!ro && <form action={ajukanUsulan} className="grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-4">
            <input type="hidden" name="tahun" value={tahun} />
            <label className="grid gap-1 text-sm sm:col-span-2">Nama alat<input name="namaAlat" required className={inp} /></label>
            <label className="grid gap-1 text-sm">Unit kerja<select name="unitKerjaId" defaultValue={kunci?.id ?? ""} className={inp}>{!kunci?.id && <option value="">—</option>}{unit.map((u) => <option key={u.id} value={u.id}>{u.nama}</option>)}</select></label>
            <label className="grid gap-1 text-sm">Ruangan<input name="ruangan" className={inp} /></label>
            <label className="grid gap-1 text-sm">Sifat<select name="sifat" className={inp}>{SIFAT.map((x) => <option key={x}>{x}</option>)}</select></label>
            <label className="grid gap-1 text-sm">Jumlah<input type="number" min={1} name="jumlah" defaultValue={1} className={inp} /></label>
            <label className="grid gap-1 text-sm">Harga satuan (Rp)<input type="number" min={0} step="any" name="hargaSatuan" defaultValue={0} className={inp} /></label>
            <span />
            <label className="grid gap-1 text-sm">Bila Ganti: usia alat lama (th)<input type="number" min={0} name="gantiUsia" className={inp} /></label>
            <label className="grid gap-1 text-sm">Kondisi alat lama<select name="gantiKondisi" className={inp}><option value="">—</option>{KONDISI_GANTI.map((x) => <option key={x}>{x}</option>)}</select></label>
            <label className="grid gap-1 text-sm sm:col-span-2">Alasan / justifikasi<input name="alasan" className={inp} /></label>
            <label className="grid gap-1 text-sm">Urgensi (1–5){skor("skorUrgensi")}</label><label className="grid gap-1 text-sm">Kondisi existing (1–5){skor("skorExisting")}</label><label className="grid gap-1 text-sm">Peruntukan (1–5){skor("skorPeruntukan")}</label>
            <Button variant="teal" className="w-fit self-end">Ajukan usulan</Button>
          </form>}
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-2">Alat</th><th>Unit</th><th>Sifat</th><th>Jml</th><th>Harga</th><th>Total</th><th>Skor</th><th>Status</th><th /></tr></thead>
            <tbody>{usulan.map((u) => <tr key={u.id} className="border-b"><td className="py-2 font-medium">{u.namaAlat}<div className="text-xs font-normal text-muted-foreground">{u.pengusul}{u.alasan ? ` · ${u.alasan}` : ""}</div></td><td>{u.unitKerjaId ? un.get(u.unitKerjaId) : "—"}{u.ruangan ? ` / ${u.ruangan}` : ""}</td><td>{u.sifat}</td><td>{u.jumlah}</td><td>{rp(u.hargaSatuan)}</td><td>{rp(total(u, u.jumlah))}</td><td>{u.skorFinal ?? "—"}</td><td><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_WARNA[u.status] ?? ""}`}>{u.status}</span></td>
              <td>{!ro && u.status === "Diajukan" && (u.pengusul === se.user.email || adm) && <form action={batalkanUsulan}><input type="hidden" name="id" value={u.id} /><Button size="sm" variant="ghost">Batalkan</Button></form>}</td></tr>)}
              {!usulan.length && <tr><td colSpan={9} className="py-6 text-center text-muted-foreground">Belum ada usulan untuk {tahun}.</td></tr>}</tbody></table></div>
        </CardContent>
      </Card>);
  } else if (bagian === "nominasi") {
    isi = (
      <Card>
        <CardHeader><CardTitle>Verifikasi & Nominasi {tahun}</CardTitle><CardDescription>Verifikator menilai ulang (skor 1–5), menyetujui jumlah, dan menentukan sumber dana serta masuk-tidaknya ke pagu. Nilai akhir = 40% skor pengusul + 60% skor verifikator (skala 0–100).</CardDescription></CardHeader>
        <CardContent className="grid gap-3">
          {pilihTahun}
          {usulan.map((u) => <details key={u.id} className="rounded-lg border p-3" open={u.status === "Diajukan"}>
            <summary className="cursor-pointer text-sm font-medium">{u.namaAlat} × {u.jumlah} · {rp(total(u, u.jumlah))} <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${STATUS_WARNA[u.status] ?? ""}`}>{u.status}</span> <span className="text-xs font-normal text-muted-foreground">nilai {u.skorFinal ?? "—"}{u.masukPagu ? " · masuk pagu" : ""}</span></summary>
            {adm ? <form action={verifikasiUsulan} className="mt-2 grid gap-2 sm:grid-cols-4"><input type="hidden" name="id" value={u.id} />
              <label className="grid gap-1 text-sm">Keputusan<select name="status" defaultValue={u.status === "Ditolak" ? "Ditolak" : "Disetujui"} className={inp}><option>Disetujui</option><option>Ditolak</option></select></label>
              <label className="grid gap-1 text-sm">Jumlah disetujui<input type="number" min={0} max={u.jumlah} name="jumlahSetuju" defaultValue={u.jumlahSetuju ?? u.jumlah} className={inp} /></label>
              <label className="grid gap-1 text-sm">Sumber dana<select name="sumberDana" defaultValue={u.sumberDana ?? ""} className={inp}><option value="">—</option>{SUMBER_DANA.map((x) => <option key={x}>{x}</option>)}</select></label>
              <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" name="masukPagu" defaultChecked={u.masukPagu} /> Masuk pagu</label>
              <label className="grid gap-1 text-sm">Urgensi{skor("kabidUrgensi", u.kabidUrgensi ?? 3)}</label><label className="grid gap-1 text-sm">Existing{skor("kabidExisting", u.kabidExisting ?? 3)}</label><label className="grid gap-1 text-sm">Peruntukan{skor("kabidPeruntukan", u.kabidPeruntukan ?? 3)}</label><span />
              {([["sesuaiIndikator", "Terkait indikator", u.sesuaiIndikator], ["sesuaiProgram", "Program unggulan", u.sesuaiProgram], ["sesuaiAspak", "Sesuai ASPAK/aset", u.sesuaiAspak], ["sesuaiLegal", "Aspek legal", u.sesuaiLegal]] as const).map(([n, l, v]) => <label key={n} className="flex items-center gap-2 text-sm"><input type="checkbox" name={n} defaultChecked={v} /> {l}</label>)}
              <label className="grid gap-1 text-sm sm:col-span-3">Catatan<input name="catatan" defaultValue={u.catatan ?? ""} className={inp} /></label><Button variant="teal" className="w-fit self-end">Simpan</Button></form>
              : <p className="mt-2 text-sm text-muted-foreground">Hanya Admin yang dapat memverifikasi.{u.catatan ? ` Catatan: ${u.catatan}` : ""}</p>}
          </details>)}
          {!usulan.length && <p className="text-sm text-muted-foreground">Belum ada usulan untuk {tahun}.</p>}
        </CardContent>
      </Card>);
  } else {
    const per = new Map<string, number>();
    usulan.filter((u) => u.masukPagu && u.status === "Disetujui").forEach((u) => per.set(u.sumberDana ?? "Belum ditentukan", (per.get(u.sumberDana ?? "Belum ditentukan") ?? 0) + total(u, u.jumlahSetuju ?? 0)));
    const sumber = [...new Set([...pagu.map((p) => p.sumberDana), ...per.keys()])].sort();
    isi = (
      <Card>
        <CardHeader><CardTitle>Pagu & Ringkasan {tahun}</CardTitle><CardDescription>Pagu per sumber dana dibanding total usulan yang disetujui dan ditandai masuk pagu.</CardDescription></CardHeader>
        <CardContent className="grid gap-3">
          {pilihTahun}
          {adm && <form action={simpanPagu} className="grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-4"><input type="hidden" name="tahun" value={tahun} />
            <label className="grid gap-1 text-sm">Sumber dana<select name="sumberDana" className={inp}>{SUMBER_DANA.map((x) => <option key={x}>{x}</option>)}</select></label>
            <label className="grid gap-1 text-sm">Nilai pagu (Rp)<input type="number" min={0} step="any" name="nilai" required className={inp} /></label><Button variant="teal" className="w-fit self-end">Simpan pagu</Button></form>}
          <table className="w-full text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-2">Sumber dana</th><th>Pagu</th><th>Nominasi masuk pagu</th><th>Sisa</th></tr></thead>
            <tbody>{sumber.map((sd) => { const p = pagu.find((x) => x.sumberDana === sd)?.nilai ?? 0, n = per.get(sd) ?? 0; return <tr key={sd} className="border-b"><td className="py-2">{sd}</td><td>{rp(p)}</td><td>{rp(n)}</td><td className={p - n < 0 ? "font-medium text-red-700" : ""}>{rp(p - n)}</td></tr>; })}
              {!sumber.length && <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">Belum ada pagu atau nominasi.</td></tr>}</tbody></table>
        </CardContent>
      </Card>);
  }
  return <div className="grid gap-4"><Flash ok={sp.ok} error={sp.error} /><SubTab aktif={bagian} item={nav} />{isi}</div>;
}
