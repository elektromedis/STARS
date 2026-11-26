"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { sesiHalaman } from "@/lib/sesi";
import { izin } from "@/lib/izin-admin";
import { audit, ipDari } from "@/lib/audit";
import { nomorMutasiBaru } from "@/lib/mutasi";
import { s, pesan, modeBaca } from "@/lib/aksi-admin";

const HAL = "/admin/logistik";

/** Catat alat sudah dijemput dari unit asal (tahap penjemputan). */
export async function catatJemput(fd: FormData) {
  const se = await sesiHalaman("Operator");
  await izin(se, "proses", HAL);
  if (modeBaca()) return pesan(HAL, "error", "Server mode internet bersifat baca saja.");
  const m = await prisma.mutasiAlat.findUnique({ where: { id: Number(fd.get("id")) || 0 } });
  if (!m || m.status !== "Disetujui") return pesan(HAL, "error", "Hanya mutasi berstatus Disetujui yang bisa dijemput.");
  await prisma.mutasiAlat.update({ where: { id: m.id }, data: { dijemputOleh: s(fd, "petugas", 120) || se.user.nama || se.user.email || null, dijemputPada: new Date() } });
  await audit("mutasi.jemput", { email: se.user.email, ip: ipDari(await headers()), objek: m.nomor });
  revalidatePath(HAL);
  pesan(HAL, "ok", `${m.nomor}: penjemputan dicatat.`);
}

/** Penggudangan (alat disimpan di gudang) atau pengembalian ke ruangan — dicatat sebagai riwayat mutasi. */
export async function gudangkanAtauKembalikan(fd: FormData) {
  const se = await sesiHalaman("Operator");
  await izin(se, "proses", HAL);
  if (modeBaca()) return pesan(HAL, "error", "Server mode internet bersifat baca saja.");
  const jenis = fd.get("jenis") === "Pengembalian" ? "Pengembalian" : "Penggudangan";
  const alat = await prisma.alat.findUnique({ where: { kode: s(fd, "kode", 60) }, include: { unitKerja: true, ruangan: true } });
  if (!alat) return pesan(HAL, "error", "Kode alat tidak ditemukan.");
  if (await prisma.mutasiAlat.findFirst({ where: { alatId: alat.id, status: { in: ["Diajukan", "Disetujui"] } } })) return pesan(HAL, "error", `${alat.kode} masih punya pengajuan relokasi/mutasi yang belum selesai.`);
  const gudang = s(fd, "gudang", 120) || "Gudang IPSRS";
  const alasan = s(fd, "alasan", 300) || (jenis === "Penggudangan" ? "Alat disimpan di gudang" : "Alat dikembalikan ke ruangan");
  await prisma.$transaction(async (tx) => {
    await tx.mutasiAlat.create({ data: {
      nomor: await nomorMutasiBaru(), alatId: alat.id, jenis, dariUnitId: alat.unitKerjaId, dariUnit: alat.unitKerja.nama, dariRuanganId: alat.ruanganId, dariRuangan: alat.ruangan?.nama ?? alat.lokasi,
      keUnitId: alat.unitKerjaId, keUnit: alat.unitKerja.nama, keRuanganId: alat.ruanganId, keRuangan: jenis === "Penggudangan" ? gudang : alat.ruangan?.nama ?? alat.lokasi,
      alasan, kondisi: alat.kondisi, status: "Selesai", gudang: jenis === "Penggudangan" ? gudang : null, diajukanOleh: se.user.email, diputuskanOleh: se.user.email, diputuskanPada: new Date(),
    } });
    await tx.alat.update({ where: { id: alat.id }, data: jenis === "Penggudangan" ? { statusOperasi: "Tidak beroperasi", alasanTidakOperasi: "Lainnya" } : { statusOperasi: "Beroperasi", alasanTidakOperasi: null } });
  });
  await audit(`mutasi.${jenis.toLowerCase()}`, { email: se.user.email, ip: ipDari(await headers()), objek: alat.kode, detail: alasan });
  revalidatePath(HAL);
  pesan(HAL, "ok", `${alat.kode}: ${jenis.toLowerCase()} dicatat.`);
}

/** Usul penghapusan alat yang tidak bisa diperbaiki (tautan ke modul Penghapusan). */
export async function usulHapus(fd: FormData) {
  const se = await sesiHalaman("Operator");
  await izin(se, "buat", HAL);
  if (modeBaca()) return pesan(HAL, "error", "Server mode internet bersifat baca saja.");
  const alat = await prisma.alat.findUnique({ where: { kode: s(fd, "kode", 60) } });
  if (!alat) return pesan(HAL, "error", "Kode alat tidak ditemukan.");
  if (await prisma.penghapusan.findFirst({ where: { alatId: alat.id, status: { in: ["Diajukan", "Diverifikasi"] } } })) return pesan(HAL, "error", `${alat.kode} sudah punya usulan penghapusan yang berjalan.`);
  const th = new Date().getFullYear();
  const akhir = await prisma.penghapusan.findFirst({ where: { nomor: { startsWith: `HPS-${th}-` } }, orderBy: { nomor: "desc" }, select: { nomor: true } });
  const nomor = `HPS-${th}-${String((Number(akhir?.nomor.slice(9)) || 0) + 1).padStart(4, "0")}`;
  await prisma.$transaction([
    prisma.penghapusan.create({ data: { nomor, alatId: alat.id, alasan: "Rusak berat", keterangan: s(fd, "keterangan", 500) || "Tidak dapat diperbaiki (usulan dari Logistik Mutasi)", tujuan: "Dibuang", pengusul: se.user.email ?? se.user.nama ?? "-" } }),
    prisma.alat.update({ where: { id: alat.id }, data: { statusOperasi: "Tidak beroperasi", alasanTidakOperasi: "Rusak tidak dapat diperbaiki" } }),
  ]);
  await audit("penghapusan.usul", { email: se.user.email, ip: ipDari(await headers()), objek: alat.kode, detail: nomor });
  revalidatePath(HAL);
  pesan(HAL, "ok", `Usulan penghapusan ${nomor} dibuat untuk ${alat.kode}. Lanjutkan verifikasi di modul Penghapusan.`);
}
