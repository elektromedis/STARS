import { createHash } from "node:crypto";
import { prisma } from "./prisma";

/** Sidik SHA-256 token lupa sandi (yang disimpan di basis data hanya sidik ini). */
export const sidik = (t: string) => createHash("sha256").update(t).digest("hex");

/** Token sah = ada, belum dipakai, belum kedaluwarsa, akunnya aktif. */
export async function cekToken(token: string) {
  if (!token || token.length < 20 || token.length > 200) return null;
  const t = await prisma.tokenSandi.findUnique({ where: { hash: sidik(token) }, include: { pengguna: { select: { id: true, email: true, aktif: true } } } });
  if (!t || t.dipakai || t.kedaluwarsa < new Date() || !t.pengguna.aktif) return null;
  return t;
}
