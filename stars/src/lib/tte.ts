/**
 * Tanda tangan elektronik (TTE) STARS untuk laporan kerusakan (WR) — server saja.
 * Alur WHO "inspection and return to service": teknisi menandatangani penyelesaian perintah kerja,
 * lalu pelapor menyetujui hasil perbaikan (serah terima). Setiap TTE menyimpan sidik SHA-256 isi dokumen
 * saat ditandatangani; halaman /verifikasi membandingkannya dengan isi terkini untuk mendeteksi perubahan.
 */
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "./prisma";

export const PERAN_TTE = ["Teknisi", "Pelapor"] as const;
export type PeranTte = (typeof PERAN_TTE)[number];

async function dataWr(nomor: string) {
  return prisma.permintaanKerja.findUnique({
    where: { nomor },
    select: {
      nomor: true, namaAlat: true, keluhan: true, pelapor: true, createdAt: true,
      perintah: { select: { nomor: true, status: true, tindakan: true, tanggalSelesai: true, teknisi: { select: { nama: true } } } },
    },
  });
}

/** Isi kanonik yang ditandatangani: identitas laporan + hasil perintah kerja. */
export async function sidikWr(nomor: string): Promise<string | null> {
  const w = await dataWr(nomor);
  if (!w) return null;
  const isi = [w.nomor, w.namaAlat, w.keluhan, w.pelapor, w.createdAt.toISOString(), w.perintah?.nomor ?? "", w.perintah?.status ?? "", w.perintah?.tindakan ?? "", w.perintah?.tanggalSelesai?.toISOString() ?? ""].join("␞");
  return createHash("sha256").update(isi, "utf8").digest("hex");
}

export const samarkan = (s: string | null | undefined) => (s ? s.replace(/(?<=.{3}).(?=.{2})/g, "•") : null);

export async function buatTte(o: { nomor: string; peran: PeranTte; nama: string; identitas: string | null; ip: string | null }) {
  const hashIsi = await sidikWr(o.nomor);
  if (!hashIsi) throw new Error("Laporan tidak ditemukan.");
  return prisma.tandaTangan.create({
    data: { token: randomBytes(16).toString("base64url"), dokumen: "Laporan Kerusakan", nomor: o.nomor, peran: o.peran, nama: o.nama.slice(0, 120), identitas: o.identitas, hashIsi, ip: o.ip },
  });
}

export async function tteUntuk(nomor: string) {
  const r = await prisma.tandaTangan.findMany({ where: { nomor } });
  return { teknisi: r.find((t) => t.peran === "Teknisi") ?? null, pelapor: r.find((t) => t.peran === "Pelapor") ?? null };
}

export const urlVerifikasi = (dasar: string, token: string) => `${dasar.replace(/\/+$/, "")}/verifikasi?t=${encodeURIComponent(token)}`;
