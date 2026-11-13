import type { Metadata } from "next";
import Link from "next/link";
import { Scale } from "lucide-react";
import { auth } from "@/auth";
import { sesiHalaman } from "@/lib/sesi";
import { unitTerkunci } from "@/lib/akses";
import { cukup } from "@/lib/peran";
import { daftarSubjek, kelompokJenis } from "@/lib/hta";
import { saranParameter } from "@/lib/hta-form";
import { PilihBanding, FotoProduk } from "@/components/hta/cari-produk";
import { TambahKandidat } from "@/components/hta/tambah-kandidat";
import { HURUF_PRODUK, WARNA_PRODUK, type SubjekRingkas } from "@/lib/hta-banding";

export const metadata: Metadata = { title: "HTA — Bandingkan Alat Kesehatan" };
export const dynamic = "force-dynamic";

const url = (ids: string[]) => `/hta/banding?${ids.map((i) => `id=${encodeURIComponent(i)}`).join("&")}`;

function KartuVs({ a, b }: { a: SubjekRingkas; b: SubjekRingkas }) {
  return (
    <Link href={url([a.id, b.id])} className="group flex min-w-0 items-center gap-3 rounded-xl border bg-card p-3 shadow-card transition hover:border-teal-300 hover:shadow-md">
      {[a, b].map((p, i) => (
        <span key={p.id} className="contents">
          {i === 1 && <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-navy-950 text-[10px] font-black uppercase text-white" aria-hidden>vs</span>}
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <FotoProduk src={p.fotoKecil} judul={p.judul} className="size-10" />
            <span className="min-w-0">
              <span className="flex items-center gap-1 text-[10px] font-bold" style={{ color: WARNA_PRODUK[i] }}><span aria-hidden>{HURUF_PRODUK[i]}</span></span>
              <span className="block truncate text-sm font-semibold text-navy-800 group-hover:text-teal-800">{p.judul}</span>
              <span className="block truncate text-xs text-muted-foreground">{p.kandidat ? "Kandidat" : `${p.unit} unit`}</span>
            </span>
          </span>
        </span>
      ))}
    </Link>
  );
}

export default async function HtaPage() {
  await sesiHalaman("Viewer");
  const s = await auth();
  const kunci = await unitTerkunci();
  const [semua, parameter] = await Promise.all([daftarSubjek(kunci?.id), saranParameter()]);
  const jenis = kelompokJenis(semua);
  const saran = jenis.filter((j) => j.produk.length >= 2).slice(0, 8).map((j) => [j.produk[0], j.produk[1]] as const);
  const kandidat = semua.filter((x) => x.kandidat);
  const bolehKelola = cukup(s?.user?.peran, "Operator") && process.env.STARS_MODE !== "internet";

  return (
    <>
      <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-teal-700"><Scale className="size-4" aria-hidden /> HTA — Health Technology Assessment</p>
      <section className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-black via-[#1b0b38] to-[#4c1d95] px-5 py-12 text-white shadow-lg sm:px-10 md:py-16">
        <div className="pointer-events-none absolute -bottom-24 left-0 right-0 h-48 rounded-[50%] bg-white/5" aria-hidden />
        <div className="relative mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-black lowercase leading-none tracking-tight sm:text-6xl">
            bandingkan <span className="underline decoration-[#7c6cf0] decoration-[6px] underline-offset-[10px] sm:decoration-8">alat kesehatan</span>
          </h1>
          <p className="mt-6 text-base text-white/85 sm:text-lg">Merek & tipe alat di RSUD Cipayung, produk e-Katalog, dan kandidat pengadaan — dinilai dari keselamatan, keandalan, ekonomi, spesifikasi, dan dukungan.</p>
          <div className="mx-auto mt-8 max-w-2xl text-left"><PilihBanding gelap /></div>
        </div>
      </section>

      {saran.length > 0 && (
        <section className="mb-8" aria-labelledby="judul-saran">
          <h2 id="judul-saran" className="mb-3 text-lg font-bold text-navy-800">Perbandingan yang disarankan</h2>
          <div className="grid gap-3 md:grid-cols-2 [&>*]:min-w-0">{saran.map(([a, b]) => <KartuVs key={`${a.id}-${b.id}`} a={a} b={b} />)}</div>
        </section>
      )}

      <section className="mb-8" aria-labelledby="judul-jenis">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="judul-jenis" className="text-lg font-bold text-navy-800">Jenis alat</h2>
            <p className="text-sm text-muted-foreground">{semua.length} produk (merek & tipe) dalam {jenis.length} jenis alat{kunci ? ` — unit ${kunci.nama}` : ""}.</p>
          </div>
          {bolehKelola && <TambahKandidat saranParameter={parameter} />}
        </div>
        {jenis.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Belum ada alat di Inventaris maupun produk kandidat.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 [&>*]:min-w-0">
            {jenis.slice(0, 24).map((j) => (
              <article key={j.jenis} className="rounded-xl border bg-card p-4 shadow-card">
                <h3 className="truncate font-semibold text-navy-800" title={j.jenis}>{j.jenis}</h3>
                <p className="text-xs text-muted-foreground">{j.produk.length} merek/tipe · {j.unit} unit</p>
                <ul className="mt-3 grid gap-2">
                  {j.produk.slice(0, 3).map((p) => (
                    <li key={p.id}>
                      <Link href={url([p.id])} className="flex min-w-0 items-center gap-2 rounded-md text-sm hover:text-teal-800">
                        <FotoProduk src={p.fotoKecil} judul={p.judul} className="size-7" />
                        <span className="truncate">{p.judul}</span>
                        <span className="ml-auto shrink-0 text-xs text-muted-foreground">{p.kandidat ? "kandidat" : `${p.unit} unit`}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                {j.produk.length >= 2 && <Link href={url(j.produk.slice(0, 3).map((p) => p.id))} className="mt-3 inline-block text-sm font-semibold text-teal-700 hover:underline">Bandingkan {Math.min(3, j.produk.length)} teratas →</Link>}
              </article>
            ))}
          </div>
        )}
      </section>

      {kandidat.length > 0 && (
        <section className="mb-8" aria-labelledby="judul-kandidat">
          <h2 id="judul-kandidat" className="mb-3 text-lg font-bold text-navy-800">Produk kandidat (belum dimiliki RS)</h2>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 [&>*]:min-w-0">
            {kandidat.map((p) => (
              <li key={p.id}>
                <Link href={url([p.id])} className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-card hover:border-teal-300">
                  <FotoProduk src={p.fotoKecil} judul={p.judul} className="size-10" />
                  <span className="min-w-0"><span className="block truncate font-medium text-navy-800">{p.judul}</span><span className="block truncate text-xs text-muted-foreground">{p.nama}</span></span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
        <h2 className="mb-1 font-semibold text-navy-800">Tentang HTA di STARS</h2>
        <p>Health Technology Assessment (HTA) berbasis rumah sakit membantu memilih alat yang paling aman, andal, dan efisien. STARS menggabungkan data operasional RS (laporan kerusakan, lama perbaikan, biaya, kalibrasi, kelengkapan dokumen) dengan data produk yang diisi tim (harga e-Katalog, garansi, TKDN, AKL, spesifikasi teknis). Hasilnya alat bantu keputusan, bukan pengganti kajian klinis atau rekomendasi Komite HTA.</p>
      </section>
    </>
  );
}
