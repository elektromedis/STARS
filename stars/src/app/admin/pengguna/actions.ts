"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { audit, ipDari } from "@/lib/audit";
import { PERAN, cukup, type Peran } from "@/lib/peran";

export type StatusAksi = { ok?: string; error?: string } | undefined;

const skemaBaru = z.object({
  nama: z.string().trim().min(2, "Nama minimal 2 huruf").max(100),
  email: z.email("Email tidak valid").trim().toLowerCase().max(200),
  sandi: z.string().min(8, "Sandi minimal 8 karakter").max(200),
  peran: z.enum(PERAN),
  unitKerjaId: z.coerce.number().int().positive().nullable().optional(),
});
const skemaUbah = skemaBaru.omit({ sandi: true }).extend({ id: z.coerce.number().int().positive(), aktif: z.coerce.boolean() });
const skemaSandi = z.object({ id: z.coerce.number().int().positive(), sandi: z.string().min(8, "Sandi minimal 8 karakter").max(200) });

async function pemeriksa(peranTarget?: string) {
  const s = await auth();
  if (!s?.user || !cukup(s.user.peran, "Admin")) return { s: null, error: "Memerlukan peran Admin." };
  if (peranTarget === "Super Admin" && s.user.peran !== "Super Admin") return { s: null, error: "Hanya Super Admin yang boleh menetapkan peran Super Admin." };
  return { s, error: null };
}

const ip = async () => ipDari(await headers());
const pesanZod = (e: z.ZodError) => e.issues.map((i) => i.message).join("; ");

export async function buatPengguna(_prev: StatusAksi, fd: FormData): Promise<StatusAksi> {
  const parsed = skemaBaru.safeParse({ nama: fd.get("nama"), email: fd.get("email"), sandi: fd.get("sandi"), peran: fd.get("peran"), unitKerjaId: fd.get("unitKerjaId") || null });
  if (!parsed.success) return { error: pesanZod(parsed.error) };
  const { s, error } = await pemeriksa(parsed.data.peran);
  if (!s) return { error: error! };
  const d = parsed.data;
  if (await prisma.pengguna.findUnique({ where: { email: d.email } })) return { error: "Email sudah terdaftar." };
  await prisma.pengguna.create({ data: { nama: d.nama, email: d.email, sandiHash: await bcrypt.hash(d.sandi, 12), peran: d.peran, unitKerjaId: d.unitKerjaId ?? null } });
  await audit("pengguna.buat", { email: s.user.email, ip: await ip(), objek: d.email, detail: `peran ${d.peran}` });
  revalidatePath("/admin/pengguna");
  return { ok: `Pengguna ${d.email} dibuat.` };
}

export async function ubahPengguna(_prev: StatusAksi, fd: FormData): Promise<StatusAksi> {
  const parsed = skemaUbah.safeParse({ id: fd.get("id"), nama: fd.get("nama"), email: fd.get("email"), peran: fd.get("peran"), unitKerjaId: fd.get("unitKerjaId") || null, aktif: fd.get("aktif") === "on" });
  if (!parsed.success) return { error: pesanZod(parsed.error) };
  const d = parsed.data;
  const target = await prisma.pengguna.findUnique({ where: { id: d.id } });
  if (!target) return { error: "Pengguna tidak ditemukan." };
  const { s, error } = await pemeriksa(d.peran === "Super Admin" || target.peran === "Super Admin" ? "Super Admin" : undefined);
  if (!s) return { error: error! };
  const sayaSendiri = String(target.id) === s.user.id;
  // Checkbox "Aktif" di form dinonaktifkan untuk akun sendiri, dan input disabled
  // tidak dikirim browser — akun sendiri selalu dianggap tetap aktif.
  const aktif = sayaSendiri ? true : d.aktif;
  if (sayaSendiri && !cukup(d.peran as Peran, "Admin")) return { error: "Anda tidak dapat menurunkan peran akun sendiri." };
  await prisma.pengguna.update({ where: { id: d.id }, data: { nama: d.nama, email: d.email, peran: d.peran, unitKerjaId: d.unitKerjaId ?? null, aktif, ...(aktif ? { terkunciSampai: null, gagalLogin: 0, menunggu: false } : {}) } });
  await audit("pengguna.ubah", { email: s.user.email, ip: await ip(), objek: d.email, detail: `peran ${d.peran}, aktif ${aktif}, unit ${d.unitKerjaId ?? "semua"}` });
  revalidatePath("/admin/pengguna");
  return { ok: `Pengguna ${d.email} diperbarui.` };
}

