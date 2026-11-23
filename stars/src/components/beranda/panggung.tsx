import Link from "next/link";
import { ChevronRight, Glasses } from "lucide-react";
import { LogoTegak } from "@/components/layout/logo-animasi";
import { StatusSinkron } from "@/components/layout/status-sinkron";
import { GulirHalus } from "@/components/beranda/gulir-halus";
import { KaryawanPublik } from "@/components/beranda/karyawan-publik";
import { RobotAllies } from "@/components/beranda/robot-allies";
import { SlideshowHero } from "@/components/beranda/slideshow-hero";
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

function JudulHero({ judul, sub, gelap, utama, children }: { judul: React.ReactNode; sub: React.ReactNode; gelap?: boolean; utama?: boolean; children: React.ReactNode }) {
  const H = utama ? "h1" : "h2";
  return (
    <div className="shrink-0 text-center">
      <H className={cn("text-[34px] font-semibold leading-none tracking-tight md:text-6xl lg:text-7xl", gelap ? "text-white" : "text-[#1d1d1f]")}>{judul}</H>
      <p className={cn("mx-auto mt-1.5 max-w-md text-sm leading-snug md:mt-3 md:text-xl lg:text-2xl", gelap ? "text-white/85" : "text-[#1d1d1f]/80")}>{sub}</p>
      <div className="mt-2.5 flex flex-wrap justify-center gap-2 md:mt-5 md:gap-3 [&>a]:px-4 [&>a]:py-1.5 [&>a]:text-sm md:[&>a]:px-5 md:[&>a]:py-2 md:[&>a]:text-[15px]">{children}</div>
    </div>
  );
}

const TEMA = [
  { label: "HIS-SIMRS", href: "https://rsudcipayung.jakarta.go.id/rsudcipayung/index.php", luar: true, src: "/tema/hospital.webp", alt: "Ilustrasi rumah sakit: gedung 24 jam, ambulans, dokter, dan radiologi" },
  { label: "TELEMEDICINE", href: "/dalam-pengembangan?fitur=telemedicine", luar: false, src: "/tema/distance-diagnostics.webp", alt: "Ilustrasi pemantauan pasien jarak jauh lewat laptop dan ponsel" },
  { label: "TELEFARMA", href: "/dalam-pengembangan?fitur=telefarma", luar: false, src: "/tema/medicine.webp", alt: "Ilustrasi farmasi: kotak P3K, obat, dan alat medis" },
  { label: "LIS", href: "/dalam-pengembangan?fitur=lis", luar: false, src: "/tema/lab-analysis.webp", alt: "Ilustrasi laboratorium: mikroskop, tabung reaksi, dan analisis molekul" },
];

const persen = (x: number) => `${x.toFixed(1).replace(".", ",")}%`;
const miliar = (x: number) => (x >= 1e9 ? `Rp ${(x / 1e9).toFixed(1).replace(".", ",")} M` : `Rp ${Math.round(x / 1e6).toLocaleString("id-ID")} jt`);

