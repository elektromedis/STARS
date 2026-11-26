"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { sesiAksiImms as sesiImms, tolakTamu } from "@/lib/imms-sesi";
import { nomorBerikut } from "@/lib/pemeliharaan";
import { perbaruiEm } from "@/lib/imms";

const teks = (f: FormData, k: string, maks = 2000) => String(f.get(k) ?? "").trim().slice(0, maks);
const angka = (f: FormData, k: string) => { const v = Number(f.get(k)); return Number.isFinite(v) ? v : NaN; };
const id = (f: FormData, k = "id") => { const v = Number(f.get(k)); if (!Number.isInteger(v) || v <= 0) throw new Error("ID tidak sah"); return v; };
const dalam = (v: number, a: number, b: number) => Number.isInteger(v) && v >= a && v <= b;
const segar = (...p: string[]) => { for (const x of ["/imms", ...p]) revalidatePath(x); };

/* ───────── Nilai EM (F02) ───────── */
export async function simpanEm(f: FormData) {
  const s = await sesiImms("Operator");
  const alatId = id(f, "alatId"), F = angka(f, "f"), A = angka(f, "a"), M = angka(f, "m");
  if (!dalam(F, 2, 10) || !dalam(A, 1, 5) || !dalam(M, 1, 5)) throw new Error("Skor di luar rentang (F 2–10, A 1–5, M 1–5).");
  const alat = await prisma.alat.update({ where: { id: alatId }, data: { emFungsi: F, emRisiko: A, emPemeliharaan: M }, select: { kode: true } });
  const n = await perbaruiEm(alatId, "Penilaian", s.user.email);
  await audit("IMMS: nilai EM", { email: s.user.email, objek: alat.kode, detail: `F${F} A${A} M${M} H${n?.h} = ${n?.total}` });
  segar("/imms/nilai-em", "/imms/jadwal", `/imms/inventaris/${alat.kode}`);
}

export async function hitungUlangSemua() {
  const s = await sesiImms("Admin");
  const alat = await prisma.alat.findMany({ where: { aktif: true, emFungsi: { not: null }, emRisiko: { not: null }, emPemeliharaan: { not: null } }, select: { id: true } });
  for (const a of alat) await perbaruiEm(a.id, "Hitung ulang", s.user.email);
  await audit("IMMS: hitung ulang EM", { email: s.user.email, detail: `${alat.length} alat` });
  segar("/imms/nilai-em", "/imms/jadwal");
}

/* ───────── Pemeliharaan terencana (F04) ───────── */
export async function buatPerintahJadwal(f: FormData) {
  const s = await sesiImms("Operator");
  const j = await prisma.jadwalPreventif.findUnique({ where: { id: id(f) }, include: { alat: { select: { nama: true, kode: true } } } });
  if (!j) throw new Error("Jadwal tidak ditemukan");
  const jenis = teks(f, "jenis") === "Inspeksi" ? "Inspeksi" : "Preventif";
  const ada = await prisma.perintahKerja.findFirst({ where: { jadwalId: j.id, jenis, status: { in: ["Terbuka", "Dikerjakan"] } } });
  if (ada) redirect(`/imms/perbaikan/${ada.nomor}`);
  const wo = await prisma.perintahKerja.create({
    data: { nomor: await nomorBerikut("WO"), alatId: j.alatId, jadwalId: j.id, jenis, prioritas: "Normal", teknisiId: Number(s.user.id) || null,
      deskripsi: `${jenis === "Inspeksi" ? "Inspeksi" : "Pemeliharaan terencana"} ${j.alat.nama} (${j.alat.kode})`, checklist: jenis === "Preventif" ? j.checklist : null },
  });
  await audit("IMMS: buat perintah kerja", { email: s.user.email, objek: wo.nomor, detail: jenis });
  segar("/imms/jadwal", "/imms/terencana", "/imms/inspeksi");
  redirect(`/imms/perbaikan/${wo.nomor}`);
}

