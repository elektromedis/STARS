/**
 * Angka agregat lintas menu untuk Dashboard (publik): HTA, kondisi alat, laporan kerusakan, kalibrasi, data sistem.
 * Tanpa data pribadi (nama/kontak pelapor tidak pernah dibaca).
 */
import { prisma } from "./prisma";
import { batasUnit } from "./pemeliharaan-ringkasan";
import { daftarSubjek, kelompokJenis } from "./hta";
import { getDataKalibrasi } from "./kalibrasi-data";

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export async function ringkasanLintasMenu(unit: { id: number | null; nama: string } | null) {
  const b = batasUnit(unit?.nama ?? null);
  const kini = new Date();
  const awal6 = new Date(Date.UTC(kini.getUTCFullYear(), kini.getUTCMonth() - 5, 1));
  const [kondisi, statusLapor, laporan6, terbaru, subjek, kal, jumlahPaket, jumlahAlat, jumlahDok, jumlahSertifikat] = await Promise.all([
    prisma.alat.groupBy({ by: ["kondisi"], where: { ...b.alat, aktif: true }, _count: { _all: true } }),
    prisma.permintaanKerja.groupBy({ by: ["status"], where: b.permintaan, _count: { _all: true } }),
    prisma.permintaanKerja.findMany({ where: { ...b.permintaan, createdAt: { gte: awal6 } }, select: { createdAt: true } }),
    prisma.permintaanKerja.findMany({ where: b.permintaan, orderBy: { createdAt: "desc" }, take: 5, select: { nomor: true, namaAlat: true, status: true, prioritas: true, createdAt: true, unitKerja: { select: { nama: true } } } }),
    daftarSubjek(unit?.id ?? null),
    getDataKalibrasi({ kunci: unit?.nama ?? null, f: { q: "", unit: "", status: "", jenis: "", lembaga: "", tahun: "", mode: "alat" }, page: 1, pageSize: 1 }),
    prisma.paket.count(),
    prisma.alat.count({ where: b.alat }),
    prisma.dokumenAlat.count({ where: b.viaAlat }),
    prisma.kalibrasi.count({ where: { ...b.viaAlat, berkas: { not: null } } }),
  ]);
  const hitung = <K extends string>(rows: (Record<K, string> & { _count: { _all: number } })[], k: K, v: string) => rows.find((r) => r[k] === v)?._count._all ?? 0;

  const perBulan = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(Date.UTC(awal6.getUTCFullYear(), awal6.getUTCMonth() + i, 1));
    return { kunci: `${d.getUTCFullYear()}-${d.getUTCMonth()}`, label: `${BULAN[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}`, jumlah: 0 };
  });
  for (const l of laporan6) {
    const w = new Date(l.createdAt.getTime() + 7 * 3_600_000); // WIB
    const x = perBulan.find((p) => p.kunci === `${w.getUTCFullYear()}-${w.getUTCMonth()}`);
    if (x) x.jumlah++;
  }
  const jenis = kelompokJenis(subjek);
  return {
    kondisi: ["Baik", "Rusak Ringan", "Rusak Berat", "Afkir"].map((k) => ({ label: k, nilai: hitung(kondisi, "kondisi", k) })),
    lapor: {
      status: ["Baru", "Ditinjau", "Diproses", "Selesai", "Ditolak"].map((k) => ({ label: k, nilai: hitung(statusLapor, "status", k) })),
      perBulan,
      terbaru: terbaru.map((t) => ({ nomor: t.nomor, alat: t.namaAlat, unit: t.unitKerja?.nama ?? null, status: t.status, prioritas: t.prioritas, waktu: t.createdAt.toISOString() })),
      total: statusLapor.reduce((a, r) => a + r._count._all, 0),
    },
    hta: { produk: subjek.length, jenis: jenis.length, kandidat: subjek.filter((s) => s.kandidat).length, bisaBanding: jenis.filter((j) => j.produk.length >= 2).length },
    kalibrasi: kal.ringkasan,
    kalibrasiBulan: kal.bulan,
    data: { paket: jumlahPaket, alat: jumlahAlat, dokumenAlat: jumlahDok, sertifikat: jumlahSertifikat },
  };
}
