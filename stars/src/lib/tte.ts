/**
 * Tanda tangan elektronik (TTE) STARS untuk laporan kerusakan (WR) — server saja.
 * Alur WHO "inspection and return to service": teknisi menandatangani penyelesaian perintah kerja,
 * lalu pelapor menyetujui hasil perbaikan (serah terima). Setiap TTE menyimpan sidik SHA-256 isi dokumen
 * saat ditandatangani; halaman /verifikasi membandingkannya dengan isi terkini untuk mendeteksi perubahan.
 */
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "./prisma";

export type PeranTte = "Teknisi" | "Pelapor" | "Pemberi" | "Penerima" | "Pengembalian" | "KepalaRuangan" | "PjAlkes" | "PengurusBarang" | "Direktur";

async function dataWr(nomor: string) {
  return prisma.permintaanKerja.findUnique({
    where: { nomor },
    select: {
      nomor: true, namaAlat: true, keluhan: true, pelapor: true, createdAt: true,
      perintah: { select: { nomor: true, status: true, tindakan: true, tanggalSelesai: true, teknisi: { select: { nama: true } } } },
    },
  });
}

/** Sidik dokumen apa pun berdasarkan awalan nomor: PJ- = peminjaman, selain itu laporan kerusakan. */
export async function sidikDokumen(nomor: string): Promise<string | null> {
  if (nomor.startsWith("LK-")) { const { sidikLK } = await import("./lembar-kerja"); return sidikLK(nomor); }
  if (nomor.startsWith("HPS-")) {
    const h = await prisma.penghapusan.findUnique({ where: { nomor } });
    if (!h) return null;
    const isi = [h.nomor, h.alatId, h.alasan, h.keterangan ?? "", h.dekontaminasi, h.dataDihapus, h.tujuan, h.kategoriLimbah ?? ""].join("\u241e");
    return createHash("sha256").update(isi, "utf8").digest("hex");
  }
  if (nomor.startsWith("KIR-")) {
    const { isiKanonikKir } = await import("./kir");
    const isi = await isiKanonikKir(nomor);
    return isi == null ? null : createHash("sha256").update(isi, "utf8").digest("hex");
  }
  if (nomor.startsWith("PJ-")) {
    const p = await prisma.peminjaman.findUnique({ where: { nomor } });
    if (!p) return null;
    const isi = [p.nomor, p.alatId, p.dariUnitId, p.keUnitId, p.peminjam, p.keperluan, p.tanggalPinjam.toISOString(), p.rencanaKembali.toISOString()].join("\u241e");
    return createHash("sha256").update(isi, "utf8").digest("hex");
  }
  return sidikWr(nomor);
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
  const hashIsi = await sidikDokumen(o.nomor);
  if (!hashIsi) throw new Error("Dokumen tidak ditemukan.");
  return prisma.tandaTangan.create({
    data: { token: randomBytes(16).toString("base64url"), dokumen: o.nomor.startsWith("LK-") ? "Lembar Kerja Pemeliharaan" : o.nomor.startsWith("PJ-") ? "Peminjaman Alat" : o.nomor.startsWith("KIR-") ? "Kartu Inventaris Ruangan" : o.nomor.startsWith("HPS-") ? "Berita Acara Penghapusan Alat" : "Laporan Kerusakan", nomor: o.nomor, peran: o.peran, nama: o.nama.slice(0, 120), identitas: o.identitas, hashIsi, ip: o.ip },
  });
}

export async function tteUntuk(nomor: string) {
  const r = await prisma.tandaTangan.findMany({ where: { nomor } });
  return { teknisi: r.find((t) => t.peran === "Teknisi") ?? null, pelapor: r.find((t) => t.peran === "Pelapor") ?? null };
}

export const urlVerifikasi = (dasar: string, token: string) => `${dasar.replace(/\/+$/, "")}/verifikasi?t=${encodeURIComponent(token)}`;
