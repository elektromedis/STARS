import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, ShieldAlert, ShieldX } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { sidikDokumen } from "@/lib/tte";

export const metadata: Metadata = { title: "Verifikasi Tanda Tangan Elektronik" };
export const dynamic = "force-dynamic";

const waktu = (d: Date) => d.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).replace(/\./g, ":");

/** Halaman publik hasil scan QR TTE: siapa, kapan, dokumen apa, dan apakah isi dokumen masih sama. Tidak menampilkan keluhan/kontak. */
export default async function VerifikasiPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const token = String((await searchParams).t ?? "").slice(0, 60);
  const t = token ? await prisma.tandaTangan.findUnique({ where: { token } }) : null;
  const wr = t ? await prisma.permintaanKerja.findUnique({ where: { nomor: t.nomor }, select: { namaAlat: true, unitKerja: { select: { nama: true } }, perintah: { select: { nomor: true } } } }) : null;
  const pj = t?.nomor.startsWith("PJ-") ? await prisma.peminjaman.findUnique({ where: { nomor: t.nomor } }).then(async (p) => p ? { alat: (await prisma.alat.findUnique({ where: { id: p.alatId }, select: { nama: true } }))?.nama ?? "—" } : null) : null;
  const utuh = t ? (await sidikDokumen(t.nomor)) === t.hashIsi : false;
  return (
    <div className="mx-auto grid max-w-lg gap-4 rounded-2xl border bg-white/90 p-6 text-center shadow-card">
      {!t ? (
        <>
          <ShieldX className="mx-auto size-14 text-red-600" aria-hidden />
          <h1 className="text-xl font-bold text-navy-900">Tanda tangan tidak dikenal</h1>
          <p className="text-sm text-muted-foreground">Kode QR ini tidak terdaftar di STARS. Dokumen mungkin palsu atau kodenya rusak.</p>
        </>
      ) : (
        <>
          {utuh ? <BadgeCheck className="mx-auto size-14 text-emerald-600" aria-hidden /> : <ShieldAlert className="mx-auto size-14 text-amber-600" aria-hidden />}
          <h1 className="text-xl font-bold text-navy-900">{utuh ? "Tanda tangan elektronik SAH" : "Tanda tangan terdaftar, tetapi isi dokumen sudah berubah"}</h1>
          <dl className="grid gap-2 text-left text-sm">
            {[
              ["Dokumen", `${t.dokumen} ${t.nomor}`],
              ["Alat", wr ? `${wr.namaAlat}${wr.unitKerja ? ` · ${wr.unitKerja.nama}` : ""}` : pj ? pj.alat : "—"],
              ["Perintah kerja", wr?.perintah?.nomor ?? "—"],
              ["Ditandatangani sebagai", ({ Teknisi: "Teknisi penyelesai perbaikan", Pelapor: "Pelapor — menyetujui hasil perbaikan", Pemberi: "Unit pemilik — menyetujui peminjaman", Penerima: "Peminjam — menerima alat", Pengembalian: "Unit pemilik — menerima kembali alat", KepalaRuangan: "Kepala Ruangan / PJ Unit", PjAlkes: "Penanggung Jawab Alat Kesehatan / verifikator", PengurusBarang: "Pengurus Barang", Direktur: "Direktur RSUD" } as Record<string, string>)[t.peran] ?? t.peran],
              ["Nama", t.nama],
              ["Identitas", t.identitas ?? "—"],
              ["Waktu", `${waktu(t.waktu)} WIB`],
              ["Sidik dokumen (SHA-256)", `${t.hashIsi.slice(0, 16)}…`],
            ].map(([k, v]) => <div key={k} className="grid grid-cols-[10rem_1fr] gap-2 border-b pb-1.5"><dt className="text-muted-foreground">{k}</dt><dd className="break-words font-medium text-navy-800">{v}</dd></div>)}
          </dl>
          {!utuh && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Data laporan atau perintah kerja telah diubah setelah tanda tangan dibuat. Minta dokumen PDF terbaru kepada Instalasi Elektromedik.</p>}
        </>
      )}
      <Link href="/" className="text-sm font-medium text-teal-700 hover:underline">STARS — RSUD Cipayung</Link>
    </div>
  );
}
