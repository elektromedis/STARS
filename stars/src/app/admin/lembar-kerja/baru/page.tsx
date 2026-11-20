import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { sesiHalaman } from "@/lib/sesi";
import { cocokkanTemplate } from "@/lib/lembar-kerja";
import { FormulirLK } from "../formulir";
import { alatUntukLK, isiDariTemplate } from "../data";

export const metadata: Metadata = { title: "Isi Lembar Kerja" };
export const dynamic = "force-dynamic";

export default async function BaruLK({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const se = await sesiHalaman("Operator");
  const sp = await searchParams;
  const kegiatan = sp.kegiatan === "Preventif" ? "Preventif" : "Inspeksi";
  const alat = await alatUntukLK({ kode: (sp.alat ?? "").trim() });
  const kembali = <Link href={`/admin/lembar-kerja?kegiatan=${kegiatan}`} className="flex items-center gap-1 text-sm text-teal-800 hover:underline"><ArrowLeft className="size-4" /> Daftar lembar kerja</Link>;
  if (!alat) return <div className="grid gap-3">{kembali}<p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">Alat dengan kode &quot;{sp.alat}&quot; tidak ditemukan di inventaris.</p></div>;
  const semua = await prisma.templateLembarKerja.findMany({ where: { aktif: true }, orderBy: { nama: "asc" }, select: { id: true, nama: true, lengkap: true } });
  const t = sp.template ? await prisma.templateLembarKerja.findUnique({ where: { id: Number(sp.template) || 0 } }) : await cocokkanTemplate(alat.nama);
  const pakai = t ?? (await prisma.templateLembarKerja.findFirst({ where: { nama: "Bed Side Monitor" } }))!;
  return (
    <div className="grid gap-4">
      {kembali}
      {sp.error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{sp.error}</p>}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-xl font-bold text-navy-900">Lembar Kerja {kegiatan === "Inspeksi" ? "Pemantauan Fungsi / Inspeksi" : "Pemeliharaan Preventif"}</h1>
          <p className="text-sm text-muted-foreground">{alat.nama} · {alat.kode} — template <b>{pakai.nama}</b>{pakai.halaman ? ` (Pedoman Kemenkes 2021 hal. ${pakai.halaman})` : ""}{!t && " — tidak ada yang cocok, pilih template yang sesuai"}{!pakai.lengkap && " · butir masih umum, sesuaikan di CMS Template"}</p></div>
        <form className="flex gap-1"><input type="hidden" name="kegiatan" value={kegiatan} /><input type="hidden" name="alat" value={alat.kode} />
          <select name="template" defaultValue={pakai.id} aria-label="Template jenis alat" className="h-9 max-w-64 rounded-md border px-2 text-sm">{semua.map((x) => <option key={x.id} value={x.id}>{x.nama}{x.lengkap ? " ✓" : ""}</option>)}</select>
          <button className="h-9 rounded-md border px-3 text-sm">Ganti</button></form>
      </div>
      <FormulirLK alat={alat} pemeriksa={se.user.name || se.user.email || "Teknisi"} v={{ kegiatan, tipeInspeksi: "Terjadwal", tanggal: new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" }), hasil: "", perhatian: "", catatan: "", template: pakai.nama, isi: isiDariTemplate(pakai) }} />
    </div>
  );
}
