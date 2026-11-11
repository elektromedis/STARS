"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sesiApi } from "@/lib/sesi";
import { audit, ipDari } from "@/lib/audit";
import {
  JENIS_PERINTAH, PRIORITAS, STATUS_PERINTAH, STATUS_PERMINTAAN, nomorBerikut,
} from "@/lib/pemeliharaan";

export type StatusAksi = { ok?: string; error?: string } | undefined;

const ip = async () => ipDari(await headers());
const pesanZod = (e: z.ZodError) => e.issues.map((i) => i.message).join("; ");

async function penjaga() {
  const { sesi, tolak } = await sesiApi("Operator");
  if (tolak) return { sesi: null, pesan: "Memerlukan peran Operator atau lebih tinggi." };
  if (process.env.STARS_MODE === "internet") return { sesi: null, pesan: "Server mode internet bersifat baca saja." };
  return { sesi, pesan: null };
}

const skemaStatusPermintaan = z.object({
  id: z.coerce.number().int().positive(),
  status: z.enum(STATUS_PERMINTAAN),
  catatanPetugas: z.string().trim().max(1000).optional(),
});

export async function ubahStatusPermintaan(_prev: StatusAksi, fd: FormData): Promise<StatusAksi> {
  const g = await penjaga();
  if (!g.sesi) return { error: g.pesan! };
  const parsed = skemaStatusPermintaan.safeParse({ id: fd.get("id"), status: fd.get("status"), catatanPetugas: fd.get("catatanPetugas") || undefined });
  if (!parsed.success) return { error: pesanZod(parsed.error) };
  const { id, status, catatanPetugas } = parsed.data;
  const p = await prisma.permintaanKerja.findUnique({ where: { id } });
  if (!p) return { error: "Permintaan tidak ditemukan." };
  await prisma.permintaanKerja.update({ where: { id }, data: { status, catatanPetugas: catatanPetugas ?? p.catatanPetugas } });
  await audit("permintaan.status", { email: g.sesi.user.email, ip: await ip(), objek: p.nomor, detail: `status ${status}` });
  revalidatePath("/admin/pemeliharaan");
  return { ok: `Permintaan ${p.nomor} diperbarui ke status ${status}.` };
}

const skemaBuatPerintah = z.object({
  permintaanId: z.coerce.number().int().positive(),
  teknisiId: z.coerce.number().int().positive().nullable().optional(),
  prioritas: z.enum(PRIORITAS).optional(),
  deskripsi: z.string().trim().max(2000).optional(),
});

/** Buat perintah kerja (WO) dari sebuah permintaan; menautkan keduanya dan menandai permintaan "Diproses". */
export async function buatPerintahDariPermintaan(_prev: StatusAksi, fd: FormData): Promise<StatusAksi> {
  const g = await penjaga();
  if (!g.sesi) return { error: g.pesan! };
  const parsed = skemaBuatPerintah.safeParse({ permintaanId: fd.get("permintaanId"), teknisiId: fd.get("teknisiId") || null, prioritas: fd.get("prioritas") || undefined, deskripsi: fd.get("deskripsi") || undefined });
  if (!parsed.success) return { error: pesanZod(parsed.error) };
  const { permintaanId, teknisiId, prioritas, deskripsi } = parsed.data;
  const p = await prisma.permintaanKerja.findUnique({ where: { id: permintaanId }, include: { perintah: true } });
  if (!p) return { error: "Permintaan tidak ditemukan." };
  if (p.perintah) return { error: `Permintaan ini sudah punya perintah kerja ${p.perintah.nomor}.` };
  if (teknisiId && !(await prisma.pengguna.findUnique({ where: { id: teknisiId } }))) return { error: "Teknisi tidak dikenal." };

  const nomor = await nomorBerikut("WO");
  await prisma.$transaction([
    prisma.perintahKerja.create({
      data: {
        nomor, permintaanId, alatId: p.alatId ?? null, jenis: "Korektif",
        deskripsi: deskripsi?.trim() || p.keluhan, prioritas: prioritas ?? p.prioritas,
        teknisiId: teknisiId ?? null, status: "Terbuka",
      },
    }),
    prisma.permintaanKerja.update({ where: { id: permintaanId }, data: { status: "Diproses" } }),
  ]);
  await audit("perintah.buat", { email: g.sesi.user.email, ip: await ip(), objek: nomor, detail: `dari ${p.nomor}` });
  revalidatePath("/admin/pemeliharaan");
  return { ok: `Perintah kerja ${nomor} dibuat dari ${p.nomor}.` };
}

const skemaUbahPerintah = z.object({
  id: z.coerce.number().int().positive(),
  status: z.enum(STATUS_PERINTAH),
  jenis: z.enum(JENIS_PERINTAH).optional(),
  teknisiId: z.coerce.number().int().positive().nullable().optional(),
  prioritas: z.enum(PRIORITAS).optional(),
  checklist: z.string().trim().max(4000).optional(),
  tindakan: z.string().trim().max(2000).optional(),
  sukuCadang: z.string().trim().max(1000).optional(),
  biaya: z.coerce.number().min(0).optional(),
});

export async function ubahPerintah(_prev: StatusAksi, fd: FormData): Promise<StatusAksi> {
  const g = await penjaga();
  if (!g.sesi) return { error: g.pesan! };
  const parsed = skemaUbahPerintah.safeParse({
    id: fd.get("id"), status: fd.get("status"), jenis: fd.get("jenis") || undefined, teknisiId: fd.get("teknisiId") || null,
    prioritas: fd.get("prioritas") || undefined, checklist: fd.get("checklist") ?? undefined, tindakan: fd.get("tindakan") || undefined, sukuCadang: fd.get("sukuCadang") || undefined, biaya: fd.get("biaya") || undefined,
  });
  if (!parsed.success) return { error: pesanZod(parsed.error) };
  const d = parsed.data;
  const wo = await prisma.perintahKerja.findUnique({ where: { id: d.id }, include: { permintaan: true } });
  if (!wo) return { error: "Perintah kerja tidak ditemukan." };
  if (d.teknisiId && !(await prisma.pengguna.findUnique({ where: { id: d.teknisiId } }))) return { error: "Teknisi tidak dikenal." };

  const mulai = d.status === "Dikerjakan" && !wo.tanggalMulai ? new Date() : wo.tanggalMulai;
  const selesai = d.status === "Selesai" ? (wo.tanggalSelesai ?? new Date()) : d.status === "Terbuka" || d.status === "Dikerjakan" ? null : wo.tanggalSelesai;

  await prisma.perintahKerja.update({
    where: { id: d.id },
    data: {
      status: d.status, jenis: d.jenis ?? wo.jenis, teknisiId: d.teknisiId ?? null, prioritas: d.prioritas ?? wo.prioritas,
      checklist: d.checklist !== undefined ? d.checklist || null : wo.checklist, tindakan: d.tindakan ?? wo.tindakan, sukuCadang: d.sukuCadang ?? wo.sukuCadang, biaya: d.biaya ?? wo.biaya,
      tanggalMulai: mulai, tanggalSelesai: selesai,
    },
  });
  // Selesaikan permintaan tertaut bila WO selesai
  if (d.status === "Selesai" && wo.permintaanId) await prisma.permintaanKerja.update({ where: { id: wo.permintaanId }, data: { status: "Selesai" } });
  await audit("perintah.ubah", { email: g.sesi.user.email, ip: await ip(), objek: wo.nomor, detail: `status ${d.status}` });
  revalidatePath("/admin/pemeliharaan");
  return { ok: `Perintah kerja ${wo.nomor} diperbarui ke status ${d.status}.` };
}
