import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { sesiImms } from "@/lib/imms-sesi";
import { simpanAlat } from "@/app/imms/actions";
import { Cari, Lencana, Tabel } from "@/components/imms/ui";

export const metadata = { title: "Kelola Data Alat" };

/** CMS input data alat. Menulis ke tabel Alat yang sama dengan STARS, jadi perubahan langsung tampil di kedua aplikasi. */
export default async function DataAlat({ searchParams }: { searchParams: Promise<{ kode?: string; q?: string }> }) {
  await sesiImms("Operator");
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const [a, unit, ruangan, daftar] = await Promise.all([
    sp.kode ? prisma.alat.findUnique({ where: { kode: sp.kode } }) : null,
    prisma.unitKerja.findMany({ orderBy: { urut: "asc" }, select: { id: true, nama: true } }),
    prisma.ruangan.findMany({ orderBy: { nama: "asc" }, select: { id: true, nama: true, unitKerja: { select: { nama: true } } } }),
    prisma.alat.findMany({
      where: q ? { OR: [{ nama: { contains: q } }, { kode: { contains: q } }, { nomorSeri: { contains: q } }] } : {},
      orderBy: { updatedAt: "desc" }, take: 30, select: { kode: true, nama: true, merek: true, kondisi: true, aktif: true, unitKerja: { select: { nama: true } } },
    }),
  ]);
  const isian = (n: string, l: string, v?: string | number | null, wajib = false, ket?: string) => (
    <div><label className="lbl" htmlFor={n}>{l}{wajib && " *"}</label><input id={n} name={n} className="isian" defaultValue={v ?? ""} required={wajib} placeholder={ket} /></div>
  );
  return (
    <div className="space-y-5">
      <section className="kaca panel">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="!mb-0">{a ? `Ubah alat ${a.kode}` : "Tambah alat baru"}</h2>
          {a && <Link href="/imms/data-alat" className="kapsul ml-auto">+ Alat baru</Link>}
        </div>
        <p className="redup mb-3 text-[12px]">Data tersimpan di basis data bersama STARS: tampil juga di menu Pemeliharaan &amp; Data/Admin STARS.</p>
        <form action={simpanAlat} key={a?.id ?? "baru"} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {a && <input type="hidden" name="id" value={a.id} />}
          {isian("kode", "Kode inventaris / barcode", a?.kode, true, "isi atau pindai barcode")}
          {isian("nama", "Nama alat", a?.nama, true)}
          {isian("kategori", "Kategori", a?.kategori)}
          {isian("merek", "Merek", a?.merek)}
          {isian("model", "Tipe / model", a?.model)}
          {isian("nomorSeri", "Nomor seri", a?.nomorSeri)}
          {isian("kodeAspak", "Kode ASPAK", a?.kodeAspak)}
          {isian("udi", "UDI", a?.udi)}
          {isian("tahunPerolehan", "Tahun perolehan", a?.tahunPerolehan)}
          <div><label className="lbl" htmlFor="unitKerjaId">Unit kerja *</label>
            <select id="unitKerjaId" name="unitKerjaId" defaultValue={a?.unitKerjaId ?? ""} required><option value="">Pilih…</option>{unit.map((u) => <option key={u.id} value={u.id}>{u.nama}</option>)}</select></div>
          <div><label className="lbl" htmlFor="ruanganId">Ruangan</label>
            <select id="ruanganId" name="ruanganId" defaultValue={a?.ruanganId ?? ""}><option value="">—</option>{ruangan.map((r) => <option key={r.id} value={r.id}>{r.nama} ({r.unitKerja.nama})</option>)}</select></div>
          <div><label className="lbl" htmlFor="jenis">Jenis</label>
            <select id="jenis" name="jenis" defaultValue={a?.jenis ?? "Medik"}><option>Medik</option><option>Non Medik</option></select></div>
          <div><label className="lbl" htmlFor="kondisi">Kondisi</label>
            <select id="kondisi" name="kondisi" defaultValue={a?.kondisi ?? "Baik"}>{["Baik", "Rusak Ringan", "Rusak Berat", "Afkir"].map((k) => <option key={k}>{k}</option>)}</select></div>
          <div><label className="lbl" htmlFor="statusOperasi">Status operasi</label>
            <select id="statusOperasi" name="statusOperasi" defaultValue={a?.statusOperasi ?? "Beroperasi"}><option>Beroperasi</option><option>Tidak beroperasi</option></select></div>
          {isian("alasanTidakOperasi", "Alasan tidak beroperasi", a?.alasanTidakOperasi)}
          <div className="sm:col-span-2 lg:col-span-3"><label className="lbl" htmlFor="catatan">Catatan</label><textarea id="catatan" name="catatan" rows={2} defaultValue={a?.catatan ?? ""} /></div>
          <div className="sm:col-span-2 lg:col-span-3"><button className="kapsul utama">{a ? "Simpan perubahan" : "Tambah alat"}</button></div>
        </form>
      </section>
      <section className="kaca panel">
        <h2>Data alat (30 terakhir diubah)</h2>
        <Cari q={q} placeholder="Cari nama, kode, nomor seri…" />
        <Tabel>
          <thead><tr><th>Kode</th><th>Nama</th><th>Merek</th><th>Unit</th><th>Kondisi</th><th /></tr></thead>
          <tbody>{daftar.map((d) => (
            <tr key={d.kode}>
              <td><Link className="tautan" href={`/imms/inventaris/${encodeURIComponent(d.kode)}`}>{d.kode}</Link></td>
              <td>{d.nama}{!d.aktif && <> <Lencana t="nonaktif" /></>}</td><td>{d.merek ?? "—"}</td><td>{d.unitKerja.nama}</td>
              <td><Lencana t={d.kondisi} nada={d.kondisi === "Baik" ? "hijau" : d.kondisi === "Afkir" ? undefined : "merah"} /></td>
              <td><Link className="tautan" href={`/imms/data-alat?kode=${encodeURIComponent(d.kode)}`}>Ubah</Link></td>
            </tr>
          ))}</tbody>
        </Tabel>
      </section>
    </div>
  );
}
