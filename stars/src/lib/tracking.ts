/**
 * Live Tracking: posisi proses kerja di setiap menu (sudah sampai mana), dihitung langsung dari data STARS.
 * Publik & tanpa data pribadi (nama/kontak pelapor tidak dibaca). Viewer ber-unit hanya melihat unitnya.
 */
import { prisma } from "./prisma";
import { batasUnit } from "./pemeliharaan-ringkasan";
import { getDataKalibrasi } from "./kalibrasi-data";
import { ringkasanAllies } from "./allies";
import { SIKLUS } from "./allies-siklus";

export type Tahapan = { label: string; jumlah: number; ket?: string; nada?: "selesai" | "proses" | "awas" | "bahaya" | "netral" };
export type Alur = { id: string; menu: string; judul: string; href: string; tahapan: Tahapan[]; satuan: string; catatan?: string };
export type Kejadian = { waktu: string; menu: string; teks: string; href: string; nada: Tahapan["nada"] };

const HARI = 86_400_000;

export async function dataTracking(unit: { id: number | null; nama: string } | null) {
  const b = batasUnit(unit?.nama ?? null);
  const kini = Date.now();
  const tahunIni = new Date().getFullYear();
  const wherePaket = { tahun: tahunIni, ...(unit ? { unitKerja: { nama: unit.nama } } : {}) };
  const [paketSerap, lapor, wo, jadwal, kal, alarmBuka, alarmBelumAkui, alarm30, hta, allies, rkbu,
    evLapor, evWo, evKal, evAlarm, evPaket] = await Promise.all([
    prisma.paket.groupBy({ by: ["serapan"], where: wherePaket, _count: { _all: true }, _sum: { nilai: true } }),
    prisma.permintaanKerja.groupBy({ by: ["status"], where: b.permintaan, _count: { _all: true } }),
    prisma.perintahKerja.groupBy({ by: ["status"], where: b.perintah, _count: { _all: true } }),
    prisma.jadwalPreventif.findMany({ where: { ...b.viaAlat, aktif: true }, select: { berikutnya: true } }),
    getDataKalibrasi({ kunci: unit?.nama ?? null, f: { q: "", unit: "", status: "", jenis: "", lembaga: "", tahun: "", mode: "alat" }, page: 1, pageSize: 1 }),
    prisma.alarmPantau.count({ where: { selesai: null, ...(unit?.id ? { lokasi: { unitKerjaId: unit.id } } : {}) } }),
    prisma.alarmPantau.count({ where: { diakuiPada: null, mulai: { gte: new Date(kini - 30 * HARI) }, ...(unit?.id ? { lokasi: { unitKerjaId: unit.id } } : {}) } }),
    prisma.alarmPantau.count({ where: { mulai: { gte: new Date(kini - 30 * HARI) }, ...(unit?.id ? { lokasi: { unitKerjaId: unit.id } } : {}) } }),
    prisma.produkHta.count(),
    ringkasanAllies(unit?.id ?? null),
    prisma.dokumenRkbu.count({ where: { tahun: tahunIni } }),
    prisma.permintaanKerja.findMany({ where: b.permintaan, orderBy: { updatedAt: "desc" }, take: 8, select: { nomor: true, namaAlat: true, status: true, updatedAt: true, createdAt: true } }),
    prisma.perintahKerja.findMany({ where: b.perintah, orderBy: { updatedAt: "desc" }, take: 8, select: { nomor: true, status: true, jenis: true, updatedAt: true, alat: { select: { nama: true } } } }),
    prisma.kalibrasi.findMany({ where: b.viaAlat, orderBy: { createdAt: "desc" }, take: 6, select: { createdAt: true, laik: true, jenis: true, alat: { select: { nama: true, kode: true } } } }),
    prisma.alarmPantau.findMany({ where: unit?.id ? { lokasi: { unitKerjaId: unit.id } } : {}, orderBy: { updatedAt: "desc" }, take: 6, select: { updatedAt: true, selesai: true, diakuiPada: true, jenis: true, lokasi: { select: { nama: true, kode: true } } } }),
    prisma.paket.findMany({ where: wherePaket, orderBy: { updatedAt: "desc" }, take: 5, select: { updatedAt: true, namaPaket: true, serapan: true, kode: true } }),
  ]);
  const n = <T extends { _count: { _all: number } }>(rows: T[], f: (r: T) => boolean) => rows.filter(f).reduce((a, r) => a + r._count._all, 0);
  const st = (rows: { status: string; _count: { _all: number } }[], s: string) => n(rows, (r) => r.status === s);
  const serap = paketSerap.find((r) => r.serapan), rencana = paketSerap.find((r) => !r.serapan);
  const tempo = jadwal.filter((j) => j.berikutnya && j.berikutnya.getTime() <= kini).length;
  const tempo30 = jadwal.filter((j) => j.berikutnya && j.berikutnya.getTime() > kini && j.berikutnya.getTime() <= kini + 30 * HARI).length;
  const h = kal.ringkasan.hitung;

  const alur: Alur[] = [
    {
      id: "perencanaan", menu: "Perencanaan-Pengadaan", judul: `Paket ${tahunIni}: direncanakan → terserap`, href: "/paket", satuan: "paket",
      tahapan: [
        { label: "Direncanakan", jumlah: rencana?._count._all ?? 0, nada: "proses", ket: `Rp ${Math.round((rencana?._sum.nilai ?? 0) / 1e6).toLocaleString("id-ID")} jt` },
        { label: "Terserap", jumlah: serap?._count._all ?? 0, nada: "selesai", ket: `Rp ${Math.round((serap?._sum.nilai ?? 0) / 1e6).toLocaleString("id-ID")} jt` },
      ],
      catatan: `${rkbu} dokumen RKBU/RKPBU disusun untuk ${tahunIni}`,
    },
    {
      id: "lapor", menu: "Lapor Kerusakan", judul: "Laporan kerusakan", href: "/lapor", satuan: "laporan",
      tahapan: [
        { label: "Baru", jumlah: st(lapor, "Baru"), nada: "awas" },
        { label: "Ditinjau", jumlah: st(lapor, "Ditinjau"), nada: "proses" },
        { label: "Diproses", jumlah: st(lapor, "Diproses"), nada: "proses" },
        { label: "Selesai", jumlah: st(lapor, "Selesai"), nada: "selesai" },
        { label: "Ditolak", jumlah: st(lapor, "Ditolak"), nada: "netral" },
      ],
    },
    {
      id: "wo", menu: "Pemeliharaan", judul: "Perintah kerja (WO)", href: "/pemeliharaan", satuan: "WO",
      tahapan: [
        { label: "Terbuka", jumlah: st(wo, "Terbuka"), nada: "awas" },
        { label: "Dikerjakan", jumlah: st(wo, "Dikerjakan"), nada: "proses" },
        { label: "Selesai", jumlah: st(wo, "Selesai"), nada: "selesai" },
        { label: "Batal", jumlah: st(wo, "Batal"), nada: "netral" },
      ],
    },
    {
      id: "preventif", menu: "Pemeliharaan", judul: "Jadwal preventif", href: "/pemeliharaan", satuan: "jadwal",
      tahapan: [
        { label: "Jatuh tempo", jumlah: tempo, nada: "bahaya" },
        { label: "≤ 30 hari", jumlah: tempo30, nada: "awas" },
        { label: "Terjadwal", jumlah: jadwal.length - tempo - tempo30, nada: "selesai" },
      ],
    },
    {
      id: "kalibrasi", menu: "Pengujian dan Kalibrasi", judul: "Status uji/kalibrasi alat", href: "/kalibrasi", satuan: "alat",
      tahapan: [
        { label: "Belum diuji", jumlah: h.belum, nada: "netral" },
        { label: "Kedaluwarsa/tidak laik", jumlah: h.bermasalah, nada: "bahaya" },
        { label: "Habis ≤ 30 hari", jumlah: h.segera, nada: "awas" },
        { label: "Berlaku", jumlah: h.berlaku + h["tanpa-batas"], nada: "selesai" },
      ],
    },
    {
      id: "monitoring", menu: "SI-LOGGER", judul: "Alarm suhu & kelembapan (30 hari)", href: "/monitoring", satuan: "alarm",
      tahapan: [
        { label: "Berlangsung", jumlah: alarmBuka, nada: "bahaya" },
        { label: "Belum diakui", jumlah: alarmBelumAkui, nada: "awas" },
        { label: "Tertangani", jumlah: Math.max(0, alarm30 - alarmBelumAkui), nada: "selesai" },
      ],
    },
    {
      id: "allies", menu: "ALLIES", judul: "Posisi alat dalam siklus hidup", href: "/allies", satuan: "alat",
      tahapan: SIKLUS.map((s) => ({ label: `${s.no}. ${s.nama}`, jumlah: allies.perTahap[s.id], nada: s.id === "penghapusan" ? "bahaya" as const : s.id === "operasional" ? "selesai" as const : "proses" as const })),
      catatan: `${hta} produk tercatat di HTA · ${allies.kandidat.length} kandidat penggantian`,
    },
  ];

  const kejadian: Kejadian[] = [
    ...evLapor.map((l) => ({ waktu: l.updatedAt.toISOString(), menu: "Lapor Kerusakan", teks: `${l.nomor} · ${l.namaAlat} → ${l.status}`, href: "/riwayat", nada: (l.status === "Selesai" ? "selesai" : l.status === "Baru" ? "awas" : "proses") as Tahapan["nada"] })),
    ...evWo.map((w) => ({ waktu: w.updatedAt.toISOString(), menu: "Pemeliharaan", teks: `${w.nomor} ${w.jenis}${w.alat ? ` · ${w.alat.nama}` : ""} → ${w.status}`, href: "/pemeliharaan", nada: (w.status === "Selesai" ? "selesai" : "proses") as Tahapan["nada"] })),
    ...evKal.map((k) => ({ waktu: k.createdAt.toISOString(), menu: "Pengujian dan Kalibrasi", teks: `${k.jenis} ${k.alat.nama} (${k.alat.kode}) → ${k.laik ? "laik" : "TIDAK LAIK"}`, href: `/alat?kode=${encodeURIComponent(k.alat.kode)}`, nada: (k.laik ? "selesai" : "bahaya") as Tahapan["nada"] })),
    ...evAlarm.map((a) => ({ waktu: a.updatedAt.toISOString(), menu: "SI-LOGGER", teks: `${a.lokasi.nama}: alarm ${a.jenis} → ${a.selesai ? "selesai" : "berlangsung"}${a.diakuiPada ? ", diakui" : ""}`, href: `/monitoring/${a.lokasi.kode}`, nada: (a.selesai ? "selesai" : "bahaya") as Tahapan["nada"] })),
    ...evPaket.map((p) => ({ waktu: p.updatedAt.toISOString(), menu: "Perencanaan-Pengadaan", teks: `${p.namaPaket.slice(0, 80)} → ${p.serapan ? "terserap" : "direncanakan"}`, href: "/paket", nada: (p.serapan ? "selesai" : "proses") as Tahapan["nada"] })),
  ].sort((a, b) => Date.parse(b.waktu) - Date.parse(a.waktu)).slice(0, 20);

  return { alur, kejadian };
}

