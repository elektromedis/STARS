import type { Metadata } from "next";
import { Info } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { sesiHalaman } from "@/lib/sesi";
import { unitTerkunci } from "@/lib/akses";
import { cukup } from "@/lib/peran";
import { AlatManager } from "@/components/pemeliharaan/alat-manager";
import { Pagination } from "@/components/dashboard/pagination";
import { KATEGORI_ALAT } from "@/lib/kategori-inventaris";
import { RingkasInventaris, PeringatanSeriGanda } from "@/components/pemeliharaan/ringkas-inventaris";
import { TombolKategori } from "@/components/pemeliharaan/tombol-kategori";
import { TombolIkatemi } from "@/components/pemeliharaan/tombol-ikatemi";

export const metadata: Metadata = { title: "Inventarisasi Alat Kesehatan" };
export const dynamic = "force-dynamic";

const PER_HALAMAN = 50;
type Sp = Record<string, string | string[] | undefined>;
const satu = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() ?? "";

/** Daftar alat dimuat per halaman (50) dengan pencarian & filter di server — tetap ringan untuk ribuan alat. */
export default async function AlatPage({ searchParams }: { searchParams: Promise<Sp> }) {
  const sp = await searchParams;
  const q = satu(sp.q).slice(0, 100), unitPilih = satu(sp.unit).slice(0, 120), aktifPilih = satu(sp.aktif), kat = satu(sp.kat).slice(0, 60);
  const s = await sesiHalaman("Viewer");
  const bolehKelola = cukup(s.user.peran, "Operator") && process.env.STARS_MODE !== "internet";
  const kunci = await unitTerkunci();
  const u = kunci ? { unitKerja: { nama: kunci.nama } } : {};
  const where = {
    ...u, ...(!kunci && unitPilih ? { unitKerja: { nama: unitPilih } } : {}),
    ...(kat === "kosong" ? { kategoriInventaris: null } : kat ? { kategoriInventaris: kat } : {}),
    ...(aktifPilih === "1" ? { aktif: true } : aktifPilih === "0" ? { aktif: false } : {}),
    ...(q ? { OR: [{ nama: { contains: q } }, { kode: { contains: q } }, { merek: { contains: q } }, { model: { contains: q } }, { nomorSeri: { contains: q } }, { ruangan: { nama: { contains: q } } }] } : {}),
  };
  const total = await prisma.alat.count({ where });
  const pages = Math.max(1, Math.ceil(total / PER_HALAMAN));
  const page = Math.min(pages, Math.max(1, Number(satu(sp.page)) || 1));
  const [data, units, ruangan, aktifTotal, belumIkatemi, belumKategori] = await Promise.all([
    prisma.alat.findMany({ where, skip: (page - 1) * PER_HALAMAN, take: PER_HALAMAN, orderBy: [{ unitKerja: { urut: "asc" } }, { nama: "asc" }], include: { unitKerja: { select: { nama: true } }, ruangan: { select: { nama: true } }, _count: { select: { permintaan: true, perintah: true } } } }),
    prisma.unitKerja.findMany({ where: kunci ? { nama: kunci.nama } : { NOT: { nama: "TIDAK ADA" } }, orderBy: { urut: "asc" }, select: { id: true, nama: true } }),
    prisma.ruangan.findMany({ where: { ...u, aktif: true }, orderBy: [{ unitKerja: { urut: "asc" } }, { nama: "asc" }], select: { id: true, nama: true, gedung: true, unitKerjaId: true, unitKerja: { select: { nama: true } } } }),
    prisma.alat.count({ where: { ...u, aktif: true } }),
    prisma.alat.count({ where: { ...u, aktif: true, ikatemiNama: null } }),
    prisma.alat.count({ where: { ...u, kategoriInventaris: null } }),
  ]);
  const query = new URLSearchParams(Object.entries({ q, unit: unitPilih, aktif: aktifPilih, kat }).filter(([, v]) => v));
  const saring = (
    <form method="get" action="#daftar-alat" role="search" className="flex flex-wrap gap-2 px-6 pb-4">
      <input name="q" defaultValue={q} placeholder="Cari nama, kode, merek, nomor seri, ruangan…" aria-label="Cari alat" className="h-9 min-w-56 flex-1 rounded-md border border-input bg-card px-3 text-sm" />
      {!kunci && <select name="unit" defaultValue={unitPilih} aria-label="Unit kerja" className="h-9 rounded-md border border-input bg-card px-2 text-sm"><option value="">Semua unit</option>{units.map((x) => <option key={x.id} value={x.nama}>{x.nama}</option>)}</select>}
      <select name="kat" defaultValue={kat} aria-label="Kategori inventaris" className="h-9 rounded-md border border-input bg-card px-2 text-sm"><option value="">Semua kategori</option>{KATEGORI_ALAT.map((k) => <option key={k} value={k}>{k}</option>)}<option value="kosong">Belum dikategorikan</option></select>
      <select name="aktif" defaultValue={aktifPilih} aria-label="Status aktif" className="h-9 rounded-md border border-input bg-card px-2 text-sm"><option value="">Aktif & nonaktif</option><option value="1">Aktif saja</option><option value="0">Nonaktif saja</option></select>
      <button type="submit" className="h-9 rounded-md bg-navy-800 px-4 text-sm font-medium text-white">Cari</button>
      {query.size > 0 && <a href="/admin/alat" className="inline-flex h-9 items-center px-2 text-sm text-teal-700 hover:underline">Reset</a>}
    </form>
  );
  return (
    <div className="grid gap-4">
      {!bolehKelola && (
        <p className="flex items-start gap-2 rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm text-teal-900">
          <Info className="mt-0.5 size-4 shrink-0" />
          <span>{process.env.STARS_MODE === "internet" ? "Server ini mode internet (baca saja)." : <>Peran <strong>{s.user.peran}</strong> hanya dapat melihat. Menambah/mengubah alat memerlukan peran Operator.</>}</span>
        </p>
      )}
      <RingkasInventaris aktif={kat || undefined} unit={kunci?.nama ?? null} />
      <PeringatanSeriGanda unit={kunci?.nama ?? null} />
      {bolehKelola && <TombolKategori belum={belumKategori} />}
      {bolehKelola && <TombolIkatemi total={aktifTotal} belum={belumIkatemi} />}
      <AlatManager data={data} units={units} ruangan={ruangan} bolehKelola={bolehKelola} alamatPublik={process.env.STARS_URL_PUBLIK ?? ""}
        total={total} saring={saring} halaman={pages > 1 ? <Pagination page={page} pages={pages} total={total} pageSize={PER_HALAMAN} query={query} satuan="alat" jangkar="daftar-alat" /> : null} />
    </div>
  );
}
