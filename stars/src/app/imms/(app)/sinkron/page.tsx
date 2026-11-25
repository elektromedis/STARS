import { prisma } from "@/lib/prisma";
import { sesiImms } from "@/lib/imms-sesi";
import { sinkronAktif } from "@/lib/sinkron-trilux";
import { sinkronSekarang } from "@/app/imms/actions";
import { Kartu, Lencana, Tabel } from "@/components/imms/ui";
import { fmtTgl } from "@/lib/imms";

export const metadata = { title: "Sinkron TRILUX" };
const LABEL: Record<string, string> = { ruangan: "Ruangan", alat: "Alat", suku: "Suku cadang", perintah: "Perintah kerja", kalibrasi: "Kalibrasi", keluhan: "Keluhan", jadwal: "Jadwal" };

export default async function Sinkron() {
  await sesiImms("Admin");
  const [per, log] = await Promise.all([
    prisma.sinkronTrilux.groupBy({ by: ["entitas", "asal"], _count: { _all: true } }),
    prisma.auditLog.findMany({ where: { aksi: { startsWith: "TRILUX:" } }, orderBy: { waktu: "desc" }, take: 30 }),
  ]);
  const jumlah = (e: string, a?: string) => per.filter((p) => p.entitas === e && (!a || p.asal === a)).reduce((x, p) => x + p._count._all, 0);
  const jam = (d: Date) => `${fmtTgl(d)} ${new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(d)}`;
  return (
    <div className="space-y-5">
      <section className="kaca panel text-[13px] leading-relaxed">
        <h2>STARS · EMASCARE ↔ TRILUX</h2>
        <p>STARS dan EMASCARE memakai satu basis data. TRILUX menjadi <b>arsip</b> yang disinkronkan dua arah secara otomatis:</p>
        <ul className="redup mt-1 list-disc pl-5">
          <li>Data baru atau perubahan di STARS/EMASCARE dikirim ke TRILUX.</li>
          <li>Data yang diisi atau diubah di TRILUX dibawa ke STARS/EMASCARE.</li>
          <li>Bila baris yang sama diubah di kedua sisi sebelum sinkron, isi STARS dipakai dan kejadiannya dicatat sebagai konflik. Tidak ada data yang terduplikasi.</li>
          <li>Data yang dihapus di STARS tetap tersimpan di TRILUX sebagai arsip.</li>
        </ul>
        <div className="mt-3 flex items-center gap-2">
          {sinkronAktif() ? <Lencana t="Tersambung" nada="hijau" /> : <Lencana t="Belum diatur (TRILUX_DB_URL kosong)" nada="kuning" />}
          <form action={sinkronSekarang} className="ml-auto"><button className="kapsul utama" disabled={!sinkronAktif()}>Sinkron sekarang</button></form>
        </div>
      </section>
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Object.keys(LABEL).map((e) => <Kartu key={e} judul={LABEL[e]} nilai={jumlah(e)} ket={`${jumlah(e, "trilux")} berasal dari TRILUX`} />)}
      </section>
      <section className="kaca panel">
        <h2>Riwayat sinkron</h2>
        <Tabel>
          <thead><tr><th>Waktu</th><th>Kejadian</th><th>Rincian</th><th>Oleh</th></tr></thead>
          <tbody>{log.map((l) => (
            <tr key={l.id}><td className="whitespace-nowrap">{jam(l.waktu)}</td>
              <td><Lencana t={l.aksi.replace("TRILUX: ", "")} nada={l.aksi.includes("gagal") ? "merah" : l.aksi.includes("konflik") ? "kuning" : "biru"} /></td>
              <td>{[l.objek, l.detail].filter(Boolean).join(" · ")}</td><td className="redup">{l.email ?? "otomatis"}</td></tr>
          ))}</tbody>
        </Tabel>
      </section>
    </div>
  );
}
