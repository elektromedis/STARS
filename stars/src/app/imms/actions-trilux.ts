"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { bolehAksi } from "@/lib/role";
import type { KodeAksi } from "@/lib/role-daftar";
import { sesiAksiImms as sesiImms } from "@/lib/imms-sesi";
import { nomorBerikut } from "@/lib/pemeliharaan";
import { HASIL_RUANGAN, KEPUTUSAN_PERMINTAAN_ALAT, MAKS_ITEM, nomorPermintaanAlat, unitBatas } from "@/lib/emascare";

const teks = (f: FormData, k: string, maks = 2000) => String(f.get(k) ?? "").trim().slice(0, maks);
const bil = (f: FormData, k: string) => { const v = Number(f.get(k)); return Number.isFinite(v) ? Math.trunc(v) : NaN; };
const id = (f: FormData, k = "id") => { const v = Number(f.get(k)); if (!Number.isInteger(v) || v <= 0) throw new Error("ID tidak sah"); return v; };
async function wajib(s: { user: { id?: string | null } }, a: KodeAksi) { if (!(await bolehAksi(s.user.id, a))) throw new Error("Peran Anda tidak diizinkan untuk aksi ini (atur di Admin → CMS Pengguna → User System)."); }
const segar = (...p: string[]) => { for (const x of ["/imms", ...p]) revalidatePath(x); };

/* ───────── Percakapan per laporan keluhan ───────── */

export async function kirimPesanKeluhan(f: FormData) {
  const s = await sesiImms("Viewer");
  const wr = await prisma.permintaanKerja.findUnique({ where: { id: id(f, "permintaanId") }, select: { id: true, nomor: true, unitKerjaId: true } });
  if (!wr) throw new Error("Laporan tidak ditemukan");
  const batas = unitBatas(s.user);
  if (batas && wr.unitKerjaId !== batas) throw new Error("Laporan di luar unit kerja Anda.");
  const isi = teks(f, "isi", 1000);
  if (isi.length < 2) throw new Error("Tuliskan pesan.");
  await prisma.pesanKeluhan.create({ data: { permintaanId: wr.id, email: s.user.email ?? null, nama: s.user.nama, peran: s.user.peran, isi } });
  await audit("EMASCARE: pesan keluhan", { email: s.user.email, objek: wr.nomor });
  segar(`/imms/keluhan/${wr.nomor}`);
}

/* ───────── Konfirmasi & penilaian ruangan atas perbaikan selesai ───────── */

export async function nilaiPerbaikan(f: FormData) {
  const s = await sesiImms("Viewer");
  const wo = await prisma.perintahKerja.findUnique({ where: { id: id(f, "woId") }, include: { alat: { select: { id: true, unitKerjaId: true, nama: true, lokasi: true } }, permintaan: { select: { pelapor: true, kontak: true } } } });
  if (!wo || wo.jenis !== "Korektif" || wo.status !== "Selesai") throw new Error("Hanya perbaikan yang sudah selesai yang dapat dinilai.");
  const batas = unitBatas(s.user);
  if (batas && wo.alat?.unitKerjaId !== batas) throw new Error("Perbaikan ini di luar unit kerja Anda.");
  if (wo.hasilRuangan) throw new Error("Perbaikan ini sudah dikonfirmasi ruangan.");
  const rating = bil(f, "rating"), hasil = teks(f, "hasil", 30), catatan = teks(f, "catatan", 500);
  if (!(rating >= 1 && rating <= 5)) throw new Error("Rating harus 1 sampai 5.");
  if (!(HASIL_RUANGAN as readonly string[]).includes(hasil)) throw new Error("Pilih hasil: berfungsi atau belum berfungsi.");
  const kini = new Date();
  await prisma.perintahKerja.update({ where: { id: wo.id }, data: { rating, ratingCatatan: catatan || null, ratingOleh: s.user.email ?? s.user.nama, ratingPada: kini, hasilRuangan: hasil, hasilRuanganOleh: s.user.email ?? s.user.nama, hasilRuanganPada: kini } });
  let lanjut = "";
  if (hasil === "Belum berfungsi" && wo.alat) {
    // Alur TRILUX "gagal memperbaiki": buka laporan keluhan tindak lanjut.
    const wr = await prisma.permintaanKerja.create({ data: { nomor: await nomorBerikut("WR"), alatId: wo.alat.id, namaAlat: wo.alat.nama, unitKerjaId: wo.alat.unitKerjaId, lokasi: wo.alat.lokasi, pelapor: s.user.nama, kontak: s.user.email ?? null, keluhan: `Tindak lanjut ${wo.nomor}: alat dinyatakan belum berfungsi oleh ruangan.${catatan ? ` ${catatan}` : ""}`.slice(0, 2000), prioritas: "Tinggi", status: "Ditinjau" } });
    lanjut = wr.nomor;
  }
  await audit("EMASCARE: penilaian perbaikan", { email: s.user.email, objek: wo.nomor, detail: `${rating}/5 · ${hasil}${lanjut ? ` · ${lanjut}` : ""}` });
  segar("/imms/penilaian", "/imms/keluhan");
  redirect(`/imms/penilaian?ok=${encodeURIComponent(lanjut ? `Terima kasih. Laporan tindak lanjut ${lanjut} dibuat.` : "Terima kasih atas penilaian Anda.")}`);
}

/* ───────── Permintaan alat dari ruangan ───────── */