export async function buatInspeksiAlat(f: FormData) {
  const s = await sesiImms("Operator");
  const alat = await prisma.alat.findUnique({ where: { id: id(f, "alatId") }, select: { id: true, nama: true, kode: true } });
  if (!alat) throw new Error("Alat tidak ditemukan");
  const wo = await prisma.perintahKerja.create({ data: { nomor: await nomorBerikut("WO"), alatId: alat.id, jenis: "Inspeksi", teknisiId: Number(s.user.id) || null, deskripsi: `Inspeksi ${alat.nama} (${alat.kode})` } });
  await audit("IMMS: buat perintah kerja", { email: s.user.email, objek: wo.nomor, detail: "Inspeksi" });
  redirect(`/imms/perbaikan/${wo.nomor}`);
}

async function tutupJadwal(jadwalId: number | null) {
  if (!jadwalId) return;
  const j = await prisma.jadwalPreventif.findUnique({ where: { id: jadwalId } });
  if (j) await prisma.jadwalPreventif.update({ where: { id: j.id }, data: { terakhir: new Date(), berikutnya: new Date(Date.now() + j.intervalHari * 86_400_000) } });
}

export async function selesaikanTerencana(f: FormData) {
  const s = await sesiImms("Operator");
  const wo = await prisma.perintahKerja.findUnique({ where: { id: id(f) } });
  if (!wo || wo.jenis !== "Preventif") throw new Error("Perintah kerja tidak sah");
  const butir = f.getAll("butir").map(String);
  const checklist = (wo.checklist ?? "").split(/\r?\n/).map((b) => b.replace(/^\[[ xX]\]\s*/, "").trim()).filter(Boolean).map((b) => `${butir.includes(b) ? "[x]" : "[ ]"} ${b}`).join("\n");
  const uji = teks(f, "ujiFungsi") === "Tidak laik" ? "Tidak laik" : "Laik";
  await prisma.perintahKerja.update({ where: { id: wo.id }, data: { checklist, tindakan: teks(f, "tindakan") || null, sukuCadang: teks(f, "sukuCadang") || null, biaya: Math.max(0, angka(f, "biaya") || 0), ujiFungsi: uji, status: "Selesai", tanggalMulai: wo.tanggalMulai ?? wo.createdAt, tanggalSelesai: new Date() } });
  await tutupJadwal(wo.jadwalId);
  if (wo.alatId && uji === "Tidak laik") await laporKerusakan(wo.alatId, `Hasil pemeliharaan terencana ${wo.nomor}: alat tidak laik pakai. ${teks(f, "tindakan")}`, s.user.nama, s.user.email);
  await audit("IMMS: pemeliharaan terencana selesai", { email: s.user.email, objek: wo.nomor, detail: uji });
  segar("/imms/terencana", "/imms/jadwal", `/imms/perbaikan/${wo.nomor}`);
}

/* ───────── Inspeksi (F05) ───────── */
export async function simpanInspeksi(f: FormData) {
  const s = await sesiImms("Operator");
  const wo = await prisma.perintahKerja.findUnique({ where: { id: id(f) } });
  if (!wo || wo.jenis !== "Inspeksi") throw new Error("Perintah kerja tidak sah");
  const hasil = {
    kondisi: teks(f, "kondisi", 40), kelengkapan: teks(f, "kelengkapan", 500), keberadaan: teks(f, "keberadaan", 40),
    pembumian: teks(f, "pembumian", 20), arusBocor: teks(f, "arusBocor", 20), keselamatan: teks(f, "keselamatan", 40),
    unjukKerja: teks(f, "unjukKerja", 40), alatUkur: teks(f, "alatUkur", 200), masalah: teks(f, "masalah", 20), catatan: teks(f, "catatan", 1000),
  };
  const laik = hasil.keselamatan !== "Tidak lolos" && hasil.unjukKerja !== "Tidak sesuai" && hasil.masalah !== "Alat";
  await prisma.perintahKerja.update({ where: { id: wo.id }, data: { hasilInspeksi: JSON.stringify(hasil), ujiFungsi: laik ? "Laik" : "Tidak laik", tindakan: hasil.catatan || null, status: "Selesai", tanggalMulai: wo.tanggalMulai ?? wo.createdAt, tanggalSelesai: new Date() } });
  await tutupJadwal(wo.jadwalId);
  if (wo.alatId && hasil.masalah === "Alat") await laporKerusakan(wo.alatId, `Temuan inspeksi ${wo.nomor}: ${hasil.catatan || "alat bermasalah"}`, s.user.nama, s.user.email);
  if (wo.alatId && hasil.masalah === "Aksesoris") await prisma.alat.update({ where: { id: wo.alatId }, data: { catatan: `Laporan kondisi aksesoris (${wo.nomor}): ${hasil.kelengkapan || hasil.catatan}`.slice(0, 2000) } });
  if (wo.alatId && hasil.keberadaan === "Ada") await prisma.alat.update({ where: { id: wo.alatId }, data: { tanggalInventarisasi: new Date() } });
  await audit("IMMS: inspeksi", { email: s.user.email, objek: wo.nomor, detail: `${laik ? "Laik" : "Tidak laik"}; masalah: ${hasil.masalah || "-"}` });
  segar("/imms/inspeksi", "/imms/jadwal", "/imms/keluhan", `/imms/perbaikan/${wo.nomor}`);
}

