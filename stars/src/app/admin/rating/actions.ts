"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { sesiHalaman } from "@/lib/sesi";
import { izin } from "@/lib/izin-admin";
import { audit, ipDari } from "@/lib/audit";
import { s, pesan, modeBaca } from "@/lib/aksi-admin";

const HAL = "/admin/rating";

export async function beriRating(fd: FormData) {
  const se = await sesiHalaman("Operator");
  await izin(se, "proses", HAL);
  if (modeBaca()) return pesan(HAL, "error", "Server mode internet bersifat baca saja.");
  const rating = Math.round(Number(fd.get("rating")));
  if (!(rating >= 1 && rating <= 5)) return pesan(HAL, "error", "Rating harus 1 sampai 5.");
  const wo = await prisma.perintahKerja.findUnique({ where: { id: Number(fd.get("id")) || 0 } });
  if (!wo || wo.status !== "Selesai") return pesan(HAL, "error", "Hanya perintah kerja berstatus Selesai yang bisa dinilai.");
  await prisma.perintahKerja.update({ where: { id: wo.id }, data: { rating, ratingCatatan: s(fd, "catatan", 500) || null, ratingOleh: se.user.email ?? null, ratingPada: new Date() } });
  await audit("wo.rating", { email: se.user.email, ip: ipDari(await headers()), objek: wo.nomor, detail: `${rating}/5` });
  revalidatePath(HAL);
  pesan(HAL, "ok", `${wo.nomor} dinilai ${rating}/5.`);
}

/** Persetujuan hasil pekerjaan oleh Admin (kepala IPSRS / PJ alat kesehatan). */
export async function setujuiWo(fd: FormData) {
  const se = await sesiHalaman("Admin");
  await izin(se, "setujui", HAL);
  const wo = await prisma.perintahKerja.findUnique({ where: { id: Number(fd.get("id")) || 0 } });
  if (!wo || wo.status !== "Selesai") return pesan(HAL, "error", "Hanya perintah kerja berstatus Selesai yang bisa disetujui.");
  const batal = fd.get("aksi") === "batal";
  await prisma.perintahKerja.update({ where: { id: wo.id }, data: batal ? { disetujuiOleh: null, disetujuiPada: null } : { disetujuiOleh: se.user.email ?? null, disetujuiPada: new Date() } });
  await audit(batal ? "wo.setuju.batal" : "wo.setuju", { email: se.user.email, ip: ipDari(await headers()), objek: wo.nomor });
  revalidatePath(HAL);
  pesan(HAL, "ok", `${wo.nomor} ${batal ? "persetujuan dibatalkan" : "disetujui"}.`);
}
