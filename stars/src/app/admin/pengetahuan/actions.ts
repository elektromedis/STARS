"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { audit, ipDari } from "@/lib/audit";
import { sesiHalaman } from "@/lib/sesi";

export async function hapusDokumen(fd: FormData) {
  const se = await sesiHalaman("Admin");
  if (process.env.STARS_MODE === "internet") return;
  const d = await prisma.dokumenPengetahuan.findUnique({ where: { id: Number(fd.get("id")) || 0 } });
  if (!d) return;
  await prisma.dokumenPengetahuan.delete({ where: { id: d.id } });
  await audit("PENGETAHUAN_HAPUS", { email: se.user?.email, objek: d.judul, ip: ipDari(await headers()) });
  revalidatePath("/admin/pengetahuan");
}