/* ───────── Perbaikan (F06) — alur Permenkes 65/2016 ───────── */
async function laporKerusakan(alatId: number, keluhan: string, pelapor: string, email?: string | null) {
  const alat = await prisma.alat.findUnique({ where: { id: alatId }, select: { nama: true, unitKerjaId: true, lokasi: true } });
  if (!alat) return null;
  const wr = await prisma.permintaanKerja.create({ data: { nomor: await nomorBerikut("WR"), alatId, namaAlat: alat.nama, unitKerjaId: alat.unitKerjaId, lokasi: alat.lokasi, pelapor, kontak: email ?? null, keluhan: keluhan.slice(0, 2000), prioritas: "Tinggi" } });
  return wr;
}

export async function buatKeluhan(f: FormData) {
  const s = await sesiImms("Viewer");
  tolakTamu(s);
  const alat = await prisma.alat.findUnique({ where: { id: id(f, "alatId") }, select: { id: true, nama: true, unitKerjaId: true, lokasi: true } });
  if (!alat) throw new Error("Alat tidak ditemukan");
  if (s.user.peran === "Viewer" && s.user.unitKerjaId && s.user.unitKerjaId !== alat.unitKerjaId) throw new Error("Alat di luar unit kerja Anda.");
  const keluhan = teks(f, "keluhan");
  if (keluhan.length < 5) throw new Error("Tuliskan keluhan.");
  const prioritas = ["Darurat", "Tinggi", "Normal", "Rendah"].includes(teks(f, "prioritas")) ? teks(f, "prioritas") : "Normal";
  const wr = await prisma.permintaanKerja.create({ data: { nomor: await nomorBerikut("WR"), alatId: alat.id, namaAlat: alat.nama, unitKerjaId: alat.unitKerjaId, lokasi: alat.lokasi, pelapor: s.user.nama, kontak: s.user.email, keluhan, prioritas, status: "Ditinjau" } });
  await audit("IMMS: laporan keluhan", { email: s.user.email, objek: wr.nomor, detail: prioritas });
  segar("/imms/keluhan");
  redirect("/imms/keluhan?dibuat=" + wr.nomor);
}

export async function terimaKeluhan(f: FormData) {
  const s = await sesiImms("Operator");
  const wr = await prisma.permintaanKerja.findUnique({ where: { id: id(f) }, include: { perintah: true } });
  if (!wr) throw new Error("Laporan tidak ditemukan");
  if (wr.perintah) redirect(`/imms/perbaikan/${wr.perintah.nomor}`);
  const prioritas = ["Darurat", "Tinggi", "Normal", "Rendah"].includes(teks(f, "prioritas")) ? teks(f, "prioritas") : wr.prioritas;
  const wo = await prisma.perintahKerja.create({ data: { nomor: await nomorBerikut("WO"), permintaanId: wr.id, alatId: wr.alatId, jenis: "Korektif", prioritas, deskripsi: wr.keluhan, teknisiId: Number(s.user.id) || null, tanggapanPada: new Date() } });
  await prisma.permintaanKerja.update({ where: { id: wr.id }, data: { status: "Diproses", prioritas } });
  if (wr.alatId) await prisma.alat.update({ where: { id: wr.alatId }, data: { statusOperasi: "Tidak beroperasi", alasanTidakOperasi: "Dalam perbaikan" } });
  await audit("IMMS: keluhan diterima", { email: s.user.email, objek: wo.nomor, detail: wr.nomor });
  redirect(`/imms/perbaikan/${wo.nomor}`);
}

