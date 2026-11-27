import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { sesiHalaman } from "@/lib/sesi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Peta Modul Terpadu" };
export const dynamic = "force-dynamic";

type Baris = { fungsi: string; asal: string; href: string; ket?: string };
const PETA: Baris[] = [
  { fungsi: "Inventaris alat, KIR, penerimaan, penghapusan", asal: "TRILUX Lite & Plus · ASPAK", href: "/admin/alat" },
  { fungsi: "Lembar kerja & log book alat", asal: "TRILUX Plus (Kelola LK)", href: "/admin/lembar-kerja" },
  { fungsi: "Jadwal preventif, master tugas, SKP", asal: "TRILUX Plus (Penjadwalan/Perencanaan)", href: "/admin/tugas" },
  { fungsi: "Status kalibrasi (sisa waktu, laik)", asal: "TRILUX Plus (Status Kalibrasi)", href: "/admin/status-kalibrasi" },
  { fungsi: "Perencanaan biaya & usia teknis", asal: "TRILUX Plus (Dashboard Pendanaan)", href: "/admin/perencanaan" },
  { fungsi: "Padanan ruang ASPAK", asal: "TRILUX Plus (Gedung-Ruangan)", href: "/admin/ruangan-aspak" },
  { fungsi: "Kelengkapan & pemenuhan standar", asal: "ASPAK · TRILUX Plus (Standar ASPAK)", href: "/admin/aspak" },
  { fungsi: "Prasarana, perizinan, mutu, SDM", asal: "ASPAK", href: "/admin/aspak?bagian=prasarana" },
  { fungsi: "Laporan keluhan, penilaian, permintaan alat", asal: "EMASCARE · TRILUX", href: "/imms/keluhan", ket: "Menu EMASCARE" },
  { fungsi: "Kinerja teknisi & rating WO", asal: "TRILUX Plus (SKP/Performa)", href: "/admin/kinerja" },
];

export default async function PetaModulPage() {
  await sesiHalaman("Viewer");
  const [alat, ruangan, std, izin, jadwal, wo] = await Promise.all([prisma.alat.count({ where: { aktif: true } }), prisma.ruangan.count(), prisma.standarAlat.count(), prisma.izinFaskes.count(), prisma.jadwalPreventif.count(), prisma.perintahKerja.count()]);
  const ringkas = [["Alat aktif", alat], ["Ruangan", ruangan], ["Baris standar ASPAK", std], ["Butir izin/mutu", izin], ["Jadwal preventif", jadwal], ["Perintah kerja", wo]] as const;
  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader><CardTitle>Peta Modul Terpadu</CardTitle><CardDescription>Fungsi dari TRILUX Lite/Plus, ASPAK, dan EMASCARE yang kini bernaung di satu aplikasi STARS. Data kompetensi SIRS RS Online diimpor lewat Kelengkapan Faskes (tanpa sambungan langsung ke SIRS).</CardDescription></CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">{ringkas.map(([k, n]) => <div key={k} className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">{k}</p><p className="text-xl font-semibold">{n}</p></div>)}</div>
          <table className="w-full text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-2">Fungsi</th><th>Asal gagasan</th><th>Di STARS</th></tr></thead>
            <tbody>{PETA.map((b) => <tr key={b.fungsi} className="border-b"><td className="py-2">{b.fungsi}</td><td className="text-muted-foreground">{b.asal}</td><td><Link className="text-teal-800 hover:underline" href={b.href}>{b.href}</Link></td></tr>)}</tbody></table>
        </CardContent>
      </Card>
    </div>
  );
}
