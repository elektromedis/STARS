/**
 * Sinkronisasi dua arah STARS/EMASCARE ↔ TRILUX (arsip) tanpa bentrok.
 *
 * Aturan:
 *  1. Setiap pasangan baris dicatat di tabel SinkronTrilux beserta `hash` = sidik isi bersama saat sinkron terakhir.
 *  2. Saat sinkron, sidik kedua sisi dihitung ulang:
 *     - hanya TRILUX yang berubah  → perubahan dibawa ke STARS;
 *     - hanya STARS yang berubah   → perubahan dibawa ke TRILUX;
 *     - keduanya berubah berbeda   → STARS menang (sumber utama), TRILUX ditimpa, dicatat sebagai "konflik" di audit.
 *  3. Baris baru di salah satu sisi disalin ke sisi lain. Bila kunci alami (kode/nomor seri/nama) sama, baris dipasangkan, bukan diduplikasi.
 *  4. Baris yang dihapus di STARS tetap disimpan di TRILUX sebagai arsip; baris yang hilang dari TRILUX dibuat ulang dari STARS.
 *  5. Saat menulis ke STARS, hanya kolom yang benar-benar berbeda yang diubah, sehingga isian khusus STARS tidak tertimpa.
 *
 * Koneksi: env TRILUX_DB_URL (mysql://user:sandi@host:3306/trilux_lite). Kosong = fitur nonaktif.
 */
import { createHash } from "node:crypto";
import mysql, { type Pool, type RowDataPacket, type ResultSetHeader } from "mysql2/promise";
import { prisma } from "./prisma";
import { audit } from "./audit";
import { nomorBerikut } from "./pemeliharaan";

type Baris = Record<string, unknown> & { id: number };
type Umum = Record<string, string | number | boolean | null>;
type Konteks = {
  db: Pool;
  peta: Record<string, { s2t: Map<number, number>; t2s: Map<number, number> }>;
  unitBawaan: number;
  aspakPerKode: Map<string, number>; aspakPerNama: Map<string, number>; aspakInfo: Map<number, { nama: string; kode: string | null }>;
  merekPerNama: Map<string, number>; merekNama: Map<number, string>;
};
type Adaptor = {
  entitas: string;
  tabel: string[];
  bacaStars(): Promise<Baris[]>;
  bacaTrilux(k: Konteks): Promise<Baris[]>;
  dariStars(s: Baris, k: Konteks): Umum;
  dariTrilux(t: Baris, k: Konteks): Umum;
  kunci(u: Umum): string | null;
  tulisTrilux(u: Umum, idTrilux: number | null, k: Konteks): Promise<number>;
  /** `lama` = bentuk umum baris STARS saat ini (untuk menulis kolom yang berbeda saja). null = buat baru. Kembalikan null bila tidak bisa dibuat. */
  tulisStars(u: Umum, s: Baris | null, lama: Umum | null, k: Konteks): Promise<number | null>;
};

export type HasilEntitas = { entitas: string; keTrilux: number; keStars: number; konflik: number; dilewati: number };

