import type { Metadata } from "next";
import { Info } from "lucide-react";
import { ImporForm } from "@/components/admin/impor-form";
import { ImporAlatForm } from "@/components/admin/impor-alat-form";
import { sesiHalaman } from "@/lib/sesi";
import { cukup } from "@/lib/peran";

export const metadata: Metadata = { title: "Impor Excel" };
export const dynamic = "force-dynamic";

export default async function ImporPage() {
  const s = await sesiHalaman("Viewer");
  const bolehSimpan = cukup(s.user.peran, "Operator");
  const modeInternet = process.env.STARS_MODE === "internet";
  return (
    <>
      {(!bolehSimpan || s.user.unitKerja || modeInternet) && (
        <p className="mb-4 flex items-start gap-2 rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm text-teal-900">
          <Info className="mt-0.5 size-4 shrink-0" />
          <span>
            {modeInternet && <>Server ini berjalan dalam <strong>mode internet</strong> (baca saja): data masuk lewat sinkronisasi dari server intranet, tombol Simpan dinonaktifkan. </>}
            {!modeInternet && !bolehSimpan && <>Peran <strong>{s.user.peran}</strong> hanya dapat memeriksa berkas; penyimpanan memerlukan peran Operator. </>}
            {!modeInternet && bolehSimpan && s.user.unitKerja && <>Akun Anda dibatasi pada unit <strong>{s.user.unitKerja}</strong>: baris untuk unit lain akan ditandai error. </>}
          </span>
        </p>
      )}
      <h2 className="mb-3 text-base font-semibold text-navy-800">A. Data paket perencanaan (RKPBU/RKBU)</h2>
      <ImporForm bolehSimpan={bolehSimpan && !modeInternet} />
      <h2 className="mb-3 mt-10 text-base font-semibold text-navy-800">B. Inventaris alat kesehatan (CMMS)</h2>
      <ImporAlatForm bolehSimpan={bolehSimpan && !modeInternet} />
    </>
  );
}
