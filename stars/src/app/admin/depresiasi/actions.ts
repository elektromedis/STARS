"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { sesiHalaman } from "@/lib/sesi";
import { audit } from "@/lib/audit";
import { pesan } from "@/lib/aksi-admin";
import { izin } from "@/lib/izin-admin";

export async function simpanInflasi(fd: FormData) {
  const se = await sesiHalaman("Admin"); await izin(se, "ubah", "/admin/depresiasi");
  const tahun = Number(fd.get("tahun")), persen = Number(String(fd.get("persen") ?? "").replace(",", "."));
  if (!Number.isInteger(tahun) || tahun < 1990 || tahun > 2100 || !Number.isFinite(persen) || persen < -50 || persen > 200) return pesan("/admin/depresiasi", "error", "Tahun (1990–2100) dan persen inflasi valid wajib diisi.");
  await prisma.inflasiTahun.upsert({ where: { tahun }, create: { tahun, persen }, update: { persen } });
  await audit("inflasi.simpan", { email: se.user.email, objek: `${tahun}: ${persen}%` });
  revalidatePath("/admin/depresiasi"); pesan("/admin/depresiasi", "ok", `Inflasi ${tahun} disimpan.`);
}

export async function hapusInflasi(fd: FormData) {
  const se = await sesiHalaman("Admin"); await izin(se, "ubah", "/admin/depresiasi");
  const tahun = Number(fd.get("tahun")) || 0;
  const r = await prisma.inflasiTahun.delete({ where: { tahun } }).catch(() => null);
  if (r) await audit("inflasi.hapus", { email: se.user.email, objek: String(tahun) });
  revalidatePath("/admin/depresiasi"); pesan("/admin/depresiasi", "ok", r ? `Inflasi ${tahun} dihapus.` : "Tidak ditemukan.");
}