/** Lacak satu nomor WR/WO: langkah-langkah prosesnya dengan waktu (tanpa data pelapor). */
export async function lacakNomor(nomor: string, unit: { nama: string } | null) {
  const b = batasUnit(unit?.nama ?? null);
  const q = nomor.trim().toUpperCase().slice(0, 40);
  if (!q) return null;
  const wr = await prisma.permintaanKerja.findFirst({ where: { ...b.permintaan, nomor: q }, select: { nomor: true, namaAlat: true, status: true, prioritas: true, createdAt: true, updatedAt: true, unitKerja: { select: { nama: true } }, perintah: { select: { nomor: true, status: true, createdAt: true, tanggalMulai: true, tanggalSelesai: true } } } });
  const wo = wr?.perintah ?? (wr ? null : await prisma.perintahKerja.findFirst({ where: { ...b.perintah, nomor: q }, select: { nomor: true, status: true, createdAt: true, tanggalMulai: true, tanggalSelesai: true } }));
  if (!wr && !wo) return null;
  const iso = (d: Date | null | undefined) => d?.toISOString() ?? null;
  const tolak = wr?.status === "Ditolak", batal = wo?.status === "Batal";
  const langkah = [
    ...(wr ? [{ label: "Laporan diterima", waktu: iso(wr.createdAt), selesai: true }] : []),
    ...(wr ? [{ label: tolak ? "Ditolak petugas" : "Ditinjau petugas", waktu: wr.status !== "Baru" ? iso(wr.perintah?.createdAt ?? wr.updatedAt) : null, selesai: wr.status !== "Baru" }] : []),
    { label: "Perintah kerja dibuat", waktu: iso(wo?.createdAt), selesai: Boolean(wo) },
    { label: batal ? "Dibatalkan" : "Dikerjakan teknisi", waktu: iso(wo?.tanggalMulai), selesai: Boolean(wo && (wo.tanggalMulai || wo.status === "Dikerjakan" || wo.status === "Selesai" || batal)) },
    { label: "Selesai", waktu: iso(wo?.tanggalSelesai ?? (wr?.status === "Selesai" ? wr.updatedAt : null)), selesai: wo?.status === "Selesai" || wr?.status === "Selesai" },
  ];
  return { nomor: wr?.nomor ?? wo!.nomor, alat: wr?.namaAlat ?? null, unit: wr?.unitKerja?.nama ?? null, status: wo?.status ?? wr!.status, tolak, langkah };
}
