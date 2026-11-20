"use server";

import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { sesiHalaman } from "@/lib/sesi";
import { audit, ipDari } from "@/lib/audit";
import { folderJdih, simpanPdfJdih, STATUS_PERATURAN } from "@/lib/jdih";

const balik = (q: string): never => redirect(`/admin/jdih?${q}`);
const s = (fd: FormData, k: string, n = 300) => String(fd.get(k) ?? "").trim().slice(0, n);
const url = (v: string) => (/^https?:\/\//.test(v) ? v : "");

/** Tambah (tanpa id) atau ubah (dengan id) peraturan. */
export async function simpanPeraturan(fd: FormData) {
  const se = await sesiHalaman("Admin");
  const id = Number(fd.get("id")) || 0;
  const tahun = Number(fd.get("tahun"));
  const data = {
    jenis: s(fd, "jenis", 40), nomor: s(fd, "nomor", 80), tahun, judul: s(fd, "judul", 500),
    pemrakarsa: s(fd, "pemrakarsa", 120) || null, subjek: s(fd, "subjek", 60) || null,
    status: STATUS_PERATURAN.includes(s(fd, "status")) ? s(fd, "status") : "Berlaku",
    keterangan: s(fd, "keterangan", 1000) || null, tautan: url(s(fd, "tautan", 600)) || null,
  };
  if (!data.jenis || !data.nomor || !data.judul || !(tahun >= 1945 && tahun <= 2100)) return balik("error=" + encodeURIComponent("Jenis, nomor, tahun (1945–2100), dan judul wajib diisi."));
  const lama = id ? await prisma.peraturan.findUnique({ where: { id } }) : null;
  if (id && !lama) return balik("error=Tidak+ditemukan");
  let berkas = lama?.berkas ?? null;
  const f = fd.get("berkas");
  if (f instanceof File && f.size > 0) {
    const r = await simpanPdfJdih(f); if (typeof r !== "string") return balik("error=" + encodeURIComponent(r.error));
    if (berkas) await unlink(join(folderJdih(), berkas)).catch(() => {});
    berkas = r;
  } else if (fd.get("hapusBerkas") === "on" && berkas) { await unlink(join(folderJdih(), berkas)).catch(() => {}); berkas = null; }
  if (id) await prisma.peraturan.update({ where: { id }, data: { ...data, berkas } });
  else await prisma.peraturan.create({ data: { ...data, berkas } });
  await audit(id ? "jdih.ubah" : "jdih.tambah", { email: se.user.email, ip: ipDari(await headers()), objek: `${data.jenis} ${data.nomor}/${tahun}` });
  revalidatePath("/jdih");
  balik("ok=" + encodeURIComponent(id ? "Peraturan diperbarui." : "Peraturan ditambahkan."));
}

export async function aksiPeraturan(fd: FormData) {
  const se = await sesiHalaman("Admin");
  const id = Number(fd.get("id")) || 0, aksi = String(fd.get("aksi"));
  const p = await prisma.peraturan.findUnique({ where: { id } });
  if (!p) return balik("error=Tidak+ditemukan");
  if (aksi === "hapus") { await prisma.peraturan.delete({ where: { id } }); if (p.berkas) await unlink(join(folderJdih(), p.berkas)).catch(() => {}); }
  else await prisma.peraturan.update({ where: { id }, data: { aktif: !p.aktif } });
  await audit("jdih." + (aksi === "hapus" ? "hapus" : "tampil"), { email: se.user.email, ip: ipDari(await headers()), objek: `${p.jenis} ${p.nomor}/${p.tahun}` });
  revalidatePath("/jdih");
  balik("ok=" + encodeURIComponent(aksi === "hapus" ? "Dihapus." : p.aktif ? "Disembunyikan dari publik." : "Ditampilkan."));
}
