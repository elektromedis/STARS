"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sesiApi } from "@/lib/sesi";
import { cukup } from "@/lib/peran";
import { bolehAksi } from "@/lib/role";
import { audit, ipDari } from "@/lib/audit";
import { nomorMutasiBaru, STATUS_TERBUKA } from "@/lib/mutasi";

export type StatusMutasi = { ok?: string; error?: string } | undefined;

async function penjaga(aksi: "ubah" | "setujui" | "proses") {
  const { sesi, tolak } = await sesiApi("Operator");
  if (tolak) return { sesi: null, pesan: "Memerlukan peran Operator atau lebih tinggi." };
  if (process.env.STARS_MODE === "internet") return { sesi: null, pesan: "Server mode internet bersifat baca saja." };
  if (!(await bolehAksi(sesi.user.id, aksi))) return { sesi: null, pesan: "Peran Anda tidak diizinkan untuk tindakan ini (atur di Admin → CMS Pengguna → User System)." };
  return { sesi, pesan: null };
}
/** Operator ber-unit (bukan Admin) hanya boleh menangani unitnya sendiri. */
const unitSaya = (s: { user: { peran: string; unitKerja?: string | null } }) => (s.user.unitKerja && !cukup(s.user.peran, "Admin") ? s.user.unitKerja : null);
const segar = () => { revalidatePath("/admin/mutasi"); revalidatePath("/admin/alat"); revalidatePath("/admin/kir"); };

const skemaAju = z.object({
  alatId: z.coerce.number().int().positive("Pilih alat."),
  keUnitId: z.coerce.number().int().positive("Pilih unit tujuan."),
  keRuanganId: z.coerce.number().int().positive().nullable(),
  alasan: z.string().trim().min(5, "Isi alasan (min. 5 huruf).").max(500),
});

export async function ajukanMutasi(_p: StatusMutasi, fd: FormData): Promise<StatusMutasi> {
  const g = await penjaga("ubah");
  if (!g.sesi) return { error: g.pesan! };
  const v = skemaAju.safeParse({ alatId: fd.get("alatId"), keUnitId: fd.get("keUnitId"), keRuanganId: fd.get("keRuanganId") || null, alasan: fd.get("alasan") });
  if (!v.success) return { error: v.error.issues.map((i) => i.message).join("; ") };
  const d = v.data;
  const alat = await prisma.alat.findUnique({ where: { id: d.alatId }, include: { unitKerja: true, ruangan: true } });
  if (!alat || !alat.aktif) return { error: "Alat tidak ditemukan atau sudah nonaktif." };
  const saya = unitSaya(g.sesi);
  if (saya && alat.unitKerja.nama !== saya) return { error: `Akun Anda hanya boleh mengajukan alat unit ${saya}.` };
  if (await prisma.mutasiAlat.findFirst({ where: { alatId: alat.id, status: { in: STATUS_TERBUKA } } })) return { error: `Alat ${alat.kode} masih punya pengajuan relokasi/mutasi yang belum selesai.` };
  const ke = await prisma.unitKerja.findUnique({ where: { id: d.keUnitId } });
  if (!ke) return { error: "Unit tujuan tidak dikenal." };
  const ru = d.keRuanganId ? await prisma.ruangan.findUnique({ where: { id: d.keRuanganId } }) : null;
  if (d.keRuanganId && (!ru || ru.unitKerjaId !== ke.id)) return { error: "Ruangan tujuan bukan milik unit tujuan." };
  if (ke.id === alat.unitKerjaId && (ru?.id ?? null) === (alat.ruanganId ?? null)) return { error: "Tujuan sama dengan lokasi alat sekarang." };
  const nomor = await nomorMutasiBaru();
  await prisma.mutasiAlat.create({ data: {
    nomor, alatId: alat.id, jenis: ke.id === alat.unitKerjaId ? "Relokasi" : "Mutasi",
    dariUnitId: alat.unitKerjaId, dariUnit: alat.unitKerja.nama, dariRuanganId: alat.ruanganId, dariRuangan: alat.ruangan?.nama ?? null,
    keUnitId: ke.id, keUnit: ke.nama, keRuanganId: ru?.id ?? null, keRuangan: ru?.nama ?? null, alasan: d.alasan, diajukanOleh: g.sesi.user.email ?? null,
  } });
  await audit("mutasi.ajukan", { email: g.sesi.user.email, ip: ipDari(await headers()), objek: alat.kode, detail: `${nomor}: ${alat.unitKerja.nama}${alat.ruangan ? `/${alat.ruangan.nama}` : ""} → ${ke.nama}${ru ? `/${ru.nama}` : ""}` });
  segar();
  return { ok: `${nomor} diajukan. Menunggu persetujuan.` };
}

