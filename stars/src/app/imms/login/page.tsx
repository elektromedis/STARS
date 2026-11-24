import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { FormMasuk } from "./form";

export const metadata: Metadata = { title: "Masuk" };
export const dynamic = "force-dynamic";

export default async function Page() {
  if ((await auth())?.user) redirect("/imms");
  return (
    <div className="imms-masuk">
      <div className="kaca w-full max-w-[380px] rounded-[26px] p-7 text-center">
        <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-[18px] text-2xl font-bold text-white" style={{ background: "linear-gradient(145deg,#0a84ff,#5e5ce6)", boxShadow: "0 10px 30px -10px rgba(10,132,255,.7)" }}>EM</div>
        <h1 className="text-xl font-bold">STARS IMMS</h1>
        <p className="redup mb-5 text-[13px]">Inventaris &amp; Pemeliharaan Alat Elektromedik — RSUD Cipayung</p>
        <FormMasuk />
        <p className="redup2 mt-5 text-[11px]">Memakai akun STARS yang sama. Alur kerja: Permenkes 65/2016 · WHO IMMIS 2025</p>
      </div>
    </div>
  );
}
