import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { LogoAnimasi } from "@/components/layout/logo-animasi";
import { StatusSinkron } from "@/components/layout/status-sinkron";
import { DiagramSiklus } from "@/components/allies/diagram-siklus";
import type { IdTahap } from "@/lib/allies-siklus";
import { cn, formatNumber } from "@/lib/utils";

/**
 * Beranda bergaya "panggung produk": panel lebar dengan judul besar di tengah, subjudul, dua tombol pil
 * ("Pelajari" berisi + "Buka ›" garis), visual di bawah, lalu kisi ubin 2 kolom. Panel terang/gelap bergantian.
 * Animasi: teks naik & memudar saat panel masuk layar, visual membesar halus (scroll-driven CSS, lihat globals.css).
 */

export type DataPanggung = {
  pagu: number; serapanPersen: number; paket: number;
  alat: number; laporanTerbuka: number; woAktif: number; cakupanKal: number;
  titikPantau: number; alarm: number;
  produkHta: number; jenisHta: number;
  kandidat: number; perTahap: Record<IdTahap, number>;
};

function Pil({ href, children, varian = "isi", gelap = false }: { href: string; children: React.ReactNode; varian?: "isi" | "garis"; gelap?: boolean }) {
  return (
    <Link href={href} className={cn(
      "inline-flex items-center gap-1 rounded-full px-5 py-2 text-[15px] font-medium transition-colors duration-200",
      varian === "isi" ? "bg-teal-600 text-white hover:bg-teal-700" : gelap ? "text-teal-300 ring-1 ring-inset ring-teal-300 hover:bg-teal-300 hover:text-navy-950" : "text-teal-700 ring-1 ring-inset ring-teal-600 hover:bg-teal-600 hover:text-white",
    )}>
      {children}{varian === "garis" && <ChevronRight className="size-4" aria-hidden />}
    </Link>
  );
}

function Teks({ judul, sub, gelap, kecil, utama, children }: { judul: React.ReactNode; sub: React.ReactNode; gelap?: boolean; kecil?: boolean; utama?: boolean; children?: React.ReactNode }) {
  const H = utama ? "h1" : "h2";
  return (
    <div className="panggung-teks relative z-10 px-6 text-center">
      <H className={cn("font-semibold tracking-tight", kecil ? "text-[32px] leading-tight md:text-[40px]" : "text-[40px] leading-[1.05] md:text-[56px]", gelap ? "text-white" : "text-[#1d1d1f]")}>{judul}</H>
      <p className={cn("mx-auto mt-2 max-w-xl", kecil ? "text-lg md:text-[21px]" : "text-xl md:text-[28px] md:leading-tight", gelap ? "text-white/85" : "text-[#1d1d1f]/80")}>{sub}</p>
      {children && <div className="mt-5 flex flex-wrap justify-center gap-3">{children}</div>}
    </div>
  );
}

function Angka({ nilai, label, gelap }: { nilai: string; label: string; gelap?: boolean }) {
  return (
    <div className="text-center">
      <p className={cn("text-4xl font-semibold tabular-nums tracking-tight md:text-5xl", gelap ? "text-white" : "text-[#1d1d1f]")}>{nilai}</p>
      <p className={cn("mt-1 text-sm", gelap ? "text-white/70" : "text-[#1d1d1f]/60")}>{label}</p>
    </div>
  );
}

const persen = (x: number) => `${x.toFixed(1).replace(".", ",")}%`;
const miliar = (x: number) => (x >= 1e9 ? `Rp ${(x / 1e9).toFixed(1).replace(".", ",")} M` : `Rp ${Math.round(x / 1e6).toLocaleString("id-ID")} jt`);

