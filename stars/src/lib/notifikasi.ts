/** Notifikasi untuk petugas yang login (Viewer+): dihitung langsung dari data, tanpa tabel tersendiri. */
import { prisma } from "./prisma";
import { batasUnit, getRingkasanPemeliharaan } from "./pemeliharaan-ringkasan";
import type { ItemNotif } from "./notifikasi-jenis";

const HARI = 86_400_000;

export async function notifikasiPetugas(o: { penggunaId: number | null; unit: string | null }): Promise<ItemNotif[]> {
  const b = batasUnit(o.unit);
  const kini = new Date();
  const hariIni = new Date(`${kini.toISOString().slice(0, 10)}T00:00:00Z`).toISOString();
  const [baru, woSaya, r] = await Promise.all([
    prisma.permintaanKerja.findMany({
      where: { ...b.permintaan, status: "Baru", createdAt: { gte: new Date(kini.getTime() - 30 * HARI) } }, orderBy: { createdAt: "desc" }, take: 20,
      select: { nomor: true, namaAlat: true, prioritas: true, createdAt: true, video: true, foto: true, unitKerja: { select: { nama: true } } },
    }),
    o.penggunaId
      ? prisma.perintahKerja.findMany({
        where: { teknisiId: o.penggunaId, status: { in: ["Terbuka", "Dikerjakan"] } }, orderBy: { updatedAt: "desc" }, take: 20,
        select: { nomor: true, deskripsi: true, prioritas: true, status: true, updatedAt: true, alat: { select: { nama: true } } },
      })
      : Promise.resolve([]),
    getRingkasanPemeliharaan(o.unit),
  ]);
  const item: ItemNotif[] = [];
  for (const p of baru) item.push({
    id: `wr-${p.nomor}`, jenis: "laporan", judul: `Laporan kerusakan baru · ${p.nomor}`,
    isi: `${p.namaAlat}${p.unitKerja ? ` — ${p.unitKerja.nama}` : ""} · prioritas ${p.prioritas}${p.foto ? " · foto" : ""}${p.video ? " · video" : ""}`,
    waktu: p.createdAt.toISOString(), href: "/admin/pemeliharaan", tingkat: p.prioritas === "Darurat" ? "bahaya" : p.prioritas === "Tinggi" ? "peringatan" : "info",
  });
  for (const w of woSaya) item.push({
    id: `wo-${w.nomor}-${w.updatedAt.getTime()}`, jenis: "wo", judul: `Perintah kerja untuk Anda · ${w.nomor}`,
    isi: `${w.alat?.nama ?? w.deskripsi.slice(0, 80)} · ${w.status} · prioritas ${w.prioritas}`,
    waktu: w.updatedAt.toISOString(), href: "/admin/pemeliharaan", tingkat: w.prioritas === "Darurat" ? "bahaya" : "peringatan",
  });
  if (r.preventifTempo > 0) item.push({
    id: `preventif-${hariIni.slice(0, 10)}-${r.preventifTempo}`, jenis: "preventif", judul: "Pemeliharaan preventif jatuh tempo",
    isi: `${r.preventifTempo} jadwal sudah jatuh tempo${r.preventif30 ? `, ${r.preventif30} lagi dalam 30 hari` : ""}.`, waktu: hariIni, href: "/admin/jadwal", tingkat: "peringatan",
  });
  if (r.kalKedaluwarsa > 0) item.push({
    id: `kal-bermasalah-${hariIni.slice(0, 10)}-${r.kalKedaluwarsa}`, jenis: "kalibrasi", judul: "Kalibrasi kedaluwarsa / tidak laik",
    isi: `${r.kalKedaluwarsa} alat perlu dikalibrasi ulang atau ditindaklanjuti.`, waktu: hariIni, href: "/kalibrasi?status=bermasalah#data-kalibrasi", tingkat: "bahaya",
  });
  if (r.kalSegera > 0) item.push({
    id: `kal-segera-${hariIni.slice(0, 10)}-${r.kalSegera}`, jenis: "kalibrasi", judul: "Kalibrasi segera habis (≤ 30 hari)",
    isi: `${r.kalSegera} alat masa berlaku kalibrasinya habis dalam 30 hari.`, waktu: hariIni, href: "/kalibrasi?status=segera#data-kalibrasi", tingkat: "peringatan",
  });
  return item.sort((a, b2) => b2.waktu.localeCompare(a.waktu));
}
