"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { sesiHalaman } from "@/lib/sesi";
import { izin } from "@/lib/izin-admin";
import { audit, ipDari } from "@/lib/audit";
import { cocokTugas } from "@/lib/tugas";
import { s, pesan, modeBaca, tglWib } from "@/lib/aksi-admin";

const HAL = "/admin/jadwal-massal";

/** Pratinjau atau buat jadwal preventif sekaligus untuk semua alat di unit/ruangan/instalasi yang cocok dengan tugas. */
export async function jadwalkanMassal(fd: FormData) {
  const se = await sesiHalaman("Operator");
  await izin(se, "buat", HAL);
  if (modeBaca()) return pesan(HAL, "error", "Server mode internet bersifat baca saja.");
  const tugas = await prisma.masterTugas.findUnique({ where: { id: Number(fd.get("tugasId")) || 0 } });
  if (!tugas || !tugas.aktif) return pesan(HAL, "error", "Pilih master tugas yang aktif.");
  const unitId = Number(fd.get("unitId")) || null, ruanganId = Number(fd.get("ruanganId")) || null, instalasi = s(fd, "instalasi", 120);
  if (!unitId && !ruanganId && !instalasi) return pesan(HAL, "error", "Pilih minimal satu cakupan: unit kerja, ruangan, atau instalasi.");
  const mulai = tglWib(s(fd, "mulai", 10)) ?? new Date();
  const alat = await prisma.alat.findMany({
    where: { aktif: true, ...(unitId && { unitKerjaId: unitId }), ...(ruanganId && { ruanganId }), ...(instalasi && { instalasi: { contains: instalasi } }) },
    select: { id: true, nama: true, jadwal: { where: { aktif: true, tugasId: tugas.id }, select: { id: true } } },
  });
  const cocok = alat.filter((a) => cocokTugas(a.nama, tugas.kataKunci));
  const baru = cocok.filter((a) => !a.jadwal.length);
  const ringkas = `${cocok.length} alat cocok, ${cocok.length - baru.length} sudah terjadwal, ${baru.length} jadwal baru`;
  if (fd.get("aksi") !== "buat") return pesan(`${HAL}?${new URLSearchParams({ unitId: String(unitId ?? ""), ruanganId: String(ruanganId ?? ""), instalasi, tugasId: String(tugas.id), mulai: s(fd, "mulai", 10) })}`, "ok", `Pratinjau: ${ringkas}.`);
  if (!baru.length) return pesan(HAL, "error", `Tidak ada jadwal baru. ${ringkas}.`);
  if (baru.length > 2000) return pesan(HAL, "error", "Cakupan terlalu besar (>2000 alat). Persempit per ruangan.");
  await prisma.jadwalPreventif.createMany({ data: baru.map((a) => ({ alatId: a.id, nama: tugas.nama, intervalHari: tugas.periodeHari, checklist: tugas.checklist, berikutnya: mulai, tugasId: tugas.id })) });
  await audit("jadwal.massal", { email: se.user.email, ip: ipDari(await headers()), objek: tugas.nama, detail: ringkas });
  revalidatePath(HAL); revalidatePath("/admin/jadwal");
  pesan(HAL, "ok", `Jadwal dibuat: ${ringkas}.`);
}
