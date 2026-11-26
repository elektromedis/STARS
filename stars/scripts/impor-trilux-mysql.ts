/**
 * Impor master TRILUX (MySQL) → STARS: rekanan, kalibrator, SKP (sistem kredit poin), master tugas (+ suku cadang), penerimaan alat.
 * Hanya MEMBACA dari TRILUX (SELECT). Aman dijalankan ulang (upsert / lewati yang sudah ada).
 *
 *   # pratinjau (tidak menulis apa pun):
 *   TRILUX_DB_URL="mysql://user:sandi@host:3306/namadb" npx tsx --env-file=.env scripts/impor-trilux-mysql.ts
 *   # tulis ke basis data STARS:
 *   TRILUX_DB_URL="..." npx tsx --env-file=.env scripts/impor-trilux-mysql.ts --tulis
 *   # tambahan: isi master merk/tipe dari kolom merek/model alat STARS yang sudah ada
 *   npx tsx --env-file=.env scripts/impor-trilux-mysql.ts --tulis --merk-dari-alat
 *
 * Kredensial TRILUX hanya lewat variabel lingkungan; jangan ditulis di berkas atau di-commit.
 * Nama tabel/kolom diambil dari skema TRILUX (db/*.sql); bila basis data Anda berbeda, sesuaikan kueri di bawah.
 */
import mysql from "mysql2/promise";
import { prisma } from "../src/lib/prisma";
import { nomorPenerimaanBaru } from "../src/lib/master";

const tulis = process.argv.includes("--tulis");
const merkDariAlat = process.argv.includes("--merk-dari-alat");
const bersih = (v: unknown, n = 300) => (v == null ? null : String(v).replace(/\s+/g, " ").trim().slice(0, n) || null);
const lapor: Record<string, { baru: number; ada: number; lewati: number }> = {};
const hitung = (k: string, h: "baru" | "ada" | "lewati") => { (lapor[k] ??= { baru: 0, ada: 0, lewati: 0 })[h]++; };

type Baris = Record<string, unknown>;

async function rekananDariTabel(db: mysql.Connection, tabel: string, kolomId: string, jenis: "Rekanan" | "Kalibrator") {
  const [rows] = await db.query<mysql.RowDataPacket[]>(`SELECT * FROM \`${tabel}\` WHERE COALESCE(deleted,0)=0`);
  const peta = new Map<number, number>(); // id TRILUX → id STARS (hanya jika menulis)
  for (const r of rows as Baris[]) {
    const nama = bersih(r.name, 200);
    if (!nama) { hitung(tabel, "lewati"); continue; }
    const data = { nama, jenis, alamat: [bersih(r.address, 200), bersih(r.city, 60)].filter(Boolean).join(", ") || null, kontak: bersih(r.pic, 120), telepon: bersih(r.phone ?? r.telp, 40), email: bersih(r.email, 160), catatan: bersih(r.json, 500) };
    const ada = await prisma.rekanan.findUnique({ where: { nama_jenis: { nama, jenis } } });
    hitung(tabel, ada ? "ada" : "baru");
    if (!tulis) continue;
    const x = ada ? await prisma.rekanan.update({ where: { id: ada.id }, data: { ...data, aktif: true } }) : await prisma.rekanan.create({ data });
    peta.set(Number(r[kolomId]), x.id);
  }
  return peta;
}

