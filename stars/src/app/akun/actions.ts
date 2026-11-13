"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { audit, ipDari } from "@/lib/audit";
import { batasi } from "@/lib/rate-limit";

export type StatusSandi = { ok?: string; error?: string } | undefined;

const skema = z.object({
  lama: z.string().min(1, "Isi sandi saat ini").max(200),
  baru: z.string().min(8, "Sandi baru minimal 8 karakter").max(200),
  ulang: z.string().max(200),
}).refine((d) => d.baru === d.ulang, { message: "Ulangi sandi baru dengan tepat", path: ["ulang"] })
  .refine((d) => d.baru !== d.lama, { message: "Sandi baru harus berbeda dari sandi saat ini", path: ["baru"] });

/** Ganti sandi akun sendiri (semua peran). Wajib sandi lama; dibatasi 5 percobaan / 15 menit. */
export async function ubahSandiSendiri(_prev: StatusSandi, fd: FormData): Promise<StatusSandi> {
  const s = await auth();
  if (!s?.user?.email) return { error: "Sesi berakhir. Silakan masuk lagi." };
  if (process.env.STARS_MODE === "internet") return { error: "Server ini baca saja. Ganti sandi di server intranet RS." };
  const ip = ipDari(await headers());
  const b = batasi(`sandi:${s.user.email}`, 5, 15 * 60 * 1000);
  if (!b.boleh) return { error: `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(b.sisaDetik / 60)} menit.` };
  const p = skema.safeParse({ lama: fd.get("lama"), baru: fd.get("baru"), ulang: fd.get("ulang") });
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Isian tidak valid." };
  const u = await prisma.pengguna.findUnique({ where: { email: s.user.email }, select: { id: true, sandiHash: true, aktif: true } });
  if (!u || !u.aktif) return { error: "Akun tidak aktif." };
  if (!(await bcrypt.compare(p.data.lama, u.sandiHash))) {
    await audit("pengguna.sandi-sendiri.gagal", { email: s.user.email, ip, detail: "sandi saat ini salah" });
    return { error: "Sandi saat ini salah." };
  }
  await prisma.pengguna.update({ where: { id: u.id }, data: { sandiHash: await bcrypt.hash(p.data.baru, 12), gagalLogin: 0, terkunciSampai: null } });
  await audit("pengguna.sandi-sendiri", { email: s.user.email, ip });
  return { ok: "Sandi berhasil diganti. Gunakan sandi baru saat masuk berikutnya." };
}
