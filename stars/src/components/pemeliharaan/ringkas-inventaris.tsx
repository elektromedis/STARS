import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { KATEGORI_ALAT, KATEGORI_STOK } from "@/lib/kategori-inventaris";
import { formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";

/** Kategori inventaris: 3 kategori alat kesehatan (Daftar Alat) terpisah dari Sparepart & BHP-BMHP (Stok). */
export async function RingkasInventaris({ aktif, unit }: { aktif?: string; unit?: string | null }) {
  const u = unit ? { unitKerja: { nama: unit } } : {};
  const [alat, stok] = await Promise.all([
    prisma.alat.groupBy({ by: ["kategoriInventaris"], where: { aktif: true, ...u }, _count: { _all: true } }),
    prisma.barangStok.groupBy({ by: ["jenis"], where: { aktif: true }, _count: { _all: true } }),
  ]);
  const nA = (k: string | null) => alat.find((x) => x.kategoriInventaris === k)?._count._all ?? 0;
  const nS = (k: string) => stok.find((x) => x.jenis === k)?._count._all ?? 0;
  const kartu = (label: string, n: number, href: string, kunci: string, kelompok: string) => (
    <Link key={kunci} href={href} aria-current={aktif === kunci ? "true" : undefined}
      className={cn("grid min-w-40 flex-1 gap-0.5 rounded-xl border bg-card px-3 py-2 shadow-card transition-colors hover:border-teal-400", aktif === kunci && "border-teal-500 ring-1 ring-teal-400")}>
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{kelompok}</span>
      <span className="text-sm font-medium text-navy-800">{label}</span>
      <span className="text-xl font-bold tabular-nums text-navy-900">{formatNumber(n)}</span>
    </Link>
  );
  return (
    <section aria-label="Kategori inventaris" className="flex flex-wrap gap-2">
      {KATEGORI_ALAT.map((k) => kartu(k, nA(k), `/admin/alat?kat=${encodeURIComponent(k)}#daftar-alat`, k, "Alat kesehatan"))}
      {nA(null) > 0 && kartu("Belum dikategorikan", nA(null), "/admin/alat?kat=kosong#daftar-alat", "kosong", "Alat kesehatan")}
      {KATEGORI_STOK.map((k) => kartu(k, nS(k), `/admin/stok?jenis=${encodeURIComponent(k)}`, k, "Sparepart & BHP"))}
    </section>
  );
}

/** Peringatan nomor seri ganda (alat berbeda dengan nomor seri sama). */
export async function PeringatanSeriGanda({ unit }: { unit?: string | null }) {
  const ganda = await prisma.alat.groupBy({
    by: ["nomorSeri"], where: { nomorSeri: { not: null, notIn: ["", "-", "0", "N/A", "n/a", "NA", "Tidak ada", "tidak ada"] }, ...(unit ? { unitKerja: { nama: unit } } : {}) },
    _count: { _all: true }, having: { nomorSeri: { _count: { gt: 1 } } }, orderBy: { _count: { nomorSeri: "desc" } }, take: 50,
  });
  if (!ganda.length) return null;
  const total = ganda.reduce((a, g) => a + g._count._all, 0);
  return (
    <div role="alert" id="seri-ganda" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
      <p className="flex items-center gap-2 font-semibold"><AlertTriangle className="size-4 text-amber-600" aria-hidden /> {ganda.length}{ganda.length === 50 ? "+" : ""} nomor seri ganda ({total} alat) — kemungkinan data dobel atau salah ketik.</p>
      <p className="mt-1 flex flex-wrap gap-1.5">
        {ganda.slice(0, 20).map((g) => <Link key={g.nomorSeri} href={`/admin/alat?q=${encodeURIComponent(g.nomorSeri ?? "")}#daftar-alat`} className="rounded-full bg-white px-2 py-0.5 font-mono text-xs ring-1 ring-amber-300 hover:bg-amber-100">{g.nomorSeri} ×{g._count._all}</Link>)}
        {ganda.length > 20 && <span className="text-xs">… dan {ganda.length - 20} lainnya</span>}
      </p>
    </div>
  );
}