/** Kunci berawalan "_" (kode identitas) hanya untuk memasangkan/membuat baris: tidak ikut sidik dan tidak ditimpa saat pembaruan. */
const sidik = (u: Umum) => createHash("sha1").update(JSON.stringify(Object.keys(u).filter((x) => !x.startsWith("_")).sort().map((x) => [x, u[x] ?? null]))).digest("hex");
/** Semua waktu dibandingkan sebagai jam dinding WIB "YYYY-MM-DD HH:mm" (MariaDB dibaca dengan dateStrings). */
const wib = (d: unknown): string | null => {
  if (!d) return null;
  if (typeof d === "string") return d.replace("T", " ").slice(0, 16);
  return new Date((d as Date).getTime() + 7 * 3_600_000).toISOString().slice(0, 16).replace("T", " ");
};
const tgl = (d: unknown) => wib(d)?.slice(0, 10) ?? null;
const waktu = (d: unknown) => wib(d);
const sql = (d: string | null) => (d ? (d.length === 10 ? `${d} 00:00:00` : `${d.slice(0, 16)}:00`) : null);
const keDate = (d: unknown) => (d ? new Date(`${String(d).length === 10 ? `${d} 00:00` : d}`.replace(" ", "T") + ":00+07:00") : null);
const teks = (v: unknown) => { const s = v == null ? "" : String(v).trim(); return s ? s : null; };
const angka = (v: unknown) => (v == null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
const beda = (u: Umum, lama: Umum | null, kunci: string) => !lama || u[kunci] !== lama[kunci];
const sOf = (k: Konteks, ent: string, idT: unknown) => (idT == null ? null : k.peta[ent]?.t2s.get(Number(idT)) ?? null);
const tOf = (k: Konteks, ent: string, idS: unknown) => (idS == null ? null : k.peta[ent]?.s2t.get(Number(idS)) ?? null);

async function q<T = RowDataPacket>(db: Pool, s: string, p: unknown[] = []) { const [r] = await db.query<RowDataPacket[]>(s, p); return r as T[]; }
async function simpan(db: Pool, tabel: string, kolomId: string, id: number | null, data: Record<string, unknown>) {
  const kol = Object.keys(data);
  if (id) { await db.query(`UPDATE \`${tabel}\` SET ${kol.map((c) => `\`${c}\`=?`).join(",")} WHERE \`${kolomId}\`=?`, [...kol.map((c) => data[c]), id]); return id; }
  const [r] = await db.query<ResultSetHeader>(`INSERT INTO \`${tabel}\` (${kol.map((c) => `\`${c}\``).join(",")}) VALUES (${kol.map(() => "?").join(",")})`, kol.map((c) => data[c]));
  return r.insertId;
}

/* ───────────── Kondisi alat: STARS (kondisi + status operasi) ↔ TRILUX (kondisi 0/1/2 + rusak 0/1/2) ───────────── */
const kondisiUmum = (kondisi: string, operasi: string) => (kondisi === "Baik" ? (operasi === "Tidak beroperasi" ? "2" : "1") : kondisi === "Rusak Ringan" ? "0-0" : "0-2");
const kondisiTrilux = (k: number | null, r: number | null) => (k === 1 ? "1" : k === 2 ? "2" : (r ?? 0) >= 2 ? "0-2" : "0-0");

/* ───────────── Adaptor per jenis data ───────────── */
const ruangan: Adaptor = {
  entitas: "ruangan",
  tabel: ["room"],
  bacaStars: () => prisma.ruangan.findMany() as Promise<Baris[]>,
  bacaTrilux: async (k) => (await q(k.db, "SELECT id_room id, room_name, kepala, deleted FROM room")) as unknown as Baris[],
  dariStars: (s) => ({ nama: teks(s.nama), kepala: teks(s.kepala), aktif: !!s.aktif }),
  dariTrilux: (t) => ({ nama: teks(t.room_name), kepala: teks(t.kepala), aktif: !Number(t.deleted) }),
  kunci: (u) => (u.nama ? String(u.nama).toLowerCase() : null),
  tulisTrilux: (u, id, k) => simpan(k.db, "room", "id_room", id, { room_name: u.nama, kepala: u.kepala, deleted: u.aktif ? 0 : 1 }),
  async tulisStars(u, s, lama, k) {
    const data: Record<string, unknown> = {};
    if (beda(u, lama, "nama")) data.nama = u.nama ?? "Ruangan TRILUX";
    if (beda(u, lama, "kepala")) data.kepala = u.kepala;
    if (beda(u, lama, "aktif")) data.aktif = !!u.aktif;
    if (s) { if (Object.keys(data).length) await prisma.ruangan.update({ where: { id: s.id }, data }); return s.id; }
    const nama = String(data.nama), ada = await prisma.ruangan.findFirst({ where: { nama, unitKerjaId: k.unitBawaan } });
    if (ada) return ada.id;
    return (await prisma.ruangan.create({ data: { nama, kepala: (u.kepala as string) ?? null, aktif: !!u.aktif, unitKerjaId: k.unitBawaan } })).id;
  },
};

const alat: Adaptor = {
  entitas: "alat",
  tabel: ["assets", "asset_em"],
  bacaStars: () => prisma.alat.findMany() as Promise<Baris[]>,
  bacaTrilux: async (k) => (await q(k.db, "SELECT a.id_asset id, a.*, e.fungsi, e.resiko, e.pemeliharaan FROM assets a LEFT JOIN asset_em e ON e.id_asset=a.id_asset")) as unknown as Baris[],
  dariStars: (s) => ({
    _kode: teks(s.kode), merek: teks(s.merek)?.toLowerCase() ?? null, _merek: teks(s.merek), model: teks(s.model), serial: teks(s.nomorSeri), tahun: angka(s.tahunPerolehan), harga: angka(s.hargaPerolehan),
    pendanaan: teks(s.pendanaan), akl: teks(s.akl), catatan: teks(s.catatan), kondisi: kondisiUmum(String(s.kondisi), String(s.statusOperasi)),
    ruang: angka(s.ruanganId), aktif: !!s.aktif,
    em: s.emFungsi != null && s.emRisiko != null && s.emPemeliharaan != null ? `${s.emFungsi}/${s.emRisiko}/${s.emPemeliharaan}` : null,
  }),
  dariTrilux: (t, k) => ({
    _kode: teks(t.no_internal) ?? `TRX-${t.id}`, _idT: Number(t.id), merek: t.id_propbrand ? k.merekNama.get(Number(t.id_propbrand))?.toLowerCase() ?? null : null, _merek: t.id_propbrand ? k.merekNama.get(Number(t.id_propbrand)) ?? null : null, model: teks(t.asset_type), serial: teks(t.serial),
    tahun: angka(t.year), harga: angka(t.cost), pendanaan: teks(t.pendanaan), akl: teks(t.akl_akd), catatan: teks(t.desc),
    kondisi: kondisiTrilux(angka(t.kondisi), angka(t.rusak)), ruang: sOf(k, "ruangan", t.id_room), aktif: Number(t.status ?? 1) !== 0,
    em: t.fungsi != null && t.resiko != null && t.pemeliharaan != null ? `${t.fungsi}/${t.resiko}/${t.pemeliharaan}` : null,
  }),
  kunci: (u) => (u._kode ? `k:${String(u._kode).toLowerCase()}` : null),
  async tulisTrilux(u, id, k) {
    const s = await prisma.alat.findFirst({ where: { kode: String(u._kode) }, select: { nama: true, kodeAspak: true } });
    const idAlat = (s?.kodeAspak && k.aspakPerKode.get(s.kodeAspak)) || (s?.nama && k.aspakPerNama.get(s.nama.toLowerCase())) || null;
    let merek: number | null = null;
    if (u.merek) {
      merek = k.merekPerNama.get(String(u.merek).toLowerCase()) ?? null;
      if (!merek) { merek = await simpan(k.db, "m_properties", "id_prop", null, { prop_name: u._merek ?? u.merek, prop_group: "brand", deleted: 0 }); k.merekPerNama.set(String(u.merek).toLowerCase(), merek); k.merekNama.set(merek, String(u._merek ?? u.merek)); }
    }
    const [kd, rs] = u.kondisi === "1" ? [1, 0] : u.kondisi === "2" ? [2, 0] : u.kondisi === "0-2" ? [0, 2] : [0, 0];
    const data: Record<string, unknown> = {
      id_propbrand: merek, asset_type: u.model, serial: u.serial, year: u.tahun, cost: u.harga, pendanaan: u.pendanaan, akl_akd: u.akl,
      desc: u.catatan, kondisi: kd, rusak: rs, id_room: tOf(k, "ruangan", u.ruang), status: u.aktif ? 1 : 0, lastupdate: new Date(),
    };
    if (idAlat || !id) data.id_alat = idAlat;
    if (!id) data.no_internal = u._kode;
    const idT = await simpan(k.db, "assets", "id_asset", id, data);
    if (u.em) {
      const [f, a, m] = String(u.em).split("/").map(Number);
      await k.db.query("INSERT INTO asset_em (id_asset,fungsi,resiko,pemeliharaan,em) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE fungsi=VALUES(fungsi),resiko=VALUES(resiko),pemeliharaan=VALUES(pemeliharaan),em=VALUES(em)", [idT, f, a, m, f + a + m]);
    }
    return idT;
  },
  async tulisStars(u, s, lama, k) {
    const d: Record<string, unknown> = {};
    if (beda(u, lama, "merek")) d.merek = u._merek;
    const peta: [string, string][] = [ ["model", "model"], ["serial", "nomorSeri"], ["tahun", "tahunPerolehan"], ["harga", "hargaPerolehan"], ["pendanaan", "pendanaan"], ["akl", "akl"], ["catatan", "catatan"], ["ruang", "ruanganId"], ["aktif", "aktif"]];
    for (const [a, b] of peta) if (beda(u, lama, a)) d[b] = u[a];
    if (beda(u, lama, "kondisi")) {
      const c = u.kondisi;
      d.kondisi = c === "1" || c === "2" ? "Baik" : c === "0-2" ? "Rusak Berat" : "Rusak Ringan";
      d.statusOperasi = c === "1" ? "Beroperasi" : "Tidak beroperasi";
    }
    if (beda(u, lama, "em")) {
      const [f, a, m] = u.em ? String(u.em).split("/").map(Number) : [null, null, null];
      Object.assign(d, { emFungsi: f, emRisiko: a, emPemeliharaan: m });
    }
    if (s) { if (Object.keys(d).length) await prisma.alat.update({ where: { id: s.id }, data: d }); return s.id; }
    const t = (await q(k.db, "SELECT id_alat FROM assets WHERE id_asset=?", [u._idT]))[0] as { id_alat?: number } | undefined;
    const info = t?.id_alat ? k.aspakInfo.get(t.id_alat) : undefined;
    const r = u.ruang ? await prisma.ruangan.findUnique({ where: { id: Number(u.ruang) }, select: { unitKerjaId: true } }) : null;
    const kode = (await prisma.alat.findUnique({ where: { kode: String(u._kode) } })) ? `${u._kode}-TRX${u._idT}` : String(u._kode); // kode kembar di TRILUX → diberi akhiran
    return (await prisma.alat.create({ data: { ...d, kode, nama: info?.nama ?? (u.model as string) ?? `Alat TRILUX ${kode}`, kodeAspak: info?.kode ?? null, unitKerjaId: r?.unitKerjaId ?? k.unitBawaan } as never })).id;
  },
};

const JENIS_WO: Record<string, number> = { Korektif: 1, Preventif: 2, Inspeksi: 2 };
const STATUS_WO: Record<string, number> = { Terbuka: 1, Dikerjakan: 2, Selesai: 3, Batal: 5 };
const perintah: Adaptor = {
  entitas: "perintah",
  tabel: ["wo_data"],
  bacaStars: () => prisma.perintahKerja.findMany() as Promise<Baris[]>,
  bacaTrilux: async (k) => (await q(k.db, "SELECT id_wo id, w.* FROM wo_data w")) as unknown as Baris[],
  dariStars: (s) => ({ _nomor: teks(s.nomor), jenis: JENIS_WO[String(s.jenis)] ?? 2, dibuat: tgl(s.createdAt), mulai: waktu(s.tanggalMulai), selesai: waktu(s.tanggalSelesai), status: STATUS_WO[String(s.status)] ?? 1, info: teks(s.deskripsi), alat: angka(s.alatId) }),
  dariTrilux: (t, k) => {
    const st = angka(t.status_wo) ?? 1, j = angka(t.jenis) ?? 2;
    return { _nomor: teks(t.wo_number) ?? `WO-TRX-${t.id}`, jenis: j === 1 ? 1 : 2, dibuat: tgl(t.tgl_buat ?? t.tgl_wo), mulai: waktu(t.tgl_pengerjaan), selesai: waktu(t.tgl_selesai), status: st === 0 || st === 4 ? 1 : st, info: teks(t.info_wo), alat: sOf(k, "alat", t.id_asset) };
  },
  kunci: (u) => (u._nomor ? String(u._nomor) : null),
  tulisTrilux: (u, id, k) => simpan(k.db, "wo_data", "id_wo", id, {
    ...(id ? {} : { wo_number: u._nomor }), jenis: u.jenis, tgl_wo: u.dibuat, tgl_buat: sql(u.dibuat as string), tgl_pengerjaan: sql(u.mulai as string), tgl_selesai: sql(u.selesai as string),
    status_wo: u.status, info_wo: u.info, id_asset: tOf(k, "alat", u.alat),
  }),
  async tulisStars(u, s, lama) {
    const d: Record<string, unknown> = {};
    if (beda(u, lama, "jenis")) d.jenis = u.jenis === 1 ? "Korektif" : "Preventif";
    if (beda(u, lama, "mulai")) d.tanggalMulai = u.mulai ? keDate(u.mulai)! : null;
    if (beda(u, lama, "selesai")) d.tanggalSelesai = u.selesai ? keDate(u.selesai)! : null;
    if (beda(u, lama, "status")) d.status = Object.keys(STATUS_WO).find((x) => STATUS_WO[x] === u.status) ?? "Terbuka";
    if (beda(u, lama, "info")) d.deskripsi = u.info ?? "(dari TRILUX)";
    if (beda(u, lama, "alat")) d.alatId = u.alat;
    if (s) { if (Object.keys(d).length) await prisma.perintahKerja.update({ where: { id: s.id }, data: d }); return s.id; }
    const nomor = (await prisma.perintahKerja.findUnique({ where: { nomor: String(u._nomor) } })) ? await nomorBerikut("WO") : String(u._nomor);
    return (await prisma.perintahKerja.create({ data: { ...d, nomor, prioritas: "Normal", createdAt: keDate(u.dibuat) ?? undefined } as never })).id;
  },
};

const kalibrasi: Adaptor = {
  entitas: "kalibrasi",
  tabel: ["kalibrasi"],
  bacaStars: () => prisma.kalibrasi.findMany() as Promise<Baris[]>,
  bacaTrilux: async (k) => (await q(k.db, "SELECT c.*, m.name kalibrator FROM kalibrasi c LEFT JOIN m_kalibrator m ON m.id_kalibrator=c.id_kalibrator")) as unknown as Baris[],
  dariStars: (s) => ({ alat: angka(s.alatId), kalibrator: teks(s.kalibrator), tanggal: tgl(s.tanggal), petugas: teks(s.petugas), metode: teks(s.metode), laik: !!s.laik, sertifikat: teks(s.nomorSertifikat), berlaku: tgl(s.berlakuSampai), ket: teks(s.keterangan) }),
  dariTrilux: (t, k) => ({ alat: sOf(k, "alat", t.id_asset), kalibrator: teks(t.kalibrator), tanggal: tgl(t.tgl_kalibrasi), petugas: teks(t.petugas), metode: teks(t.metode), laik: Number(t.stt_laik) === 1, sertifikat: teks(t.link_sertifikat), berlaku: tgl(t.tgl_expire), ket: teks(t.keterangan) }),
  kunci: (u) => (u.alat && u.tanggal ? `${u.alat}|${u.tanggal}` : null),
  async tulisTrilux(u, id, k) {
    const nama = String(u.kalibrator ?? "Tidak diketahui");
    let idK = (await q<{ id_kalibrator: number }>(k.db, "SELECT id_kalibrator FROM m_kalibrator WHERE name=? LIMIT 1", [nama]))[0]?.id_kalibrator;
    if (!idK) idK = await simpan(k.db, "m_kalibrator", "id_kalibrator", null, { name: nama });
    return simpan(k.db, "kalibrasi", "id", id, {
    id_asset: tOf(k, "alat", u.alat), id_kalibrator: idK, tgl_kalibrasi: u.tanggal, petugas: u.petugas, metode: u.metode, stt_laik: u.laik ? 1 : 0, link_sertifikat: u.sertifikat, tgl_expire: u.berlaku, keterangan: u.ket,
  });
  },
  async tulisStars(u, s, lama) {
    if (!u.alat || !u.tanggal) return s?.id ?? null;
    const d: Record<string, unknown> = {};
    if (beda(u, lama, "alat")) d.alatId = u.alat;
    if (beda(u, lama, "tanggal")) d.tanggal = keDate(u.tanggal);
    if (beda(u, lama, "kalibrator")) d.kalibrator = u.kalibrator ?? "TRILUX";
    if (beda(u, lama, "petugas")) d.petugas = u.petugas;
    if (beda(u, lama, "metode")) d.metode = u.metode;
    if (beda(u, lama, "laik")) d.laik = !!u.laik;
    if (beda(u, lama, "sertifikat")) d.nomorSertifikat = u.sertifikat;
    if (beda(u, lama, "berlaku")) d.berlakuSampai = u.berlaku ? keDate(u.berlaku) : null;
    if (beda(u, lama, "ket")) d.keterangan = u.ket;
    if (s) { if (Object.keys(d).length) await prisma.kalibrasi.update({ where: { id: s.id }, data: d }); return s.id; }
    return (await prisma.kalibrasi.create({ data: d as never })).id;
  },
};

const STATUS_KELUHAN: Record<string, string> = { Baru: "baru", Ditinjau: "proses", Diproses: "proses", Selesai: "selesai", Ditolak: "tolak" };
const keluhan: Adaptor = {
  entitas: "keluhan",
  tabel: ["complain"],
  bacaStars: () => prisma.permintaanKerja.findMany() as Promise<Baris[]>,
  bacaTrilux: async (k) => (await q(k.db, "SELECT id_compalin id, c.* FROM complain c")) as unknown as Baris[],
  dariStars: (s) => ({ judul: teks(s.namaAlat), isi: teks(s.keluhan), alat: angka(s.alatId), dibuat: waktu(s.createdAt), status: STATUS_KELUHAN[String(s.status)] ?? "baru" }),
  dariTrilux: (t, k) => ({
    judul: teks(t.title), isi: teks(t.desc), alat: sOf(k, "alat", t.id_asset), dibuat: waktu(t.com_time ?? t.create_time),
    status: t.com_finish ? (Number(t.finish_status) === 100 ? "tolak" : "selesai") : t.com_respon ? "proses" : "baru",
  }),
  kunci: (u) => (u.dibuat && u.isi ? `${u.dibuat}|${u.isi}` : null),
  async tulisTrilux(u, id, k) {
    const lama = id ? ((await q(k.db, "SELECT com_respon, com_finish FROM complain WHERE id_compalin=?", [id]))[0] as { com_respon?: Date; com_finish?: Date } | undefined) : undefined;
    const kini = new Date(), st = u.status;
    return simpan(k.db, "complain", "id_compalin", id, {
      title: u.judul, desc: u.isi, id_asset: tOf(k, "alat", u.alat), com_time: sql(u.dibuat as string), create_time: sql(u.dibuat as string),
      com_respon: st === "baru" ? null : lama?.com_respon ?? kini, com_finish: st === "selesai" || st === "tolak" ? lama?.com_finish ?? kini : null, finish_status: st === "tolak" ? 100 : 0,
    });
  },
  async tulisStars(u, s, lama) {
    const d: Record<string, unknown> = {};
    if (beda(u, lama, "judul")) d.namaAlat = u.judul ?? "(tanpa nama alat)";
    if (beda(u, lama, "isi")) d.keluhan = u.isi ?? "(dari TRILUX)";
    if (beda(u, lama, "alat")) d.alatId = u.alat;
    if (beda(u, lama, "status")) d.status = { baru: "Baru", proses: "Diproses", selesai: "Selesai", tolak: "Ditolak" }[String(u.status)] ?? "Baru";
    if (s) { if (Object.keys(d).length) await prisma.permintaanKerja.update({ where: { id: s.id }, data: d }); return s.id; }
    return (await prisma.permintaanKerja.create({ data: { ...d, nomor: await nomorBerikut("WR"), pelapor: "TRILUX", prioritas: "Normal", createdAt: keDate(u.dibuat) ?? undefined } as never })).id;
  },
};

const suku: Adaptor = {
  entitas: "suku",
  tabel: ["m_parts"],
  bacaStars: () => prisma.barangStok.findMany({ where: { jenis: "Sparepart" } }) as Promise<Baris[]>,
  bacaTrilux: async (k) => (await q(k.db, "SELECT id_part id, p.* FROM m_parts p")) as unknown as Baris[],
  dariStars: (s) => ({ _kode: teks(s.kode), nama: teks(s.nama), tipe: teks(s.alatTerkait), harga: angka(s.harga), minimum: angka(s.stokMinimum) ?? 0, ket: teks(s.catatan), aktif: !!s.aktif }),
  dariTrilux: (t) => ({ _kode: teks(t.pn) ?? `PART-TRX-${t.id}`, _idT: Number(t.id), nama: teks(t.name), tipe: teks(t.tipe), harga: angka(t.harga), minimum: angka(t.minimum_stok) ?? 0, ket: teks(t.desc), aktif: !Number(t.deleted) }),
  kunci: (u) => (u._kode ? String(u._kode).toLowerCase() : null),
  tulisTrilux: (u, id, k) => simpan(k.db, "m_parts", "id_part", id, { ...(id ? {} : { pn: u._kode }), name: u.nama, tipe: u.tipe, harga: u.harga, minimum_stok: u.minimum, desc: u.ket, deleted: u.aktif ? 0 : 1 }),
  async tulisStars(u, s, lama) {
    const d: Record<string, unknown> = {};
    for (const [a, b] of [["nama", "nama"], ["tipe", "alatTerkait"], ["harga", "harga"], ["minimum", "stokMinimum"], ["ket", "catatan"], ["aktif", "aktif"]] as const) if (beda(u, lama, a)) d[b] = u[a];
    if (d.nama === null) d.nama = "Suku cadang TRILUX";
    if (s) { if (Object.keys(d).length) await prisma.barangStok.update({ where: { id: s.id }, data: d }); return s.id; }
    return (await prisma.barangStok.create({ data: { ...d, kode: (await prisma.barangStok.findUnique({ where: { kode: String(u._kode) } })) ? `${u._kode}-TRX${u._idT}` : String(u._kode), jenis: "Sparepart" } as never })).id;
  },
};

const jadwal: Adaptor = {
  entitas: "jadwal",
  tabel: ["schedule"],
  bacaStars: () => prisma.jadwalPreventif.findMany() as Promise<Baris[]>,
  bacaTrilux: async (k) => (await q(k.db, "SELECT id_sched id, s.* FROM schedule s")) as unknown as Baris[],
  dariStars: (s) => ({ judul: teks(s.nama), alat: angka(s.alatId), tanggal: tgl(s.berikutnya), tugas: teks(s.checklist), aktif: !!s.aktif }),
  dariTrilux: (t, k) => ({ judul: teks(t.sched_title), alat: sOf(k, "alat", t.id_asset), tanggal: tgl(t.tgl_mulai), tugas: teks(t.task), aktif: Number(t.status ?? 1) !== 0 }),
  kunci: (u) => (u.alat && u.judul ? `${u.alat}|${u.judul}` : null),
  tulisTrilux: (u, id, k) => simpan(k.db, "schedule", "id_sched", id, { sched_title: u.judul, id_asset: tOf(k, "alat", u.alat), tgl_mulai: u.tanggal, tgl_selesai: u.tanggal, task: u.tugas, status: u.aktif ? 1 : 0 }),
  async tulisStars(u, s, lama) {
    if (!u.alat) return s?.id ?? null;
    const d: Record<string, unknown> = {};
    if (beda(u, lama, "judul")) d.nama = u.judul ?? "Jadwal TRILUX";
    if (beda(u, lama, "alat")) d.alatId = u.alat;
    if (beda(u, lama, "tanggal")) d.berikutnya = keDate(u.tanggal);
    if (beda(u, lama, "tugas")) d.checklist = u.tugas;
    if (beda(u, lama, "aktif")) d.aktif = !!u.aktif;
    if (s) { if (Object.keys(d).length) await prisma.jadwalPreventif.update({ where: { id: s.id }, data: d }); return s.id; }
    return (await prisma.jadwalPreventif.create({ data: { ...d, intervalHari: 365 } as never })).id;
  },
};

export const ADAPTOR = [ruangan, alat, suku, perintah, kalibrasi, keluhan, jadwal];

/* ───────────── Mesin ───────────── */
async function jalankan(a: Adaptor, k: Konteks): Promise<HasilEntitas> {
  const h: HasilEntitas = { entitas: a.entitas, keTrilux: 0, keStars: 0, konflik: 0, dilewati: 0 };
  const [S, T, M] = await Promise.all([a.bacaStars(), a.bacaTrilux(k), prisma.sinkronTrilux.findMany({ where: { entitas: a.entitas } })]);
  const sId = new Map(S.map((x) => [x.id, x])), tId = new Map(T.map((x) => [Number(x.id), x]));
  const p = (k.peta[a.entitas] = { s2t: new Map(), t2s: new Map() });
  for (const m of M) { p.s2t.set(m.idStars, m.idTrilux); p.t2s.set(m.idTrilux, m.idStars); }
  const catat = async (idS: number, idT: number, hash: string, asal: string) => {
    await prisma.sinkronTrilux.upsert({ where: { entitas_idStars: { entitas: a.entitas, idStars: idS } }, update: { idTrilux: idT, hash }, create: { entitas: a.entitas, idStars: idS, idTrilux: idT, asal, hash } });
    p.s2t.set(idS, idT); p.t2s.set(idT, idS);
  };
  const terpasangT = new Set<number>();
  for (const m of M) {
    const s = sId.get(m.idStars), t = tId.get(m.idTrilux);
    if (!s) { await prisma.sinkronTrilux.delete({ where: { id: m.id } }); p.s2t.delete(m.idStars); continue; } // dihapus di STARS → TRILUX tetap jadi arsip
    if (!t) { // hilang dari TRILUX → buat ulang
      const u = a.dariStars(s, k); await prisma.sinkronTrilux.delete({ where: { id: m.id } });
      await catat(s.id, await a.tulisTrilux(u, null, k), sidik(u), m.asal); h.keTrilux++; continue;
    }
    terpasangT.add(t.id);
    const us = a.dariStars(s, k), ut = a.dariTrilux(t, k), hs = sidik(us), ht = sidik(ut);
    if (hs === ht) { if (m.hash !== hs) await catat(s.id, t.id, hs, m.asal); continue; }
    const sBerubah = hs !== m.hash, tBerubah = ht !== m.hash;
    if (tBerubah && !sBerubah) { await a.tulisStars(ut, s, us, k); await catat(s.id, t.id, ht, m.asal); h.keStars++; }
    else {
      if (sBerubah && tBerubah) { h.konflik++; await audit("TRILUX: konflik, STARS dipakai", { objek: `${a.entitas} #${s.id}`, detail: `TRILUX #${t.id} ditimpa` }); }
      await a.tulisTrilux(us, t.id, k); await catat(s.id, t.id, hs, m.asal); h.keTrilux++;
    }
  }
  // Baris belum berpasangan: cocokkan lewat kunci alami dulu.
  const tLepas = new Map<string, Baris>();
  for (const t of T) if (!terpasangT.has(Number(t.id)) && !p.t2s.has(Number(t.id))) { const kk = a.kunci(a.dariTrilux(t, k)); tLepas.set(kk && !tLepas.has(kk) ? kk : `#${t.id}`, t); }
  for (const s of S) {
    if (p.s2t.has(s.id)) continue;
    const u = a.dariStars(s, k), kk = a.kunci(u), t = kk ? tLepas.get(kk) : undefined;
    if (t) tLepas.delete(kk!);
    await catat(s.id, await a.tulisTrilux(u, t ? Number(t.id) : null, k), sidik(u), "stars"); h.keTrilux++;
  }
  for (const t of tLepas.values()) {
    const u = a.dariTrilux(t, k), idS = await a.tulisStars(u, null, null, k);
    if (idS == null || p.s2t.has(idS)) { h.dilewati++; continue; }
    await catat(idS, Number(t.id), sidik(u), "trilux"); h.keStars++;
  }
  return h;
}