export async function tolakKeluhan(f: FormData) {
  const s = await sesiImms("Operator");
  const wr = await prisma.permintaanKerja.update({ where: { id: id(f) }, data: { status: "Ditolak", catatanPetugas: teks(f, "alasan") || "Ditolak" } });
  await audit("IMMS: keluhan ditolak", { email: s.user.email, objek: wr.nomor });
  segar("/imms/keluhan");
}

export async function simpanAnalisis(f: FormData) {
  const s = await sesiImms("Operator");
  const wo = await prisma.perintahKerja.findUnique({ where: { id: id(f) } });
  if (!wo || wo.status === "Selesai" || wo.status === "Batal") throw new Error("Perintah kerja sudah ditutup");
  const pelaksana = teks(f, "pelaksana") === "Pihak Ketiga" ? "Pihak Ketiga" : "Internal";
  const perluSukuCadang = f.get("perluSukuCadang") === "1";
  const perluUsulan = pelaksana === "Pihak Ketiga" || perluSukuCadang;
  const usulan = teks(f, "usulan");
  if (perluUsulan && usulan.length < 5) throw new Error("Isi usulan: suku cadang yang diperlukan / alasan tidak dapat diperbaiki internal.");
  const biaya = angka(f, "perkiraanBiaya");
  await prisma.perintahKerja.update({
    where: { id: wo.id },
    data: { analisis: teks(f, "analisis") || null, pelaksana, perluSukuCadang, tanggapanPada: wo.tanggapanPada ?? new Date(),
      usulan: perluUsulan ? usulan : null, perkiraanBiaya: perluUsulan && biaya >= 0 ? biaya : null,
      usulanStatus: perluUsulan ? "Diajukan" : null, usulanOleh: perluUsulan ? s.user.nama : null, usulanPada: perluUsulan ? new Date() : null, usulanCatatan: null,
      ...(perluUsulan ? {} : { status: "Dikerjakan", tanggalMulai: wo.tanggalMulai ?? new Date() }) },
  });
  if (perluSukuCadang && wo.alatId) await prisma.alat.update({ where: { id: wo.alatId }, data: { alasanTidakOperasi: "Menunggu suku cadang" } });
  await audit("IMMS: analisis kerusakan", { email: s.user.email, objek: wo.nomor, detail: `${pelaksana}${perluUsulan ? "; usulan diajukan" : ""}` });
  segar("/imms/perbaikan", "/imms/persetujuan", `/imms/perbaikan/${wo.nomor}`);
}

export async function setujuiUsulan(f: FormData) { await putuskanUsulan(f, true); }
export async function tolakUsulan(f: FormData) { await putuskanUsulan(f, false); }

async function putuskanUsulan(f: FormData, setuju: boolean) {
  const s = await sesiImms("Admin");
  const wo = await prisma.perintahKerja.findUnique({ where: { id: id(f) } });
  if (!wo || wo.usulanStatus !== "Diajukan") throw new Error("Usulan tidak menunggu persetujuan");
  const catatan = teks(f, "catatan", 1000);
  if (!setuju && catatan.length < 3) throw new Error("Tuliskan alasan penolakan.");
  await prisma.perintahKerja.update({ where: { id: wo.id }, data: { usulanStatus: setuju ? "Disetujui" : "Ditolak", usulanCatatan: `${catatan || (setuju ? "Disetujui" : "")} — ${s.user.nama}, ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}` } });
  await audit("IMMS: keputusan usulan", { email: s.user.email, objek: wo.nomor, detail: setuju ? "Disetujui" : `Ditolak: ${catatan}` });
  segar("/imms/persetujuan", "/imms/perbaikan", `/imms/perbaikan/${wo.nomor}`);
}

export async function mulaiPerbaikan(f: FormData) {
  const s = await sesiImms("Operator");
  const wo = await prisma.perintahKerja.findUnique({ where: { id: id(f) } });
  if (!wo) throw new Error("Tidak ditemukan");
  if (wo.usulanStatus === "Diajukan" || wo.usulanStatus === "Ditolak") throw new Error("Usulan belum disetujui pimpinan.");
  await prisma.perintahKerja.update({ where: { id: wo.id }, data: { status: "Dikerjakan", tanggalMulai: wo.tanggalMulai ?? new Date(), tanggapanPada: wo.tanggapanPada ?? new Date() } });
  await audit("IMMS: perbaikan dimulai", { email: s.user.email, objek: wo.nomor });
  segar(`/imms/perbaikan/${wo.nomor}`, "/imms/perbaikan");
}

