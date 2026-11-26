import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { sesiHalaman } from "@/lib/sesi";
import { cukup } from "@/lib/peran";
import { JENIS_REKANAN } from "@/lib/master";
import { inp } from "@/lib/aksi-admin";
import { SubTab } from "@/components/admin/sub-tab";
import { Flash } from "@/components/admin/flash";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { hapusMerkTipe, hapusRekanan, simpanMerk, simpanRekanan, simpanTipe } from "./actions";

export const metadata: Metadata = { title: "Master Rekanan, Supplier, Kalibrator & Merk" };
export const dynamic = "force-dynamic";

export default async function MasterPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const se = await sesiHalaman("Viewer");
  const sp = await searchParams;
  const bagian = [...JENIS_REKANAN, "Merk"].includes(sp.bagian ?? "") ? sp.bagian! : "Supplier";
  const op = cukup(se.user.peran, "Operator") && process.env.STARS_MODE !== "internet", adm = cukup(se.user.peran, "Admin");
  const tab = [...JENIS_REKANAN, "Merk"].map((k) => ({ kode: k, label: k === "Merk" ? "Merk & Tipe" : k, href: `/admin/master?bagian=${k}` }));
  const rekanan = bagian === "Merk" ? [] : await prisma.rekanan.findMany({ where: { jenis: bagian }, orderBy: [{ aktif: "desc" }, { nama: "asc" }], include: { _count: { select: { penerimaan: true } } } });
  const merk = bagian === "Merk" ? await prisma.merkAlat.findMany({ orderBy: { nama: "asc" }, include: { tipe: { orderBy: { nama: "asc" } } } }) : [];
  return (
    <div className="grid gap-4">
      <Flash ok={sp.ok} error={sp.error} />
      <SubTab item={tab} aktif={bagian} />
      {bagian !== "Merk" ? (
        <Card>
          <CardHeader><CardTitle>{bagian}</CardTitle><CardDescription>{bagian === "Kalibrator" ? "Lembaga pengkalibrasi — isi nomor akreditasi (KAN) pada kolom sertifikat." : bagian === "Servis" ? "Vendor/bengkel servis dan penyedia kontrak servis." : "Penyedia / penyalur alat kesehatan yang tercatat pada penerimaan alat."}</CardDescription></CardHeader>
          <CardContent className="grid gap-3">
            {op && <form action={simpanRekanan} className="grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-4">
              <input type="hidden" name="jenis" value={bagian} />
              <label className="grid gap-1 text-sm sm:col-span-2">Nama<input name="nama" required className={inp} /></label>
              <label className="grid gap-1 text-sm">Kontak<input name="kontak" className={inp} /></label>
              <label className="grid gap-1 text-sm">Telepon<input name="telepon" className={inp} /></label>
              <label className="grid gap-1 text-sm">Email<input name="email" type="email" className={inp} /></label>
              <label className="grid gap-1 text-sm">{bagian === "Kalibrator" ? "No. akreditasi (KAN)" : "Izin / sertifikat"}<input name="sertifikat" className={inp} /></label>
              <label className="grid gap-1 text-sm sm:col-span-2">Alamat<input name="alamat" className={inp} /></label>
              <label className="grid gap-1 text-sm sm:col-span-3">Catatan<input name="catatan" className={inp} /></label>
              <Button variant="teal" className="self-end">Simpan</Button>
            </form>}
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-2">Nama</th><th>Kontak</th><th>Telepon / Email</th><th>{bagian === "Kalibrator" ? "Akreditasi" : "Izin"}</th><th>Dipakai</th><th /></tr></thead>
              <tbody>{rekanan.map((r) => <tr key={r.id} className={`border-b ${r.aktif ? "" : "opacity-50"}`}><td className="py-2 font-medium">{r.nama}{!r.aktif && " (nonaktif)"}<div className="text-xs font-normal text-muted-foreground">{r.alamat}</div></td><td>{r.kontak ?? "—"}</td><td>{[r.telepon, r.email].filter(Boolean).join(" · ") || "—"}</td><td>{r.sertifikat ?? "—"}</td><td>{r._count.penerimaan}</td>
                <td>{adm && <form action={hapusRekanan}><input type="hidden" name="id" value={r.id} /><Button size="sm" variant="ghost">Hapus</Button></form>}</td></tr>)}
                {!rekanan.length && <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">Belum ada data {bagian.toLowerCase()}.</td></tr>}</tbody></table></div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader><CardTitle>Merk &amp; Tipe Alat</CardTitle><CardDescription>Daftar baku merk dan tipe agar penulisan konsisten (HTA dan inventaris).</CardDescription></CardHeader>
          <CardContent className="grid gap-3">
            {op && <div className="grid gap-2 sm:grid-cols-2">
              <form action={simpanMerk} className="grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-3"><label className="grid gap-1 text-sm sm:col-span-2">Merk baru<input name="nama" required className={inp} /></label><label className="grid gap-1 text-sm">Negara<input name="negara" className={inp} /></label><Button variant="teal" className="sm:col-span-3">Simpan merk</Button></form>
              <form action={simpanTipe} className="grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-3"><label className="grid gap-1 text-sm">Merk<select name="merkId" required className={inp}>{merk.map((m) => <option key={m.id} value={m.id}>{m.nama}</option>)}</select></label><label className="grid gap-1 text-sm">Tipe<input name="nama" required className={inp} /></label><label className="grid gap-1 text-sm">Jenis alat<input name="namaAlat" className={inp} placeholder="Infusion Pump" /></label><Button variant="teal" className="sm:col-span-3">Simpan tipe</Button></form>
            </div>}
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{merk.map((m) => <div key={m.id} className="rounded-lg border p-3 text-sm"><div className="flex items-center justify-between font-semibold text-navy-900">{m.nama}{m.negara && <span className="text-xs font-normal text-muted-foreground">{m.negara}</span>}</div>
              <ul className="mt-1 grid gap-0.5">{m.tipe.map((t) => <li key={t.id} className="flex items-center justify-between"><span>{t.nama}{t.namaAlat && <span className="text-xs text-muted-foreground"> · {t.namaAlat}</span>}</span>{adm && <form action={hapusMerkTipe}><input type="hidden" name="jenis" value="tipe" /><input type="hidden" name="id" value={t.id} /><button className="text-xs text-red-700 hover:underline">hapus</button></form>}</li>)}{!m.tipe.length && <li className="text-xs text-muted-foreground">Belum ada tipe.</li>}</ul>
              {adm && <form action={hapusMerkTipe} className="mt-2"><input type="hidden" name="jenis" value="merk" /><input type="hidden" name="id" value={m.id} /><button className="text-xs text-red-700 hover:underline">hapus merk (beserta tipenya)</button></form>}</div>)}</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
