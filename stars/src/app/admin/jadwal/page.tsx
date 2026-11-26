import type { Metadata } from "next";
import { Info } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sesiHalaman } from "@/lib/sesi";
import { unitTerkunci } from "@/lib/akses";
import { cukup } from "@/lib/peran";
import { JadwalManager } from "@/components/pemeliharaan/jadwal-manager";
import { Pagination } from "@/components/dashboard/pagination";

export const metadata: Metadata = { title: "Jadwal Preventif" };
export const dynamic = "force-dynamic";

const PER_HALAMAN = 50;
type Sp = Record<string, string | string[] | undefined>;
const satu = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() ?? "";

/** Jadwal preventif per halaman (50) dengan cari/filter di server — ringan untuk ribuan alat. */
export default async function JadwalPage({ searchParams }: { searchParams: Promise<Sp> }) {
  const sp = await searchParams;
  const s = await sesiHalaman("Viewer");
  const bolehKelola = cukup(s.user.peran, "Operator") && process.env.STARS_MODE !== "internet";
  const kunci = await unitTerkunci();
  const u = kunci ? { unitKerja: { nama: kunci.nama } } : {};
  const q = satu(sp.q).slice(0, 100), unitPilih = satu(sp.unit).slice(0, 120), st = satu(sp.st);
  const kini = new Date();
  const where: Prisma.JadwalPreventifWhereInput = {
    alat: { ...u, ...(!kunci && unitPilih ? { unitKerja: { nama: unitPilih } } : {}), ...(q ? { OR: [{ nama: { contains: q } }, { kode: { contains: q } }] } : {}) },
    ...(st === "tempo" ? { aktif: true, berikutnya: { lte: kini } } : st === "aktif" ? { aktif: true } : st === "nonaktif" ? { aktif: false } : {}),
  };
  const total = await prisma.jadwalPreventif.count({ where });
  const pages = Math.max(1, Math.ceil(total / PER_HALAMAN));
  const page = Math.min(pages, Math.max(1, Number(satu(sp.page)) || 1));
  const [jadwal, alat, jatuhTempo, units] = await Promise.all([
    prisma.jadwalPreventif.findMany({ where, skip: (page - 1) * PER_HALAMAN, take: PER_HALAMAN, orderBy: [{ aktif: "desc" }, { berikutnya: "asc" }], include: { alat: { select: { kode: true, nama: true, unitKerja: { select: { nama: true } } } }, perintah: { where: { status: { in: ["Terbuka", "Dikerjakan"] } }, select: { nomor: true } } } }),
    prisma.alat.findMany({ where: { ...u, aktif: true }, orderBy: [{ unitKerja: { urut: "asc" } }, { nama: "asc" }], select: { id: true, kode: true, nama: true, unitKerja: { select: { nama: true } } } }),
    prisma.jadwalPreventif.count({ where: { alat: u, aktif: true, berikutnya: { lte: kini }, perintah: { none: { status: { in: ["Terbuka", "Dikerjakan"] } } } } }),
    kunci ? Promise.resolve([]) : prisma.unitKerja.findMany({ where: { NOT: { nama: "TIDAK ADA" } }, orderBy: { urut: "asc" }, select: { id: true, nama: true } }),
  ]);
  const query = new URLSearchParams(Object.entries({ q, unit: unitPilih, st }).filter(([, v]) => v));
  const saring = (
    <form method="get" action="#daftar-jadwal" role="search" className="flex flex-wrap gap-2 px-6 pb-4">
      <input name="q" defaultValue={q} placeholder="Cari nama / kode alat…" aria-label="Cari jadwal" className="h-9 min-w-56 flex-1 rounded-md border border-input bg-card px-3 text-sm" />
      {!kunci && <select name="unit" defaultValue={unitPilih} aria-label="Unit kerja" className="h-9 rounded-md border border-input bg-card px-2 text-sm"><option value="">Semua unit</option>{units.map((x) => <option key={x.id} value={x.nama}>{x.nama}</option>)}</select>}
      <select name="st" defaultValue={st} aria-label="Status jadwal" className="h-9 rounded-md border border-input bg-card px-2 text-sm"><option value="">Semua status</option><option value="tempo">Sudah jatuh tempo</option><option value="aktif">Aktif</option><option value="nonaktif">Nonaktif</option></select>
      <button type="submit" className="h-9 rounded-md bg-navy-800 px-4 text-sm font-medium text-white">Cari</button>
      {query.size > 0 && <a href="/admin/jadwal" className="inline-flex h-9 items-center px-2 text-sm text-teal-700 hover:underline">Reset</a>}
    </form>
  );
  return (
    <div className="grid gap-4">
      {!bolehKelola && (
        <p className="flex items-start gap-2 rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm text-teal-900"><Info className="mt-0.5 size-4 shrink-0" />
          <span>{process.env.STARS_MODE === "internet" ? "Server ini mode internet (baca saja)." : <>Peran <strong>{s.user.peran}</strong> hanya dapat melihat. Mengelola jadwal memerlukan peran Operator.</>}</span></p>
      )}
      <JadwalManager data={jadwal} alat={alat} bolehKelola={bolehKelola} total={total} jatuhTempo={jatuhTempo} saring={saring}
        halaman={pages > 1 ? <Pagination page={page} pages={pages} total={total} pageSize={PER_HALAMAN} query={query} satuan="jadwal" jangkar="daftar-jadwal" /> : null} />
    </div>
  );
}
