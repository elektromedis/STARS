import { prisma } from "./prisma";
import { type Filter, TAHAP_URUT, whereFilter } from "./filter";

export type PaketRow = {
  kode: string; namaPaket: string; unit: string; kategori: string; nilai: number; serapan: boolean;
  tahun: number; tahap: string; jenis: string; prioritas: string | null;
};

export async function getRingkasan(f: Filter) {
  const where = whereFilter(f);
  const [agg, terserap, pm] = await Promise.all([
    prisma.paket.aggregate({ where, _sum: { nilai: true }, _count: { _all: true } }),
    prisma.paket.aggregate({ where: { ...where, serapan: true }, _sum: { nilai: true }, _count: { _all: true } }),
    prisma.paket.aggregate({ where: { ...where, jenis: "Pemeliharaan" }, _sum: { vol1: true } }),
  ]);
  const totalNilai = agg._sum.nilai ?? 0;
  const nilaiTerserap = terserap._sum.nilai ?? 0;
  return {
    totalNilai,
    jumlahPaket: agg._count._all,
    paketTerserap: terserap._count._all,
    alkesDipelihara: Math.round(pm._sum.vol1 ?? 0),
    nilaiTerserap,
    realisasiPersen: totalNilai ? (nilaiTerserap / totalNilai) * 100 : 0,
  };
}

export async function getNilaiPerUnit(f: Filter, limit?: number) {
  const g = await prisma.paket.groupBy({
    by: ["unitKerjaId"],
    where: whereFilter(f),
    _sum: { nilai: true },
    _count: { _all: true },
    orderBy: { _sum: { nilai: "desc" } },
    ...(limit ? { take: limit } : {}),
  });
  const units = await prisma.unitKerja.findMany({ where: { id: { in: g.map((x) => x.unitKerjaId) } } });
  const nama = new Map(units.map((u) => [u.id, u.nama]));
  return g.map((x) => ({ name: nama.get(x.unitKerjaId) ?? "?", value: x._sum.nilai ?? 0, paket: x._count._all }));
}

export async function getNilaiPerKategori(f: Filter) {
  const g = await prisma.paket.groupBy({
    by: ["kategori"], where: whereFilter(f), _sum: { nilai: true }, _count: { _all: true }, orderBy: { _sum: { nilai: "desc" } },
  });
  return g.map((x) => ({ name: x.kategori, value: x._sum.nilai ?? 0, paket: x._count._all }));
}

/** Total nilai per tahun dan tahap (untuk grafik perbandingan antar tahun). */
export async function getNilaiPerTahun(f: Pick<Filter, "unit" | "kategori">) {
  const g = await prisma.paket.groupBy({
    by: ["tahun", "tahap"],
    where: { ...(f.unit ? { unitKerja: { nama: f.unit } } : {}), ...(f.kategori ? { kategori: f.kategori } : {}) },
    _sum: { nilai: true },
    orderBy: [{ tahun: "asc" }],
  });
  const tahapKeys = TAHAP_URUT.filter((t) => g.some((x) => x.tahap === t));
  const rows = new Map<number, Record<string, number | string>>();
  for (const x of g) {
    const r = rows.get(x.tahun) ?? { tahun: String(x.tahun) };
    r[x.tahap] = x._sum.nilai ?? 0;
    rows.set(x.tahun, r);
  }
  return { data: [...rows.values()], tahapKeys: [...tahapKeys] };
}

export type PaketQuery = { filter: Filter; q?: string; status?: string; page?: number; pageSize?: number; orderBy?: "nilai" | "nama" };

export async function getPaketList({ filter, q, status, page = 1, pageSize = 25, orderBy = "nilai" }: PaketQuery) {
  const where = {
    ...whereFilter(filter),
    ...(status === "terserap" ? { serapan: true } : status === "direncanakan" ? { serapan: false } : {}),
    ...(q
      ? { OR: [{ namaPaket: { contains: q } }, { uraian: { contains: q } }, { namaRekening: { contains: q } }, { kode: { contains: q } }, { lokasiAsli: { contains: q } }] }
      : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.paket.count({ where }),
    prisma.paket.findMany({
      where,
      include: { unitKerja: { select: { nama: true } } },
      orderBy: orderBy === "nama" ? { namaPaket: "asc" } : { nilai: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  const data: PaketRow[] = rows.map((p) => ({
    kode: p.kode, namaPaket: p.namaPaket, unit: p.unitKerja.nama, kategori: p.kategori, nilai: p.nilai, serapan: p.serapan,
    tahun: p.tahun, tahap: p.tahap, jenis: p.jenis, prioritas: p.prioritas,
  }));
  return { data, total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)) };
}

/** Baris lengkap untuk ekspor XLSX/CSV, kolom mengikuti template STARS. */
export async function getPaketForExport(f: Filter) {
  const rows = await prisma.paket.findMany({ where: whereFilter(f), include: { unitKerja: true }, orderBy: [{ unitKerja: { urut: "asc" } }, { nilai: "desc" }] });
  return rows.map((p) => ({
    kode: p.kode, tahun: p.tahun, tahap: p.tahap, jenis: p.jenis, sumber_dana: p.sumberDana, nama_rekening: p.namaRekening,
    nama_paket: p.namaPaket, uraian: p.uraian ?? "", unit_kerja: p.unitKerja.nama, lokasi_asli: p.lokasiAsli ?? "", kode_barang: p.kodeBarang ?? "",
    vol1: p.vol1, satuan1: p.satuan1 ?? "", vol2: p.vol2, satuan2: p.satuan2 ?? "", harga_satuan: p.hargaSatuan, nilai: p.nilai,
    serapan: p.serapan ? "Ya" : "Tidak", prioritas: p.prioritas ?? "", kategori: p.kategori, keterangan: p.keterangan ?? "", link_harga: p.linkHarga ?? "",
  }));
}

/** Daftar dataset yang bisa diunduh: satu per (tahun, tahap). */
export async function getDatasets() {
  const g = await prisma.paket.groupBy({
    by: ["tahun", "tahap"], _count: { _all: true }, _sum: { nilai: true }, _max: { updatedAt: true }, orderBy: [{ tahun: "desc" }],
  });
  return g
    .sort((a, b) => b.tahun - a.tahun || TAHAP_URUT.indexOf(b.tahap as never) - TAHAP_URUT.indexOf(a.tahap as never))
    .map((x) => ({ tahun: x.tahun, tahap: x.tahap, baris: x._count._all, nilai: x._sum.nilai ?? 0, diperbarui: x._max.updatedAt }));
}

export async function getUnitKerjaRows() {
  const units = await prisma.unitKerja.findMany({ orderBy: { urut: "asc" }, include: { _count: { select: { paket: true } } } });
  return units.map((u) => ({ no: u.urut + 1, nama_unit_kerja: u.nama, jumlah_paket_tercatat: u._count.paket }));
}
