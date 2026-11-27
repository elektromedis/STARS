"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { sesiHalaman } from "@/lib/sesi";
import { izin } from "@/lib/izin-admin";
import { audit, ipDari } from "@/lib/audit";
import { s, pesan, modeBaca, pesanZod, tglWib } from "@/lib/aksi-admin";
import { IZIN_BAWAAN, PRASARANA_BAWAAN, parseStandar, skemaIzin, skemaNakes, skemaPrasarana, skemaProfil } from "@/lib/aspak";

const HAL = "/admin/aspak";
const url = (bagian: string) => `${HAL}?bagian=${bagian}`;
const baca = () => (modeBaca() ? "Server mode internet bersifat baca saja." : null);

export async function simpanProfil(fd: FormData) {
  const se = await sesiHalaman("Admin"); await izin(se, "ubah", HAL); const g = baca(); if (g) return pesan(url("pemenuhan"), "error", g);
  const v = skemaProfil.safeParse({ kodeFaskes: s(fd, "kodeFaskes", 40) || undefined, strata: s(fd, "strata", 20) || null, kelas: s(fd, "kelas", 20) || undefined });
  if (!v.success) return pesan(url("pemenuhan"), "error", pesanZod(v.error));
  const data = { kodeFaskes: v.data.kodeFaskes ?? null, strata: v.data.strata ?? null, kelas: v.data.kelas ?? null };
  await prisma.profilFaskes.upsert({ where: { id: 1 }, create: { id: 1, ...data }, update: data });
  await audit("aspak.profil", { email: se.user.email, ip: ipDari(await headers()), objek: data.strata ?? "-" });
  revalidatePath(HAL); pesan(url("pemenuhan"), "ok", "Profil faskes disimpan.");
}

export async function imporStandar(fd: FormData) {
  const se = await sesiHalaman("Operator"); await izin(se, "impor", HAL); const g = baca(); if (g) return pesan(url("standar"), "error", g);
  const strata = s(fd, "strata", 20); if (!strata) return pesan(url("standar"), "error", "Pilih strata.");
  const { baris, galat } = parseStandar(String(fd.get("teks") ?? "").slice(0, 200000));
  if (galat.length) return pesan(url("standar"), "error", galat.slice(0, 3).join("; ") + (galat.length > 3 ? ` (+${galat.length - 3} lainnya)` : ""));
  if (!baris.length) return pesan(url("standar"), "error", "Tidak ada baris untuk diimpor.");
  const timpa = fd.get("timpa") === "on";
  await prisma.$transaction(async (tx) => {
    if (timpa) await tx.standarAlat.deleteMany({ where: { strata } });
    for (const b of baris) await tx.standarAlat.upsert({
      where: { strata_namaRuangan_namaAlat: { strata, namaRuangan: b.namaRuangan, namaAlat: b.namaAlat } },
      create: { strata, ...b, kodeRuangan: b.kodeRuangan ?? null }, update: { jumlah: b.jumlah, kodeRuangan: b.kodeRuangan ?? null },
    });
  });
  await audit("aspak.standar.impor", { email: se.user.email, ip: ipDari(await headers()), objek: `${strata}: ${baris.length} baris` });
  revalidatePath(HAL); pesan(url("standar"), "ok", `${baris.length} baris standar strata ${strata} diimpor.`);
}

export async function hapusStandar(fd: FormData) {
  const se = await sesiHalaman("Admin"); await izin(se, "hapus", HAL); const g = baca(); if (g) return pesan(url("standar"), "error", g);
  const strata = s(fd, "strata", 20);
  const r = await prisma.standarAlat.deleteMany({ where: { strata } });
  await audit("aspak.standar.hapus", { email: se.user.email, objek: `${strata}: ${r.count}` });
  revalidatePath(HAL); pesan(url("standar"), "ok", `${r.count} baris standar strata ${strata} dihapus.`);
}

