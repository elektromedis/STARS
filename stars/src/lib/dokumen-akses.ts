import type { Session } from "next-auth";
import { prisma } from "./prisma";
import { cukup } from "./peran";

/**
 * Boleh mengelola (unggah/hapus) dokumen paket ini? Operator+; Operator yang dibatasi unit hanya untuk unitnya.
 * Mengembalikan paket bila boleh, atau pesan penolakan.
 */
export async function aksesKelolaPaket(sesi: Session, kode: string) {
  if (!cukup(sesi.user.peran, "Operator")) return { paket: null, pesan: "Memerlukan peran Operator atau lebih tinggi." };
  if (process.env.STARS_MODE === "internet") return { paket: null, pesan: "Server mode internet bersifat baca saja." };
  const paket = await prisma.paket.findUnique({ where: { kode }, select: { kode: true, namaPaket: true, unitKerja: { select: { nama: true } } } });
  if (!paket) return { paket: null, pesan: "Paket tidak ditemukan." };
  if (sesi.user.unitKerja && !cukup(sesi.user.peran, "Admin") && paket.unitKerja.nama !== sesi.user.unitKerja) {
    return { paket: null, pesan: `Akun Anda hanya boleh mengelola dokumen unit ${sesi.user.unitKerja}.` };
  }
  return { paket, pesan: null };
}
