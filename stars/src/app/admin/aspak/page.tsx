import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { sesiHalaman } from "@/lib/sesi";
import { cukup } from "@/lib/peran";
import { inp, tgl, inputTgl } from "@/lib/aksi-admin";
import { STRATA, hitungPemenuhan, sisaHari } from "@/lib/aspak";
import { SubTab } from "@/components/admin/sub-tab";
import { Flash } from "@/components/admin/flash";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { statusKompetensi } from "@/lib/rs-online";
import { imporRsOnlineCsv, simpanPemetaanRuang, hapusNakes, hapusStandar, imporStandar, isiDaftarBawaan, simpanIzin, simpanNakes, simpanPrasarana, simpanProfil } from "./actions";

export const metadata: Metadata = { title: "Kelengkapan Faskes (gaya ASPAK)" };
export const dynamic = "force-dynamic";

const BAGIAN = [["pemenuhan", "Pemenuhan Alat"], ["standar", "Standar Alat"], ["prasarana", "Prasarana"], ["izin", "Perizinan & Mutu"], ["sdm", "Tenaga Kesehatan"], ["kompetensi", "Kompetensi RS (RS Online)"], ["inventaris", "Inventaris ASPAK"]] as const;
const warna = (p: number) => (p >= 80 ? "bg-emerald-500" : p >= 50 ? "bg-amber-500" : "bg-red-500");

