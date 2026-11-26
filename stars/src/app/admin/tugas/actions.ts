"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { sesiHalaman } from "@/lib/sesi";
import { izin } from "@/lib/izin-admin";
import { audit, ipDari } from "@/lib/audit";
import { skemaSkp, skemaTugas } from "@/lib/tugas";
import { s, pesan, modeBaca, pesanZod } from "@/lib/aksi-admin";

const HAL = "/admin/tugas";

export async function simpanTugas(fd: FormData) {
  const se = await sesiHalaman("Operator");
  await izin(se, "buat", HAL);
  if (modeBaca()) return pesan(HAL, "error", "Server mode internet bersifat baca saja.");
  const v = skemaTugas.safeParse({
    nama: fd.get("nama"), jenis: fd.get("jenis"), durasiMenit: fd.get("durasiMenit") || 60, periodeHari: fd.get("periodeHari") || 90, biaya: fd.get("biaya") || 0, kritis: fd.get("kritis") === "on",
    kataKunci: s(fd, "kataKunci") || undefined, checklist: s(fd, "checklist", 4000) || undefined, sukuCadang: s(fd, "sukuCadang", 2000) || undefined, skpId: fd.get("skpId") || null,
  });
  if (!v.success) return pesan(HAL, "error", pesanZod(v.error));
  const id = Number(fd.get("id")) || null;
  const data = { ...v.data, skpId: v.data.skpId ?? null };
  const ganda = await prisma.masterTugas.findUnique({ where: { nama: data.nama } });
  if (ganda && ganda.id !== id) return pesan(HAL, "error", `Tugas "${data.nama}" sudah ada.`);
  if (id) await prisma.masterTugas.update({ where: { id }, data }); else await prisma.masterTugas.create({ data });
  await audit(id ? "tugas.ubah" : "tugas.tambah", { email: se.user.email, ip: ipDari(await headers()), objek: data.nama });
  revalidatePath(HAL);
  pesan(HAL, "ok", `Tugas ${data.nama} disimpan.`);
}

export async function hapusTugas(fd: FormData) {
  const se = await sesiHalaman("Admin");
  await izin(se, "hapus", HAL);
  const t = await prisma.masterTugas.delete({ where: { id: Number(fd.get("id")) || 0 } }).catch(() => null); // jadwal: tugasId → NULL
  if (t) await audit("tugas.hapus", { email: se.user.email, objek: t.nama });
  revalidatePath(HAL);
  pesan(HAL, "ok", t ? `${t.nama} dihapus (jadwal yang sudah dibuat tetap ada).` : "Tidak ditemukan.");
}

export async function simpanSkp(fd: FormData) {
  const se = await sesiHalaman("Operator");
  await izin(se, "buat", HAL);
  if (modeBaca()) return pesan(HAL, "error", "Server mode internet bersifat baca saja.");
  const v = skemaSkp.safeParse({ kode: fd.get("kode"), nama: fd.get("nama"), poin: fd.get("poin") || 0, uraian: s(fd, "uraian", 1000) || undefined });
  if (!v.success) return pesan(`${HAL}?bagian=skp`, "error", pesanZod(v.error));
  await prisma.skp.upsert({ where: { kode: v.data.kode }, update: v.data, create: v.data });
  await audit("skp.simpan", { email: se.user.email, objek: v.data.kode });
  revalidatePath(HAL);
  pesan(`${HAL}?bagian=skp`, "ok", `SKP ${v.data.kode} disimpan.`);
}

export async function hapusSkp(fd: FormData) {
  const se = await sesiHalaman("Admin");
  await izin(se, "hapus", HAL);
  const k = await prisma.skp.delete({ where: { id: Number(fd.get("id")) || 0 } }).catch(() => null);
  if (k) await audit("skp.hapus", { email: se.user.email, objek: k.kode });
  revalidatePath(HAL);
  pesan(`${HAL}?bagian=skp`, "ok", "SKP dihapus.");
}
