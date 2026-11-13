import type { Metadata } from "next";
import { Info } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { sesiHalaman } from "@/lib/sesi";
import { unitTerkunci } from "@/lib/akses";
import { cukup } from "@/lib/peran";
import { statusKalibrasi } from "@/lib/kalibrasi";
import { KalibrasiManager, type PerluPerhatian } from "@/components/pemeliharaan/kalibrasi-manager";

export const metadata: Metadata = { title: "Kalibrasi" };
export const dynamic = "force-dynamic";

export default async function KalibrasiPage({ searchParams }: { searchParams: Promise<{ alat?: string }> }) {
  const alatAwal = Number((await searchParams).alat) || null;
  const s = await sesiHalaman("Viewer");
  const bolehKelola = cukup(s.user.peran, "Operator") && process.env.STARS_MODE !== "internet";
  const kunci = await unitTerkunci();
  const u = kunci ? { unitKerja: { nama: kunci.nama } } : {};
  const [data, semua, alat] = await Promise.all([
    prisma.kalibrasi.findMany({
      where: kunci ? { alat: u } : {}, orderBy: [{ tanggal: "desc" }, { id: "desc" }], take: 2000,
      select: {
        id: true, alatId: true, tanggal: true, jenis: true, kalibrator: true, petugas: true, metode: true, laik: true, nomorSertifikat: true, berlakuSampai: true, keterangan: true,
        berkas: true, namaBerkas: true, alat: { select: { kode: true, nama: true, unitKerja: { select: { nama: true } } } },
      },
    }),
    // Status alat = catatan TERBARU tiap alat aktif (seluruh riwayat, bukan hanya yang ditampilkan).
    prisma.kalibrasi.findMany({
      where: { alat: { ...u, aktif: true } }, orderBy: [{ tanggal: "desc" }, { id: "desc" }],
      select: { alatId: true, laik: true, berlakuSampai: true, alat: { select: { kode: true, nama: true, unitKerja: { select: { nama: true } } } } },
    }),
    bolehKelola
      ? prisma.alat.findMany({ where: { ...u, aktif: true }, orderBy: [{ unitKerja: { urut: "asc" } }, { nama: "asc" }], select: { id: true, kode: true, nama: true, nomorSeri: true, unitKerja: { select: { nama: true } }, ruangan: { select: { nama: true } } } })
      : Promise.resolve([]),
  ]);
  const terkini = new Map<number, (typeof semua)[number]>();
  for (const k of semua) if (!terkini.has(k.alatId)) terkini.set(k.alatId, k);
  const kini = Date.now();
  const perlu: PerluPerhatian[] = [...terkini.values()]
    .map((k) => ({ k, st: statusKalibrasi(k, kini) }))
    .filter(({ st }) => st.kunci === "bermasalah" || st.kunci === "segera")
    .sort((a, b) => a.st.peringkat - b.st.peringkat || (a.k.berlakuSampai?.getTime() ?? 0) - (b.k.berlakuSampai?.getTime() ?? 0))
    .map(({ k }) => ({ alatId: k.alatId, kode: k.alat.kode, nama: k.alat.nama, unit: k.alat.unitKerja.nama, laik: k.laik, berlakuSampai: k.berlakuSampai }));

  return (
    <div className="grid gap-4">
      {!bolehKelola && (
        <p className="flex items-start gap-2 rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm text-teal-900"><Info className="mt-0.5 size-4 shrink-0" />
          <span>{process.env.STARS_MODE === "internet" ? "Server ini mode internet (baca saja)." : <>Peran <strong>{s.user.peran}</strong> hanya dapat melihat. Mencatat kalibrasi & mengunggah sertifikat memerlukan peran Operator.</>}</span></p>
      )}
      <KalibrasiManager
        data={data}
        perlu={perlu}
        alat={alat.map((a) => ({ id: a.id, kode: a.kode, nama: a.nama, nomorSeri: a.nomorSeri, unit: a.unitKerja.nama, ruangan: a.ruangan?.nama ?? null }))}
        bolehKelola={bolehKelola}
        alatAwal={alatAwal}
      />
    </div>
  );
}
