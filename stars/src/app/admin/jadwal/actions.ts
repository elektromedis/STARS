"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sesiApi } from "@/lib/sesi";
import { audit, ipDari } from "@/lib/audit";
import { nomorBerikut, skemaJadwal, tambahHari } from "@/lib/pemeliharaan";

export type StatusAksi = { ok?: string; error?: string } | undefined;

const ip = async () => ipDari(await headers());
const pesanZod = (e: z.ZodError) => e.issues.map((i) => i.message).join("; ");

async function penjaga() {
  const { sesi, tolak } = await sesiApi("Operator");
  if (tolak) return { sesi: null, pesan: "Memerlukan peran Operator atau lebih tinggi." };
  if (process.env.STARS_MODE === "internet") return { sesi: null, pesan: "Server mode internet bersifat baca saja." };
  return { sesi, pesan: null };
}

export async function buatJadwal(_prev: StatusAksi, fd: FormData): Promise<StatusAksi> {
  const g = await penjaga();
  if (!g.sesi) return { error: g.pesan! };
  const parsed = skemaJadwal.safeParse({ alatId: fd.get("alatId"), nama: fd.get("nama"), intervalHari: fd.get("intervalHari"), checklist: fd.get("checklist") || undefined, mulai: fd.get("mulai") || new Date() });
  if (!parsed.success) return { error: pesanZod(parsed.error) };
  const d = parsed.data;
  const alat = await prisma.alat.findUnique({ where: { id: d.alatId } });
  if (!alat) return { error: "Alat tidak dikenal." };
  await prisma.jadwalPreventif.create({ data: { alatId: d.alatId, nama: d.nama, intervalHari: d.intervalHari, checklist: d.checklist || null, berikutnya: d.mulai, aktif: true } });
  await audit("jadwal.buat", { email: g.sesi.user.email, ip: await ip(), objek: alat.kode, detail: `${d.nama} tiap ${d.intervalHari} hari` });
  revalidatePath("/admin/jadwal");
  return { ok: `Jadwal "${d.nama}" untuk ${alat.kode} dibuat.` };
}

const skemaUbah = z.object({
  id: z.coerce.number().int().positive(),
  nama: z.string().trim().min(1).max(160),
  intervalHari: z.coerce.number().int().min(1).max(3650),
  checklist: z.string().trim().max(4000).optional(),
  berikutnya: z.coerce.date().nullable().optional(),
  aktif: z.coerce.boolean(),
});

export async function ubahJadwal(_prev: StatusAksi, fd: FormData): Promise<StatusAksi> {
  const g = await penjaga();
  if (!g.sesi) return { error: g.pesan! };
  const parsed = skemaUbah.safeParse({ id: fd.get("id"), nama: fd.get("nama"), intervalHari: fd.get("intervalHari"), checklist: fd.get("checklist") || undefined, berikutnya: fd.get("berikutnya") || null, aktif: fd.get("aktif") === "on" });
  if (!parsed.success) return { error: pesanZod(parsed.error) };
  const d = parsed.data;
  const j = await prisma.jadwalPreventif.findUnique({ where: { id: d.id }, include: { alat: true } });
  if (!j) return { error: "Jadwal tidak ditemukan." };
  await prisma.jadwalPreventif.update({ where: { id: d.id }, data: { nama: d.nama, intervalHari: d.intervalHari, checklist: d.checklist || null, berikutnya: d.berikutnya ?? j.berikutnya, aktif: d.aktif } });
  await audit("jadwal.ubah", { email: g.sesi.user.email, ip: await ip(), objek: j.alat.kode, detail: `${d.nama}, aktif ${d.aktif}` });
  revalidatePath("/admin/jadwal");
  return { ok: `Jadwal "${d.nama}" diperbarui.` };
}

/** Buat satu WO Preventif dari jadwal, lalu majukan tanggal berikutnya. Dipakai tombol per-jadwal dan "semua jatuh tempo". */
async function terbitkanWo(jadwalId: number, email: string | null | undefined) {
  const j = await prisma.jadwalPreventif.findUnique({ where: { id: jadwalId }, include: { alat: true, perintah: { where: { status: { in: ["Terbuka", "Dikerjakan"] } }, select: { nomor: true } } } });
  if (!j) return { error: "Jadwal tidak ditemukan." };
  if (!j.aktif) return { error: `Jadwal "${j.nama}" nonaktif.` };
  if (j.perintah.length > 0) return { error: `Masih ada WO aktif (${j.perintah[0].nomor}) untuk jadwal "${j.nama}".` };
  const kini = new Date();
  let berikut = tambahHari(j.berikutnya ?? kini, j.intervalHari);
  while (berikut <= kini) berikut = tambahHari(berikut, j.intervalHari);
  const nomor = await nomorBerikut("WO");
  await prisma.$transaction([
    prisma.perintahKerja.create({ data: { nomor, alatId: j.alatId, jadwalId: j.id, jenis: "Preventif", deskripsi: `Pemeliharaan preventif: ${j.nama} — ${j.alat.nama} (${j.alat.kode})`, prioritas: "Normal", checklist: j.checklist, status: "Terbuka" } }),
    prisma.jadwalPreventif.update({ where: { id: j.id }, data: { terakhir: kini, berikutnya: berikut } }),
  ]);
  await audit("perintah.buat", { email, ip: await ip(), objek: nomor, detail: `preventif dari jadwal "${j.nama}" (${j.alat.kode})` });
  return { ok: nomor };
}

export async function buatWoDariJadwal(_prev: StatusAksi, fd: FormData): Promise<StatusAksi> {
  const g = await penjaga();
  if (!g.sesi) return { error: g.pesan! };
  const id = z.coerce.number().int().positive().safeParse(fd.get("id"));
  if (!id.success) return { error: "ID jadwal tidak valid." };
  const r = await terbitkanWo(id.data, g.sesi.user.email);
  revalidatePath("/admin/jadwal"); revalidatePath("/admin/pemeliharaan");
  return r.error ? { error: r.error } : { ok: `Perintah kerja ${r.ok} dibuat.` };
}

export async function buatSemuaJatuhTempo(_prev: StatusAksi, _fd: FormData): Promise<StatusAksi> {
  void _fd;
  const g = await penjaga();
  if (!g.sesi) return { error: g.pesan! };
  const tempo = await prisma.jadwalPreventif.findMany({ where: { aktif: true, berikutnya: { lte: new Date() } }, select: { id: true } });
  let jadi = 0; const lewat: string[] = [];
  for (const t of tempo) { const r = await terbitkanWo(t.id, g.sesi.user.email); if (r.error) lewat.push(r.error); else jadi++; }
  revalidatePath("/admin/jadwal"); revalidatePath("/admin/pemeliharaan");
  if (tempo.length === 0) return { ok: "Tidak ada jadwal yang jatuh tempo." };
  return { ok: `${jadi} perintah kerja preventif dibuat.${lewat.length ? ` Dilewati ${lewat.length}: ${lewat[0]}` : ""}` };
}
