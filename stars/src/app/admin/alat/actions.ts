"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sesiApi } from "@/lib/sesi";
import { audit, ipDari } from "@/lib/audit";
import { skemaAlat } from "@/lib/pemeliharaan";

export type StatusAksi = { ok?: string; error?: string } | undefined;

const ip = async () => ipDari(await headers());
const pesanZod = (e: z.ZodError) => e.issues.map((i) => i.message).join("; ");

async function penjaga() {
  const { sesi, tolak } = await sesiApi("Operator");
  if (tolak) return { sesi: null, pesan: "Memerlukan peran Operator atau lebih tinggi." };
  if (process.env.STARS_MODE === "internet") return { sesi: null, pesan: "Server mode internet bersifat baca saja." };
  return { sesi, pesan: null };
}

function bacaForm(fd: FormData) {
  return skemaAlat.safeParse({
    kode: fd.get("kode"), nama: fd.get("nama"), merek: fd.get("merek") || undefined, model: fd.get("model") || undefined,
    nomorSeri: fd.get("nomorSeri") || undefined, unitKerjaId: fd.get("unitKerjaId"), lokasi: fd.get("lokasi") || undefined,
    kategori: fd.get("kategori") || undefined, tahunPerolehan: fd.get("tahunPerolehan") || null, kondisi: fd.get("kondisi") || "Baik",
    catatan: fd.get("catatan") || undefined,
  });
}

export async function buatAlat(_prev: StatusAksi, fd: FormData): Promise<StatusAksi> {
  const g = await penjaga();
  if (!g.sesi) return { error: g.pesan! };
  const parsed = bacaForm(fd);
  if (!parsed.success) return { error: pesanZod(parsed.error) };
  const d = parsed.data;
  if (await prisma.alat.findUnique({ where: { kode: d.kode } })) return { error: `Kode inventaris ${d.kode} sudah terdaftar.` };
  if (!(await prisma.unitKerja.findUnique({ where: { id: d.unitKerjaId } }))) return { error: "Unit kerja tidak dikenal." };
  await prisma.alat.create({ data: { ...d, merek: d.merek || null, model: d.model || null, nomorSeri: d.nomorSeri || null, lokasi: d.lokasi || null, kategori: d.kategori || null, tahunPerolehan: d.tahunPerolehan ?? null, catatan: d.catatan || null } });
  await audit("alat.buat", { email: g.sesi.user.email, ip: await ip(), objek: d.kode, detail: d.nama });
  revalidatePath("/admin/alat");
  return { ok: `Alat ${d.kode} ditambahkan.` };
}

export async function ubahAlat(_prev: StatusAksi, fd: FormData): Promise<StatusAksi> {
  const g = await penjaga();
  if (!g.sesi) return { error: g.pesan! };
  const id = z.coerce.number().int().positive().safeParse(fd.get("id"));
  if (!id.success) return { error: "ID alat tidak valid." };
  const parsed = bacaForm(fd);
  if (!parsed.success) return { error: pesanZod(parsed.error) };
  const d = parsed.data;
  const alat = await prisma.alat.findUnique({ where: { id: id.data } });
  if (!alat) return { error: "Alat tidak ditemukan." };
  const bentrok = await prisma.alat.findUnique({ where: { kode: d.kode } });
  if (bentrok && bentrok.id !== id.data) return { error: `Kode inventaris ${d.kode} dipakai alat lain.` };
  if (!(await prisma.unitKerja.findUnique({ where: { id: d.unitKerjaId } }))) return { error: "Unit kerja tidak dikenal." };
  await prisma.alat.update({ where: { id: id.data }, data: { ...d, merek: d.merek || null, model: d.model || null, nomorSeri: d.nomorSeri || null, lokasi: d.lokasi || null, kategori: d.kategori || null, tahunPerolehan: d.tahunPerolehan ?? null, catatan: d.catatan || null } });
  await audit("alat.ubah", { email: g.sesi.user.email, ip: await ip(), objek: d.kode, detail: `kondisi ${d.kondisi}` });
  revalidatePath("/admin/alat");
  return { ok: `Alat ${d.kode} diperbarui.` };
}
