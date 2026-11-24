import { sesiImms } from "@/lib/imms-sesi";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { fmtTgl } from "@/lib/imms";
import { Kartu, Lencana, Tabel, Kosong } from "@/components/imms/ui";

export default async function Kalibrasi() {
  await sesiImms("Operator");
  const kini = new Date(), batas = new Date(kini.getTime() + 60 * 86_400_000);
  const data = await prisma.kalibrasi.findMany({ orderBy: { tanggal: "desc" }, take: 2000, include: { alat: { select: { kode: true, nama: true, unitKerja: { select: { nama: true } } } } } });
  const terbaru = new Map<number, (typeof data)[number]>();
  for (const k of data) if (!terbaru.has(k.alatId)) terbaru.set(k.alatId, k); // data urut tanggal menurun → yang pertama = terbaru
  const akhir = [...terbaru.values()].sort((a, b) => (a.berlakuSampai?.getTime() ?? Infinity) - (b.berlakuSampai?.getTime() ?? Infinity));
  const kadaluarsa = akhir.filter((k) => k.berlakuSampai && k.berlakuSampai < kini).length;
  const segera = akhir.filter((k) => k.berlakuSampai && k.berlakuSampai >= kini && k.berlakuSampai <= batas).length;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3"><Kartu judul="Alat terkalibrasi" nilai={akhir.length} /><Kartu judul="Habis ≤ 60 hari" nilai={segera} nada="kuning" /><Kartu judul="Kedaluwarsa" nilai={kadaluarsa} nada="merah" /></div>
      <p className="redup text-[13px]">Sesuai batasan proposal, pengujian & kalibrasi bukan modul terpisah: IMMS hanya menampilkan tanggal kalibrasi terakhir dan status laik pakai dari sertifikat. Sertifikat diunggah lewat menu Kalibrasi STARS.</p>
      {akhir.length === 0 ? <div className="kaca panel"><Kosong>Belum ada data kalibrasi.</Kosong></div> : (
        <Tabel><thead><tr><th>Alat</th><th>Unit</th><th>Tanggal</th><th>Kalibrator</th><th>Status</th><th>Berlaku s.d.</th></tr></thead>
          <tbody>{akhir.map((k) => { const lewat = k.berlakuSampai && k.berlakuSampai < kini; return (
            <tr key={k.id}><td><Link className="tautan" href={`/imms/inventaris/${encodeURIComponent(k.alat.kode)}`}>{k.alat.nama}</Link></td><td className="redup">{k.alat.unitKerja.nama}</td><td>{fmtTgl(k.tanggal)}</td><td className="redup">{k.kalibrator}</td><td><Lencana t={k.laik ? "Laik" : "Tidak laik"} /></td>
              <td style={lewat ? { color: "var(--merah)", fontWeight: 600 } : undefined}>{lewat ? "⚠ " : ""}{fmtTgl(k.berlakuSampai)}</td></tr>); })}</tbody></Tabel>
      )}
    </div>
  );
}