export async function setelUlangSandi(_prev: StatusAksi, fd: FormData): Promise<StatusAksi> {
  const parsed = skemaSandi.safeParse({ id: fd.get("id"), sandi: fd.get("sandi") });
  if (!parsed.success) return { error: pesanZod(parsed.error) };
  const target = await prisma.pengguna.findUnique({ where: { id: parsed.data.id } });
  if (!target) return { error: "Pengguna tidak ditemukan." };
  const { s, error } = await pemeriksa(target.peran === "Super Admin" ? "Super Admin" : undefined);
  if (!s) return { error: error! };
  await prisma.pengguna.update({ where: { id: target.id }, data: { sandiHash: await bcrypt.hash(parsed.data.sandi, 12), gagalLogin: 0, terkunciSampai: null } });
  await audit("pengguna.sandi", { email: s.user.email, ip: await ip(), objek: target.email });
  revalidatePath("/admin/pengguna");
  return { ok: `Sandi ${target.email} disetel ulang.` };
}

const skemaSetujui = z.object({ id: z.coerce.number().int().positive(), peran: z.enum(PERAN), unitKerjaId: z.coerce.number().int().positive().nullable().optional() });

/** Menyetujui pendaftar mandiri (/daftar): aktifkan dengan peran & batas unit pilihan Admin. */
export async function setujuiPendaftar(_prev: StatusAksi, fd: FormData): Promise<StatusAksi> {
  const parsed = skemaSetujui.safeParse({ id: fd.get("id"), peran: fd.get("peran"), unitKerjaId: fd.get("unitKerjaId") || null });
  if (!parsed.success) return { error: pesanZod(parsed.error) };
  const { s, error } = await pemeriksa(parsed.data.peran);
  if (!s) return { error: error! };
  const t = await prisma.pengguna.findUnique({ where: { id: parsed.data.id } });
  if (!t || !t.menunggu) return { error: "Pendaftar tidak ditemukan atau sudah diproses." };
  await prisma.pengguna.update({ where: { id: t.id }, data: { aktif: true, menunggu: false, peran: parsed.data.peran, unitKerjaId: parsed.data.unitKerjaId ?? null, gagalLogin: 0, terkunciSampai: null } });
  await audit("pengguna.setujui", { email: s.user.email, ip: await ip(), objek: t.email, detail: `peran ${parsed.data.peran}, unit ${parsed.data.unitKerjaId ?? "semua"}` });
  revalidatePath("/admin/pengguna");
  return { ok: `${t.email} disetujui sebagai ${parsed.data.peran}.` };
}

/** Menolak pendaftar mandiri: akun yang belum pernah aktif dihapus. */
export async function tolakPendaftar(_prev: StatusAksi, fd: FormData): Promise<StatusAksi> {
  const id = Number(fd.get("id"));
  const { s, error } = await pemeriksa();
  if (!s) return { error: error! };
  const t = Number.isInteger(id) && id > 0 ? await prisma.pengguna.findUnique({ where: { id } }) : null;
  if (!t || !t.menunggu) return { error: "Pendaftar tidak ditemukan atau sudah diproses." };
  await prisma.pengguna.delete({ where: { id: t.id } });
  await audit("pengguna.tolak", { email: s.user.email, ip: await ip(), objek: t.email });
  revalidatePath("/admin/pengguna");
  return { ok: `Pendaftaran ${t.email} ditolak & dihapus.` };
}
