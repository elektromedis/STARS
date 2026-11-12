import { prisma } from "./prisma";
import { SEMUA_TAHAP } from "./tahap";
import { unitTerkunci } from "./akses";

export { SEMUA_TAHAP, labelTahap, labelFilter, labelNilai } from "./tahap";

/** Urutan tahap anggaran dari paling awal ke paling akhir. */
export const TAHAP_URUT = ["Ranwal", "Penetapan", "Pergeseran", "Perubahan", "Perubahan II"] as const;

export type SearchParams = Record<string, string | string[] | undefined>;
export type Filter = {
  tahun: number; tahap: string; unit: string | null; kategori: string | null;
  /** Tahap terakhir pada tahun terpilih (pagu final), dipakai saat tahap = "semua". */
  tahapFinal?: string;
  /** true bila unit dikunci oleh akun Viewer ber-unit (tidak bisa diganti di filter). */
  unitTerkunci?: boolean;
};
export type FilterOptions = {
  tahunTahap: { tahun: number; tahap: string[] }[];
  units: string[];
  kategori: string[];
};

export const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const byTahap = (a: string, b: string) => TAHAP_URUT.indexOf(a as never) - TAHAP_URUT.indexOf(b as never);

export function tahapTerakhir(list: string[]) {
  return [...list].sort(byTahap).at(-1) ?? "";
}

/** Pilihan filter yang tersedia di basis data (tahun → tahap, unit kerja, kategori). `unit` = batasi ke satu unit. */
export async function getFilterOptions(unit?: string | null): Promise<FilterOptions> {
  const w = unit ? { unitKerja: { nama: unit } } : {};
  const [tt, units, kat] = await Promise.all([
    prisma.paket.groupBy({ by: ["tahun", "tahap"], where: w, orderBy: [{ tahun: "desc" }] }),
    prisma.unitKerja.findMany({ where: unit ? { nama: unit } : {}, orderBy: { urut: "asc" }, select: { nama: true } }),
    prisma.paket.groupBy({ by: ["kategori"], where: w, orderBy: { kategori: "asc" } }),
  ]);
  const map = new Map<number, string[]>();
  for (const r of tt) map.set(r.tahun, [...(map.get(r.tahun) ?? []), r.tahap]);
  const tahunTahap = [...map.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([tahun, tahap]) => ({ tahun, tahap: tahap.sort(byTahap) }));
  return { tahunTahap, units: units.map((u) => u.nama), kategori: kat.map((k) => k.kategori) };
}

/**
 * Menerjemahkan query string (?tahun=&tahap=&unit=&kategori=) menjadi filter yang valid.
 * Default: tahun anggaran berjalan (bila ada datanya), tahap paling akhir pada tahun itu.
 * Akun Viewer ber-unit selalu dikunci ke unitnya sendiri (lihat lib/akses.ts).
 */
export async function resolveFilter(sp: SearchParams, opts?: FilterOptions): Promise<{ filter: Filter; options: FilterOptions }> {
  const kunci = await unitTerkunci();
  const options = opts ?? (await getFilterOptions(kunci?.nama));
  const tahunReq = Number(first(sp.tahun));
  const tahunIni = new Date().getFullYear();
  const tahunRow =
    options.tahunTahap.find((t) => t.tahun === tahunReq) ??
    options.tahunTahap.find((t) => t.tahun === tahunIni) ??
    options.tahunTahap[0];
  const tahun = tahunRow?.tahun ?? tahunIni;
  const tahapReq = first(sp.tahap);
  const tahap =
    tahunRow && tahapReq === SEMUA_TAHAP ? SEMUA_TAHAP
    : tahunRow && tahapReq && tahunRow.tahap.includes(tahapReq) ? tahapReq
    : tahapTerakhir(tahunRow?.tahap ?? []);
  const unitReq = first(sp.unit);
  const unit = kunci ? kunci.nama : unitReq && options.units.includes(unitReq) ? unitReq : null;
  const katReq = first(sp.kategori);
  const kategori = katReq && options.kategori.includes(katReq) ? katReq : null;
  const tahapFinal = tahapTerakhir(tahunRow?.tahap ?? []);
  return { filter: { tahun, tahap, unit, kategori, tahapFinal, ...(kunci ? { unitTerkunci: true } : {}) }, options };
}

/** Klausa `where` Prisma dari filter. Tahap "semua" = tanpa batasan tahap (semua tahap pada tahun itu dijumlahkan). */
export function whereFilter(f: Filter) {
  return {
    tahun: f.tahun,
    ...(f.tahap === SEMUA_TAHAP ? {} : { tahap: f.tahap }),
    ...(f.unit ? { unitKerja: { nama: f.unit } } : {}),
    ...(f.kategori ? { kategori: f.kategori } : {}),
  };
}

/**
 * Klausa `where` untuk ANGKA TOTAL (ringkasan, grafik, rekap). Saat "Semua Tahapan" hanya memakai
 * tahap terakhir (pagu final) agar paket yang sama di beberapa tahap tidak terhitung berulang.
 */
export function whereNilai(f: Filter) {
  const tahap = f.tahap === SEMUA_TAHAP ? f.tahapFinal ?? "" : f.tahap;
  return { ...whereFilter(f), tahap };
}

/** Query string dari filter, untuk tautan antarhalaman. */
export function filterToQuery(f: Partial<Filter>, extra: Record<string, string | undefined> = {}) {
  const p = new URLSearchParams();
  if (f.tahun) p.set("tahun", String(f.tahun));
  if (f.tahap) p.set("tahap", f.tahap);
  if (f.unit) p.set("unit", f.unit);
  if (f.kategori) p.set("kategori", f.kategori);
  for (const [k, v] of Object.entries(extra)) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : "";
}
