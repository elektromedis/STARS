"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sesiApi } from "@/lib/sesi";
import { audit, ipDari } from "@/lib/audit";
import { skemaKalibrasi } from "@/lib/pemeliharaan";

export type StatusAksi = { ok?: string; error?: string } | undefined;

const ip = async () => ipDari(await headers());

async function penjaga() {
  const { sesi, tolak } = await sesiApi("Operator");
  if (tolak) return { sesi: null, pesan: "Memerlukan peran Operator atau lebih tinggi." };
  if (process.env.STARS_MODE === "internet") return { sesi: null, pesan: "Server mode internet bersifat baca saja." };
  return { sesi, pesan: null };
}

export async function buatKalibrasi(_prev: StatusAksi, fd: FormData): Promise<StatusAksi> {
  const g = await penjaga();
  if (!g.sesi) return { error: g.pesan! };
  const parsed = skemaKalibrasi.safeParse({
    alatId: fd.get("alatId"), tanggal: fd.get("tanggal"), kalibrator: fd.get("kalibrator"), petugas: fd.get("petugas") || undefined, metode: fd.get("metode") || undefined,
    laik: fd.get("laik") === "on", nomorSertifikat: fd.get("nomorSertifikat") || undefined, berlakuSampai: fd.get("berlakuSampai") || null, keterangan: fd.get("keterangan") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues.map((i) => i.message).join("; ") };
  const d = parsed.data;
  const alat = await prisma.alat.findUnique({ where: { id: d.alatId } });
  if (!alat) return { error: "Alat tidak dikenal." };
  if (d.berlakuSampai && d.berlakuSampai < d.tanggal) return { error: "Tanggal berlaku tidak boleh sebelum tanggal kalibrasi." };
  await prisma.kalibrasi.create({ data: { alatId: d.alatId, tanggal: d.tanggal, kalibrator: d.kalibrator, petugas: d.petugas || null, metode: d.metode || null, laik: d.laik, nomorSertifikat: d.nomorSertifikat || null, berlakuSampai: d.berlakuSampai ?? null, keterangan: d.keterangan || null } });
  await audit("kalibrasi.buat", { email: g.sesi.user.email, ip: await ip(), objek: alat.kode, detail: `${d.kalibrator}, ${d.laik ? "laik" : "TIDAK laik"}` });
  revalidatePath("/admin/kalibrasi");
  return { ok: `Kalibrasi ${alat.kode} dicatat.` };
}

export async function hapusKalibrasi(_prev: StatusAksi, fd: FormData): Promise<StatusAksi> {
  const g = await penjaga();
  if (!g.sesi) return { error: g.pesan! };
  const id = z.coerce.number().int().positive().safeParse(fd.get("id"));
  if (!id.success) return { error: "ID tidak valid." };
  const k = await prisma.kalibrasi.findUnique({ where: { id: id.data }, include: { alat: { select: { kode: true } } } });
  if (!k) return { error: "Catatan tidak ditemukan." };
  await prisma.kalibrasi.delete({ where: { id: id.data } });
  await audit("kalibrasi.hapus", { email: g.sesi.user.email, ip: await ip(), objek: k.alat.kode, detail: k.tanggal.toISOString().slice(0, 10) });
  revalidatePath("/admin/kalibrasi");
  return { ok: "Catatan kalibrasi dihapus." };
}
