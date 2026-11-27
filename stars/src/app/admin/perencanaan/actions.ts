"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { sesiHalaman } from "@/lib/sesi";
import { audit } from "@/lib/audit";
import { pesan } from "@/lib/aksi-admin";
import { izin } from "@/lib/izin-admin";
import { KUNCI_PMK } from "@/lib/aspak";

export async function simpanPersen(fd: FormData) {
  const se = await sesiHalaman("Admin"); await izin(se, "ubah", "/admin/perencanaan");
  const v = Number(String(fd.get("persen") ?? "").replace(",", "."));
  if (!Number.isFinite(v) || v < 0 || v > 100) return pesan("/admin/perencanaan", "error", "Persentase harus 0–100.");
  await prisma.pengaturan.upsert({ where: { kunci: KUNCI_PMK }, create: { kunci: KUNCI_PMK, nilai: String(v), diubahOleh: se.user.email }, update: { nilai: String(v), diubahOleh: se.user.email } });
  await audit("perencanaan.persen", { email: se.user.email, objek: `${v}%` });
  revalidatePath("/admin/perencanaan");
  pesan("/admin/perencanaan", "ok", `Persentase biaya pemeliharaan diatur ${v}%.`);
}