async function main() {
  const url = process.env.TRILUX_DB_URL;
  if (!url) throw new Error("Set TRILUX_DB_URL (mysql://user:sandi@host:3306/namadb). Kredensial tidak boleh ditulis di berkas.");
  const db = await mysql.createConnection(url);
  try {
    await db.query("SET SESSION TRANSACTION READ ONLY").catch(() => null);
    const petaRekanan = await rekananDariTabel(db, "m_rekanan", "id_rekan", "Rekanan");
    await rekananDariTabel(db, "m_kalibrator", "id_kalibrator", "Kalibrator");

    // SKP = Sistem Kredit Poin (tabel skp: skp_code, skp_name, skp_value)
    const petaSkp = new Map<number, number>();
    const [skp] = await db.query<mysql.RowDataPacket[]>("SELECT * FROM skp WHERE COALESCE(deleted,0)=0");
    for (const r of skp as Baris[]) {
      const nama = bersih(r.skp_name, 200); if (!nama) { hitung("skp", "lewati"); continue; }
      const kode = bersih(r.skp_code, 60) ?? `SKP-${r.id_skp}`;
      const data = { kode, nama, poin: Number(r.skp_value) || 0 };
      const ada = await prisma.skp.findUnique({ where: { kode } });
      hitung("skp", ada ? "ada" : "baru");
      if (!tulis) continue;
      const x = await prisma.skp.upsert({ where: { kode }, update: data, create: data });
      petaSkp.set(Number(r.id_skp), x.id);
    }

    // Suku cadang per tugas: task_partcons → m_parts
    const [parts] = await db.query<mysql.RowDataPacket[]>("SELECT tp.id_task, p.name, tp.jumlah FROM task_partcons tp JOIN m_parts p ON p.id_part = tp.id_part").catch(() => [[]] as unknown as [mysql.RowDataPacket[]]);
    const sukuCadang = new Map<number, string[]>();
    for (const r of parts as Baris[]) { const l = sukuCadang.get(Number(r.id_task)) ?? []; l.push(`${bersih(r.name, 120)} × ${Number(r.jumlah) || 1}`); sukuCadang.set(Number(r.id_task), l); }

    // Master tugas. satuan: 0 hari, 1 minggu, 2 bulan. durasi diasumsikan dalam jam (kolom TRILUX tidak menyebut satuan).
    const [tugas] = await db.query<mysql.RowDataPacket[]>("SELECT * FROM m_task WHERE COALESCE(deleted,0)=0 AND COALESCE(tipe,1)=1");
    for (const r of tugas as Baris[]) {
      const nama = bersih(r.name, 200); if (!nama) { hitung("m_task", "lewati"); continue; }
      const kali = Number(r.satuan) === 1 ? 7 : Number(r.satuan) === 2 ? 30 : 1;
      const data = {
        nama, jenis: "Preventif", periodeHari: Math.max(1, (Number(r.periode) || 0) * kali || 90), durasiMenit: Math.max(1, Math.round((Number(r.durasi) || 1) * 60)),
        biaya: Number(r.biaya) || 0, kritis: Number(r.critical) > 0, checklist: bersih(r.desc, 4000), sukuCadang: (sukuCadang.get(Number(r.id_task)) ?? []).join("\n") || null,
        skpId: petaSkp.get(Number(r.skp_0)) ?? null,
      };
      const ada = await prisma.masterTugas.findUnique({ where: { nama } });
      hitung("m_task", ada ? "ada" : "baru");
      if (tulis) await prisma.masterTugas.upsert({ where: { nama }, update: data, create: data });
    }

    // Penerimaan: tipe 0 N/A, 1 E-catalogue, 2 Lelang/Tender; jenis 1 Medis, 2 Non medis
    const [pen] = await db.query<mysql.RowDataPacket[]>("SELECT * FROM penerimaan").catch(() => [[]] as unknown as [mysql.RowDataPacket[]]);
    for (const r of pen as Baris[]) {
      const nomorKontrak = bersih(r.no_kontrak, 120); if (!nomorKontrak || !r.tanggal) { hitung("penerimaan", "lewati"); continue; }
      const tanggal = new Date(r.tanggal as string | Date);
      if (await prisma.penerimaanAlat.findFirst({ where: { nomorKontrak, tanggal } })) { hitung("penerimaan", "ada"); continue; }
      hitung("penerimaan", "baru");
      if (!tulis) continue;
      const tipeAsal = Number(r.tipe) === 1 ? "E-catalogue" : Number(r.tipe) === 2 ? "Lelang/Tender" : null;
      await prisma.penerimaanAlat.create({ data: {
        nomor: await nomorPenerimaanBaru(), nomorKontrak, tanggal, nomorBap: bersih(r.no_bap, 120), rekananId: petaRekanan.get(Number(r.id_rekanan)) ?? null,
        tipe: "Pembelian", jenis: Number(r.jenis) === 2 ? "Non Medik" : "Medik", catatan: [tipeAsal && `Cara pengadaan: ${tipeAsal}`, bersih(r.desc, 800)].filter(Boolean).join(" — ") || null, oleh: "impor-trilux",
      } });
    }
  } finally { await db.end(); }

  if (merkDariAlat) {
    const alat = await prisma.alat.findMany({ where: { aktif: true, merek: { not: null } }, select: { merek: true, model: true, nama: true }, distinct: ["merek", "model"] });
    for (const a of alat) {
      const merek = bersih(a.merek, 120); if (!merek) continue;
      const ada = await prisma.merkAlat.findUnique({ where: { nama: merek } });
      hitung("merk", ada ? "ada" : "baru");
      if (!tulis) continue;
      const m = ada ?? await prisma.merkAlat.create({ data: { nama: merek } });
      const tipe = bersih(a.model, 120);
      if (tipe) await prisma.tipeAlat.upsert({ where: { merkId_nama: { merkId: m.id, nama: tipe } }, update: {}, create: { merkId: m.id, nama: tipe, namaAlat: bersih(a.nama, 160) } });
    }
  }

  console.log(tulis ? "== HASIL IMPOR (ditulis) ==" : "== PRATINJAU (belum ada yang ditulis; tambahkan --tulis) ==");
  console.table(lapor);
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