export async function putuskanMutasi(_p: StatusMutasi, fd: FormData): Promise<StatusMutasi> {
  const g = await penjaga("setujui");
  if (!g.sesi) return { error: g.pesan! };
  const id = Number(fd.get("id")), setuju = fd.get("keputusan") === "setujui", catatan = String(fd.get("catatan") ?? "").trim().slice(0, 500) || null;
  const m = await prisma.mutasiAlat.findUnique({ where: { id }, include: { alat: { select: { kode: true } } } });
  if (!m || m.status !== "Diajukan") return { error: "Pengajuan tidak ditemukan atau sudah diputuskan." };
  if (!cukup(g.sesi.user.peran, "Admin") && m.diajukanOleh === g.sesi.user.email) return { error: "Pengajuan Anda sendiri harus diputuskan petugas lain atau Admin." };
  if (!setuju && !catatan) return { error: "Isi alasan penolakan." };
  await prisma.mutasiAlat.update({ where: { id }, data: { status: setuju ? "Disetujui" : "Ditolak", diputuskanOleh: g.sesi.user.email ?? null, diputuskanPada: new Date(), catatanKeputusan: catatan } });
  await audit(setuju ? "mutasi.setujui" : "mutasi.tolak", { email: g.sesi.user.email, ip: ipDari(await headers()), objek: m.alat.kode, detail: `${m.nomor}${catatan ? `: ${catatan}` : ""}` });
  segar();
  return { ok: `${m.nomor} ${setuju ? "disetujui. Lanjutkan serah terima di unit tujuan." : "ditolak."}` };
}

export async function terimaMutasi(_p: StatusMutasi, fd: FormData): Promise<StatusMutasi> {
  const g = await penjaga("proses");
  if (!g.sesi) return { error: g.pesan! };
  const id = Number(fd.get("id")), kondisi = String(fd.get("kondisi") ?? "Baik").slice(0, 40);
  const m = await prisma.mutasiAlat.findUnique({ where: { id }, include: { alat: true } });
  if (!m || m.status !== "Disetujui") return { error: "Hanya pengajuan berstatus Disetujui yang bisa diserahterimakan." };
  const saya = unitSaya(g.sesi);
  if (saya && saya !== m.keUnit && saya !== m.dariUnit) return { error: `Serah terima dilakukan oleh unit ${m.dariUnit} / ${m.keUnit} atau Admin.` };
  if (m.alat.unitKerjaId !== m.dariUnitId || (m.alat.ruanganId ?? null) !== (m.dariRuanganId ?? null)) return { error: "Lokasi alat sudah berubah sejak pengajuan. Batalkan lalu ajukan ulang." };
  if (m.keRuanganId && !(await prisma.ruangan.findUnique({ where: { id: m.keRuanganId } }))) return { error: "Ruangan tujuan sudah tidak ada." };
  await prisma.$transaction([
    prisma.alat.update({ where: { id: m.alatId }, data: { unitKerjaId: m.keUnitId, ruanganId: m.keRuanganId, lokasi: m.keRuangan ?? m.alat.lokasi } }),
    prisma.mutasiAlat.update({ where: { id }, data: { status: "Selesai", kondisi, diterimaOleh: g.sesi.user.email ?? null, diterimaPada: new Date() } }),
  ]);
  await audit("alat.ubah", { email: g.sesi.user.email, ip: ipDari(await headers()), objek: m.alat.kode, detail: `${m.jenis} ${m.nomor}: ${m.dariUnit}${m.dariRuangan ? `/${m.dariRuangan}` : ""} → ${m.keUnit}${m.keRuangan ? `/${m.keRuangan}` : ""}` });
  segar();
  return { ok: `${m.nomor} selesai. Lokasi ${m.alat.kode} kini ${m.keUnit}${m.keRuangan ? ` / ${m.keRuangan}` : ""}. Perbarui & sahkan ulang KIR ruangan terkait.` };
}

export async function batalkanMutasi(_p: StatusMutasi, fd: FormData): Promise<StatusMutasi> {
  const g = await penjaga("ubah");
  if (!g.sesi) return { error: g.pesan! };
  const m = await prisma.mutasiAlat.findUnique({ where: { id: Number(fd.get("id")) }, include: { alat: { select: { kode: true } } } });
  if (!m || !STATUS_TERBUKA.includes(m.status)) return { error: "Pengajuan tidak dapat dibatalkan." };
  if (!cukup(g.sesi.user.peran, "Admin") && m.diajukanOleh !== g.sesi.user.email) return { error: "Hanya pengaju atau Admin yang dapat membatalkan." };
  await prisma.mutasiAlat.update({ where: { id: m.id }, data: { status: "Dibatalkan", catatanKeputusan: `Dibatalkan oleh ${g.sesi.user.email}` } });
  await audit("mutasi.batal", { email: g.sesi.user.email, ip: ipDari(await headers()), objek: m.alat.kode, detail: m.nomor });
  segar();
  return { ok: `${m.nomor} dibatalkan.` };
}
