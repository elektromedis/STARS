import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { labelFilter, resolveFilter, type SearchParams } from "@/lib/filter";
import { barisDataset } from "@/lib/dataset";
import { JUDUL } from "@/lib/dataset-judul";
import { TombolBagikan } from "@/components/dashboard/tombol-bagikan";
import { formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Lihat Dokumen" };
export const dynamic = "force-dynamic";

const BATAS = 500;
const judulKolom = (k: string) => k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const tampil = (v: unknown) => (typeof v === "number" ? formatNumber(v) : String(v ?? ""));

/** Tampilan dokumen di browser sebelum diunduh/dibagikan (.pdf, .xlsx, .docx, .pptx). */
export default async function LihatDokumen({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<SearchParams> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const { filter } = await resolveFilter(sp);
  const ds = await barisDataset(slug, filter);
  if (!ds) notFound();
  const q = new URLSearchParams(Object.entries(sp).filter(([k, v]) => k !== "format" && typeof v === "string") as [string, string][]).toString();
  const sumber = `/api/dataset/${slug}${q ? `?${q}` : ""}`;
  const kunci = Object.keys(ds.baris[0] ?? {});
  const judul = JUDUL[slug] ?? slug;
  return (
    <div className="grid gap-4">
      <div className="relative z-30 flex flex-wrap items-start justify-between gap-3 print:hidden">
        <Link href="/data" className="inline-flex items-center gap-1 text-sm text-teal-700 hover:underline"><ArrowLeft className="size-4" aria-hidden /> Kembali ke Data</Link>
        <TombolBagikan sumber={sumber} judul={judul} />
      </div>
      <article className="overflow-hidden rounded-2xl border bg-white text-slate-900 shadow-card">
        <header className="border-b bg-slate-50 px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">STARS · RSUD Cipayung</p>
          <h1 className="mt-1 text-xl font-bold text-navy-900 md:text-2xl">{judul}</h1>
          <p className="text-sm text-slate-600">{labelFilter(filter)}{filter.unit ? ` · ${filter.unit}` : ""} · {formatNumber(ds.baris.length)} baris</p>
        </header>
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full min-w-max border-collapse text-sm">
            <thead className="sticky top-0 z-[1] bg-teal-700 text-left text-white">
              <tr>{kunci.map((k) => <th key={k} scope="col" className="px-3 py-2 font-semibold">{judulKolom(k)}</th>)}</tr>
            </thead>
            <tbody>
              {ds.baris.slice(0, BATAS).map((b, i) => (
                <tr key={i} className="border-b border-slate-100 odd:bg-white even:bg-slate-50">
                  {kunci.map((k) => <td key={k} className={typeof b[k] === "number" ? "px-3 py-1.5 text-right tabular-nums" : "px-3 py-1.5"}>{tampil(b[k])}</td>)}
                </tr>
              ))}
              {!ds.baris.length && <tr><td className="px-3 py-6 text-center text-slate-500">Tidak ada data.</td></tr>}
            </tbody>
          </table>
        </div>
        {ds.baris.length > BATAS && <p className="border-t px-6 py-3 text-xs text-slate-600">Pratinjau menampilkan {BATAS} baris pertama. Berkas unduhan memuat seluruh {formatNumber(ds.baris.length)} baris.</p>}
      </article>
    </div>
  );
}
