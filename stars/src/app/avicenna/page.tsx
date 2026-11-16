import type { Metadata } from "next";
import Link from "next/link";
import { BookOpenCheck, Boxes, Glasses, GraduationCap, HeartPulse, Repeat, ShieldCheck, Timer, Wrench } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SimulasiVr } from "@/components/avicenna/simulasi-vr";

export const metadata: Metadata = { title: "AVICENNA" };

const MANFAAT = [
  { ikon: ShieldCheck, judul: "Aman tanpa risiko pasien", isi: "Kesalahan pengoperasian alat dilatih di dunia virtual, bukan pada pasien atau alat sungguhan." },
  { ikon: Repeat, judul: "Bisa diulang kapan saja", isi: "Skenario kritis (henti jantung, alarm ventilator) dapat diulang sampai kompeten." },
  { ikon: Timer, judul: "Hemat waktu & biaya", isi: "Mengurangi pemakaian alat produksi, bahan habis pakai, dan jadwal pelatihan tatap muka." },
  { ikon: BookOpenCheck, judul: "Terukur", isi: "Skor tiap langkah menjadi bukti kompetensi pengguna alat sebelum diberi kewenangan." },
];

const PENERAPAN = [
  { ikon: HeartPulse, judul: "Pelatihan pengguna alat", isi: "Defibrilator, ventilator, infusion/syringe pump, ESU, monitor pasien — sesuai inventaris RS." },
  { ikon: Wrench, judul: "Pelatihan teknisi elektromedis", isi: "Bongkar-pasang modul, troubleshooting, dan uji keselamatan listrik secara virtual." },
  { ikon: GraduationCap, judul: "Edukasi & orientasi", isi: "Orientasi pegawai baru, tur ruang OK/ICU/radiologi 360°, dan keselamatan radiasi & MRI." },
  { ikon: Boxes, judul: "Pra-pengadaan (HTA)", isi: "Mencoba antarmuka alat secara virtual sebelum membeli, sebagai masukan SI-ALKES › HTA." },
];

const ALUR = ["Pilih alat prioritas dari inventaris (risiko tinggi & sering dipakai)", "Susun skenario bersama user & elektromedis (SOP / manual alat)", "Latihan di headset VR atau layar (versi web)", "Penilaian skor & umpan balik otomatis", "Catat kompetensi; ulang berkala atau saat ganti alat"];

export default function AvicennaPage() {
  return (
    <>
      <PageHeader title="AVICENNA" description="Virtual Reality untuk alat kesehatan — pelatihan, simulasi pengoperasian, dan edukasi keselamatan bagi tenaga kesehatan dan teknisi elektromedis." />

      <section className="relative mb-6 overflow-hidden rounded-3xl bg-black px-6 py-12 text-center text-white md:py-16">
        <div className="vr-grid pointer-events-none absolute inset-0 opacity-40" aria-hidden />
        <div className="relative">
          <span className="vr-melayang mx-auto grid size-20 place-items-center rounded-3xl bg-gradient-to-br from-teal-400 to-[#7a6bff] shadow-2xl"><Glasses className="size-10" aria-hidden /></span>
          <h2 className="mt-6 text-4xl font-semibold tracking-tight md:text-6xl">Latih dulu di dunia virtual.</h2>
          <p className="mx-auto mt-3 max-w-2xl text-lg text-white/80 md:text-xl">Peran Virtual Reality dalam pendidikan medis dan pelatihan kesehatan — diterapkan pada alat kesehatan RSUD Cipayung.</p>
          <a href="#simulasi" className="mt-6 inline-flex rounded-full bg-teal-500 px-6 py-2.5 font-medium text-white hover:bg-teal-600">Coba simulasi</a>
        </div>
      </section>

      <section aria-label="Manfaat" className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {MANFAAT.map((m) => (
          <Card key={m.judul} className="muncul"><CardContent className="pt-6">
            <m.ikon className="size-6 text-teal-600" aria-hidden />
            <p className="mt-3 font-semibold text-navy-800">{m.judul}</p>
            <p className="mt-1 text-sm text-muted-foreground">{m.isi}</p>
          </CardContent></Card>
        ))}
      </section>

      <Card id="simulasi" className="mb-6 scroll-mt-24">
        <CardHeader>
          <CardTitle>Simulasi pengoperasian alat</CardTitle>
          <CardDescription>Pratinjau modul VR versi layar: pilih langkah yang benar di setiap tahap skenario. Materi bersifat contoh edukasi — tetap ikuti SOP RS dan manual pabrikan.</CardDescription>
        </CardHeader>
        <CardContent><SimulasiVr /></CardContent>
      </Card>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Penerapan</CardTitle></CardHeader>
          <CardContent className="grid gap-4">
            {PENERAPAN.map((p) => (
              <div key={p.judul} className="flex gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-teal-50 text-teal-700"><p.ikon className="size-5" aria-hidden /></span>
                <div><p className="font-medium text-navy-800">{p.judul}</p><p className="text-sm text-muted-foreground">{p.isi}</p></div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Alur program pelatihan VR</CardTitle></CardHeader>
          <CardContent>
            <ol className="grid gap-3">
              {ALUR.map((a, i) => (
                <li key={a} className="flex items-start gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-navy-800 text-sm font-semibold text-white">{i + 1}</span>
                  <span className="pt-0.5 text-sm text-navy-800">{a}</span>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-sm text-muted-foreground">Daftar alat prioritas diambil dari <Link href="/pemeliharaan" className="font-medium text-teal-700 underline">SI-FARMALKES › Pemeliharaan</Link>. Perangkat: headset VR mandiri (standalone) atau browser biasa untuk versi layar.</p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
