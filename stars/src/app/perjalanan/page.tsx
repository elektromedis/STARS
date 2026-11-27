import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, LogIn, Wrench } from "lucide-react";
import { AdeganPerjalanan, type Tahap } from "@/components/perjalanan/adegan";
import { angkaPerjalanan } from "@/lib/perjalanan";
import { formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Perjalanan Alat Kesehatan", description: "Dari penerimaan sampai penghapusan — perjalanan setiap alat kesehatan di RSUD Cipayung, tercatat di STARS." };
export const dynamic = "force-dynamic";

const pct = (a: number, b: number) => (b ? `${Math.round((100 * a) / b)}%` : "—");
const n = (x: number) => formatNumber(x);

/** Halaman publik: hanya angka ringkasan (agregat), tanpa data pribadi. */
export default async function PerjalananPage() {
  const a = await angkaPerjalanan();
  const tahap: Tahap[] = [
    { kode: "mulai", label: "Gedung", kicker: "STARS · RSUD Cipayung", judul: "Satu Alat.", sorot: "Satu Riwayat Utuh.",
      teks: "Ikuti perjalanan setiap alat kesehatan: diterima, dicatat, dirawat, diuji, diperbaiki, sampai direncanakan penggantiannya — semuanya di satu aplikasi.",
      kartu: { judul: "Saat ini dikelola", baris: [{ k: "Alat aktif", v: n(a.alat) }, { k: "Ruangan", v: n(a.ruangan) }, { k: "Unit kerja", v: n(a.unit) }] },
      href: "/lapor", tautan: "Lapor kerusakan alat" },
    { kode: "terima", label: "Penerimaan", kicker: "Tahap 1 · Penerimaan", judul: "Diterima,", sorot: "Diperiksa, Dicatat.",
      teks: "Alat baru diperiksa bersama rekanan: kontrak, BAST/BAP, uji fungsi, dan berkas pendukung disimpan sejak hari pertama.",
      kartu: { judul: "Penerimaan alat", baris: [{ k: "Total", v: n(a.penerimaan) }, { k: "Tahun ini", v: n(a.penerimaanTahunIni) }, { k: "Status", v: "Tercatat", nada: "baik" }] },
      href: "/login?callbackUrl=/admin/penerimaan", tautan: "Buka penerimaan" },
    { kode: "inventaris", label: "Inventarisasi", kicker: "Tahap 2 · Inventarisasi", judul: "Berlabel QR,", sorot: "Terlacak di Mana Saja.",
      teks: "Setiap alat mendapat kode inventaris dan label QR. Pindai untuk melihat detail, dokumen, riwayat lokasi, dan status terakhirnya.",
      kartu: { judul: "Inventaris alat", baris: [{ k: "Alat aktif", v: n(a.alat) }, { k: "Ber-kode ASPAK", v: pct(a.berAspak, a.alat) }, { k: "Terkategori", v: pct(a.berKategori, a.alat) }] },
      href: "/alat", tautan: "Cari alat" },
    { kode: "preventif", label: "Pemeliharaan", kicker: "Tahap 3 · Pemeliharaan preventif", judul: "Dirawat", sorot: "Sebelum Rusak.",
      teks: "Jadwal preventif berjalan otomatis. Teknisi mengisi lembar kerja dan checklist, lalu jadwal berikutnya terbentuk sendiri.",
      kartu: { judul: "Jadwal preventif aktif", baris: [{ k: "Jadwal", v: n(a.jadwal) }, { k: "Tepat waktu", v: pct(a.jadwalTepat, a.jadwal), nada: "baik" }, { k: "Terlewat", v: n(a.jadwalLewat), nada: a.jadwalLewat ? "waspada" : undefined }] },
      href: "/pemeliharaan", tautan: "Lihat pemeliharaan" },
    { kode: "kalibrasi", label: "Kalibrasi", kicker: "Tahap 4 · Pengujian & kalibrasi", judul: "Diuji, Dikalibrasi,", sorot: "Laik Pakai.",
      teks: "Hasil uji dan kalibrasi beserta masa berlakunya tercatat per alat, dengan pengingat sebelum kedaluwarsa.",
      kartu: { judul: "Kalibrasi terakhir per alat", baris: [{ k: "Laik & berlaku", v: n(a.kalibrasiLaik), nada: "baik" }, { k: "Dari", v: n(a.kalibrasiTotal) }, { k: "≤ 30 hari lagi", v: n(a.kalibrasiSegera), nada: a.kalibrasiSegera ? "waspada" : undefined }] },
      href: "/kalibrasi", tautan: "Lihat kalibrasi" },
    { kode: "lapor", label: "Lapor & Perbaikan", kicker: "Tahap 5 · Lapor kerusakan & perbaikan", judul: "Rusak?", sorot: "Lapor dari Ponsel.",
      teks: "Siapa pun bisa melapor tanpa akun — cukup pindai QR alat. Laporan menjadi perintah kerja, dan hasil perbaikan disahkan dengan TTE.",
      kartu: { judul: "Perbaikan", baris: [{ k: "Laporan bulan ini", v: n(a.laporanBulanIni) }, { k: "WO berjalan", v: n(a.woTerbuka), nada: a.woTerbuka ? "waspada" : undefined }, { k: "WO selesai", v: n(a.woSelesai), nada: "baik" }] },
      href: "/lapor", tautan: "Lapor kerusakan" },
    { kode: "rencana", label: "Perencanaan", kicker: "Tahap 6 · Perencanaan & penghapusan", judul: "Direncanakan", sorot: "Sampai Akhir Usia.",
      teks: "Usia teknis, depresiasi, dan kebutuhan kompetensi RS menjadi dasar usulan pengadaan dan penghapusan alat.",
      kartu: { judul: `Usulan pengadaan ${new Date().getFullYear()}+`, baris: [{ k: "Usulan", v: n(a.usulan) }, { k: "Disetujui", v: n(a.usulanSetuju), nada: "baik" }, { k: "Lewat usia teknis", v: n(a.tua), nada: a.tua ? "waspada" : undefined }], catatan: `${n(a.penghapusan)} pengajuan penghapusan tercatat.` },
      href: "/rkbu", tautan: "Lihat perencanaan" },
  ];
  return (
    <main id="main" className="min-h-screen bg-background">
      <a href="#ringkas" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded focus:bg-card focus:p-2">Lewati animasi</a>
      <header className="fixed inset-x-0 top-0 z-30 border-b border-black/5 bg-white/70 backdrop-blur dark:border-white/10 dark:bg-[#0b1220]/70">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-sm font-extrabold tracking-tight text-navy-800 dark:text-white"><span className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-navy-700 text-[11px] text-white">S</span>STARS<span className="hidden font-medium text-muted-foreground sm:inline">· RSUD Cipayung</span></Link>
          <nav className="flex items-center gap-1.5">
            <Link href="/lapor" className="hidden rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted sm:inline-flex">Lapor kerusakan</Link>
            <Link href="/" className="hidden rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted sm:inline-flex">Beranda</Link>
            <Link href="/login" className="inline-flex items-center gap-1.5 rounded-full bg-navy-800 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 dark:bg-teal-600"><LogIn className="size-3.5" /> Masuk</Link>
          </nav>
        </div>
      </header>
      <AdeganPerjalanan tahap={tahap} />
      <section id="ringkas" className="px-4 py-16 sm:px-6">
        <div className="mx-auto grid max-w-5xl items-center gap-8 overflow-hidden rounded-3xl bg-gradient-to-br from-navy-800 to-teal-800 p-8 text-white shadow-card md:grid-cols-[1.4fr_1fr] md:p-12">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-100">Siap membantu</p>
            <h2 className="mt-2 text-3xl font-extrabold leading-tight md:text-4xl">Alat bermasalah? Laporkan sekarang.</h2>
            <p className="mt-3 max-w-md text-sm text-navy-100">Tanpa akun, cukup tiga langkah. Anda mendapat nomor laporan dan kode lacak untuk memantau perbaikannya.</p>
          </div>
          <div className="flex flex-col gap-3">
            <Link href="/lapor" className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-navy-800 hover:bg-teal-50"><Wrench className="size-4" /> Lapor kerusakan <ArrowRight className="size-4" /></Link>
            <Link href="/login" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/40 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"><LogIn className="size-4" /> Masuk ke STARS</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
