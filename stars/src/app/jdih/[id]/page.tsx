import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, ExternalLink } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { namaPeraturan } from "@/lib/jdih";

export const dynamic = "force-dynamic";
const ambil = async (id: string) => prisma.peraturan.findFirst({ where: { id: Number(id) || 0, aktif: true } });

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const p = await ambil((await params).id);
  return { title: p ? namaPeraturan(p) : "JDIH" };
}

export default async function DetailPeraturan({ params }: { params: Promise<{ id: string }> }) {
  const p = await ambil((await params).id);
  if (!p) notFound();
  const baris: [string, string | number | null][] = [["Jenis", p.jenis], ["Nomor", p.nomor], ["Tahun", p.tahun], ["Tentang", p.judul], ["Pemrakarsa", p.pemrakarsa], ["Subjek", p.subjek], ["Status", p.status], ["Keterangan", p.keterangan]];
  return (
    <div className="grid gap-4">
      <Link href="/jdih" className="flex items-center gap-1 text-sm text-teal-800 hover:underline"><ArrowLeft className="size-4" aria-hidden /> Kembali ke JDIH</Link>
      <h1 className="text-2xl font-bold text-navy-900">{namaPeraturan(p)}</h1>
      <p className="-mt-2 text-slate-700">tentang {p.judul}</p>
      <dl className="grid overflow-hidden rounded-xl border bg-card text-sm sm:grid-cols-[12rem_1fr]">
        {baris.filter(([, v]) => v !== null && v !== "").map(([k, v]) => <div key={k} className="contents"><dt className="border-b bg-slate-50 px-4 py-2 font-medium">{k}</dt><dd className="border-b px-4 py-2">{v}</dd></div>)}
      </dl>
      <div className="flex flex-wrap gap-2">
        {p.berkas && <a href={`/api/jdih/${p.id}/berkas?unduh=1`} className="flex h-10 items-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white"><Download className="size-4" aria-hidden /> Unduh PDF</a>}
        {p.tautan && <a href={p.tautan} target="_blank" rel="noopener noreferrer" className="flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-semibold">{p.tautan.includes("bpk.go.id") ? "Buka di JDIH BPK" : "Buka sumber"} <ExternalLink className="size-4" aria-hidden /></a>}
      </div>
      {p.berkas && <iframe src={`/api/jdih/${p.id}/berkas`} title={`Dokumen ${namaPeraturan(p)}`} className="h-[80vh] w-full rounded-xl border" />}
    </div>
  );
}
