import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { type Filter, TAHAP_URUT, whereFilter, whereNilai } from "./filter";
import type { StatusDokumen } from "./dokumen";
import { getStatusDokumen } from "./dokumen-data";

export type PaketRow = {
  kode: string; namaPaket: string; unit: string; kategori: string; nilai: number; serapan: boolean;
  tahun: number; tahap: string; jenis: string; prioritas: string | null;
  dokumen?: StatusDokumen;
};

/** Kolom yang bisa diurutkan di tabel paket (?urut=&arah=). */
export const KOLOM_URUT = ["kode", "nama", "unit", "kategori", "nilai", "serapan"] as const;
export type KolomUrut = (typeof KOLOM_URUT)[number];
export type Arah = "asc" | "desc";
export const adalahKolomUrut = (v: unknown): v is KolomUrut => typeof v === "string" && (KOLOM_URUT as readonly string[]).includes(v);

/** Kolom angka/boolean diurutkan oleh basis data. */
function urutanPrisma(urut: "nilai" | "serapan", arah: Arah) {
  return urut === "serapan" ? [{ serapan: arah }, { nilai: "desc" as const }] : [{ nilai: arah }];
}

/** Kolom teks diurutkan secara alami bahasa Indonesia: tidak peka kapital, angka sebagai angka ("3" < "7" < "32"). */
const kolator = new Intl.Collator("id", { numeric: true, sensitivity: "base" });

export async function getRingkasan(f: Filter) {
  const where = whereNilai(f);
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
    where: whereNilai(f),
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
    by: ["kategori"], where: whereNilai(f), _sum: { nilai: true }, _count: { _all: true }, orderBy: { _sum: { nilai: "desc" } },
  });
  return g.map((x) => ({ name: x.kategori, value: x._sum.nilai ?? 0, paket: x._count._all }));
}

/** Total nilai per tahun dan tahap (untuk grafik perbandingan antar tahun). */
/**
 * Nilai per tahun & tahap. Tiap tahap juga membawa pecahan serapan:
 * `<tahap>` = pagu total, `<tahap>__serap` = nilai paket terserap, `<tahap>__selisih` = pagu − serapan (belum terserap).
 */
export async function getNilaiPerTahun(f: Pick<Filter, "unit" | "kategori">) {
  const g = await prisma.paket.groupBy({
    by: ["tahun", "tahap", "serapan"],
    where: { ...(f.unit ? { unitKerja: { nama: f.unit } } : {}), ...(f.kategori ? { kategori: f.kategori } : {}) },
    _sum: { nilai: true },
    orderBy: [{ tahun: "asc" }],
  });
  const tahapKeys = TAHAP_URUT.filter((t) => g.some((x) => x.tahap === t));
  const rows = new Map<number, Record<string, number | string>>();
  for (const x of g) {
    const r = rows.get(x.tahun) ?? { tahun: String(x.tahun) };
    const v = x._sum.nilai ?? 0;
    r[x.tahap] = Number(r[x.tahap] ?? 0) + v;
    if (x.serapan) r[`${x.tahap}__serap`] = Number(r[`${x.tahap}__serap`] ?? 0) + v;
    rows.set(x.tahun, r);
  }
  for (const r of rows.values()) {
    for (const t of tahapKeys) {
      if (r[t] == null) continue;
      r[`${t}__serap`] = Number(r[`${t}__serap`] ?? 0);
      r[`${t}__selisih`] = Number(r[t]) - Number(r[`${t}__serap`]);
    }
  }
  return { data: [...rows.values()], tahapKeys: [...tahapKeys] };
}

/**
 * `hanyaFinal` = saat "Semua Tahapan", ambil paket dari pagu final saja (untuk peringkat/total, bukan daftar lengkap).
 * `dokumen` = sertakan status dokumen pendukung tiap paket.
 */
export type PaketQuery = { filter: Filter; q?: string; status?: string; page?: number; pageSize?: number; urut?: KolomUrut; arah?: Arah; hanyaFinal?: boolean; dokumen?: boolean };

