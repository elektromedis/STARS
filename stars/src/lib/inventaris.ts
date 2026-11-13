/** Inventaris Alat Kesehatan (publik, menu Pemeliharaan): daftar alat aktif + status kalibrasi terbaru. */
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { statusKalibrasi, type StatusKalibrasi } from "./kalibrasi";

export const KOLOM_INVENTARIS = ["kode", "nama", "unit", "kondisi", "kalibrasi"] as const;
export type KolomInventaris = (typeof KOLOM_INVENTARIS)[number];
export const adalahKolomInventaris = (v: unknown): v is KolomInventaris => typeof v === "string" && (KOLOM_INVENTARIS as readonly string[]).includes(v);

export type BarisInventaris = {
  id: number; kode: string; nama: string; merek: string | null; model: string | null; nomorSeri: string | null; jenis: string; kondisi: string;
  unit: string; ruangan: string | null; kalibrasi: { tanggal: Date; berlakuSampai: Date | null; laik: boolean } | null; status: StatusKalibrasi;
};

export type OpsiInventaris = {
  kunci?: string | null; q?: string; unit?: string; jenis?: string; kondisi?: string; kal?: string;
  urut: KolomInventaris; arah: "asc" | "desc"; page: number; pageSize: number;
};

const URUT_KONDISI: Record<string, number> = { "Rusak Berat": 0, "Rusak Ringan": 1, Baik: 2, Afkir: 3 };
const kolasi = new Intl.Collator("id", { numeric: true, sensitivity: "base" });

export async function getInventaris(o: OpsiInventaris) {
  const unit = o.kunci ?? o.unit;
  const where: Prisma.AlatWhereInput = {
    aktif: true,
    ...(unit ? { unitKerja: { nama: unit } } : {}),
    ...(o.jenis ? { jenis: o.jenis } : {}),
    ...(o.kondisi ? { kondisi: o.kondisi } : {}),
    ...(o.q ? { OR: [{ nama: { contains: o.q } }, { kode: { contains: o.q } }, { merek: { contains: o.q } }, { model: { contains: o.q } }, { nomorSeri: { contains: o.q } }, { ruangan: { nama: { contains: o.q } } }] } : {}),
  };
  const mentah = await prisma.alat.findMany({
    where,
    select: {
      id: true, kode: true, nama: true, merek: true, model: true, nomorSeri: true, jenis: true, kondisi: true,
      unitKerja: { select: { nama: true, urut: true } }, ruangan: { select: { nama: true } },
      kalibrasi: { orderBy: [{ tanggal: "desc" }, { id: "desc" }], take: 1, select: { tanggal: true, berlakuSampai: true, laik: true } },
    },
  });
  const kini = Date.now();
  let rows = mentah.map((a) => {
    const k = a.kalibrasi[0] ?? null;
    return {
      id: a.id, kode: a.kode, nama: a.nama, merek: a.merek, model: a.model, nomorSeri: a.nomorSeri, jenis: a.jenis, kondisi: a.kondisi,
      unit: a.unitKerja.nama, urutUnit: a.unitKerja.urut, ruangan: a.ruangan?.nama ?? null, kalibrasi: k, status: statusKalibrasi(k, kini),
    };
  });
  if (o.kal) rows = rows.filter((r) => r.status.kunci === o.kal);

  const banding: Record<KolomInventaris, (a: (typeof rows)[number], b: (typeof rows)[number]) => number> = {
    kode: (a, b) => kolasi.compare(a.kode, b.kode),
    nama: (a, b) => kolasi.compare(a.nama, b.nama) || kolasi.compare(a.kode, b.kode),
    unit: (a, b) => a.urutUnit - b.urutUnit || kolasi.compare(a.unit, b.unit) || kolasi.compare(a.nama, b.nama),
    kondisi: (a, b) => (URUT_KONDISI[a.kondisi] ?? 9) - (URUT_KONDISI[b.kondisi] ?? 9) || kolasi.compare(a.nama, b.nama),
    // paling mendesak dulu: tidak laik/kedaluwarsa → segera habis → berlaku → tanpa batas → belum ada data
    kalibrasi: (a, b) => a.status.peringkat - b.status.peringkat || (a.kalibrasi?.berlakuSampai?.getTime() ?? Infinity) - (b.kalibrasi?.berlakuSampai?.getTime() ?? Infinity) || kolasi.compare(a.nama, b.nama),
  };
  const f = banding[o.urut];
  rows.sort((a, b) => (o.arah === "asc" ? f(a, b) : f(b, a)));

  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / o.pageSize));
  const page = Math.min(Math.max(1, o.page), pages);
  const data: BarisInventaris[] = rows.slice((page - 1) * o.pageSize, page * o.pageSize).map((r) => ({ id: r.id, kode: r.kode, nama: r.nama, merek: r.merek, model: r.model, nomorSeri: r.nomorSeri, jenis: r.jenis, kondisi: r.kondisi, unit: r.unit, ruangan: r.ruangan, kalibrasi: r.kalibrasi, status: r.status }));
  return { data, total, page, pages, pageSize: o.pageSize };
}

/** Pilihan unit untuk filter: unit yang punya alat aktif. */
export async function getUnitInventaris() {
  const rows = await prisma.unitKerja.findMany({ where: { alat: { some: { aktif: true } } }, orderBy: { urut: "asc" }, select: { nama: true, _count: { select: { alat: { where: { aktif: true } } } } } });
  return rows.map((r) => ({ nama: r.nama, jumlah: r._count.alat }));
}
