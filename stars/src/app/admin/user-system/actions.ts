"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { sesiApi } from "@/lib/sesi";
import { audit, ipDari } from "@/lib/audit";
import { AKSI, ROLE_PENUH, SEMUA_MENU, namaRole, simpanAksesRole } from "@/lib/role";

export type StatusUs = { ok?: string; error?: string } | undefined;

/** Simpan sakelar ON/OFF akses & menu untuk satu peran (Admin). Super Administrator selalu penuh. */
export async function simpanAksesPeran(_p: StatusUs, fd: FormData): Promise<StatusUs> {
  const { sesi, tolak } = await sesiApi("Admin");
  if (tolak) return { error: "Mengatur peran memerlukan tingkatan Admin." };
  const role = String(fd.get("role") ?? "");
  if (!namaRole.has(role)) return { error: "Peran tidak dikenal." };
  if (role === ROLE_PENUH) return { error: "Super Administrator selalu memiliki akses penuh." };
  const aksi = Object.fromEntries(AKSI.map((a) => [a.kode, fd.get(`aksi:${a.kode}`) === "1"]));
  const menu = Object.fromEntries(SEMUA_MENU.map((h) => [h, fd.get(`menu:${h}`) === "1"]));
  // Jangan sampai Admin mengunci dirinya sendiri dari User System.
  if (role === "Administrator") { menu["/admin/user-system"] = true; menu["/admin/pengguna"] = true; }
  await simpanAksesRole(role, { aksi, menu }, sesi.user.email ?? "admin");
  const mati = Object.values(menu).filter((v) => !v).length;
  await audit("peran.akses", { email: sesi.user.email, ip: ipDari(await headers()), objek: role, detail: `${Object.values(aksi).filter(Boolean).length}/${AKSI.length} aksi ON, ${mati} menu OFF` });
  revalidatePath("/admin", "layout");
  return { ok: `Akses peran ${role} tersimpan.` };
}
