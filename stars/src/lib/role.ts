/**
 * Peran pengguna (jabatan/fungsi, mengikuti pola TRILUX) + pengaturan akses ON/OFF per peran.
 *
 * Dua lapis:
 *  - TINGKATAN sistem (kolom `peran`: Viewer < Operator < Admin < Super Admin) — pengaman dasar yang sudah ada, tidak berubah.
 *  - PERAN (kolom `role`) — menentukan menu/fitur yang tampil & aksi yang diizinkan, diatur Admin di Admin → User System.
 * Izin efektif = tingkatan mengizinkan DAN sakelar peran ON. Super Administrator selalu penuh.
 */
import { cache } from "react";
import { prisma } from "./prisma";
import { bacaPengaturan, simpanPengaturan } from "./pengaturan";

import { AKSI, ROLE, ROLE_PENUH, SEMUA_MENU, namaRole, roleBawaan, menuUntuk, type KodeAksi } from "./role-daftar";
export * from "./role-daftar";

export type AksesRole = { aksi: Record<string, boolean>; menu: Record<string, boolean> };
const KUNCI = "akses_role";

/** Bawaan: semua menu ON; aksi mengikuti tingkatan bawaan peran. */
export function aksesBawaan(role: string): AksesRole {
  const t = ROLE.find((r) => r.nama === role)?.tingkat ?? "Viewer";
  const op = t !== "Viewer", ad = t === "Admin" || t === "Super Admin";
  return {
    aksi: { buat: op, ubah: op, hapus: ad, impor: op, ekspor: true, setujui: ad, proses: op },
    menu: Object.fromEntries(SEMUA_MENU.map((h) => [h, true])),
  };
}

export async function bacaSemuaAkses(): Promise<Record<string, AksesRole>> {
  let simpan: Record<string, Partial<AksesRole>> = {};
  try { simpan = JSON.parse((await bacaPengaturan(KUNCI)) ?? "{}"); } catch { simpan = {}; }
  return Object.fromEntries(ROLE.map((r) => {
    const b = aksesBawaan(r.nama), s = simpan[r.nama] ?? {};
    return [r.nama, { aksi: { ...b.aksi, ...(s.aksi ?? {}) }, menu: { ...b.menu, ...(s.menu ?? {}) } }];
  }));
}

export async function simpanAksesRole(role: string, akses: AksesRole, oleh: string) {
  let simpan: Record<string, AksesRole> = {};
  try { simpan = JSON.parse((await bacaPengaturan(KUNCI)) ?? "{}"); } catch { simpan = {}; }
  simpan[role] = akses;
  await simpanPengaturan(KUNCI, JSON.stringify(simpan), oleh);
}

/** Akses efektif pengguna yang sedang login (sekali per permintaan). null = tanpa pembatasan peran. */
export const aksesPengguna = cache(async (userId: string | undefined | null): Promise<(AksesRole & { role: string }) | null> => {
  const id = Number(userId);
  if (!Number.isInteger(id) || id <= 0) return null;
  const u = await prisma.pengguna.findUnique({ where: { id }, select: { role: true, peran: true } }).catch(() => null);
  if (!u) return null;
  const role = u.role && namaRole.has(u.role) ? u.role : roleBawaan(u.peran);
  if (role === ROLE_PENUH) return null;
  return { role, ...(await bacaSemuaAkses())[role] };
});

export async function bolehMenu(userId: string | undefined | null, path: string) {
  const a = await aksesPengguna(userId);
  if (!a) return true;
  const h = menuUntuk(path);
  return !h || a.menu[h] !== false;
}

export async function bolehAksi(userId: string | undefined | null, aksi: KodeAksi) {
  const a = await aksesPengguna(userId);
  return !a || a.aksi[aksi] !== false;
}

export const labelAksi = (k: KodeAksi) => AKSI.find((a) => a.kode === k)?.label.replace("Izinkan ", "") ?? k;

/** Untuk route unduhan: 403 bila pengguna yang login dimatikan izin "ekspor"-nya. Pengunjung tanpa akun tidak terpengaruh. */
export async function tolakEkspor() {
  const { auth } = await import("@/auth");
  const s = await auth();
  if (!s?.user || (await bolehAksi(s.user.id, "ekspor"))) return null;
  const { NextResponse } = await import("next/server");
  return NextResponse.json({ error: "Peran Anda tidak diizinkan mengunduh/ekspor data (atur di Admin → User System)." }, { status: 403 });
}