export function Panggung({ d }: { d: DataPanggung }) {
  return (
    <div className="panggung mb-10 grid gap-3">
      {/* 1. Slideshow pembuka: logo, STARS + 4 panel, ALLIES */}
      <GulirHalus />
      <SlideshowHero slide={[
        { label: "Logo STARS", isi: (
          <div className="flex h-full flex-col items-center justify-center gap-4 bg-white/80 px-4 pb-14 pt-5 backdrop-blur-[2px]">
            <div className="panggung-logo w-[min(330px,68%,42svh)]"><LogoTegak className="w-full" /></div>
            <StatusSinkron />
          </div>
        ) },
        { label: "STARS", isi: (
          <div className="flex h-full flex-col gap-3 bg-white/90 px-4 pb-14 pt-4 md:px-16 lg:grid lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-6 lg:pt-6">
            <JudulHero judul="STARS" utama sub={<>Seluruh Siklus Alat Kesehatan.<br />Satu Sistem. Satu Pintu.</>}>
              <Pil href="#perencanaan">Lihat data</Pil>
              <Pil href="/allies" varian="garis">Tanya ALLIES</Pil>
            </JudulHero>
            <ul className="mx-auto grid min-h-0 w-full max-w-[34rem] flex-1 grid-cols-2 grid-rows-2 gap-2 md:gap-3 lg:h-[26rem] lg:flex-none" aria-label="Cakupan STARS">
              {TEMA.map((t) => (
                <li key={t.src} className="tema-ubin min-h-0 overflow-hidden rounded-2xl ring-1 ring-slate-900/5">
                  <a href={t.href} {...(t.luar ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="relative block h-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-300" aria-label={`${t.label}${t.luar ? " (situs RSUD Cipayung, tab baru)" : " — dalam pengembangan"}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={t.src} alt={t.alt} width={720} height={720} loading="lazy" decoding="async" className="block size-full object-cover" />
                    <span className="absolute left-1.5 top-1.5 rounded-full bg-navy-950/85 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white shadow-sm md:left-2 md:top-2 md:px-2.5 md:py-1 md:text-xs">{t.label}</span>
                    {!t.luar && <span className="absolute bottom-1.5 right-1.5 rounded-full bg-white/90 px-2 py-0.5 text-[9px] font-semibold text-navy-800 shadow-sm md:text-[10px]">Segera hadir</span>}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) },
        { label: "ALLIES", gelap: true, isi: (
          <div className="flex h-full flex-col gap-3 bg-black px-4 pb-14 pt-4 md:px-16 lg:grid lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-6 lg:pt-6">
            <JudulHero gelap judul={<>ALLIES<span className="bg-gradient-to-r from-teal-300 to-[#a99bff] bg-clip-text text-transparent">.</span></>} sub={<>Agen alat medik, dari kebutuhan sampai penghapusan.<span className="mt-1 block text-xs text-white/70 md:text-sm">{formatNumber(d.kandidat)} alat direkomendasikan diganti atau dihapus.</span></>}>
              <Pil href="/allies#tanya">Tanya sekarang</Pil>
              <Pil href="/allies" varian="garis" gelap>Siklusnya</Pil>
            </JudulHero>
            <div className="mx-auto min-h-0 w-full max-w-[32rem] flex-1 lg:h-[26rem] lg:flex-none"><RobotAllies /></div>
          </div>
        ) },
        { label: "Karyawan AI", isi: (
          <div className="flex h-full flex-col gap-3 bg-white/90 px-4 pb-6 pt-4 md:px-16 lg:grid lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-6 lg:pt-6">
            <JudulHero judul="Karyawan AI" sub={<>Lima petugas virtual untuk pengelolaan alat kesehatan.<span className="mt-1 block text-xs opacity-75 md:text-sm">Hanya membaca data dan memberi saran.</span></>}>
              <Pil href="/allies/kantor">Masuk ke Kantor AI</Pil>
            </JudulHero>
            <KaryawanPublik />
          </div>
        ) },
      ]} />

      {/* 2. Lapor kerusakan */}
      <section aria-label="Lapor Kerusakan" className="muncul flex min-h-[18rem] flex-col justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-teal-600 to-navy-800 py-12">
          <Teks kecil gelap judul="Alat bermasalah?" sub="Laporkan dalam satu menit — tanpa akun. Scan QR di alat untuk mengisi otomatis.">
            <Pil href="/lapor">Lapor kerusakan</Pil>
          </Teks>
        </section>

      {/* 5. Kisi ubin */}
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

        <section aria-label="AVICENNA" className="muncul relative flex min-h-[22rem] flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br from-navy-950 via-navy-900 to-[#2b1f6b] pb-10 pt-12">
          <div className="vr-grid pointer-events-none absolute inset-0 opacity-40" aria-hidden />
          <div className="relative">
            <Teks kecil gelap judul="AVICENNA" sub="Virtual Reality untuk alat kesehatan. Latih dulu di dunia virtual.">
              <Pil href="/avicenna#simulasi">Coba simulasi</Pil><Pil href="/avicenna" varian="garis" gelap>Pelajari</Pil>
            </Teks>
          </div>
          <div className="panggung-visual relative mt-6 flex justify-center" aria-hidden>
            <span className="vr-melayang grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-teal-400 to-[#7a6bff] text-white shadow-2xl"><Glasses className="size-8" /></span>
          </div>
        </section>

      </div>
    </div>
  );
}
