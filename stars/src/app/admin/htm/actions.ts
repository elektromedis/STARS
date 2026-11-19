"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { sesiHalaman } from "@/lib/sesi";
import { cukup } from "@/lib/peran";
import { audit, ipDari } from "@/lib/audit";
import { buatTte, samarkan } from "@/lib/tte";

const balik = (q: string): never => redirect(`/admin/htm?${q}#penghapusan`);
const e = (s: string) => "error=" + encodeURIComponent(s);

export async function ajukanPenghapusan(fd: FormData) {
  const s = await sesiHalaman("Operator");
  if (process.env.STARS_MODE === "internet") return balik(e("Server mode internet bersifat baca saja."));
  const alat = await prisma.alat.findUnique({ where: { id: Number(fd.get("alatId")) || 0 }, select: { id: true, aktif: true, kategoriLimbah: true } });
  if (!alat?.aktif) return balik(e("Pilih alat aktif."));
  if (await prisma.penghapusan.findFirst({ where: { alatId: alat.id, status: { in: ["Diajukan", "Diverifikasi"] } } })) return balik(e("Alat ini sudah dalam proses penghapusan."));
  const alasan = String(fd.get("alasan") ?? ""), tujuan = String(fd.get("tujuan") ?? "");
  if (!alasan || !tujuan) return balik(e("Alasan dan tujuan wajib diisi."));
  const th = new Date().getFullYear();
  const n = await prisma.penghapusan.count({ where: { nomor: { startsWith: `HPS-${th}-` } } });
  const nomor = `HPS-${th}-${String(n + 1).padStart(4, "0")}`;
  await prisma.penghapusan.create({ data: { nomor, alatId: alat.id, alasan, tujuan, keterangan: String(fd.get("keterangan") ?? "").slice(0, 500) || null, kategoriLimbah: String(fd.get("kategoriLimbah") || alat.kategoriLimbah || "") || null, pengusul: s.user.name ?? s.user.email ?? "Petugas" } });
  await audit("penghapusan.ajukan", { email: s.user.email, ip: ipDari(await headers()), objek: nomor });
  revalidatePath("/admin/htm");
  balik("ok=" + encodeURIComponent(`${nomor} diajukan. Lakukan dekontaminasi & penghapusan data pasien, lalu verifikasi.`));
}

/** verifikasi (Operator, TTE PJ Alkes — wajib dekontaminasi & data dihapus) → setujui (Admin, TTE Direktur; alat nonaktif & Afkir) | tolak */
export async function langkahPenghapusan(fd: FormData) {
  const s = await sesiHalaman("Operator");
  const nomor = String(fd.get("nomor") ?? ""), aksi = String(fd.get("aksi") ?? "");
  const h = await prisma.penghapusan.findUnique({ where: { nomor } });
  if (!h) return balik(e("Tidak ditemukan."));
  const ip = ipDari(await headers()), nama = s.user.name ?? s.user.email ?? "Petugas", identitas = samarkan(s.user.email);
  if (aksi === "verifikasi" && h.status === "Diajukan") {
    const dek = fd.get("dekontaminasi") === "on", dat = fd.get("dataDihapus") === "on";
    if (!dek || !dat) return balik(e("Centang dekontaminasi dan penghapusan data pasien terlebih dahulu (WHO 7.11)."));
    await prisma.penghapusan.update({ where: { nomor }, data: { dekontaminasi: true, dataDihapus: true, status: "Diverifikasi" } });
    await buatTte({ nomor, peran: "PjAlkes", nama, identitas, ip });
  } else if ((aksi === "setujui" || aksi === "tolak") && h.status === "Diverifikasi") {
    if (!cukup(s.user.peran, "Admin")) return balik(e("Persetujuan penghapusan memerlukan akun Admin (atas nama Direktur)."));
    if (aksi === "tolak") await prisma.penghapusan.update({ where: { nomor }, data: { status: "Ditolak" } });
    else {
      await buatTte({ nomor, peran: "Direktur", nama, identitas, ip });
      await prisma.$transaction([
        prisma.penghapusan.update({ where: { nomor }, data: { status: "Disetujui" } }),
        prisma.alat.update({ where: { id: h.alatId }, data: { aktif: false, kondisi: "Afkir", statusOperasi: "Tidak beroperasi", alasanTidakOperasi: "Rusak tidak dapat diperbaiki" } }),
      ]);
    }
  } else return balik(e(`Aksi tidak sesuai status ${h.status}.`));
  await audit(`penghapusan.${aksi}`, { email: s.user.email, ip, objek: nomor });
  revalidatePath("/admin/htm");
  balik("ok=" + encodeURIComponent(`${nomor}: ${aksi} berhasil.`));
}