export async function isiDaftarBawaan() {
  const se = await sesiHalaman("Operator"); await izin(se, "buat", HAL); const g = baca(); if (g) return pesan(url("izin"), "error", g);
  let n = 0;
  for (const [kelompok, daftar] of Object.entries(IZIN_BAWAAN)) for (const nama of daftar) {
    const r = await prisma.izinFaskes.upsert({ where: { kelompok_nama: { kelompok, nama } }, create: { kelompok, nama }, update: {} }); if (r) n++;
  }
  for (const p of PRASARANA_BAWAAN) await prisma.prasaranaFaskes.upsert({ where: { jenis_uraian: { jenis: p.jenis, uraian: p.uraian } }, create: p, update: {} });
  await audit("aspak.bawaan", { email: se.user.email, objek: `${n} butir` });
  revalidatePath(HAL); pesan(url("izin"), "ok", "Daftar izin, mutu, dan prasarana baku diisi (data yang sudah ada tidak ditimpa).");
}

export async function simpanIzin(fd: FormData) {
  const se = await sesiHalaman("Operator"); await izin(se, "ubah", HAL); const g = baca(); if (g) return pesan(url("izin"), "error", g);
  const tglTeks = s(fd, "berlakuSampai", 10);
  const v = skemaIzin.safeParse({ kelompok: fd.get("kelompok"), nama: s(fd, "nama", 200), ada: fd.get("ada") === "on", nomor: s(fd, "nomor", 100) || undefined, selamanya: fd.get("selamanya") === "on", berlakuSampai: tglTeks ? tglWib(tglTeks) : null, catatan: s(fd, "catatan", 300) || undefined });
  if (!v.success) return pesan(url("izin"), "error", pesanZod(v.error));
  if (v.data.berlakuSampai && Number.isNaN(v.data.berlakuSampai.getTime())) return pesan(url("izin"), "error", "Tanggal berlaku tidak valid.");
  const { kelompok, nama, ...isi } = v.data;
  const data = { ...isi, ada: isi.ada || !!isi.berlakuSampai || isi.selamanya, nomor: isi.nomor ?? null, catatan: isi.catatan ?? null, berlakuSampai: isi.selamanya ? null : isi.berlakuSampai };
  await prisma.izinFaskes.upsert({ where: { kelompok_nama: { kelompok, nama } }, create: { kelompok, nama, ...data }, update: data });
  await audit("aspak.izin", { email: se.user.email, ip: ipDari(await headers()), objek: nama });
  revalidatePath(HAL); pesan(url("izin"), "ok", `${nama} disimpan.`);
}

export async function simpanPrasarana(fd: FormData) {
  const se = await sesiHalaman("Operator"); await izin(se, "ubah", HAL); const g = baca(); if (g) return pesan(url("prasarana"), "error", g);
  const v = skemaPrasarana.safeParse({ id: fd.get("id"), ada: fd.get("ada") === "on", jumlah: fd.get("jumlah") || 0, berfungsi: fd.get("berfungsi") === "on" });
  if (!v.success) return pesan(url("prasarana"), "error", pesanZod(v.error));
  const { id, ...data } = v.data;
  const r = await prisma.prasaranaFaskes.update({ where: { id }, data: { ...data, ada: data.ada || data.jumlah > 0 } }).catch(() => null);
  if (!r) return pesan(url("prasarana"), "error", "Butir prasarana tidak ditemukan.");
  await audit("aspak.prasarana", { email: se.user.email, ip: ipDari(await headers()), objek: r.uraian });
  revalidatePath(HAL); pesan(url("prasarana"), "ok", `${r.uraian} disimpan.`);
}

export async function simpanNakes(fd: FormData) {
  const se = await sesiHalaman("Operator"); await izin(se, "ubah", HAL); const g = baca(); if (g) return pesan(url("sdm"), "error", g);
  const v = skemaNakes.safeParse({ jenis: s(fd, "jenis", 120), kelompok: s(fd, "kelompok", 120) || undefined, jumlah: fd.get("jumlah") || 0, strMemiliki: fd.get("strMemiliki") || 0, strAktif: fd.get("strAktif") || 0, sipMemiliki: fd.get("sipMemiliki") || 0, sipAktif: fd.get("sipAktif") || 0 });
  if (!v.success) return pesan(url("sdm"), "error", pesanZod(v.error));
  const data = { ...v.data, kelompok: v.data.kelompok ?? null };
  await prisma.tenagaFaskes.upsert({ where: { jenis: data.jenis }, create: data, update: data });
  await audit("aspak.nakes", { email: se.user.email, ip: ipDari(await headers()), objek: data.jenis });
  revalidatePath(HAL); pesan(url("sdm"), "ok", `${data.jenis} disimpan.`);
}

