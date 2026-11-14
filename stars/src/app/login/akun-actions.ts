"use server";

import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { audit, ipDari } from "@/lib/audit";
import { batasi } from "@/lib/rate-limit";
import { emailSiap, kirimEmail } from "@/lib/email";
import { asalPermintaan, normalAlamat } from "@/lib/alamat";
import { cekToken, sidik } from "@/lib/token-sandi";

export type StatusAkun = { ok?: string; error?: string; emailMati?: boolean } | undefined;

const TOKEN_MENIT = 30;
const pesanZod = (e: z.ZodError) => e.issues.map((i) => i.message).join("; ");
const sandiKuat = z.string().min(8, "Sandi minimal 8 karakter").max(200)
  .refine((s) => /[A-Za-z]/.test(s) && /\d/.test(s), "Sandi harus memuat huruf dan angka");

// ---------------------------------------------------------------- Registrasi

const skemaDaftar = z.object({
  nama: z.string().trim().min(2, "Nama minimal 2 huruf").max(100),
  email: z.email("Email tidak valid").trim().toLowerCase().max(200),
  unitKerjaId: z.coerce.number().int().positive().nullable(),
  catatan: z.string().trim().min(3, "Isi jabatan/keperluan").max(300),
  sandi: sandiKuat,
  ulang: z.string(),
}).refine((d) => d.sandi === d.ulang, { message: "Konfirmasi sandi tidak sama", path: ["ulang"] });

/**
 * Pendaftaran mandiri: akun dibuat NONAKTIF (menunggu=true, peran Viewer) sampai Admin menyetujui di Admin → Pengguna.
 * Pesan berhasil sama untuk email baru maupun yang sudah terdaftar (tidak membocorkan daftar akun).
 */
export async function daftar(_p: StatusAkun, fd: FormData): Promise<StatusAkun> {
  const ip = ipDari(await headers());
  if (String(fd.get("situs") ?? "")) return { ok: "Pendaftaran diterima." }; // jebakan bot (kolom tersembunyi)
  if (!batasi(`daftar:${ip ?? "?"}`, 5, 60 * 60 * 1000).boleh) return { error: "Terlalu banyak pendaftaran dari jaringan ini. Coba lagi 1 jam lagi." };
  const p = skemaDaftar.safeParse({
    nama: fd.get("nama"), email: fd.get("email"), unitKerjaId: fd.get("unitKerjaId") || null,
    catatan: fd.get("catatan"), sandi: fd.get("sandi"), ulang: fd.get("ulang"),
  });
  if (!p.success) return { error: pesanZod(p.error) };
  const d = p.data;
  const ada = await prisma.pengguna.findUnique({ where: { email: d.email } });
  if (ada) {
    await audit("pengguna.daftar.ganda", { email: d.email, ip });
  } else {
    if (d.unitKerjaId && !(await prisma.unitKerja.findUnique({ where: { id: d.unitKerjaId } }))) return { error: "Unit kerja tidak dikenal." };
    await prisma.pengguna.create({
      data: { nama: d.nama, email: d.email, sandiHash: await bcrypt.hash(d.sandi, 12), peran: "Viewer", unitKerjaId: d.unitKerjaId, aktif: false, menunggu: true, catatanDaftar: d.catatan },
    });
    await audit("pengguna.daftar", { email: d.email, ip, detail: d.catatan });
  }
  return { ok: "Pendaftaran terkirim. Admin STARS akan memeriksa dan mengaktifkan akun Anda; setelah disetujui, masuk memakai email & sandi tadi." };
}

// ---------------------------------------------------------------- Lupa sandi

/** Alamat dasar tautan di email: STARS_URL_PUBLIK; cadangan = alamat permintaan HANYA bila localhost/IP lokal/Tailscale (cegah peracunan header Host). */
function alamatDasar(h: Headers): string | null {
  const env = normalAlamat(process.env.STARS_URL_PUBLIK);
  if (env) return env;
  const asal = asalPermintaan(h, "");
  try {
    const host = new URL(asal).hostname;
    if (host === "localhost" || /\.ts\.net$/i.test(host) || /^(10|127)\.\d+\.\d+\.\d+$/.test(host) || /^192\.168\.\d+\.\d+$/.test(host) || /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(host)) return asal;
  } catch { /* tidak valid */ }
  return null;
}

