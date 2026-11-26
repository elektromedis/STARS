"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { sesiHalaman } from "@/lib/sesi";
import { izin } from "@/lib/izin-admin";
import { audit, ipDari } from "@/lib/audit";
import { skemaRekanan, skemaMerk, skemaTipe } from "@/lib/master";
import { s, pesan, modeBaca, pesanZod } from "@/lib/aksi-admin";

const HAL = "/admin/master";

export async function simpanRekanan(fd: FormData) {
  const se = await sesiHalaman("Operator");
  await izin(se, "buat", HAL);
  if (modeBaca()) return pesan(HAL, "error", "Server mode internet bersifat baca saja.");
  const v = skemaRekanan.safeParse({ nama: fd.get("nama"), jenis: fd.get("jenis"), alamat: s(fd, "alamat") || undefined, kontak: s(fd, "kontak") || undefined, telepon: s(fd, "telepon") || undefined, email: s(fd, "email") || undefined, sertifikat: s(fd, "sertifikat") || undefined, catatan: s(fd, "catatan") || undefined });
  if (!v.success) return pesan(`${HAL}?bagian=${s(fd, "jenis")}`, "error", pesanZod(v.error));
  const id = Number(fd.get("id")) || null;
  const ganda = await prisma.rekanan.findUnique({ where: { nama_jenis: { nama: v.data.nama, jenis: v.data.jenis } } });
  if (ganda && ganda.id !== id) return pesan(`${HAL}?bagian=${v.data.jenis}`, "error", `${v.data.nama} sudah terdaftar sebagai ${v.data.jenis}.`);
  if (id) await prisma.rekanan.update({ where: { id }, data: v.data }); else await prisma.rekanan.create({ data: v.data });
  await audit(id ? "master.rekanan.ubah" : "master.rekanan.tambah", { email: se.user.email, ip: ipDari(await headers()), objek: v.data.nama, detail: v.data.jenis });
  revalidatePath(HAL);
  pesan(`${HAL}?bagian=${v.data.jenis}`, "ok", `${v.data.nama} disimpan.`);
}

export async function hapusRekanan(fd: FormData) {
  const se = await sesiHalaman("Admin");
  await izin(se, "hapus", HAL);
  const id = Number(fd.get("id")) || 0;
  const r = await prisma.rekanan.findUnique({ where: { id }, include: { _count: { select: { penerimaan: true } } } });
  if (!r) return pesan(HAL, "error", "Data tidak ditemukan.");
  if (r._count.penerimaan) { await prisma.rekanan.update({ where: { id }, data: { aktif: false } }); await audit("master.rekanan.nonaktif", { email: se.user.email, objek: r.nama }); return pesan(`${HAL}?bagian=${r.jenis}`, "ok", `${r.nama} dipakai pada penerimaan alat, jadi dinonaktifkan (tidak dihapus).`); }
  await prisma.rekanan.delete({ where: { id } });
  await audit("master.rekanan.hapus", { email: se.user.email, objek: r.nama });
  revalidatePath(HAL);
  pesan(`${HAL}?bagian=${r.jenis}`, "ok", `${r.nama} dihapus.`);
}

export async function simpanMerk(fd: FormData) {
  const se = await sesiHalaman("Operator");
  await izin(se, "buat", HAL);
  if (modeBaca()) return pesan(HAL, "error", "Server mode internet bersifat baca saja.");
  const v = skemaMerk.safeParse({ nama: fd.get("nama"), negara: s(fd, "negara") || undefined });
  if (!v.success) return pesan(`${HAL}?bagian=Merk`, "error", pesanZod(v.error));
  await prisma.merkAlat.upsert({ where: { nama: v.data.nama }, update: { negara: v.data.negara }, create: v.data });
  await audit("master.merk.simpan", { email: se.user.email, objek: v.data.nama });
  revalidatePath(HAL);
  pesan(`${HAL}?bagian=Merk`, "ok", `Merk ${v.data.nama} disimpan.`);
}

export async function simpanTipe(fd: FormData) {
  const se = await sesiHalaman("Operator");
  await izin(se, "buat", HAL);
  if (modeBaca()) return pesan(HAL, "error", "Server mode internet bersifat baca saja.");
  const v = skemaTipe.safeParse({ merkId: fd.get("merkId"), nama: fd.get("nama"), namaAlat: s(fd, "namaAlat") || undefined });
  if (!v.success) return pesan(`${HAL}?bagian=Merk`, "error", pesanZod(v.error));
  await prisma.tipeAlat.upsert({ where: { merkId_nama: { merkId: v.data.merkId, nama: v.data.nama } }, update: { namaAlat: v.data.namaAlat }, create: v.data });
  await audit("master.tipe.simpan", { email: se.user.email, objek: v.data.nama });
  revalidatePath(HAL);
  pesan(`${HAL}?bagian=Merk`, "ok", `Tipe ${v.data.nama} disimpan.`);
}

export async function hapusMerkTipe(fd: FormData) {
  const se = await sesiHalaman("Admin");
  await izin(se, "hapus", HAL);
  const id = Number(fd.get("id")) || 0;
  if (fd.get("jenis") === "tipe") await prisma.tipeAlat.delete({ where: { id } }).catch(() => null);
  else await prisma.merkAlat.delete({ where: { id } }).catch(() => null); // tipe ikut terhapus (cascade)
  await audit("master.merk.hapus", { email: se.user.email, objek: `${fd.get("jenis")}#${id}` });
  revalidatePath(HAL);
  pesan(`${HAL}?bagian=Merk`, "ok", "Dihapus.");
}
