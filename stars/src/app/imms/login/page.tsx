import { LogoEmas } from "@/components/imms/logo";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { FormMasuk } from "./form";

export const metadata: Metadata = { title: "Masuk" };
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ tamu?: string }> }) {
  const sp = await searchParams;
  if ((await auth())?.user) redirect("/imms");
  return (
    <div className="imms-masuk">
      <div className="kaca w-full max-w-[380px] rounded-[26px] p-7 text-center">
        <LogoEmas ukuran={84} className="mx-auto mb-4 block" />
        <h1 className="emas-teks text-2xl font-bold tracking-[.1em]">EMASCARE</h1>
        <p className="redup text-[12px]">Electromedical Asset Management &amp; Service Care System</p>
        <p className="mb-5 mt-2 text-[11px] font-bold tracking-[.18em]" style={{ color: "var(--aksen)" }}>KENALI. RAWAT. KENDALIKAN.</p>
        {sp.tamu === "gagal" && <p className="mb-3 rounded-xl p-2 text-[12px]" style={{ background: "rgba(239,68,68,.12)" }} role="alert">Tautan pratinjau tidak berlaku atau sudah dicabut. Minta tautan baru ke Admin elektromedis.</p>}
        <FormMasuk />
        <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--garis)" }}>
          <p className="redup mb-2 text-[12px]">Tidak punya akun? Alat rusak tetap bisa dilaporkan.</p>
          <a href="/imms/lapor" className="kapsul w-full justify-center">Lapor kerusakan tanpa akun</a>
          <a href="/imms/riwayat" className="tautan mt-2 inline-block text-[12px]">Lacak laporan saya</a>
        </div>
        <p className="redup2 mt-5 text-[11px]">EMAS: Electromedical Asset Management · CARE: Care, Maintenance, Reliability. Memakai akun STARS. Alur kerja: Permenkes 65/2016 · WHO IMMIS 2025</p>
      </div>
    </div>
  );
}
