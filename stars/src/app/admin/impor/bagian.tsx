import { Info } from "lucide-react";
import { ImporForm } from "@/components/admin/impor-form";
import { ImporAlatForm } from "@/components/admin/impor-alat-form";
import type { Session } from "next-auth";
import { cukup } from "@/lib/peran";

export default function ImporBagian({ s }: { s: Session }) {
  const bolehSimpan = cukup(s.user!.peran, "Operator");
  const modeInternet = process.env.STARS_MODE === "internet";
  return (
    <>
      {(!bolehSimpan || s.user!.unitKerja || modeInternet) && (
        <p className="mb-4 flex items-start gap-2 rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm text-teal-900">
          <Info className="mt-0.5 size-4 shrink-0" />
          <span>
            {modeInternet && <>Server ini berjalan dalam <strong>mode internet</strong> (baca saja): data masuk lewat sinkronisasi dari server intranet, tombol Simpan dinonaktifkan. </>}
            {!modeInternet && bolehSimpan && s.user!.unitKerja && <>Akun Anda dibatasi pada unit <strong>{s.user!.unitKerja}</strong>: baris untuk unit lain akan ditandai error. </>}
          </span>
        </p>
      )}
      <h2 className="mb-3 text-base font-semibold text-navy-800">A. Data paket perencanaan (RKPBU/RKBU)</h2>
      <ImporForm bolehSimpan={bolehSimpan && !modeInternet} />
      <h2 id="alat" className="mb-3 mt-10 scroll-mt-24 text-base font-semibold text-navy-800">B. Inventaris alat kesehatan (CMMS)</h2>
      <ImporAlatForm bolehSimpan={bolehSimpan && !modeInternet} />
    </>
  );
}