export async function ajukanPermintaanAlat(f: FormData) {
  const s = await sesiImms("Viewer");
  const uraian = teks(f, "uraian", 1000);
  if (uraian.length < 5) throw new Error("Tuliskan alasan/keperluan permintaan.");
  const item: { namaAlat: string; jumlah: number }[] = [];
  for (let i = 0; i < MAKS_ITEM; i++) {
    const nama = teks(f, `nama_${i}`, 160), jumlah = bil(f, `jumlah_${i}`);
    if (!nama) continue;
    if (!(jumlah >= 1 && jumlah <= 1000)) throw new Error(`Jumlah untuk "${nama}" harus 1–1000.`);
    item.push({ namaAlat: nama, jumlah });
  }
  if (!item.length) throw new Error("Isi minimal satu alat yang diminta.");
  const unitKerjaId = unitBatas(s.user) ?? (Number(f.get("unitKerjaId")) || s.user.unitKerjaId || null);
  const pa = await prisma.permintaanAlat.create({ data: { nomor: await nomorPermintaanAlat(), unitKerjaId: unitKerjaId ?? null, ruangan: teks(f, "ruangan", 120) || null, pemohon: s.user.nama, emailPemohon: s.user.email ?? null, uraian, item: { create: item } } });
  await audit("EMASCARE: permintaan alat", { email: s.user.email, objek: pa.nomor, detail: `${item.length} item` });
  segar("/imms/permintaan-alat");
  redirect(`/imms/permintaan-alat?ok=${encodeURIComponent(`Permintaan ${pa.nomor} terkirim.`)}`);
}

export async function batalkanPermintaanAlat(f: FormData) {
  const s = await sesiImms("Viewer");
  const pa = await prisma.permintaanAlat.findUnique({ where: { id: id(f) } });
  if (!pa || pa.status !== "Baru") throw new Error("Hanya permintaan berstatus Baru yang dapat dibatalkan.");
  const boleh = pa.emailPemohon === s.user.email || (s.user.peran !== "Viewer");
  if (!boleh) throw new Error("Hanya pemohon yang dapat membatalkan.");
  await prisma.permintaanAlat.update({ where: { id: pa.id }, data: { status: "Dibatalkan" } });
  await audit("EMASCARE: permintaan alat batal", { email: s.user.email, objek: pa.nomor });
  segar("/imms/permintaan-alat");
}

/** Kepala instalasi / Pimpinan (Admin) memutuskan: pengadaan, mutasi, relokasi, atau tolak; jumlah disetujui per item. */
export async function putuskanPermintaanAlat(f: FormData) {
  const s = await sesiImms("Admin");
  await wajib(s, "setujui");
  const pa = await prisma.permintaanAlat.findUnique({ where: { id: id(f) }, include: { item: true } });
  if (!pa || pa.status !== "Baru") throw new Error("Permintaan sudah diputuskan atau tidak ditemukan.");
  const keputusan = teks(f, "keputusan", 20);
  if (!(KEPUTUSAN_PERMINTAAN_ALAT as readonly string[]).includes(keputusan)) throw new Error("Pilih keputusan.");
  const catatan = teks(f, "catatan", 500);
  if (keputusan === "Ditolak" && !catatan) throw new Error("Isi alasan penolakan.");
  await prisma.$transaction([
    ...pa.item.map((it) => { const v = keputusan === "Ditolak" ? 0 : bil(f, `setuju_${it.id}`); const setuju = Number.isFinite(v) ? Math.min(Math.max(v, 0), it.jumlah) : it.jumlah; return prisma.itemPermintaanAlat.update({ where: { id: it.id }, data: { jumlahSetuju: setuju } }); }),
    prisma.permintaanAlat.update({ where: { id: pa.id }, data: { status: keputusan, diputuskanOleh: s.user.email ?? s.user.nama, diputuskanPada: new Date(), catatanKeputusan: catatan || null } }),
  ]);
  await audit("EMASCARE: keputusan permintaan alat", { email: s.user.email, objek: pa.nomor, detail: keputusan });
  segar("/imms/permintaan-alat");
}

/** Teknisi mencatat jumlah yang sudah terpenuhi; bila semua item terpenuhi, status menjadi Selesai. */
export async function catatTerpenuhi(f: FormData) {
  const s = await sesiImms("Operator");
  await wajib(s, "proses");
  const pa = await prisma.permintaanAlat.findUnique({ where: { id: id(f) }, include: { item: true } });
  if (!pa || !["Pengadaan", "Mutasi", "Relokasi"].includes(pa.status)) throw new Error("Permintaan belum disetujui atau sudah ditutup.");
  const hasil = pa.item.map((it) => { const v = bil(f, `penuh_${it.id}`); const n = Number.isFinite(v) ? Math.min(Math.max(v, 0), it.jumlahSetuju ?? it.jumlah) : it.jumlahTerpenuhi; return { id: it.id, n, target: it.jumlahSetuju ?? 0 }; });
  const tuntas = hasil.every((h) => h.n >= h.target);
  await prisma.$transaction([
    ...hasil.map((h) => prisma.itemPermintaanAlat.update({ where: { id: h.id }, data: { jumlahTerpenuhi: h.n } })),
    prisma.permintaanAlat.update({ where: { id: pa.id }, data: tuntas ? { status: "Selesai" } : {} }),
  ]);
  await audit("EMASCARE: permintaan alat terpenuhi", { email: s.user.email, objek: pa.nomor, detail: tuntas ? "selesai" : "sebagian" });
  segar("/imms/permintaan-alat");
}