export async function hapusNakes(fd: FormData) {
  const se = await sesiHalaman("Admin"); await izin(se, "hapus", HAL); const g = baca(); if (g) return pesan(url("sdm"), "error", g);
  const r = await prisma.tenagaFaskes.delete({ where: { id: Number(fd.get("id")) || 0 } }).catch(() => null);
  if (r) await audit("aspak.nakes.hapus", { email: se.user.email, objek: r.jenis });
  revalidatePath(HAL); pesan(url("sdm"), "ok", r ? `${r.jenis} dihapus.` : "Tidak ditemukan.");
}

/* ───────── ASPAK & SIRS RS Online ───────── */

/** Unggah satu atau beberapa CSV hasil ekstraksi SIRS RS Online (jenis dikenali dari kolom kepala). */
export async function imporRsOnlineCsv(fd: FormData) {
  const se = await sesiHalaman("Admin"); await izin(se, "impor", url("kompetensi"));
  const { bacaCsv, kenaliBerkas, imporRsOnline } = await import("@/lib/rs-online");
  const files = fd.getAll("berkas").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return pesan(url("kompetensi"), "error", "Pilih berkas CSV (aspak_device_ref, aspak_rooms, aspak_inventory, competency, competency_requirement).");
  const set: Partial<Record<string, ReturnType<typeof bacaCsv>>> = {}, dilewati: string[] = [];
  for (const f of files) {
    if (f.size > 5 * 1024 * 1024) { dilewati.push(`${f.name} (> 5 MB)`); continue; }
    const baris = bacaCsv(await f.text());
    const j = kenaliBerkas(baris);
    if (!j) { dilewati.push(f.name); continue; }
    set[j] = baris;
  }
  if (!Object.keys(set).length) return pesan(url("kompetensi"), "error", `Tidak ada berkas yang dikenali${dilewati.length ? `: ${dilewati.join(", ")}` : ""}.`);
  let hasil: string[];
  try { hasil = await imporRsOnline(set); } catch (e) { return pesan(url("kompetensi"), "error", `Impor gagal: ${(e as Error).message.slice(0, 200)}`); }
  await audit("aspak.rsonline.impor", { email: se.user.email, ip: ipDari(await headers()), detail: hasil.join("; ") });
  revalidatePath(HAL);
  pesan(url("kompetensi"), "ok", `Diimpor: ${hasil.join(", ")}.${dilewati.length ? ` Dilewati: ${dilewati.join(", ")}.` : ""}`);
}

/** Pemetaan ruang ASPAK → unit kerja STARS (Admin), sekaligus tandai terverifikasi. */
export async function simpanPemetaanRuang(fd: FormData) {
  const se = await sesiHalaman("Admin"); await izin(se, "ubah", url("inventaris"));
  const kode = s(fd, "kode", 32), unitKerjaId = Number(fd.get("unitKerjaId")) || null;
  if (unitKerjaId && !(await prisma.unitKerja.findUnique({ where: { id: unitKerjaId } }))) return pesan(url("inventaris"), "error", "Unit kerja tidak dikenal.");
  const r = await prisma.aspakRuang.update({ where: { kode }, data: { unitKerjaId, terverifikasi: fd.get("terverifikasi") === "on" } }).catch(() => null);
  if (!r) return pesan(url("inventaris"), "error", "Ruang ASPAK tidak ditemukan.");
  await audit("aspak.ruang.petakan", { email: se.user.email, ip: ipDari(await headers()), objek: r.kode, detail: `${r.nama} → unit #${unitKerjaId ?? "-"}${r.terverifikasi ? " (terverifikasi)" : ""}` });
  revalidatePath(HAL); pesan(`${url("inventaris")}#ruang-${r.kode}`, "ok", `${r.nama} disimpan.`);
}
