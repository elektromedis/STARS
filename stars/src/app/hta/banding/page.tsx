import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Scale } from "lucide-react";
import { auth } from "@/auth";
import { sesiHalaman } from "@/lib/sesi";
import { unitTerkunci } from "@/lib/akses";
import { cukup } from "@/lib/peran";
import { muatSubjek } from "@/lib/hta";
import { formProduk, saranParameter } from "@/lib/hta-form";
import { MAKS_BANDING } from "@/lib/hta-banding";
import { BandingHta } from "@/components/hta/banding-hta";
import { PilihBanding } from "@/components/hta/cari-produk";
import type { ProdukForm } from "@/components/hta/editor-produk";

export const dynamic = "force-dynamic";
type SP = Promise<Record<string, string | string[] | undefined>>;
const ambilId = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []).filter((x) => /^h[0-9a-f]{12}$/.test(x)).slice(0, MAKS_BANDING);

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const kunci = await unitTerkunci();
  const s = await muatSubjek(ambilId((await searchParams).id), kunci?.id).catch(() => []);
  return { title: s.length ? `${s.map((x) => x.judul).join(" vs ")} — HTA` : "Bandingkan — HTA" };
}

export default async function BandingPage({ searchParams }: { searchParams: SP }) {
  await sesiHalaman("Viewer");
  const sesi = await auth();
  const kunci = await unitTerkunci();
  const ids = ambilId((await searchParams).id);
  const subjek = await muatSubjek(ids, kunci?.id);
  const bolehKelola = cukup(sesi?.user?.peran, "Operator") && process.env.STARS_MODE !== "internet";
  const [forms, parameter] = await Promise.all([formProduk(subjek.map((s) => s.produkId).filter((x): x is number => x !== null)), bolehKelola ? saranParameter() : Promise.resolve([])]);
  const form: Record<string, ProdukForm> = {};
  for (const s of subjek) if (s.produkId && forms.has(s.produkId)) form[s.id] = forms.get(s.produkId)!;

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-teal-700"><Scale className="size-4" aria-hidden /> HTA — Bandingkan alat kesehatan</p>
        <Link href="/hta" className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:underline print:hidden"><ArrowLeft className="size-4" /> Semua jenis alat</Link>
      </div>
      {subjek.length === 0 ? (
        <div className="rounded-2xl border bg-card p-6 shadow-card">
          <h1 className="mb-1 text-xl font-bold text-navy-800">Pilih produk untuk dibandingkan</h1>
          <p className="mb-4 text-sm text-muted-foreground">{ids.length ? "Produk pada tautan ini tidak ditemukan (mungkin sudah dihapus atau di luar unit Anda)." : "Belum ada produk dipilih."}</p>
          <PilihBanding autoFocus />
        </div>
      ) : (
        <>
          <h1 className="sr-only">{subjek.map((s) => s.judul).join(" vs ")}</h1>
          <BandingHta key={subjek.map((s) => s.id).join("-")} subjek={subjek} form={form} bolehKelola={bolehKelola} saranParameter={parameter} />
        </>
      )}
    </>
  );
}