export async function selesaikanPerbaikan(f: FormData) {
  const s = await sesiImms("Operator");
  const wo = await prisma.perintahKerja.findUnique({ where: { id: id(f) } });
  if (!wo || wo.jenis !== "Korektif") throw new Error("Perintah kerja tidak sah");
  if (!wo.tanggalMulai) throw new Error("Perbaikan belum dimulai.");
  const tindakan = teks(f, "tindakan");
  if (tindakan.length < 5) throw new Error("Isi laporan hasil perbaikan.");
  const uji = teks(f, "ujiFungsi") === "Tidak laik" ? "Tidak laik" : "Laik";
  await prisma.perintahKerja.update({ where: { id: wo.id }, data: { tindakan, sukuCadang: teks(f, "sukuCadang") || null, biaya: Math.max(0, angka(f, "biaya") || 0), ujiFungsi: uji, status: "Selesai", tanggalSelesai: new Date() } });
  if (wo.permintaanId) await prisma.permintaanKerja.update({ where: { id: wo.permintaanId }, data: { status: "Selesai", catatanPetugas: tindakan.slice(0, 1000) } });
  if (wo.alatId) {
    await prisma.alat.update({ where: { id: wo.alatId }, data: uji === "Laik" ? { kondisi: "Baik", statusOperasi: "Beroperasi", alasanTidakOperasi: null } : { kondisi: "Rusak Berat", statusOperasi: "Tidak beroperasi", alasanTidakOperasi: "Rusak tidak dapat diperbaiki" } });
    await perbaruiEm(wo.alatId, "Perbaikan selesai", s.user.email); // riwayat kerusakan berubah → EM & jadwal dihitung ulang
  }
  await audit("IMMS: perbaikan selesai", { email: s.user.email, objek: wo.nomor, detail: `Uji fungsi: ${uji}` });
  segar("/imms/perbaikan", "/imms/keluhan", "/imms/nilai-em", `/imms/perbaikan/${wo.nomor}`);
}

export async function batalkanPerintah(f: FormData) {
  const s = await sesiImms("Admin");
  const wo = await prisma.perintahKerja.update({ where: { id: id(f) }, data: { status: "Batal", tindakan: teks(f, "alasan") || "Dibatalkan" } });
  await audit("IMMS: perintah kerja dibatalkan", { email: s.user.email, objek: wo.nomor });
  segar("/imms/perbaikan", `/imms/perbaikan/${wo.nomor}`);
}

/* ───────── Kelola data alat (CMS) — tabel Alat yang sama dengan STARS ───────── */
const KONDISI = ["Baik", "Rusak Ringan", "Rusak Berat", "Afkir"];
export async function simpanAlat(f: FormData) {
  const s = await sesiImms("Operator");
  if (process.env.STARS_MODE === "internet") throw new Error("Server mode internet bersifat baca saja.");
  const idLama = Number(f.get("id")) || null;
  const kode = teks(f, "kode", 60), nama = teks(f, "nama", 200), unitKerjaId = Number(f.get("unitKerjaId"));
  if (!kode || !nama || !Number.isInteger(unitKerjaId) || unitKerjaId <= 0) throw new Error("Kode, nama, dan unit kerja wajib diisi.");
  if (!(await prisma.unitKerja.findUnique({ where: { id: unitKerjaId } }))) throw new Error("Unit kerja tidak dikenal.");
  const ruanganId = Number(f.get("ruanganId")) || null;
  if (ruanganId && !(await prisma.ruangan.findFirst({ where: { id: ruanganId, unitKerjaId } }))) throw new Error("Ruangan bukan milik unit kerja itu.");
  const bentrok = await prisma.alat.findUnique({ where: { kode }, select: { id: true } });
  if (bentrok && bentrok.id !== idLama) throw new Error(`Kode ${kode} sudah dipakai alat lain.`);
  const thn = Number(f.get("tahunPerolehan"));
  const kondisi = teks(f, "kondisi");
  const statusOperasi = teks(f, "statusOperasi") === "Tidak beroperasi" ? "Tidak beroperasi" : "Beroperasi";
  const data = {
    kode, nama, unitKerjaId, ruanganId,
    merek: teks(f, "merek", 120) || null, model: teks(f, "model", 120) || null, nomorSeri: teks(f, "nomorSeri", 120) || null,
    kategori: teks(f, "kategori", 120) || null, kodeAspak: teks(f, "kodeAspak", 60) || null, udi: teks(f, "udi", 200) || null,
    jenis: teks(f, "jenis") === "Non Medik" ? "Non Medik" : "Medik",
    kondisi: KONDISI.includes(kondisi) ? kondisi : "Baik", statusOperasi,
    alasanTidakOperasi: statusOperasi === "Tidak beroperasi" ? teks(f, "alasanTidakOperasi", 120) || null : null,
    tahunPerolehan: Number.isInteger(thn) && thn >= 1950 && thn <= 2100 ? thn : null,
    catatan: teks(f, "catatan") || null,
  };
  const a = idLama ? await prisma.alat.update({ where: { id: idLama }, data }) : await prisma.alat.create({ data });
  await audit(idLama ? "IMMS: ubah alat" : "IMMS: tambah alat", { email: s.user.email, objek: a.kode, detail: a.nama });
  segar("/imms/inventaris", "/imms/data-alat", `/imms/inventaris/${a.kode}`, "/admin/alat");
  redirect(`/imms/inventaris/${encodeURIComponent(a.kode)}`);
}

