"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { cukup } from "@/lib/peran";
import { audit, ipDari } from "@/lib/audit";
import { KARYAWAN, type IdKaryawan } from "@/lib/allies-karyawan";
import { bacaJadwal, kerjakan, simpanJadwal, type JadwalKaryawan } from "@/lib/karyawan-ai";

export type StatusKai = { ok?: string; error?: string } | undefined;

async function admin() {
  const s = await auth();
  return s?.user && cukup(s.user.peran, "Admin") ? s : null;
}

export async function simpanJadwalKaryawan(_p: StatusKai, fd: FormData): Promise<StatusKai> {
  const s = await admin();
  if (!s) return { error: "Hanya Admin." };
  const lama = await bacaJadwal();
  const baru = { ...lama };
  for (const k of KARYAWAN) {
    const jam = String(fd.get(`jam:${k.id}`) ?? lama[k.id].jam);
    baru[k.id] = { aktif: fd.get(`aktif:${k.id}`) === "1", jam: /^([01]\d|2[0-3]):[0-5]\d$/.test(jam) ? jam : lama[k.id].jam, hari: fd.get(`hari:${k.id}`) === "setiap" ? "setiap" : "kerja" } satisfies JadwalKaryawan;
  }
  await simpanJadwal(baru, s.user!.email ?? "admin");
  await audit("karyawan-ai.jadwal", { email: s.user!.email, ip: ipDari(await headers()), detail: KARYAWAN.map((k) => `${k.id}:${baru[k.id].aktif ? baru[k.id].jam : "OFF"}`).join(" ") });
  revalidatePath("/admin/karyawan-ai");
  return { ok: "Jadwal Karyawan AI tersimpan." };
}

export async function jalankanSekarang(_p: StatusKai, fd: FormData): Promise<StatusKai> {
  const s = await admin();
  if (!s) return { error: "Hanya Admin." };
  const id = String(fd.get("id")) as IdKaryawan;
  if (!KARYAWAN.some((k) => k.id === id)) return { error: "Karyawan tidak dikenal." };
  const c = await kerjakan(id, true);
  revalidatePath("/admin/karyawan-ai");
  return { ok: `${c.judul}: selesai (${c.isi.length} temuan).` };
}
