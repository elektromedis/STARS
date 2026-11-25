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

export type StatusNotif = { ok?: string; error?: string } | undefined;

/** Simpan preferensi notifikasi perubahan data (email/WA) milik sendiri. Tombol "uji" mengirim pesan percobaan. */
export async function simpanNotifSaya(_prev: StatusNotif, fd: FormData): Promise<StatusNotif> {
  const s = await auth();
  if (!s?.user?.email) return { error: "Sesi berakhir. Silakan masuk lagi." };
  const u = await prisma.pengguna.findUnique({ where: { email: s.user.email }, select: { id: true, nama: true, email: true, peran: true } });
  if (!u || u.peran === "Viewer") return { error: "Notifikasi perubahan data untuk peran Operator ke atas." };
  const { normalWa } = await import("@/lib/wa");
  const mentah = String(fd.get("wa") ?? "").trim();
  const wa = mentah ? normalWa(mentah) : null;
  if (mentah && !wa) return { error: "Nomor WhatsApp tidak valid. Contoh: 0812xxxxxxx." };
  const email = fd.get("email") === "on";
  const { kunciPref, kirimWa, waSiap } = await import("@/lib/notif-kirim");
  const { simpanPengaturan } = await import("@/lib/pengaturan");
  await simpanPengaturan(kunciPref(u.id), JSON.stringify({ email, wa }), u.email);
  await audit("akun.notifikasi", { email: u.email, ip: ipDari(await headers()), detail: `email ${email ? "aktif" : "mati"}, WA ${wa ? "diisi" : "kosong"}` });
  if (fd.get("uji") !== "1") return { ok: "Tersimpan." };
  const { emailSiap, kirimEmail } = await import("@/lib/email");
  const hasil: string[] = [];
  const teks = `Halo ${u.nama}, ini pesan uji notifikasi STARS. Pengiriman sudah berfungsi.`;
  if (email) hasil.push(!emailSiap() ? "email: SMTP belum diatur Admin" : await kirimEmail(u.email, "Uji notifikasi STARS", teks).then(() => "email terkirim", (e) => `email gagal (${(e as Error).message})`));
  if (wa) hasil.push(!waSiap() ? "WA: gateway belum diatur Admin" : await kirimWa(wa, teks).then(() => "WA terkirim", (e) => `WA gagal (${(e as Error).message})`));
  return hasil.length ? { ok: `Tersimpan. Uji: ${hasil.join("; ")}.` } : { ok: "Tersimpan. Aktifkan email atau isi nomor WA untuk menguji." };
}
