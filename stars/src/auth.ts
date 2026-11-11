import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authConfig } from "./auth.config";
import { prisma } from "./lib/prisma";
import { audit } from "./lib/audit";
import { batasi, reset } from "./lib/rate-limit";

const MAKS_GAGAL_AKUN = 10; // setelah ini akun dikunci 15 menit
const KUNCI_MENIT = 15;

const skemaLogin = z.object({ email: z.string().trim().toLowerCase().min(3).max(200), password: z.string().min(1).max(200) });

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Email dan sandi",
      credentials: { email: { label: "Email", type: "email" }, password: { label: "Sandi", type: "password" } },
      async authorize(raw, req) {
        const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || "lokal";
        const parsed = skemaLogin.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        // 1) pembatas per IP: 5 percobaan / 15 menit
        const b = batasi(`login:${ip}`, 5, KUNCI_MENIT * 60 * 1000);
        if (!b.boleh) {
          await audit("login.dibatasi", { email, ip, detail: `IP melebihi 5 percobaan; coba lagi ${b.sisaDetik}s` });
          return null;
        }

        const u = await prisma.pengguna.findUnique({ where: { email }, include: { unitKerja: true } });
        if (!u || !u.aktif) {
          // tetap hitung hash agar waktu respons mirip (mengurangi enumerasi akun)
          await bcrypt.compare(password, "$2a$10$CwTycUXWue0Thq9StjUM0uJ8ZzYwSxJv1V5nYQmQJmQ9kqXnQYl2y");
          await audit("login.gagal", { email, ip, detail: u ? "akun nonaktif" : "akun tidak ada" });
          return null;
        }
        if (u.terkunciSampai && u.terkunciSampai > new Date()) {
          await audit("login.terkunci", { email, ip, detail: `terkunci sampai ${u.terkunciSampai.toISOString()}` });
          return null;
        }
        const cocok = await bcrypt.compare(password, u.sandiHash);
        if (!cocok) {
          const gagal = u.gagalLogin + 1;
          const kunci = gagal >= MAKS_GAGAL_AKUN;
          await prisma.pengguna.update({
            where: { id: u.id },
            data: { gagalLogin: kunci ? 0 : gagal, terkunciSampai: kunci ? new Date(Date.now() + KUNCI_MENIT * 60 * 1000) : null },
          });
          await audit(kunci ? "akun.dikunci" : "login.gagal", { email, ip, detail: kunci ? `${MAKS_GAGAL_AKUN} kali sandi salah` : `sandi salah (${gagal})` });
          return null;
        }

        await prisma.pengguna.update({ where: { id: u.id }, data: { gagalLogin: 0, terkunciSampai: null, terakhirLogin: new Date() } });
        reset(`login:${ip}`);
        await audit("login.berhasil", { email, ip });
        return { id: String(u.id), email: u.email, name: u.nama, nama: u.nama, peran: u.peran, unitKerjaId: u.unitKerjaId, unitKerja: u.unitKerja?.nama ?? null };
      },
    }),
  ],
});
