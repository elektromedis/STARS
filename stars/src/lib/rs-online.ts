/**
 * ASPAK & SIRS RS Online: impor snapshot CSV (hasil ekstraksi baca-saja dari sirs.kemkes.go.id) dan
 * perhitungan pemenuhan alat/sarana per kompetensi RS — pengganti view PostgreSQL patch (STARS memakai SQLite).
 * Aturan grup: TERPENUHI bila semua item Wajib tersedia (>0) DAN, bila ada item Substitusi, minimal satu tersedia.
 * Ketersediaan per kode ASPAK: inventaris ASPAK snapshot terbaru → bila kosong, alat aktif STARS ber-kode ASPAK sama → bila kosong, jumlah snapshot SIRS.
 */
import { prisma } from "./prisma";

export type Baris = Record<string, string>;

/** Parser CSV minimal (quote ganda, koma di dalam kutip, BOM). */
export function bacaCsv(text: string): Baris[] {
  text = text.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [], cur = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cur); rows.push(row); row = []; cur = ""; }
    else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.length > 1);
  if (!head) return [];
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? "").trim()])));
}

/** Berkas yang dikenali (nama berkas boleh berawalan/berakhiran lain, mis. salinan "aspak_inventory (1).csv"). */
export const BERKAS_RS_ONLINE = {
  kode: { nama: "aspak_device_ref.csv", kolom: ["kode_aspak", "nama", "kelompok"] },
  ruang: { nama: "aspak_rooms.csv", kolom: ["kode_ruang", "nama_ruang_aspak", "usulan_unit_kerja_stars"] },
  inventaris: { nama: "aspak_inventory.csv", kolom: ["nama_alat", "kode_ruang", "jumlah", "rusak"] },
  kompetensi: { nama: "competency.csv", kolom: ["id", "nama_kompetensi", "strata_rs_saat_ini"] },
  syarat: { nama: "competency_requirement.csv", kolom: ["competency_id", "strata", "kode_aspak", "status", "group_code"] },
} as const;
export type JenisBerkas = keyof typeof BERKAS_RS_ONLINE;

/** Kenali jenis berkas dari kolom kepalanya (bukan dari nama berkas). */
export function kenaliBerkas(baris: Baris[]): JenisBerkas | null {
  const k = new Set(Object.keys(baris[0] ?? {}));
  // Yang paling spesifik dulu: berkas syarat & inventaris juga memuat kolom milik berkas kode & ruang.
  for (const j of ["syarat", "inventaris", "kompetensi", "ruang", "kode"] as JenisBerkas[]) if (BERKAS_RS_ONLINE[j].kolom.every((x) => k.has(x))) return j;
  return null;
}

const huruf = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
const angka = (s: string) => { const n = Math.trunc(Number(s)); return Number.isFinite(n) && n >= 0 ? n : 0; };

/** Impor satu set berkas. Inventaris: snapshot dengan tanggal yang sama diganti; syarat kompetensi: diganti seluruhnya. */
export async function imporRsOnline(berkas: Partial<Record<JenisBerkas, Baris[]>>) {
  const hasil: string[] = [];
  const units = await prisma.unitKerja.findMany({ select: { id: true, nama: true } });
  const unitId = new Map(units.map((u) => [u.nama.toUpperCase(), u.id]));
  await prisma.$transaction(async (tx) => {
    if (berkas.kode?.length) {
      for (const d of berkas.kode) if (d.kode_aspak) await tx.aspakKode.upsert({ where: { kode: d.kode_aspak }, update: { nama: d.nama, kelompok: d.kelompok || "Alat Kesehatan" }, create: { kode: d.kode_aspak, nama: d.nama, kelompok: d.kelompok || "Alat Kesehatan" } });
      hasil.push(`${berkas.kode.length} kode ASPAK`);
    }
    if (berkas.ruang?.length) {
      for (const r of berkas.ruang) {
        if (!r.kode_ruang || !r.nama_ruang_aspak) continue;
        const usul = unitId.get((r.usulan_unit_kerja_stars ?? "").toUpperCase()) ?? null;
        const ada = await tx.aspakRuang.findUnique({ where: { kode: r.kode_ruang } });
        // Pemetaan yang sudah diverifikasi Admin tidak ditimpa usulan berkas.
        if (ada) await tx.aspakRuang.update({ where: { kode: r.kode_ruang }, data: { nama: r.nama_ruang_aspak, ...(ada.terverifikasi ? {} : { unitKerjaId: usul }) } });
        else await tx.aspakRuang.create({ data: { kode: r.kode_ruang, nama: r.nama_ruang_aspak, unitKerjaId: usul } });
      }
      hasil.push(`${berkas.ruang.length} ruang ASPAK`);
    }
    if (berkas.inventaris?.length) {
      const snap = berkas.inventaris.map((x) => x.snapshot).find((x) => /^\d{4}-\d{2}-\d{2}$/.test(x ?? ""));
      const snapshot = snap ? new Date(`${snap}T00:00:00+07:00`) : new Date(new Date().toISOString().slice(0, 10) + "T00:00:00+07:00");
      const ruangAda = new Set((await tx.aspakRuang.findMany({ select: { kode: true } })).map((r) => r.kode));
      const baru = berkas.inventaris.filter((x) => x.kode_ruang);
      for (const x of baru) if (!ruangAda.has(x.kode_ruang)) { await tx.aspakRuang.create({ data: { kode: x.kode_ruang, nama: x.nama_ruang_aspak || x.kode_ruang } }).catch(() => null); ruangAda.add(x.kode_ruang); }
      await tx.aspakInventaris.deleteMany({ where: { snapshot } });
      await tx.aspakInventaris.createMany({ data: baru.map((x) => ({ namaAlat: (x.nama_alat || "(tanpa nama di ASPAK)").replace(/;+$/, "").slice(0, 300), kodeAspak: x.kode_aspak_cocok || x.kode_aspak || null, ruangKode: x.kode_ruang, jumlah: angka(x.jumlah), rusak: angka(x.rusak), sumber: (x.sumber || "SIRS RS Online").slice(0, 80), snapshot })) });
      hasil.push(`${baru.length} baris inventaris (snapshot ${snap ?? new Date(snapshot.getTime() + 7 * 3600_000).toISOString().slice(0, 10)})`);
    }
    if (berkas.kompetensi?.length) {
      for (const c of berkas.kompetensi) { const id = angka(c.id); if (!id) continue; await tx.kompetensiRs.upsert({ where: { id }, update: { nama: c.nama_kompetensi, strataRs: c.strata_rs_saat_ini }, create: { id, nama: c.nama_kompetensi, strataRs: c.strata_rs_saat_ini } }); }
      hasil.push(`${berkas.kompetensi.length} kompetensi`);
    }
    if (berkas.syarat?.length) {
      const ada = new Set((await tx.kompetensiRs.findMany({ select: { id: true } })).map((k) => k.id));
      const baris = berkas.syarat.filter((r) => ada.has(angka(r.competency_id)) && r.kode_aspak && r.group_code);
      await tx.syaratKompetensi.deleteMany({});
      await tx.syaratKompetensi.createMany({ data: baris.map((r) => ({ kompetensiId: angka(r.competency_id), strata: huruf(r.strata), kodeAspak: r.kode_aspak, nama: r.nama || r.kode_aspak, kelompok: r.kelompok || null, status: r.status.toLowerCase() === "wajib" ? "Wajib" : "Substitusi", grup: r.group_code, jumlahRs: angka(r.jumlah_rs) })) });
      hasil.push(`${baris.length} syarat kompetensi${baris.length < berkas.syarat.length ? ` (${berkas.syarat.length - baris.length} dilewati: kompetensi belum ada)` : ""}`);
    }
  }, { timeout: 60_000 });
  return hasil;
}

