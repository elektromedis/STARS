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

/* ───────── Perubahan data lintas aplikasi (STARS · EMASCARE · TRILUX) ───────── */
const AWALAN_DATA = ["alat.", "ruangan.", "perintah.", "permintaan.", "kalibrasi", "stok.", "jadwal", "rkbu.", "paket.", "penghapusan.", "IMMS:", "TRILUX:"];
const LABEL_AKSI: Record<string, string> = {
  "alat.buat": "menambah alat", "alat.ubah": "mengubah data alat", "alat.foto": "memperbarui foto alat", "ruangan.buat": "menambah ruangan",
  "perintah.buat": "membuat perintah kerja", "perintah.ubah": "memperbarui perintah kerja", "permintaan.buat": "membuat laporan kerusakan", "permintaan.status": "mengubah status laporan",
  "stok.mutasi": "mencatat mutasi stok",
};
/** Sumber perubahan menurut kode audit: "IMMS:" = EMASCARE, "TRILUX:" = hasil sinkron, selainnya STARS. */
export const asalPerubahan = (aksi: string) => (aksi.startsWith("IMMS:") ? "EMASCARE" : aksi.startsWith("TRILUX:") ? "TRILUX" : "STARS");

/** Notifikasi bila data diubah di salah satu aplikasi oleh orang lain (atau oleh sinkron TRILUX). Untuk Operator ke atas. */
export async function notifikasiPerubahan(o: { email: string | null; hari?: number }): Promise<ItemNotif[]> {
  const log = await prisma.auditLog.findMany({
    where: {
      waktu: { gte: new Date(Date.now() - (o.hari ?? 3) * HARI) },
      OR: AWALAN_DATA.map((a) => ({ aksi: { startsWith: a } })),
      NOT: [{ aksi: "TRILUX: sinkron", detail: "tidak ada perubahan" }, ...(o.email ? [{ email: o.email }] : [])],
    },
    orderBy: { waktu: "desc" }, take: 40,
  });
  return log.map(itemPerubahan);
}

/** Saring AuditLog perubahan data (dipakai lonceng & pengiriman email/WA). */
export const saringPerubahan = { OR: AWALAN_DATA.map((a) => ({ aksi: { startsWith: a } })), NOT: [{ aksi: "TRILUX: sinkron", detail: "tidak ada perubahan" }] };

export function itemPerubahan(l: { id: number; waktu: Date; email: string | null; aksi: string; objek: string | null; detail: string | null }): ItemNotif {
  {
    const asal = asalPerubahan(l.aksi), sinkron = l.aksi.startsWith("TRILUX:");
    const apa = LABEL_AKSI[l.aksi] ?? l.aksi.replace(/^(IMMS|TRILUX): ?/, "").replace(/\./g, " ");
    return {
      id: `ubah-${l.id}`, jenis: "perubahan" as const,
      judul: sinkron ? (l.aksi.includes("gagal") ? "Sinkron TRILUX gagal" : l.aksi.includes("konflik") ? "Konflik data TRILUX (isi STARS dipakai)" : "Data tersinkron dengan TRILUX") : `Perubahan data di ${asal}`,
      isi: sinkron ? [l.objek, l.detail].filter(Boolean).join(" · ") : `${l.email ?? "Sistem"} ${apa}${l.objek ? ` · ${l.objek}` : ""}${l.detail ? ` — ${l.detail}` : ""}`.slice(0, 220),
      waktu: l.waktu.toISOString(), href: sinkron ? "/imms/sinkron" : asal === "EMASCARE" ? "/imms/audit" : "/admin/audit",
      tingkat: l.aksi.includes("gagal") ? "bahaya" : l.aksi.includes("konflik") ? "peringatan" : "info",
    };
  }
}