const NAMA: Record<string, string> = { ruangan: "Ruangan", alat: "Alat", suku: "Suku cadang", perintah: "Perintah kerja", kalibrasi: "Kalibrasi", keluhan: "Keluhan", jadwal: "Jadwal" };
let berjalan: Promise<HasilEntitas[]> | null = null;
export const sinkronAktif = () => !!process.env.TRILUX_DB_URL;

export function sinkronTrilux(oleh = "otomatis"): Promise<HasilEntitas[]> {
  if (berjalan) return berjalan;
  berjalan = (async () => {
    const db = mysql.createPool({ uri: process.env.TRILUX_DB_URL!, connectionLimit: 2, dateStrings: true, timezone: "+07:00" });
    try {
      const [aspak, merek, unit] = await Promise.all([
        q<{ id_alat: number; alat_name: string; alat_code: string | null; code_aspak: string | null }>(db, "SELECT id_alat, alat_name, alat_code, code_aspak FROM aspak_new_alat"),
        q<{ id_prop: number; prop_name: string }>(db, "SELECT id_prop, prop_name FROM m_properties WHERE prop_group='brand' AND IFNULL(deleted,0)=0"),
        prisma.unitKerja.findFirst({ orderBy: { urut: "asc" }, select: { id: true } }),
      ]);
      const k: Konteks = {
        db, peta: {}, unitBawaan: unit?.id ?? 1,
        aspakPerKode: new Map(), aspakPerNama: new Map(), aspakInfo: new Map(), merekPerNama: new Map(), merekNama: new Map(),
      };
      for (const r of aspak) {
        for (const c of [r.alat_code, r.code_aspak]) if (c && !k.aspakPerKode.has(c)) k.aspakPerKode.set(c, r.id_alat);
        if (r.alat_name && !k.aspakPerNama.has(r.alat_name.toLowerCase())) k.aspakPerNama.set(r.alat_name.toLowerCase(), r.id_alat);
        k.aspakInfo.set(r.id_alat, { nama: r.alat_name, kode: r.alat_code ?? r.code_aspak });
      }
      for (const r of merek) { k.merekNama.set(r.id_prop, r.prop_name); if (!k.merekPerNama.has(r.prop_name.toLowerCase())) k.merekPerNama.set(r.prop_name.toLowerCase(), r.id_prop); }
      const hasil: HasilEntitas[] = [], gagal: string[] = [];
      const ada = new Set((await q<{ t: string }>(db, "SELECT table_name t FROM information_schema.tables WHERE table_schema = DATABASE()")).map((r) => r.t));
      for (const a of ADAPTOR) {
        if (a.tabel.some((t) => !ada.has(t))) { hasil.push({ entitas: a.entitas, keTrilux: 0, keStars: 0, konflik: 0, dilewati: -1 }); continue; } // tabel belum ada di TRILUX ini
        try { hasil.push(await jalankan(a, k)); }
        catch (e) { gagal.push(`${a.entitas}: ${(e as Error).message.slice(0, 200)}`); hasil.push({ entitas: a.entitas, keTrilux: 0, keStars: 0, konflik: 0, dilewati: 0 }); }
      }
      if (gagal.length) await audit("TRILUX: sinkron gagal", { email: oleh, detail: gagal.join(" | ") });
      const ringkas = hasil.filter((x) => x.keTrilux + x.keStars + x.konflik || x.dilewati).map((x) => `${NAMA[x.entitas] ?? x.entitas}: ${x.keStars} masuk dari TRILUX, ${x.keTrilux} dikirim ke TRILUX${x.konflik ? `, ${x.konflik} konflik` : ""}${x.dilewati > 0 ? `, dilewati ${x.dilewati}` : x.dilewati < 0 ? " (tabel TRILUX belum ada)" : ""}`).join("; ");
      await audit("TRILUX: sinkron", { email: oleh, detail: ringkas || "tidak ada perubahan" });
      return hasil;
    } catch (e) {
      await audit("TRILUX: sinkron gagal", { email: oleh, detail: String((e as Error).message).slice(0, 500) });
      throw e;
    } finally { await db.end(); berjalan = null; }
  })();
  return berjalan;
}