export type GrupStatus = { kompetensiId: number; strata: string; grup: string; kelompok: string | null; terpenuhi: boolean; tersedia: string[]; opsi: { kode: string; nama: string; status: string; jumlah: number; sumber: string }[] };

/** Ketersediaan per kode ASPAK (lihat aturan di atas). */
export async function stokPerKode() {
  const akhir = await prisma.aspakInventaris.findFirst({ orderBy: { snapshot: "desc" }, select: { snapshot: true } });
  const [inv, stars] = await Promise.all([
    akhir ? prisma.aspakInventaris.groupBy({ by: ["kodeAspak"], where: { snapshot: akhir.snapshot, kodeAspak: { not: null } }, _sum: { jumlah: true } }) : Promise.resolve([]),
    prisma.alat.groupBy({ by: ["kodeAspak"], where: { aktif: true, kodeAspak: { not: null } }, _count: { _all: true } }),
  ]);
  return { snapshot: akhir?.snapshot ?? null, aspak: new Map(inv.map((x) => [x.kodeAspak!, x._sum.jumlah ?? 0])), stars: new Map(stars.map((x) => [x.kodeAspak!, x._count._all])) };
}

export async function statusKompetensi() {
  const [syarat, kompetensi, stok] = await Promise.all([
    prisma.syaratKompetensi.findMany({ orderBy: [{ kompetensiId: "asc" }, { strata: "asc" }, { grup: "asc" }] }),
    prisma.kompetensiRs.findMany({ orderBy: { id: "asc" } }),
    stokPerKode(),
  ]);
  const grup = new Map<string, GrupStatus>();
  for (const r of syarat) {
    const k = `${r.kompetensiId}|${r.strata}|${r.grup}`;
    const g = grup.get(k) ?? { kompetensiId: r.kompetensiId, strata: r.strata, grup: r.grup, kelompok: r.kelompok, terpenuhi: false, tersedia: [], opsi: [] };
    const a = stok.aspak.get(r.kodeAspak), s = stok.stars.get(r.kodeAspak);
    const [jumlah, sumber] = a != null ? [a, "ASPAK"] : s != null ? [s, "STARS"] : [r.jumlahRs, "SIRS"];
    g.opsi.push({ kode: r.kodeAspak, nama: r.nama, status: r.status, jumlah, sumber });
    grup.set(k, g);
  }
  for (const g of grup.values()) {
    const wajib = g.opsi.filter((o) => o.status === "Wajib"), sub = g.opsi.filter((o) => o.status === "Substitusi");
    g.terpenuhi = wajib.every((o) => o.jumlah > 0) && (!sub.length || sub.some((o) => o.jumlah > 0));
    g.tersedia = g.opsi.filter((o) => o.jumlah > 0).map((o) => o.nama);
  }
  const ringkas = kompetensi.flatMap((c) => {
    const per = new Map<string, GrupStatus[]>();
    for (const g of grup.values()) if (g.kompetensiId === c.id) per.set(g.strata, [...(per.get(g.strata) ?? []), g]);
    return [...per.entries()].map(([strata, gs]) => ({ id: c.id, nama: c.nama, strataRs: c.strataRs, strata, total: gs.length, terpenuhi: gs.filter((x) => x.terpenuhi).length, persen: gs.length ? Math.round((1000 * gs.filter((x) => x.terpenuhi).length) / gs.length) / 10 : 0, belum: gs.filter((x) => !x.terpenuhi) }));
  });
  return { ringkas, snapshot: stok.snapshot, jumlahSyarat: syarat.length };
}
