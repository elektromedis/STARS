"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { sesiApi } from "@/lib/sesi";
import { audit, ipDari } from "@/lib/audit";

export type StatusAksi = { ok?: string; error?: string; auditId?: number } | undefined;

async function penjaga() {
  const { sesi, tolak } = await sesiApi("Operator");
  if (tolak) return { sesi: null, pesan: "Memerlukan peran Operator atau lebih tinggi." };
  if (process.env.STARS_MODE === "internet") return { sesi: null, pesan: "Server mode internet bersifat baca saja." };
  return { sesi, pesan: null };
}

export async function buatAudit(_p: StatusAksi, fd: FormData): Promise<StatusAksi> {
  const { sesi, pesan } = await penjaga();
  if (!sesi) return { error: pesan! };
  const tahun = Number(fd.get("tahun"));
  if (!Number.isInteger(tahun) || tahun < 2000 || tahun > 2100) return { error: "Tahun tidak valid." };
  const nama = String(fd.get("nama") ?? "").trim().slice(0, 160) || `Audit inventaris alat ${tahun}`;
  const a = await prisma.auditInventaris.create({ data: { tahun, nama, dibuatOleh: sesi.user.email ?? null } });
  await audit("audit-inventaris.buat", { email: sesi.user.email, ip: ipDari(await headers()), objek: String(a.id), detail: nama });
  revalidatePath("/admin/audit");
  return { ok: `${nama} dibuat.`, auditId: a.id };
}

/** Catat hasil verifikasi satu alat (boleh diulang; hasil terakhir yang berlaku). */
export async function catatAuditItem(auditId: number, alatId: number, d: { ditemukan: boolean; kondisiSesuai: boolean; lokasiSesuai: boolean; catatan: string | null }): Promise<StatusAksi> {
  const { sesi, pesan } = await penjaga();
  if (!sesi) return { error: pesan! };
  const a = await prisma.auditInventaris.findUnique({ where: { id: auditId } });
  if (!a || a.status !== "Berjalan") return { error: "Audit tidak ditemukan atau sudah selesai." };
  const data = { ditemukan: d.ditemukan, kondisiSesuai: d.kondisiSesuai, lokasiSesuai: d.lokasiSesuai, catatan: d.catatan?.slice(0, 500) || null, oleh: sesi.user.email ?? null, waktu: new Date() };
  await prisma.auditItem.upsert({ where: { auditId_alatId: { auditId, alatId } }, update: data, create: { auditId, alatId, ...data } });
  if (d.ditemukan) await prisma.alat.update({ where: { id: alatId }, data: { tanggalInventarisasi: new Date() } });
  revalidatePath("/admin/audit");
  return { ok: "Tersimpan." };
}

/** Cari alat dari kode / nomor seri / no. aset (untuk scanner barcode/QR atau ketik manual). */
export async function cariKodeAudit(teks: string): Promise<{ id: number; nama: string; kode: string } | null> {
  const { sesi } = await penjaga();
  if (!sesi) return null;
  let k = teks.trim().slice(0, 300);
  try { const u = new URL(k); k = u.searchParams.get("kode") ?? u.searchParams.get("alat") ?? k; } catch { /* bukan URL */ }
  if (!k) return null;
  return prisma.alat.findFirst({ where: { aktif: true, OR: [{ kode: k }, { nomorSeri: k }, { noUrutAset: k }] }, select: { id: true, nama: true, kode: true } });
}

export async function selesaikanAudit(_p: StatusAksi, fd: FormData): Promise<StatusAksi> {
  const { sesi, pesan } = await penjaga();
  if (!sesi) return { error: pesan! };
  const id = Number(fd.get("id"));
  await prisma.auditInventaris.update({ where: { id }, data: { status: "Selesai", selesaiPada: new Date() } });
  await audit("audit-inventaris.selesai", { email: sesi.user.email, ip: ipDari(await headers()), objek: String(id) });
  revalidatePath("/admin/audit");
  return { ok: "Audit ditandai selesai." };
}
