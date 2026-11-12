import type { Metadata } from "next";
import { Wrench } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { LaporForm, type AlatQr } from "./lapor-form";

export const metadata: Metadata = { title: "Lapor Kerusakan Alat" };
export const dynamic = "force-dynamic";

type Sp = { alat?: string; aspak?: string };

/**
 * Isian otomatis dari scan QR:
 *  ?alat=<kode>  → QR/teks berisi kode inventaris, no seri, atau no urut aset alat STARS.
 *  ?aspak=<kode> → QR lama Trilux (JSON "codenom" = kode jenis alat ASPAK); bisa cocok ke beberapa alat sejenis.
 */
async function cariAlat(sp: Sp): Promise<{ kandidat: AlatQr[]; pesan: string | null }> {
  const pilih = { id: true, nama: true, merek: true, unitKerjaId: true, lokasi: true, unitKerja: { select: { nama: true } }, ruangan: { select: { nama: true } } } as const;
  const keQr = (a: { id: number; nama: string; merek: string | null; unitKerjaId: number; lokasi: string | null; unitKerja: { nama: string }; ruangan: { nama: string } | null }): AlatQr => ({
    id: a.id, nama: a.merek ? `${a.nama} (${a.merek})` : a.nama, unitKerjaId: a.unitKerjaId, unit: a.unitKerja.nama, lokasi: a.ruangan?.nama ?? a.lokasi,
  });
  const kode = sp.alat?.trim().slice(0, 120);
  if (kode) {
    const a = await prisma.alat.findFirst({ where: { aktif: true, OR: [{ kode }, { nomorSeri: kode }, { noUrutAset: kode }] }, select: pilih });
    return a ? { kandidat: [keQr(a)], pesan: `Alat dari QR: ${a.nama}. Data alat sudah terisi — lengkapi keluhannya.` }
      : { kandidat: [], pesan: `QR berisi "${kode}", tetapi tidak cocok dengan alat terdaftar. Silakan isi formulir secara manual.` };
  }
  const aspak = sp.aspak?.trim().slice(0, 40);
  if (aspak) {
    const daftar = await prisma.alat.findMany({ where: { aktif: true, kodeAspak: aspak }, select: pilih, orderBy: [{ unitKerja: { urut: "asc" } }, { nama: "asc" }], take: 100 });
    if (daftar.length === 0) return { kandidat: [], pesan: `QR Trilux (kode alat ${aspak}) belum cocok dengan Daftar Alat STARS. Silakan isi formulir secara manual.` };
    return { kandidat: daftar.map(keQr), pesan: daftar.length === 1 ? `Alat dari QR Trilux: ${daftar[0].nama}. Data alat sudah terisi.` : `QR Trilux menunjuk jenis alat ${daftar[0].nama} — ada ${daftar.length} unit terdaftar, pilih yang dimaksud.` };
  }
  return { kandidat: [], pesan: null };
}

export default async function LaporPage({ searchParams }: { searchParams: Promise<Sp> }) {
  const [units, qr] = await Promise.all([
    prisma.unitKerja.findMany({ where: { NOT: { nama: "TIDAK ADA" } }, orderBy: { urut: "asc" }, select: { id: true, nama: true } }),
    searchParams.then(cariAlat),
  ]);
  return (
    <div className="mx-auto max-w-3xl">
      <section className="mb-6 flex items-start gap-4 rounded-2xl bg-gradient-to-br from-navy-800 to-teal-800 p-6 text-white shadow-card">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white/15"><Wrench className="size-6" aria-hidden /></div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-100">RSUD Cipayung</p>
          <h1 className="text-2xl font-bold">Lapor Kerusakan Alat</h1>
          <p className="mt-1 text-sm text-navy-100">Laporkan alat kesehatan atau sarana yang rusak/bermasalah. Tidak perlu akun — cukup isi formulir di bawah, atau scan QR pada alat.</p>
        </div>
      </section>
      <LaporForm units={units} kandidat={qr.kandidat} pesanQr={qr.pesan} />
    </div>
  );
}