/* ───────── Sinkron TRILUX (arsip) ───────── */
export async function sinkronSekarang() {
  const s = await sesiImms("Admin");
  const { sinkronTrilux, sinkronAktif } = await import("@/lib/sinkron-trilux");
  if (!sinkronAktif()) throw new Error("TRILUX_DB_URL belum diisi di server.");
  await sinkronTrilux(s.user.email ?? "admin");
  segar("/imms/sinkron", "/imms/inventaris", "/imms/perbaikan", "/imms/kalibrasi", "/imms/keluhan", "/imms/suku-cadang", "/imms/jadwal");
}

export type StatusTamu = { token?: string; sampai?: string; error?: string; ok?: string } | undefined;

/** Admin: buat tautan pratinjau baca-saja (menggantikan tautan lama). */
export async function buatTautanTamu(_p: StatusTamu, f: FormData): Promise<StatusTamu> {
  const s = await sesiImms("Admin");
  const hari = [1, 3, 7, 14, 30].includes(Number(f.get("hari"))) ? Number(f.get("hari")) : 7;
  const { buatTamu } = await import("@/lib/tamu");
  const r = await buatTamu(hari, s.user.email ?? null, teks(f, "ket", 120) || null);
  await audit("IMMS: tautan tamu dibuat", { email: s.user.email, detail: `${hari} hari${teks(f, "ket") ? ` · ${teks(f, "ket", 120)}` : ""}` });
  return r;
}

export async function cabutTautanTamu(): Promise<StatusTamu> {
  const s = await sesiImms("Admin");
  const { cabutTamu } = await import("@/lib/tamu");
  await cabutTamu(s.user.email ?? null);
  await audit("IMMS: tautan tamu dicabut", { email: s.user.email });
  return { ok: "Tautan dicabut. Tautan lama tidak bisa dipakai lagi." };
}

/** Admin: nyalakan / matikan Mode Dosen Pembimbing (alamat EMASCARE langsung terbuka, baca saja). */
export async function aturModeDosen(f: FormData) {
  const s = await sesiImms("Admin");
  const hari = Number(f.get("hari")) || 0;
  const { aturDosen } = await import("@/lib/tamu");
  await aturDosen([1, 3, 7, 14, 30].includes(hari) ? hari : null, s.user.email ?? null);
  await audit(hari ? "IMMS: mode dosen aktif" : "IMMS: mode dosen mati", { email: s.user.email, detail: hari ? `${hari} hari` : null });
  revalidatePath("/imms/akun");
}

/** Keluar dari EMASCARE ke halaman masuk EMASCARE (bukan Beranda, agar Mode Dosen tidak langsung masuk lagi). */
export async function keluarImms() {
  const { signOut } = await import("@/auth");
  await signOut({ redirect: false });
  redirect("/imms/login");
}