export async function mintaSetelUlang(_p: StatusAkun, fd: FormData): Promise<StatusAkun> {
  const h = await headers();
  const ip = ipDari(h);
  const email = String(fd.get("email") ?? "").trim().toLowerCase().slice(0, 200);
  if (!z.email().safeParse(email).success) return { error: "Email tidak valid." };
  if (!batasi(`lupa:${ip ?? "?"}`, 5, 15 * 60 * 1000).boleh || !batasi(`lupa-email:${email}`, 3, 60 * 60 * 1000).boleh) {
    return { error: "Terlalu banyak permintaan. Coba lagi beberapa saat lagi." };
  }
  const dasar = alamatDasar(h);
  if (!emailSiap() || !dasar) {
    await audit("sandi.lupa", { email, ip, detail: "email belum diatur — perlu disetel ulang Admin" });
    return { emailMati: true, ok: "Pengiriman email belum diaktifkan di server ini. Permintaan Anda sudah dicatat; hubungi Admin STARS untuk menyetel ulang sandi." };
  }
  const ok = { ok: `Bila ${email} terdaftar dan aktif, tautan untuk membuat sandi baru sudah dikirim. Periksa kotak masuk & folder spam; tautan berlaku ${TOKEN_MENIT} menit.` };
  const u = await prisma.pengguna.findUnique({ where: { email } });
  if (!u || !u.aktif || u.menunggu) {
    await audit("sandi.lupa", { email, ip, detail: u ? "akun nonaktif/menunggu" : "akun tidak ada" });
    return ok;
  }
  const token = randomBytes(32).toString("base64url");
  await prisma.$transaction([
    prisma.tokenSandi.deleteMany({ where: { penggunaId: u.id } }),
    prisma.tokenSandi.create({ data: { penggunaId: u.id, hash: sidik(token), kedaluwarsa: new Date(Date.now() + TOKEN_MENIT * 60_000) } }),
  ]);
  const tautan = `${dasar}/setel-sandi?token=${encodeURIComponent(token)}`;
  try {
    await kirimEmail(
      u.email,
      "Setel ulang sandi STARS",
      `Halo ${u.nama},\n\nAda permintaan membuat sandi baru untuk akun STARS Anda. Buka tautan ini (berlaku ${TOKEN_MENIT} menit, sekali pakai):\n\n${tautan}\n\nBila Anda tidak meminta, abaikan email ini — sandi lama tetap berlaku.\n\nSTARS — Sistem Terintegrasi Alat Kesehatan Rumah Sakit`,
      `<p>Halo ${u.nama.replace(/[<>&"]/g, "")},</p><p>Ada permintaan membuat sandi baru untuk akun STARS Anda. Tautan berlaku ${TOKEN_MENIT} menit dan hanya sekali pakai:</p><p><a href="${tautan}" style="display:inline-block;background:#0B2545;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Buat sandi baru</a></p><p style="color:#64748b;font-size:12px">Bila Anda tidak meminta, abaikan email ini — sandi lama tetap berlaku.</p>`,
    );
    await audit("sandi.lupa.kirim", { email, ip });
  } catch (e) {
    console.error("[lupa-sandi] gagal kirim email:", e instanceof Error ? e.message : e);
    await audit("sandi.lupa.gagal", { email, ip, detail: "SMTP gagal mengirim" });
    return { error: "Email gagal dikirim (server email bermasalah). Coba lagi nanti atau hubungi Admin STARS." };
  }
  return ok;
}

const skemaSetel = z.object({ token: z.string().min(20).max(200), sandi: sandiKuat, ulang: z.string() })
  .refine((d) => d.sandi === d.ulang, { message: "Konfirmasi sandi tidak sama", path: ["ulang"] });

export async function setelSandiBaru(_p: StatusAkun, fd: FormData): Promise<StatusAkun> {
  const ip = ipDari(await headers());
  if (!batasi(`setel:${ip ?? "?"}`, 10, 15 * 60 * 1000).boleh) return { error: "Terlalu banyak percobaan. Coba lagi beberapa menit lagi." };
  const p = skemaSetel.safeParse({ token: fd.get("token"), sandi: fd.get("sandi"), ulang: fd.get("ulang") });
  if (!p.success) return { error: pesanZod(p.error) };
  const t = await cekToken(p.data.token);
  if (!t) return { error: "Tautan tidak berlaku (sudah dipakai atau lewat 30 menit). Minta tautan baru di halaman Lupa sandi." };
  await prisma.$transaction([
    prisma.pengguna.update({ where: { id: t.penggunaId }, data: { sandiHash: await bcrypt.hash(p.data.sandi, 12), gagalLogin: 0, terkunciSampai: null } }),
    prisma.tokenSandi.deleteMany({ where: { penggunaId: t.penggunaId } }),
  ]);
  await audit("sandi.setel-ulang", { email: t.pengguna.email, ip, detail: "lewat tautan email" });
  return { ok: "Sandi baru tersimpan. Silakan masuk memakai sandi baru." };
}
