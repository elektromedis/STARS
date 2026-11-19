"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { sesiHalaman } from "@/lib/sesi";
import { cukup } from "@/lib/peran";
import { unitTerkunci } from "@/lib/akses";
import { audit, ipDari } from "@/lib/audit";
import { buatTte } from "@/lib/tte";
import { URUTAN_KIR, JUDUL_KIR, dataKir, nomorKir, type PeranKir } from "@/lib/kir";

const balik = (q: string, unit = ""): never => redirect(`/admin/kir?${unit ? `unit=${encodeURIComponent(unit)}&` : ""}${q}`);

/** Tanda tangani KIR sesuai urutan: Kepala Ruangan (Viewer unitnya / Operator+) → PJ Alkes → Pengurus Barang → Direktur (Operator+). */
export async function tandatanganiKir(fd: FormData) {
  const s = await sesiHalaman("Viewer");
  const unit = String(fd.get("unit") ?? "");
  if (process.env.STARS_MODE === "internet") return balik("error=" + encodeURIComponent("Server mode internet bersifat baca saja."), unit);
  const r = await dataKir(Number(fd.get("ruanganId")) || 0);
  const tahun = Number(fd.get("tahun")) || new Date().getFullYear();
  const peran = String(fd.get("peran")) as PeranKir;
  if (!r || !URUTAN_KIR.includes(peran)) return balik("error=" + encodeURIComponent("Data tidak valid."), unit);
  const kunci = await unitTerkunci();
  if (kunci && kunci.nama !== r.unitKerja.nama) return balik("error=" + encodeURIComponent("Bukan ruangan unit Anda."), unit);
  if (peran !== "KepalaRuangan" && !cukup(s.user.peran, "Operator")) return balik("error=" + encodeURIComponent(`${JUDUL_KIR[peran]} perlu akun Operator/Admin.`), unit);
  if (r.alat.length === 0) return balik("error=" + encodeURIComponent("Ruangan belum berisi alat."), unit);
  const nomor = nomorKir(r.id, tahun);
  const ada = await prisma.tandaTangan.findMany({ where: { nomor }, select: { peran: true } });
  const i = URUTAN_KIR.indexOf(peran);
  if (ada.some((t) => t.peran === peran)) return balik("error=" + encodeURIComponent(`${JUDUL_KIR[peran]} sudah menandatangani.`), unit);
  if (i > 0 && !ada.some((t) => t.peran === URUTAN_KIR[i - 1])) return balik("error=" + encodeURIComponent(`Tunggu TTE ${JUDUL_KIR[URUTAN_KIR[i - 1]]} terlebih dahulu.`), unit);
  const nip = String(fd.get("nip") ?? "").replace(/\D/g, "").slice(0, 18);
  const ip = ipDari(await headers());
  await buatTte({ nomor, peran, nama: String(fd.get("nama") ?? "").trim().slice(0, 120) || s.user.name || s.user.email || "Petugas", identitas: nip ? `NIP. ${nip}` : null, ip });
  await audit("kir.tte", { email: s.user.email, ip, objek: nomor, detail: peran });
  revalidatePath("/admin/kir");
  balik("ok=" + encodeURIComponent(`KIR ${r.nama} ${tahun}: ${JUDUL_KIR[peran]} menandatangani secara elektronik.`), unit);
}

/** Admin: batalkan semua TTE KIR (mis. isi ruangan berubah, perlu disahkan ulang). */
export async function resetKir(fd: FormData) {
  const s = await sesiHalaman("Admin");
  const nomor = String(fd.get("nomor") ?? ""), unit = String(fd.get("unit") ?? "");
  if (!/^KIR-\d+-\d{4}$/.test(nomor)) return balik("error=" + encodeURIComponent("Nomor tidak valid."), unit);
  const { count } = await prisma.tandaTangan.deleteMany({ where: { nomor } });
  await audit("kir.reset", { email: s.user.email, ip: ipDari(await headers()), objek: nomor, detail: `${count} TTE dihapus` });
  revalidatePath("/admin/kir");
  balik("ok=" + encodeURIComponent(`${count} TTE pada ${nomor} dibatalkan — silakan tandatangani ulang.`), unit);
}