export function Panggung({ d }: { d: DataPanggung }) {
  return (
    <div className="panggung mb-10 grid gap-3">
      {/* 1. Hero terang */}
      <section aria-label="STARS" className="muncul relative overflow-hidden rounded-3xl bg-[#f5f5f7] pb-10 pt-12 md:pt-16">
        <div className="mb-4 flex justify-center"><StatusSinkron /></div>
        <div className="panggung-masuk">
          <Teks utama judul={<span className="text-[56px] md:text-[96px]">STARS</span>} sub="Seluruh siklus alat kesehatan RSUD Cipayung. Satu sistem.">
            <Pil href="#perencanaan">Lihat data</Pil>
            <Pil href="/allies" varian="garis">Tanya ALLIES</Pil>
          </Teks>
        </div>
        <div className="panggung-visual mx-auto mt-8 w-[min(640px,88%)]"><LogoAnimasi terang className="w-full" /></div>
      </section>

      {/* 2. ALLIES — panel gelap */}
      <section aria-label="ALLIES" className="muncul relative overflow-hidden rounded-3xl bg-black pb-8 pt-12 md:pt-14">
        <Teks gelap judul={<>ALLIES<span className="bg-gradient-to-r from-teal-300 to-[#a99bff] bg-clip-text text-transparent">.</span></>} sub="Agen alat medik. Dari analisa kebutuhan sampai penghapusan — lalu mulai lagi.">
          <Pil href="/allies#tanya">Tanya sekarang</Pil>
          <Pil href="/allies" varian="garis" gelap>Pelajari siklusnya</Pil>
        </Teks>
        <div className="panggung-visual mx-auto mt-6 w-[min(720px,94%)] rounded-2xl bg-white p-2"><DiagramSiklus jumlah={d.perTahap} /></div>
        <p className="mt-4 text-center text-sm text-white/70">{formatNumber(d.kandidat)} alat direkomendasikan untuk diganti atau dihapus.</p>
      </section>

      {/* 3. Kisi ubin */}
      <div className="grid gap-3 lg:grid-cols-2">
        <section aria-label="SI-ALKES" className="muncul flex min-h-[26rem] flex-col justify-between overflow-hidden rounded-3xl bg-[#f5f5f7] pb-10 pt-12">
          <Teks kecil judul="SI-ALKES" sub="Perencanaan-Pengadaan &amp; HTA. Pagu, serapan, dan selisih — setiap tahap anggaran.">
            <Pil href="/nilai">Lihat nilai</Pil><Pil href="/rkbu" varian="garis">Cetak RKBU</Pil>
          </Teks>
          <div className="panggung-visual mt-8 grid grid-cols-3 gap-2 px-6">
            <Angka nilai={miliar(d.pagu)} label="pagu" /><Angka nilai={persen(d.serapanPersen)} label="terserap" /><Angka nilai={formatNumber(d.paket)} label="paket" />
          </div>
        </section>

        <section aria-label="SI-FARMALKES" className="muncul flex min-h-[26rem] flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-b from-navy-900 to-navy-700 pb-10 pt-12">
          <Teks kecil gelap judul="SI-FARMALKES" sub="Pemeliharaan, pengujian & kalibrasi, dan lapor kerusakan.">
            <Pil href="/pemeliharaan">Buka</Pil><Pil href="/lapor" varian="garis" gelap>Lapor kerusakan</Pil>
          </Teks>
          <div className="panggung-visual mt-8 grid grid-cols-3 gap-2 px-6">
            <Angka gelap nilai={formatNumber(d.alat)} label="alat terdaftar" /><Angka gelap nilai={formatNumber(d.laporanTerbuka + d.woAktif)} label="pekerjaan berjalan" /><Angka gelap nilai={persen(d.cakupanKal * 100)} label="kalibrasi berlaku" />
          </div>
        </section>

        <section aria-label="SI-LOGGER" className="muncul flex min-h-[26rem] flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-b from-teal-50 to-[#f5f5f7] pb-10 pt-12">
          <Teks kecil judul="SI-LOGGER" sub="Suhu & kelembapan kulkas vaksin, darah, dan ruang alat. Real time.">
            <Pil href="/monitoring">Pantau</Pil><Pil href="/admin/monitoring" varian="garis">Atur sensor</Pil>
          </Teks>
          <div className="panggung-visual mt-8 flex items-end justify-center gap-10 px-6">
            <Angka nilai={formatNumber(d.titikPantau)} label="titik dipantau" />
            <div className="relative grid size-24 place-items-center" aria-hidden>
              <span className="absolute inset-0 animate-ping rounded-full bg-teal-400/30 motion-reduce:animate-none" />
              <span className="relative size-14 rounded-full bg-gradient-to-br from-teal-400 to-teal-700 shadow-lg" />
            </div>
            <Angka nilai={formatNumber(d.alarm)} label="alarm aktif" />
          </div>
        </section>

        <section aria-label="SI-TRACKING" className="muncul flex min-h-[26rem] flex-col justify-between overflow-hidden rounded-3xl bg-black pb-10 pt-12">
          <Teks kecil gelap judul="SI-TRACKING" sub="Sampai mana setiap pekerjaan. Dari laporan masuk sampai selesai.">
            <Pil href="/tracking">Lacak</Pil><Pil href="/riwayat" varian="garis" gelap>Laporan saya</Pil>
          </Teks>
          <ol className="panggung-visual mx-auto mt-8 flex w-[min(30rem,90%)] items-center" aria-hidden>
            {["Masuk", "Ditinjau", "Dikerjakan", "Selesai"].map((l, i) => (
              <li key={l} className="flex flex-1 items-center last:flex-none">
                <span className="flex flex-col items-center gap-1.5">
                  <span className="lacak-titik size-4 rounded-full bg-teal-400" style={{ animationDelay: `${i * 0.5}s` }} />
                  <span className="text-xs text-white/70">{l}</span>
                </span>
                {i < 3 && <span className="mx-1 mb-5 h-0.5 flex-1 bg-white/20"><span className="lacak-garis block h-full bg-teal-400" style={{ animationDelay: `${i * 0.5}s` }} /></span>}
              </li>
            ))}
          </ol>
        </section>

        <section aria-label="HTA" className="muncul flex min-h-[22rem] flex-col justify-between overflow-hidden rounded-3xl bg-[#f5f5f7] pb-10 pt-12">
          <Teks kecil judul="HTA" sub="Bandingkan merek & tipe sebelum membeli.">
            <Pil href="/hta">Bandingkan</Pil>
          </Teks>
          <div className="panggung-visual mt-6 grid grid-cols-2 gap-2 px-6"><Angka nilai={formatNumber(d.produkHta)} label="produk" /><Angka nilai={formatNumber(d.jenisHta)} label="jenis alat" /></div>
        </section>

        <section aria-label="Lapor Kerusakan" className="muncul flex min-h-[22rem] flex-col justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-teal-600 to-navy-800 py-12">
          <Teks kecil gelap judul="Alat bermasalah?" sub="Laporkan dalam satu menit — tanpa akun. Scan QR di alat untuk mengisi otomatis.">
            <Pil href="/lapor">Lapor kerusakan</Pil>
          </Teks>
        </section>
      </div>
    </div>
  );
}
