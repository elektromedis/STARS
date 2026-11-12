import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldX } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { sesiHalaman } from "@/lib/sesi";
import { cukup } from "@/lib/peran";
import { unitTerkunci } from "@/lib/akses";
import { JENIS_DOKUMEN } from "@/lib/dokumen";
import { SlotDokumen } from "@/components/admin/slot-dokumen";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRupiah } from "@/lib/utils";

export const metadata: Metadata = { title: "Kelola Dokumen Paket" };
export const dynamic = "force-dynamic";

export default async function KelolaDokumenPage({ params }: { params: Promise<{ kode: string }> }) {
  const s = await sesiHalaman("Viewer");
  const kode = decodeURIComponent((await params).kode);
  const paket = await prisma.paket.findUnique({ where: { kode }, include: { unitKerja: { select: { nama: true } } } });
  if (!paket) notFound();
  const kunci = await unitTerkunci();
  if (kunci && paket.unitKerja.nama !== kunci.nama) {
    return <p className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"><ShieldX className="size-4" /> Paket ini bukan milik unit kerja Anda ({kunci.nama}).</p>;
  }
  const docs = await prisma.dokumenPaket.findMany({ where: { paketKode: kode }, orderBy: { createdAt: "desc" } });
  const bolehKelola = cukup(s.user.peran, "Operator") && process.env.STARS_MODE !== "internet"
    && (!s.user.unitKerja || cukup(s.user.peran, "Admin") || s.user.unitKerja === paket.unitKerja.nama);

  return (
    <div className="grid gap-4">
      <Link href="/admin/dokumen" className="inline-flex w-fit items-center gap-1 text-sm font-medium text-teal-700 hover:underline"><ArrowLeft className="size-4" /> Kembali ke daftar dokumen</Link>
      <Card>
        <CardHeader><CardTitle className="leading-snug">{paket.namaPaket}</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
          <span>Kode <strong className="font-mono text-foreground">{paket.kode}</strong></span>
          <span>{paket.tahap} {paket.tahun}</span>
          <span>Unit <strong className="text-foreground">{paket.unitKerja.nama}</strong></span>
          <span>{paket.kategori}</span>
          <span>Nilai <strong className="text-foreground">{formatRupiah(paket.nilai)}</strong></span>
          <Badge variant={paket.serapan ? "success" : "teal"}>{paket.serapan ? "Terserap" : "Direncanakan"}</Badge>
        </CardContent>
      </Card>
      {!bolehKelola && <p className="rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm text-teal-900">Akun Anda hanya dapat melihat dokumen. Mengunggah/menghapus memerlukan peran Operator{s.user.unitKerja ? ` unit ${paket.unitKerja.nama}` : ""}.</p>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {JENIS_DOKUMEN.map((j) => (
          <SlotDokumen key={j.kode} paketKode={paket.kode} jenis={j.kode} label={j.label} bolehKelola={bolehKelola}
            dokumen={docs.filter((d) => d.jenis === j.kode).map((d) => ({ id: d.id, namaBerkas: d.namaBerkas, ukuran: d.ukuran, nomor: d.nomor, tanggal: d.tanggal?.toISOString() ?? null, keterangan: d.keterangan, diunggahOleh: d.diunggahOleh, createdAt: d.createdAt.toISOString() }))} />
        ))}
      </div>
    </div>
  );
}
