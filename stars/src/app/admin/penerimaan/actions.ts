"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { sesiHalaman } from "@/lib/sesi";
import { izin } from "@/lib/izin-admin";
import { audit, ipDari } from "@/lib/audit";
import { JENIS_BERKAS, nomorPenerimaanBaru, skemaPenerimaan } from "@/lib/master";
import { periksaDokumenAlat, simpanDokumenAlat } from "@/lib/alat-berkas";
import { s, pesan, modeBaca, pesanZod, tglWib } from "@/lib/aksi-admin";

const HAL = "/admin/penerimaan";

export async function simpanPenerimaan(fd: FormData) {
  const se = await sesiHalaman("Operator");
  await izin(se, "ubah", HAL);
  if (modeBaca()) return pesan(HAL, "error", "Server mode internet bersifat baca saja.");
  const v = skemaPenerimaan.safeParse({
    nomorKontrak: fd.get("nomorKontrak"), tanggal: s(fd, "tanggal", 10) || undefined, nomorBap: s(fd, "nomorBap") || undefined, tanggalBap: s(fd, "tanggalBap", 10) || null,
    rekananId: fd.get("rekananId") || null, tipe: fd.get("tipe"), jenis: fd.get("jenis"), nilai: fd.get("nilai") || null, catatan: s(fd, "catatan", 1000) || undefined,
  });
  if (!v.success) return pesan(HAL, "error", pesanZod(v.error));
  const id = Number(fd.get("id")) || null;
  const data = { ...v.data, tanggal: tglWib(s(fd, "tanggal", 10))!, tanggalBap: tglWib(s(fd, "tanggalBap", 10)), rekananId: v.data.rekananId ?? null, nilai: v.data.nilai ?? null };
  const p = id ? await prisma.penerimaanAlat.update({ where: { id }, data }) : await prisma.penerimaanAlat.create({ data: { ...data, nomor: await nomorPenerimaanBaru(), oleh: se.user.email ?? null } });
  await audit(id ? "penerimaan.ubah" : "penerimaan.tambah", { email: se.user.email, ip: ipDari(await headers()), objek: p.nomor, detail: p.nomorKontrak });
  revalidatePath(HAL);
  pesan(`${HAL}?id=${p.id}`, "ok", `Penerimaan ${p.nomor} disimpan.`);
}

/** Tautkan alat (satu kode per baris) ke penerimaan; kode yang tidak dikenal dilaporkan. */
export async function tautkanAlat(fd: FormData) {
  const se = await sesiHalaman("Operator");
  const id = Number(fd.get("id")) || 0, url = `${HAL}?id=${id}`;
  await izin(se, "ubah", url);
  if (modeBaca()) return pesan(url, "error", "Server mode internet bersifat baca saja.");
  if (!(await prisma.penerimaanAlat.findUnique({ where: { id }, select: { id: true } }))) return pesan(HAL, "error", "Penerimaan tidak ditemukan.");
  const kode = String(fd.get("kode") ?? "").split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean).slice(0, 500);
  if (!kode.length) return pesan(url, "error", "Isi minimal satu kode alat.");
  const ada = await prisma.alat.findMany({ where: { kode: { in: kode } }, select: { kode: true } });
  const dikenal = new Set(ada.map((a) => a.kode));
  await prisma.alat.updateMany({ where: { kode: { in: [...dikenal] } }, data: { penerimaanId: id } });
  await audit("penerimaan.tautkan", { email: se.user.email, objek: `#${id}`, detail: `${dikenal.size} alat` });
  revalidatePath(HAL);
  const hilang = kode.filter((k) => !dikenal.has(k));
  pesan(url, hilang.length ? "error" : "ok", hilang.length ? `${dikenal.size} alat ditautkan. Kode tidak dikenal: ${hilang.slice(0, 10).join(", ")}${hilang.length > 10 ? "…" : ""}` : `${dikenal.size} alat ditautkan.`);
}

export async function lepasAlat(fd: FormData) {
  const se = await sesiHalaman("Operator");
  const id = Number(fd.get("id")) || 0;
  await izin(se, "ubah", `${HAL}?id=${id}`);
  await prisma.alat.update({ where: { id: Number(fd.get("alatId")) || 0 }, data: { penerimaanId: null } }).catch(() => null);
  await audit("penerimaan.lepas", { email: se.user.email, objek: `#${id}` });
  revalidatePath(HAL);
  pesan(`${HAL}?id=${id}`, "ok", "Alat dilepas dari penerimaan.");
}

export async function unggahBerkas(fd: FormData) {
  const se = await sesiHalaman("Operator");
  const id = Number(fd.get("id")) || 0, url = `${HAL}?id=${id}`;
  await izin(se, "buat", url);
  if (modeBaca()) return pesan(url, "error", "Server mode internet bersifat baca saja.");
  if (!(await prisma.penerimaanAlat.findUnique({ where: { id }, select: { id: true } }))) return pesan(HAL, "error", "Penerimaan tidak ditemukan.");
  const file = fd.get("berkas");
  if (!(file instanceof File) || file.size === 0) return pesan(url, "error", "Pilih berkas (PDF/JPG/PNG/DOCX/XLSX).");
  const jenis = (JENIS_BERKAS as readonly string[]).includes(s(fd, "jenis")) ? s(fd, "jenis") : "Lainnya";
  const v = await periksaDokumenAlat(file);
  if ("error" in v) return pesan(url, "error", v.error);
  const nama = await simpanDokumenAlat(v);
  await prisma.berkasPenerimaan.create({ data: { penerimaanId: id, jenis, nama: v.nama, berkas: nama, ukuran: v.ukuran, oleh: se.user.email ?? null } });
  await audit("penerimaan.berkas", { email: se.user.email, objek: `#${id}`, detail: `${jenis}: ${v.nama}` });
  revalidatePath(HAL);
  pesan(url, "ok", `${v.nama} diunggah.`);
}

export async function hapusBerkas(fd: FormData) {
  const se = await sesiHalaman("Admin");
  await izin(se, "hapus", HAL);
  const b = await prisma.berkasPenerimaan.delete({ where: { id: Number(fd.get("berkasId")) || 0 } }).catch(() => null);
  if (b) {
    const { hapusDokumenAlatJikaYatim } = await import("@/lib/alat-berkas");
    if ((await prisma.berkasPenerimaan.count({ where: { berkas: b.berkas } })) === 0) await hapusDokumenAlatJikaYatim(b.berkas);
    await audit("penerimaan.berkas.hapus", { email: se.user.email, objek: `#${b.penerimaanId}`, detail: b.nama });
  }
  revalidatePath(HAL);
  pesan(`${HAL}?id=${b?.penerimaanId ?? ""}`, "ok", "Berkas dihapus.");
}
