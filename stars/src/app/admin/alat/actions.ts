"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sesiApi } from "@/lib/sesi";
import { audit, ipDari } from "@/lib/audit";
import { skemaAlat, skemaRuangan } from "@/lib/pemeliharaan";

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
    nomorSeri: fd.get("nomorSeri") || undefined, unitKerjaId: fd.get("unitKerjaId"), ruanganId: fd.get("ruanganId") || null,
    lokasi: fd.get("lokasi") || undefined, kategori: fd.get("kategori") || undefined, jenis: fd.get("jenis") || "Medik",
    risiko: fd.get("risiko") || null, tahunPerolehan: fd.get("tahunPerolehan") || null, hargaPerolehan: fd.get("hargaPerolehan") || null,
    usiaTeknis: fd.get("usiaTeknis") || null, garansiSampai: fd.get("garansiSampai") || null, kondisi: fd.get("kondisi") || "Baik",
    catatan: fd.get("catatan") || undefined, kodeAspak: fd.get("kodeAspak") || undefined, pendanaan: fd.get("pendanaan") || undefined,
    akl: fd.get("akl") || undefined, produsen: fd.get("produsen") || undefined, distributor: fd.get("distributor") || undefined,
    tanggalUjiFungsi: fd.get("tanggalUjiFungsi") || null,
  });
}

type DataAlat = ReturnType<typeof bacaForm> extends { success: true; data: infer D } | { success: false } ? D : never;
function rapikan(d: DataAlat) {
  return {
    ...d, merek: d.merek || null, model: d.model || null, nomorSeri: d.nomorSeri || null, ruanganId: d.ruanganId ?? null,
    lokasi: d.lokasi || null, kategori: d.kategori || null, risiko: d.risiko ?? null, tahunPerolehan: d.tahunPerolehan ?? null,
    hargaPerolehan: d.hargaPerolehan ?? null, usiaTeknis: d.usiaTeknis ?? null, garansiSampai: d.garansiSampai ?? null, catatan: d.catatan || null,
    kodeAspak: d.kodeAspak || null, pendanaan: d.pendanaan || null, akl: d.akl || null, produsen: d.produsen || null, distributor: d.distributor || null,
    tanggalUjiFungsi: d.tanggalUjiFungsi ?? null,
  };
}

async function cekRelasi(d: DataAlat): Promise<string | null> {
  if (!(await prisma.unitKerja.findUnique({ where: { id: d.unitKerjaId } }))) return "Unit kerja tidak dikenal.";
  if (d.ruanganId) {
    const r = await prisma.ruangan.findUnique({ where: { id: d.ruanganId } });
    if (!r) return "Ruangan tidak dikenal.";
    if (r.unitKerjaId !== d.unitKerjaId) return "Ruangan itu bukan milik unit kerja yang dipilih.";
  }
  return null;
}

export async function buatRuangan(_prev: StatusAksi, fd: FormData): Promise<StatusAksi> {
  const g = await penjaga();
  if (!g.sesi) return { error: g.pesan! };
  const parsed = skemaRuangan.safeParse({ nama: fd.get("nama"), gedung: fd.get("gedung") || undefined, unitKerjaId: fd.get("unitKerjaId"), kepala: fd.get("kepala") || undefined });
  if (!parsed.success) return { error: pesanZod(parsed.error) };
  const d = parsed.data;
  if (!(await prisma.unitKerja.findUnique({ where: { id: d.unitKerjaId } }))) return { error: "Unit kerja tidak dikenal." };
  if (await prisma.ruangan.findUnique({ where: { nama_unitKerjaId: { nama: d.nama, unitKerjaId: d.unitKerjaId } } })) return { error: `Ruangan ${d.nama} sudah ada di unit itu.` };
  await prisma.ruangan.create({ data: { nama: d.nama, gedung: d.gedung || null, unitKerjaId: d.unitKerjaId, kepala: d.kepala || null } });
  await audit("ruangan.buat", { email: g.sesi.user.email, ip: await ip(), objek: d.nama });
  revalidatePath("/admin/alat");
  return { ok: `Ruangan ${d.nama} ditambahkan.` };
}

export async function buatAlat(_prev: StatusAksi, fd: FormData): Promise<StatusAksi> {
  const g = await penjaga();
  if (!g.sesi) return { error: g.pesan! };
  const parsed = bacaForm(fd);
  if (!parsed.success) return { error: pesanZod(parsed.error) };
  const d = parsed.data;
  if (await prisma.alat.findUnique({ where: { kode: d.kode } })) return { error: `Kode inventaris ${d.kode} sudah terdaftar.` };
  const salah = await cekRelasi(d);
  if (salah) return { error: salah };
  await prisma.alat.create({ data: rapikan(d) });
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
  const salah = await cekRelasi(d);
  if (salah) return { error: salah };
  await prisma.alat.update({ where: { id: id.data }, data: rapikan(d) });
  await audit("alat.ubah", { email: g.sesi.user.email, ip: await ip(), objek: d.kode, detail: `kondisi ${d.kondisi}` });
  revalidatePath("/admin/alat");
  return { ok: `Alat ${d.kode} diperbarui.` };
}