export async function getPaketList({ filter, q, status, page = 1, pageSize = 25, urut = "nilai", arah = "desc", hanyaFinal = false, dokumen = false }: PaketQuery) {
  const where = {
    ...(hanyaFinal ? whereNilai(filter) : whereFilter(filter)),
    ...(status === "terserap" ? { serapan: true } : status === "direncanakan" ? { serapan: false } : {}),
    ...(q
      ? { OR: [{ namaPaket: { contains: q } }, { uraian: { contains: q } }, { namaRekening: { contains: q } }, { kode: { contains: q } }, { lokasiAsli: { contains: q } }] }
      : {}),
  };
  const skip = (page - 1) * pageSize;
  let total: number;
  let rows: Awaited<ReturnType<typeof ambilHalaman>>;
  async function ambilHalaman(args: { where: Prisma.PaketWhereInput; skip?: number; take?: number; orderBy?: Prisma.PaketOrderByWithRelationInput[] }) {
    return prisma.paket.findMany({ ...args, include: { unitKerja: { select: { nama: true } } } });
  }
  if (urut === "nilai" || urut === "serapan") {
    [total, rows] = await Promise.all([prisma.paket.count({ where }), ambilHalaman({ where, orderBy: urutanPrisma(urut, arah), skip, take: pageSize })]);
  } else {
    // SQLite mengurutkan teks secara biner (peka kapital, "32" < "7"); urutkan kunci ringan di sini lalu ambil satu halaman.
    const semua = await prisma.paket.findMany({ where, select: { id: true, kode: true, namaPaket: true, kategori: true, nilai: true, unitKerja: { select: { nama: true } } } });
    const kunci = (p: (typeof semua)[number]) => (urut === "kode" ? p.kode : urut === "nama" ? p.namaPaket : urut === "unit" ? p.unitKerja.nama : p.kategori);
    const arahKali = arah === "asc" ? 1 : -1;
    semua.sort((a, b) => kolator.compare(kunci(a), kunci(b)) * arahKali || b.nilai - a.nilai);
    const ids = semua.slice(skip, skip + pageSize).map((p) => p.id);
    const urutan = new Map(ids.map((id, i) => [id, i]));
    total = semua.length;
    rows = (await ambilHalaman({ where: { id: { in: ids } } })).sort((a, b) => (urutan.get(a.id) ?? 0) - (urutan.get(b.id) ?? 0));
  }
  const data: PaketRow[] = rows.map((p) => ({
    kode: p.kode, namaPaket: p.namaPaket, unit: p.unitKerja.nama, kategori: p.kategori, nilai: p.nilai, serapan: p.serapan,
    tahun: p.tahun, tahap: p.tahap, jenis: p.jenis, prioritas: p.prioritas,
  }));
  if (dokumen) {
    const status = await getStatusDokumen(data.map((d) => d.kode));
    for (const d of data) d.dokumen = status.get(d.kode) ?? {};
  }
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

/**
 * Perbandingan per tahap pada tahun terpilih (unit/kategori ikut filter): nilai, jumlah paket, terserap,
 * dan selisih terhadap tahap sebelumnya. Dipakai saat "Semua Tahapan".
 */
export async function getPerbandinganTahap(f: Filter) {
  const where = { tahun: f.tahun, ...(f.unit ? { unitKerja: { nama: f.unit } } : {}), ...(f.kategori ? { kategori: f.kategori } : {}) };
  const [g, t] = await Promise.all([
    prisma.paket.groupBy({ by: ["tahap"], where, _sum: { nilai: true }, _count: { _all: true } }),
    prisma.paket.groupBy({ by: ["tahap"], where: { ...where, serapan: true }, _sum: { nilai: true } }),
  ]);
  const terserap = new Map(t.map((x) => [x.tahap, x._sum.nilai ?? 0]));
  const urut = g.sort((a, b) => TAHAP_URUT.indexOf(a.tahap as never) - TAHAP_URUT.indexOf(b.tahap as never));
  return urut.map((x, i) => {
    const nilai = x._sum.nilai ?? 0;
    const sebelumnya = i > 0 ? urut[i - 1]._sum.nilai ?? 0 : null;
    return { tahap: x.tahap, nilai, paket: x._count._all, terserap: terserap.get(x.tahap) ?? 0, selisih: sebelumnya === null ? null : nilai - sebelumnya, final: i === urut.length - 1 };
  });
}

/** Daftar dataset yang bisa diunduh: satu per (tahun, tahap). `unit` = hanya baris unit itu. */
export async function getDatasets(unit?: string | null) {
  const g = await prisma.paket.groupBy({
    by: ["tahun", "tahap"], where: unit ? { unitKerja: { nama: unit } } : {}, _count: { _all: true }, _sum: { nilai: true }, _max: { updatedAt: true }, orderBy: [{ tahun: "desc" }],
  });
  return g
    .sort((a, b) => b.tahun - a.tahun || TAHAP_URUT.indexOf(b.tahap as never) - TAHAP_URUT.indexOf(a.tahap as never))
    .map((x) => ({ tahun: x.tahun, tahap: x.tahap, baris: x._count._all, nilai: x._sum.nilai ?? 0, diperbarui: x._max.updatedAt }));
}

export async function getUnitKerjaRows(unit?: string | null) {
  const units = await prisma.unitKerja.findMany({ where: unit ? { nama: unit } : {}, orderBy: { urut: "asc" }, include: { _count: { select: { paket: true } } } });
  return units.map((u) => ({ no: u.urut + 1, nama_unit_kerja: u.nama, jumlah_paket_tercatat: u._count.paket }));
}
