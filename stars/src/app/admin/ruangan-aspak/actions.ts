"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { sesiHalaman } from "@/lib/sesi";
import { audit, ipDari } from "@/lib/audit";
import { s, pesan } from "@/lib/aksi-admin";
import { izin } from "@/lib/izin-admin";

const HAL = "/admin/ruangan-aspak";

export async function simpanPadanan(fd: FormData) {
  const se = await sesiHalaman("Operator"); await izin(se, "ubah", HAL);
  const id = Number(fd.get("id")) || 0, padanan = s(fd, "padanan", 200) || null;
  const r = await prisma.ruangan.update({ where: { id }, data: { padananAspak: padanan } }).catch(() => null);
  if (!r) return pesan(HAL, "error", "Ruangan tidak ditemukan.");
  await audit("ruangan.padanan", { email: se.user.email, ip: ipDari(await headers()), objek: `${r.nama} → ${padanan ?? "—"}` });
  revalidatePath(HAL); revalidatePath("/admin/aspak");
  pesan(HAL, "ok", `Padanan ${r.nama} disimpan.`);
}

/** Isi otomatis padanan yang masih kosong bila nama ruangan identik dengan salah satu ruang standar. */
export async function isiOtomatis() {
  const se = await sesiHalaman("Operator"); await izin(se, "ubah", HAL);
  const std = [...new Set((await prisma.standarAlat.findMany({ select: { namaRuangan: true } })).map((x) => x.namaRuangan))];
  const kosong = await prisma.ruangan.findMany({ where: { padananAspak: null } });
  let n = 0;
  for (const r of kosong) {
    const t = std.find((x) => x.toLowerCase().replace(/^ruangan\s+/, "") === r.nama.toLowerCase().replace(/^ruangan\s+/, ""));
    if (t) { await prisma.ruangan.update({ where: { id: r.id }, data: { padananAspak: t } }); n++; }
  }
  await audit("ruangan.padanan.otomatis", { email: se.user.email, objek: `${n} ruangan` });
  revalidatePath(HAL); revalidatePath("/admin/aspak");
  pesan(HAL, "ok", `${n} ruangan terisi otomatis (hanya yang namanya identik dengan ruang standar).`);
}
