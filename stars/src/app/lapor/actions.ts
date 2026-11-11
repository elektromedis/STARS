"use server";

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { audit, ipDari } from "@/lib/audit";
import { nomorBerikut, skemaPermintaan } from "@/lib/pemeliharaan";

export type StatusLapor = { ok?: string; nomor?: string; error?: string } | undefined;

const MAKS_FOTO = 5 * 1024 * 1024;
const TIPE_FOTO: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/**
 * Terima laporan kerusakan dari PUBLIK (tanpa akun). Membuat PermintaanKerja berstatus "Baru".
 * Foto opsional (gambar, maks 5 MB) disimpan di UPLOAD_DIR/permintaan dan hanya dapat dilihat petugas.
 * Server mode "internet" (baca saja) menolak; gunakan server intranet RS.
 */
export async function buatPermintaan(_prev: StatusLapor, fd: FormData): Promise<StatusLapor> {
  if (process.env.STARS_MODE === "internet") return { error: "Server ini baca saja. Silakan lapor dari jaringan RS atau hubungi IPSRS/Elektromedik." };

  const parsed = skemaPermintaan.safeParse({
    namaAlat: fd.get("namaAlat"), alatId: fd.get("alatId") || null, unitKerjaId: fd.get("unitKerjaId") || null,
    lokasi: fd.get("lokasi") || undefined, pelapor: fd.get("pelapor"), kontak: fd.get("kontak") || undefined,
    keluhan: fd.get("keluhan"), prioritas: fd.get("prioritas") || "Normal",
  });
  if (!parsed.success) return { error: parsed.error.issues.map((i) => i.message).join("; ") };
  const d = parsed.data;

  // Validasi relasi opsional agar FK tidak gagal
  if (d.unitKerjaId && !(await prisma.unitKerja.findUnique({ where: { id: d.unitKerjaId } }))) return { error: "Unit kerja tidak dikenal." };
  if (d.alatId && !(await prisma.alat.findUnique({ where: { id: d.alatId } }))) return { error: "Alat tidak dikenal." };

  // Foto opsional
  let foto: string | null = null;
  const berkas = fd.get("foto");
  if (berkas instanceof File && berkas.size > 0) {
    if (!TIPE_FOTO[berkas.type]) return { error: "Foto harus berformat JPG, PNG, atau WEBP." };
    if (berkas.size > MAKS_FOTO) return { error: "Ukuran foto melebihi 5 MB." };
    try {
      const dir = join(process.env.UPLOAD_DIR || join(process.cwd(), "uploads"), "permintaan");
      await mkdir(dir, { recursive: true });
      const nama = `${randomUUID()}.${TIPE_FOTO[berkas.type]}`;
      await writeFile(join(dir, nama), Buffer.from(await berkas.arrayBuffer()));
      foto = nama;
    } catch { /* foto bersifat opsional; abaikan kegagalan simpan */ }
  }

  try {
    const nomor = await nomorBerikut("WR");
    await prisma.permintaanKerja.create({
      data: {
        nomor, namaAlat: d.namaAlat, alatId: d.alatId ?? null, unitKerjaId: d.unitKerjaId ?? null,
        lokasi: d.lokasi || null, pelapor: d.pelapor, kontak: d.kontak || null, keluhan: d.keluhan,
        prioritas: d.prioritas, foto, status: "Baru",
      },
    });
    await audit("permintaan.buat", { email: null, ip: ipDari(await headers()), objek: nomor, detail: `${d.namaAlat} — ${d.prioritas}` });
    return { ok: "Laporan terkirim.", nomor };
  } catch (err) {
    return { error: `Gagal menyimpan laporan: ${err instanceof Error ? err.message : String(err)}` };
  }
}
