/**
 * Data menu "Pengujian dan Kalibrasi" (publik): ringkasan status, jatuh tempo, per unit, per lembaga, per tahun,
 * serta tabel per alat / seluruh riwayat. Status alat = catatan TERBARU-nya (lihat statusKalibrasi).
 * Populasi = alat aktif jenis Medik + alat aktif lain yang pernah diuji/dikalibrasi.
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { AMBANG_SEGERA, HARI, statusKalibrasi, type StatusKalibrasi } from "./kalibrasi";

export const JENIS_UJI = ["Kalibrasi", "Pengujian"] as const;
export const STATUS_DATA = [
  { kode: "bermasalah", label: "Kedaluwarsa / tidak laik" },
  { kode: "segera", label: `Habis ≤ ${AMBANG_SEGERA} hari` },
  { kode: "berlaku", label: "Berlaku" },
  { kode: "tanpa-batas", label: "Tanpa masa berlaku" },
  { kode: "belum", label: "Belum pernah" },
] as const;
export type KunciStatus = StatusKalibrasi["kunci"];

export type FilterKalibrasi = { q: string; unit: string; status: string; jenis: string; lembaga: string; tahun: string; mode: "alat" | "riwayat" };

const kolasi = new Intl.Collator("id", { numeric: true, sensitivity: "base" });
const cocok = (teks: (string | null | undefined)[], q: string) => {
  const kata = q.toLowerCase().split(/\s+/).filter(Boolean);
  const gabung = teks.filter(Boolean).join(" ").toLowerCase();
  return kata.every((k) => gabung.includes(k));
};

export async function getDataKalibrasi(o: { kunci: string | null; f: FilterKalibrasi; page: number; pageSize: number }) {
  const unitKunci = o.kunci ?? null;
  const whereAlat: Prisma.AlatWhereInput = { aktif: true, ...(unitKunci ? { unitKerja: { nama: unitKunci } } : {}), OR: [{ jenis: "Medik" }, { kalibrasi: { some: {} } }] };
  const [alat, catatan] = await Promise.all([
    prisma.alat.findMany({
      where: whereAlat,
      select: { id: true, kode: true, nama: true, merek: true, model: true, nomorSeri: true, unitKerja: { select: { nama: true, urut: true } }, ruangan: { select: { nama: true } } },
    }),
    prisma.kalibrasi.findMany({
      where: { alat: whereAlat },
      orderBy: [{ tanggal: "desc" }, { id: "desc" }],
      select: { id: true, alatId: true, tanggal: true, jenis: true, kalibrator: true, nomorSertifikat: true, laik: true, berlakuSampai: true, metode: true, berkas: true },
    }),
  ]);
  const kini = Date.now();
  const terbaru = new Map<number, (typeof catatan)[number]>();
  for (const k of catatan) if (!terbaru.has(k.alatId)) terbaru.set(k.alatId, k);
  const infoAlat = new Map(alat.map((a) => [a.id, a]));

  // --- per alat ---
  const perAlat = alat.map((a) => {
    const k = terbaru.get(a.id) ?? null;
    return { alat: a, k, st: statusKalibrasi(k, kini) };
  });

  // --- ringkasan ---
  const hitung: Record<KunciStatus, number> = { bermasalah: 0, segera: 0, berlaku: 0, "tanpa-batas": 0, belum: 0 };
  let tidakLaik = 0;
  for (const r of perAlat) { hitung[r.st.kunci]++; if (r.k && !r.k.laik) tidakLaik++; }
  const total = perAlat.length;

  // jatuh tempo 12 bulan ke depan (bulan berjalan = 0)
  const d0 = new Date(kini);
  const bulan = Array.from({ length: 12 }, (_, i) => {
    const awal = new Date(Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth() + i, 1));
    return { kunci: awal.toISOString().slice(0, 7), label: awal.toLocaleDateString("id-ID", { month: "short", year: "2-digit", timeZone: "UTC" }), jumlah: 0 };
  });
  const indeksBulan = new Map(bulan.map((b, i) => [b.kunci, i]));
  for (const r of perAlat) {
    if (!r.k?.laik || !r.k.berlakuSampai || r.k.berlakuSampai.getTime() < kini) continue;
    const i = indeksBulan.get(r.k.berlakuSampai.toISOString().slice(0, 7));
    if (i !== undefined) bulan[i].jumlah++;
  }

  // per lembaga (seluruh catatan) — 8 teratas + lainnya
  const lembagaMap = new Map<string, number>();
  for (const k of catatan) lembagaMap.set(k.kalibrator, (lembagaMap.get(k.kalibrator) ?? 0) + 1);
  const lembagaUrut = [...lembagaMap.entries()].sort((a, b) => b[1] - a[1] || kolasi.compare(a[0], b[0]));
  const lembaga = lembagaUrut.slice(0, 8).map(([nama, jumlah]) => ({ nama, jumlah }));
  const sisaLembaga = lembagaUrut.slice(8).reduce((s, [, n]) => s + n, 0);
  if (sisaLembaga) lembaga.push({ nama: `Lainnya (${lembagaUrut.length - 8} lembaga)`, jumlah: sisaLembaga });

  // per tahun & jenis (6 tahun terakhir yang punya data)
  const tahunMap = new Map<number, { Kalibrasi: number; Pengujian: number }>();
  for (const k of catatan) {
    const t = k.tanggal.getUTCFullYear();
    const e = tahunMap.get(t) ?? { Kalibrasi: 0, Pengujian: 0 };
    e[k.jenis === "Pengujian" ? "Pengujian" : "Kalibrasi"]++;
    tahunMap.set(t, e);
  }
  const perTahun = [...tahunMap.entries()].sort((a, b) => a[0] - b[0]).slice(-6).map(([tahun, v]) => ({ tahun, ...v }));

  // per unit
  const unitMap = new Map<string, { nama: string; urut: number; total: number } & Record<KunciStatus, number>>();
  for (const r of perAlat) {
    const u = r.alat.unitKerja;
    const e = unitMap.get(u.nama) ?? { nama: u.nama, urut: u.urut, total: 0, bermasalah: 0, segera: 0, berlaku: 0, "tanpa-batas": 0, belum: 0 };
    e.total++; e[r.st.kunci]++;
    unitMap.set(u.nama, e);
  }
  const perUnit = [...unitMap.values()].sort((a, b) => a.urut - b.urut || kolasi.compare(a.nama, b.nama));

  // pilihan filter
  const opsi = {
    unit: [...new Set(alat.map((a) => a.unitKerja.nama))].sort(kolasi.compare),
    lembaga: lembagaUrut.map(([n]) => n),
    tahun: [...tahunMap.keys()].sort((a, b) => b - a),
  };

  // --- tabel ---
  const f = o.f;
  const tahunF = Number(f.tahun) || null;
  type Baris = {
    id: string; alatId: number; kode: string; nama: string; tipe: string; nomorSeri: string | null; unit: string; ruangan: string | null;
    catatanId: number | null; tanggal: Date | null; jenis: string | null; kalibrator: string | null; nomorSertifikat: string | null; laik: boolean | null;
    berlakuSampai: Date | null; adaBerkas: boolean; st: StatusKalibrasi;
  };
  const keBaris = (a: (typeof alat)[number], k: (typeof catatan)[number] | null, st: StatusKalibrasi): Baris => ({
    id: k ? `k${k.id}` : `a${a.id}`, alatId: a.id, kode: a.kode, nama: a.nama, tipe: [a.merek, a.model].filter(Boolean).join(" "), nomorSeri: a.nomorSeri,
    unit: a.unitKerja.nama, ruangan: a.ruangan?.nama ?? null, catatanId: k?.id ?? null, tanggal: k?.tanggal ?? null, jenis: k?.jenis ?? null,
    kalibrator: k?.kalibrator ?? null, nomorSertifikat: k?.nomorSertifikat ?? null, laik: k?.laik ?? null, berlakuSampai: k?.berlakuSampai ?? null, adaBerkas: Boolean(k?.berkas), st,
  });
  let baris: Baris[];
  if (f.mode === "riwayat") {
    baris = catatan.flatMap((k) => {
      const a = infoAlat.get(k.alatId);
      if (!a) return [];
      // status catatan lama dinilai sendiri (berlaku/kedaluwarsa pada masanya); status alat ada di mode per alat
      return [keBaris(a, k, statusKalibrasi(k, kini))];
    });
  } else {
    baris = perAlat.map((r) => keBaris(r.alat, r.k, r.st));
  }
  baris = baris.filter((b) =>
    (!f.unit || b.unit === f.unit) &&
    (!f.status || b.st.kunci === f.status) &&
    (!f.jenis || b.jenis === f.jenis) &&
    (!f.lembaga || b.kalibrator === f.lembaga) &&
    (!tahunF || b.tanggal?.getUTCFullYear() === tahunF) &&
    (!f.q || cocok([b.nama, b.tipe, b.nomorSeri, b.kode, b.ruangan, b.kalibrator, b.nomorSertifikat], f.q)));
  if (f.mode === "riwayat") baris.sort((a, b) => (b.tanggal?.getTime() ?? 0) - (a.tanggal?.getTime() ?? 0));
  else baris.sort((a, b) => a.st.peringkat - b.st.peringkat || (a.berlakuSampai?.getTime() ?? Infinity) - (b.berlakuSampai?.getTime() ?? Infinity) || kolasi.compare(a.nama, b.nama));

  const jumlahBaris = baris.length;
  const pages = Math.max(1, Math.ceil(jumlahBaris / o.pageSize));
  const page = Math.min(Math.max(1, o.page), pages);
  return {
    ringkasan: {
      total, hitung, tidakLaik, catatan: catatan.length, sertifikat: catatan.filter((k) => k.berkas).length,
      pengujian: catatan.filter((k) => k.jenis === "Pengujian").length,
      cakupan: total ? (hitung.berlaku + hitung.segera + hitung["tanpa-batas"]) / total : 0,
      jatuhTempo90: perAlat.filter((r) => r.k?.laik && r.k.berlakuSampai && r.k.berlakuSampai.getTime() >= kini && r.k.berlakuSampai.getTime() - kini <= 90 * HARI).length,
    },
    bulan, lembaga, perTahun, perUnit, opsi,
    tabel: { data: baris.slice((page - 1) * o.pageSize, page * o.pageSize), total: jumlahBaris, page, pages, pageSize: o.pageSize },
    semuaBaris: baris,
  };
}