export default async function AspakPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const se = await sesiHalaman("Viewer");
  const sp = await searchParams;
  const bagian = BAGIAN.find((b) => b[0] === sp.bagian)?.[0] ?? "pemenuhan";
  const tulis = cukup(se.user.peran, "Operator") && process.env.STARS_MODE !== "internet";
  const adm = cukup(se.user.peran, "Admin") && process.env.STARS_MODE !== "internet";
  const profil = await prisma.profilFaskes.findUnique({ where: { id: 1 } });
  const strata = profil?.strata ?? "";

  let isi: React.ReactNode = null;
  if (bagian === "pemenuhan") {
    const [standar, alat] = await Promise.all([
      strata ? prisma.standarAlat.findMany({ where: { strata }, orderBy: [{ namaRuangan: "asc" }, { namaAlat: "asc" }] }) : Promise.resolve([]),
      prisma.alat.findMany({ where: { aktif: true }, select: { nama: true, ruangan: { select: { nama: true } }, unitKerja: { select: { nama: true } } } }),
    ]);
    const { baris, total } = hitungPemenuhan(standar.map((x) => ({ ...x, kodeRuangan: x.kodeRuangan ?? undefined })), alat.map((a) => ({ nama: a.nama, ruangan: a.ruangan?.nama ?? "", unit: a.unitKerja.nama })));
    const per = new Map<string, typeof baris>();
    baris.forEach((b) => per.set(b.namaRuangan, [...(per.get(b.namaRuangan) ?? []), b]));
    isi = (
      <Card>
        <CardHeader><CardTitle>Pemenuhan Alat terhadap Standar</CardTitle><CardDescription>Jumlah alat aktif di inventaris dibanding standar per ruangan. Pencocokan memakai kata pada nama alat dan nama ruangan/unit kerja, jadi nama di standar sebaiknya mirip dengan inventaris.</CardDescription></CardHeader>
        <CardContent className="grid gap-3">
          <form action={simpanProfil} className="grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-4">
            <label className="grid gap-1 text-sm">Kode faskes<input name="kodeFaskes" defaultValue={profil?.kodeFaskes ?? ""} className={inp} disabled={!adm} /></label>
            <label className="grid gap-1 text-sm">Strata<select name="strata" defaultValue={strata} className={inp} disabled={!adm}><option value="">— belum diatur —</option>{STRATA.map((x) => <option key={x}>{x}</option>)}</select></label>
            <label className="grid gap-1 text-sm">Kelas<input name="kelas" defaultValue={profil?.kelas ?? ""} className={inp} disabled={!adm} /></label>
            {adm && <Button variant="teal" className="self-end">Simpan profil</Button>}
          </form>
          {!strata ? <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Strata belum diatur — standar dan pemenuhan tidak dapat dihitung.</p>
            : !standar.length ? <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Belum ada standar alat untuk strata {strata}. Impor di tab Standar Alat.</p>
            : <>
              <div className="rounded-lg border p-3"><p className="text-sm text-muted-foreground">Pemenuhan keseluruhan (strata {strata})</p><p className="text-3xl font-semibold text-navy-900">{total}%</p><div className="mt-1 h-2 rounded bg-slate-100"><div className={`h-2 rounded ${warna(total)}`} style={{ width: `${total}%` }} /></div></div>
              {[...per].map(([r, bs]) => { const st = bs.reduce((n, b) => n + b.standar, 0), ok = bs.reduce((n, b) => n + Math.min(b.ada, b.standar), 0), p = Math.round((ok / st) * 100);
                return <details key={r} className="rounded-lg border p-3" open={p < 100}><summary className="cursor-pointer text-sm font-medium">{r} <span className="ml-2 text-xs font-normal text-muted-foreground">{ok}/{st} · {p}%</span></summary>
                  <table className="mt-2 w-full text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-1">Alat standar</th><th>Standar</th><th>Ada</th><th>%</th></tr></thead>
                    <tbody>{bs.map((b) => <tr key={b.namaAlat} className="border-b"><td className="py-1">{b.namaAlat}</td><td>{b.standar}</td><td>{b.ada}</td><td className={b.ada < b.standar ? "text-red-700" : "text-emerald-700"}>{b.persen}%</td></tr>)}</tbody></table></details>; })}
            </>}
        </CardContent>
      </Card>);
  } else if (bagian === "standar") {
    const hit = await prisma.standarAlat.groupBy({ by: ["strata"], _count: { _all: true } });
    isi = (
      <Card>
        <CardHeader><CardTitle>Standar Alat per Strata</CardTitle><CardDescription>Standar tidak disertakan bawaan. Tempel dari sumber resmi yang Anda miliki (Permenkes/ASPAK), satu baris: <code>ruangan;alat;jumlah</code> atau <code>kode;ruangan;alat;jumlah</code>. Baris berawalan # diabaikan.</CardDescription></CardHeader>
        <CardContent className="grid gap-3">
          {tulis && <form action={imporStandar} className="grid gap-2 rounded-lg bg-slate-50 p-3">
            <div className="flex flex-wrap items-end gap-3"><label className="grid gap-1 text-sm">Strata<select name="strata" defaultValue={strata} className={inp}>{STRATA.map((x) => <option key={x}>{x}</option>)}</select></label>
              <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" name="timpa" /> Ganti seluruh standar strata ini</label></div>
            <textarea name="teks" rows={8} placeholder={"Ruangan Klinik Sp. Penyakit Dalam;Tensimeter Digital;1\nRuangan Klinik Sp. Penyakit Dalam;Stetoskop Dewasa;1"} className="rounded-md border bg-white p-2 font-mono text-xs" />
            <Button variant="teal" className="w-fit">Impor standar</Button></form>}
          <div className="grid gap-2 sm:grid-cols-4">{STRATA.map((x) => { const n = hit.find((h) => h.strata === x)?._count._all ?? 0; return <div key={x} className="rounded-lg border p-3 text-sm"><p className="font-semibold">{x}</p><p className="text-muted-foreground">{n} baris</p>
            {adm && n > 0 && <form action={hapusStandar}><input type="hidden" name="strata" value={x} /><button className="mt-1 text-xs text-red-700 hover:underline">hapus semua</button></form>}</div>; })}</div>
        </CardContent>
      </Card>);
  } else if (bagian === "prasarana") {
    const pr = await prisma.prasaranaFaskes.findMany({ orderBy: [{ jenis: "asc" }, { id: "asc" }] });
    isi = (
      <Card>
        <CardHeader><CardTitle>Prasarana Listrik</CardTitle><CardDescription>Genset, UPS, dan daya PLN.</CardDescription></CardHeader>
        <CardContent className="grid gap-2">
          {tulis && <form action={isiDaftarBawaan}><Button variant="outline" size="sm">Isi daftar baku (tidak menimpa data)</Button></form>}
          {!pr.length && <p className="text-sm text-muted-foreground">Belum ada butir. Klik &quot;Isi daftar baku&quot;.</p>}
          {pr.map((r) => <form key={r.id} action={simpanPrasarana} className="grid items-center gap-2 rounded-lg border p-2 text-sm sm:grid-cols-[1fr_auto_8rem_auto_auto]">
            <input type="hidden" name="id" value={r.id} /><span><b>{r.jenis}</b> · {r.uraian}</span>
            <label className="flex items-center gap-1"><input type="checkbox" name="ada" defaultChecked={r.ada} disabled={!tulis} /> Ada</label>
            <label className="flex items-center gap-1"><input type="number" step="any" min={0} name="jumlah" defaultValue={r.jumlah} className={inp} disabled={!tulis} /> {r.satuan}</label>
            <label className="flex items-center gap-1"><input type="checkbox" name="berfungsi" defaultChecked={r.berfungsi} disabled={!tulis} /> Berfungsi</label>
            {tulis && <Button size="sm" variant="teal">Simpan</Button>}</form>)}
        </CardContent>
      </Card>);
  } else if (bagian === "izin") {
    const iz = await prisma.izinFaskes.findMany({ orderBy: [{ kelompok: "asc" }, { nama: "asc" }] });
    isi = (
      <Card>
        <CardHeader><CardTitle>Perizinan & Mutu</CardTitle><CardDescription>Masa berlaku dengan penanda kedaluwarsa (merah ≤ 0 hari, kuning ≤ 90 hari).</CardDescription></CardHeader>
        <CardContent className="grid gap-2">
          {tulis && <form action={isiDaftarBawaan}><Button variant="outline" size="sm">Isi daftar baku (tidak menimpa data)</Button></form>}
          {!iz.length && <p className="text-sm text-muted-foreground">Belum ada butir. Klik &quot;Isi daftar baku&quot;.</p>}
          {iz.map((z) => { const h = z.selamanya ? null : sisaHari(z.berlakuSampai); const w = h == null ? "" : h <= 0 ? "bg-red-50" : h <= 90 ? "bg-amber-50" : "";
            return <form key={z.id} action={simpanIzin} className={`grid items-center gap-2 rounded-lg border p-2 text-sm sm:grid-cols-[1fr_auto_9rem_9rem_auto] ${w}`}>
              <input type="hidden" name="kelompok" value={z.kelompok} /><input type="hidden" name="nama" value={z.nama} />
              <span><span className="mr-1 rounded bg-slate-100 px-1.5 text-xs">{z.kelompok}</span>{z.nama}<span className="block text-xs text-muted-foreground">{z.selamanya ? "Berlaku selamanya" : z.berlakuSampai ? `s/d ${tgl(z.berlakuSampai)}${h != null ? (h <= 0 ? " (kedaluwarsa)" : ` (${h} hari)`) : ""}` : z.ada ? "Ada, tanpa tanggal" : "Belum ada"}</span></span>
              <label className="flex items-center gap-1"><input type="checkbox" name="ada" defaultChecked={z.ada} disabled={!tulis} /> Ada</label>
              <input name="nomor" defaultValue={z.nomor ?? ""} placeholder="Nomor" className={inp} disabled={!tulis} />
              <input type="date" name="berlakuSampai" defaultValue={inputTgl(z.berlakuSampai)} className={inp} disabled={!tulis} />
              {tulis && <div className="flex items-center gap-2"><label className="flex items-center gap-1 text-xs"><input type="checkbox" name="selamanya" defaultChecked={z.selamanya} /> selamanya</label><Button size="sm" variant="teal">Simpan</Button></div>}</form>; })}
        </CardContent>
      </Card>);
  } else if (bagian === "kompetensi") {
    const { ringkas, snapshot, jumlahSyarat } = await statusKompetensi();
    const strataDipilih = ["Dasar", "Madya", "Utama", "Paripurna"].includes(sp.strata ?? "") ? sp.strata! : "Dasar";
    const baris = ringkas.filter((r) => r.strata === strataDipilih);
    const strataAda = [...new Set(ringkas.map((r) => r.strata))];
    isi = (
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Pemenuhan Alat & Sarana per Kompetensi RS</CardTitle>
            <CardDescription>
              Standar dari SIRS RS Online (Kemenkes) — {jumlahSyarat ? `${jumlahSyarat} syarat` : "belum ada data"}{snapshot ? `, inventaris ASPAK snapshot ${tgl(snapshot)}` : ""}.
              Grup <b>terpenuhi</b> bila semua alat <b>wajib</b> tersedia dan minimal satu alat <b>substitusi</b> tersedia.
              Ketersediaan: inventaris ASPAK → bila kosong, alat aktif STARS dengan kode ASPAK sama → bila kosong, jumlah snapshot SIRS.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {strataAda.length > 0 && <div className="flex flex-wrap gap-1.5">{strataAda.map((x) => <a key={x} href={`/admin/aspak?bagian=kompetensi&strata=${x}`} className={`rounded-full border px-3 py-1 text-xs font-medium ${x === strataDipilih ? "border-teal-600 bg-teal-600 text-white" : "hover:bg-muted"}`}>Strata {x}</a>)}</div>}
            {baris.length > 0 ? (
              <div className="overflow-x-auto"><table className="w-full text-sm">
                <thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-2">Kompetensi</th><th>Strata RS (SIRS)</th><th className="text-right">Grup terpenuhi</th><th className="w-48">Pemenuhan</th><th>Belum terpenuhi (bahan perencanaan)</th></tr></thead>
                <tbody>{baris.map((r) => (
                  <tr key={r.id} className="border-b align-top">
                    <td className="py-2 font-medium">{r.nama}</td><td>{r.strataRs}</td>
                    <td className="text-right tabular-nums">{r.terpenuhi}/{r.total}</td>
                    <td><div className="flex items-center gap-2"><div className="h-2 flex-1 rounded bg-muted"><div className={`h-2 rounded ${warna(r.persen)}`} style={{ width: `${r.persen}%` }} /></div><span className="w-12 text-right tabular-nums">{r.persen}%</span></div></td>
                    <td className="text-xs">{r.belum.length ? r.belum.map((g) => <div key={g.grup}><b>{g.grup}</b>: {g.opsi.map((o) => `${o.nama}${o.status === "Wajib" ? " (wajib)" : ""}`).join(" / ")}</div>) : <span className="text-emerald-700">Lengkap</span>}</td>
                  </tr>
                ))}</tbody>
              </table></div>
            ) : <p className="text-sm text-muted-foreground">Belum ada data kompetensi. Unggah berkas CSV hasil ekstraksi SIRS RS Online di bawah.</p>}
          </CardContent>
        </Card>
        {adm && (
          <Card>
            <CardHeader><CardTitle>Impor data SIRS RS Online / ASPAK</CardTitle><CardDescription>Pilih beberapa CSV sekaligus: <code>aspak_device_ref</code>, <code>aspak_rooms</code>, <code>aspak_inventory</code>, <code>competency</code>, <code>competency_requirement</code>. Jenis dikenali dari kolomnya. Inventaris dengan tanggal snapshot sama diganti; syarat kompetensi diganti seluruhnya; pemetaan ruang yang sudah diverifikasi tidak ditimpa.</CardDescription></CardHeader>
            <CardContent>
              <form action={imporRsOnlineCsv} className="flex flex-wrap items-end gap-3">
                <input type="file" name="berkas" multiple accept=".csv,text/csv" required className="text-sm" />
                <Button variant="teal">Impor</Button>
              </form>
              <p className="mt-2 text-xs text-muted-foreground">Belum ada webservice resmi ASPAK yang bisa dipanggil STARS; perbarui data lewat ekspor berkala. Data diekstraksi baca-saja dari sirs.kemkes.go.id.</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  } else if (bagian === "inventaris") {
    const akhir = await prisma.aspakInventaris.findFirst({ orderBy: { snapshot: "desc" }, select: { snapshot: true } });
    const [ruang, inv, units, starsPerUnit] = await Promise.all([
      prisma.aspakRuang.findMany({ orderBy: { kode: "asc" }, include: { unitKerja: { select: { nama: true } } } }),
      akhir ? prisma.aspakInventaris.groupBy({ by: ["ruangKode"], where: { snapshot: akhir.snapshot }, _sum: { jumlah: true, rusak: true }, _count: { _all: true } }) : Promise.resolve([]),
      prisma.unitKerja.findMany({ orderBy: { urut: "asc" }, select: { id: true, nama: true } }),
      prisma.alat.groupBy({ by: ["unitKerjaId"], where: { aktif: true }, _count: { _all: true } }),
    ]);
    const perRuang = new Map(inv.map((x) => [x.ruangKode, x]));
    const starsU = new Map(starsPerUnit.map((x) => [x.unitKerjaId, x._count._all]));
    const aspakU = new Map<number, number>();
    for (const r of ruang) if (r.unitKerjaId) aspakU.set(r.unitKerjaId, (aspakU.get(r.unitKerjaId) ?? 0) + (perRuang.get(r.kode)?._sum.jumlah ?? 0));
    const total = inv.reduce((a, x) => a + (x._sum.jumlah ?? 0), 0), rusak = inv.reduce((a, x) => a + (x._sum.rusak ?? 0), 0), barisN = inv.reduce((a, x) => a + x._count._all, 0);
    isi = (
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Inventaris ASPAK (SIRS RS Online)</CardTitle>
            <CardDescription>{akhir ? <>Snapshot {tgl(akhir.snapshot)}: <b>{barisN}</b> baris, <b>{total}</b> unit, <b>{rusak}</b> rusak di {ruang.length} ruang ASPAK.</> : "Belum ada data — impor di tab Kompetensi RS."} Petakan setiap ruang ASPAK ke unit kerja STARS lalu centang <b>Terverifikasi</b>. Kolom <b>Selisih</b> membandingkan jumlah unit ASPAK dengan alat aktif STARS pada unit kerja yang sama.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-2">Kode</th><th>Ruang ASPAK</th><th className="text-right">Unit (rusak)</th><th>Unit kerja STARS</th></tr></thead>
              <tbody>{ruang.map((r) => { const x = perRuang.get(r.kode); return (
                <tr key={r.kode} id={`ruang-${r.kode}`} className="border-b align-top">
                  <td className="py-2 font-mono text-xs">{r.kode}</td><td>{r.nama}</td>
                  <td className="text-right tabular-nums">{x?._sum.jumlah ?? 0}{x?._sum.rusak ? <span className="text-red-700"> ({x._sum.rusak})</span> : ""}</td>
                  <td>{adm ? (
                    <form action={simpanPemetaanRuang} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="kode" value={r.kode} />
                      <select name="unitKerjaId" defaultValue={r.unitKerjaId ?? ""} aria-label={`Unit kerja untuk ${r.nama}`} className="h-8 rounded-md border bg-background px-2 text-xs"><option value="">— belum —</option>{units.map((u) => <option key={u.id} value={u.id}>{u.nama}</option>)}</select>
                      <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="terverifikasi" defaultChecked={r.terverifikasi} /> Terverifikasi</label>
                      <Button size="sm" variant="outline">Simpan</Button>
                    </form>
                  ) : <>{r.unitKerja?.nama ?? "—"}{r.terverifikasi ? " ✓" : " (usulan)"}</>}</td>
                </tr>); })}
                {!ruang.length && <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">Belum ada ruang ASPAK.</td></tr>}</tbody>
            </table>
          </CardContent>
        </Card>
        {aspakU.size > 0 && (
          <Card>
            <CardHeader><CardTitle>Rekonsiliasi per unit kerja</CardTitle><CardDescription>Jumlah unit di ASPAK (ruang yang dipetakan ke unit) dibanding alat aktif di STARS. Selisih besar = data perlu disamakan (impor ke STARS atau perbarui ASPAK).</CardDescription></CardHeader>
            <CardContent className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-2">Unit kerja</th><th className="text-right">ASPAK</th><th className="text-right">STARS</th><th className="text-right">Selisih</th></tr></thead>
              <tbody>{units.filter((u) => aspakU.has(u.id) || starsU.has(u.id)).map((u) => { const a = aspakU.get(u.id) ?? 0, b = starsU.get(u.id) ?? 0; return (
                <tr key={u.id} className="border-b"><td className="py-1.5">{u.nama}</td><td className="text-right tabular-nums">{a}</td><td className="text-right tabular-nums">{b}</td><td className={`text-right tabular-nums ${a - b ? "font-semibold text-amber-700" : "text-emerald-700"}`}>{a - b > 0 ? `+${a - b}` : a - b}</td></tr>); })}</tbody>
            </table></CardContent>
          </Card>
        )}
      </div>
    );
  } else {
    const nk = await prisma.tenagaFaskes.findMany({ orderBy: [{ kelompok: "asc" }, { jenis: "asc" }] });
    const tot = nk.reduce((a, r) => ({ j: a.j + r.jumlah, s: a.s + r.strAktif, p: a.p + r.sipAktif }), { j: 0, s: 0, p: 0 });
    isi = (
      <Card>
        <CardHeader><CardTitle>Tenaga Kesehatan</CardTitle><CardDescription>Jumlah per jenis ketenagaan beserta kepemilikan STR dan SIP. Total {tot.j} orang · STR aktif {tot.s} · SIP aktif {tot.p}.</CardDescription></CardHeader>
        <CardContent className="grid gap-3">
          {tulis && <form action={simpanNakes} className="grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-4">
            <label className="grid gap-1 text-sm sm:col-span-2">Jenis ketenagaan<input name="jenis" required placeholder="Teknisi Elektromedis" className={inp} /></label>
            <label className="grid gap-1 text-sm sm:col-span-2">Kelompok<input name="kelompok" placeholder="Tenaga Teknik Biomedika" className={inp} /></label>
            {(["jumlah", "strMemiliki", "strAktif", "sipMemiliki", "sipAktif"] as const).map((k) => <label key={k} className="grid gap-1 text-sm">{k.replace(/([A-Z])/g, " $1")}<input type="number" min={0} name={k} defaultValue={0} className={inp} /></label>)}
            <Button variant="teal" className="w-fit self-end">Simpan</Button></form>}
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-2">Jenis</th><th>Kelompok</th><th>Jumlah</th><th>STR ada/aktif</th><th>SIP ada/aktif</th><th /></tr></thead>
            <tbody>{nk.map((r) => <tr key={r.id} className="border-b"><td className="py-2 font-medium">{r.jenis}</td><td>{r.kelompok ?? "—"}</td><td>{r.jumlah}</td><td>{r.strMemiliki}/{r.strAktif}</td><td>{r.sipMemiliki}/{r.sipAktif}</td><td>{adm && <form action={hapusNakes}><input type="hidden" name="id" value={r.id} /><Button size="sm" variant="ghost">Hapus</Button></form>}</td></tr>)}
              {!nk.length && <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">Belum ada data.</td></tr>}</tbody></table></div>
        </CardContent>
      </Card>);
  }
  return (
    <div className="grid gap-4">
      <Flash ok={sp.ok} error={sp.error} />
      <SubTab aktif={bagian} item={BAGIAN.map(([kode, label]) => ({ kode, label, href: `/admin/aspak?bagian=${kode}` }))} />
      {isi}
    </div>
  );
}
