"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { sesiHalaman } from "@/lib/sesi";
import { cukup } from "@/lib/peran";
import { unitTerkunci } from "@/lib/akses";
import { izin } from "@/lib/izin-admin";
import { audit, ipDari } from "@/lib/audit";
import { s, pesan, modeBaca, pesanZod } from "@/lib/aksi-admin";
import { skemaUsulan, skemaVerifikasi, skorAkhir, skorSkala } from "@/lib/perencanaan";

const url = (b: string, t?: number) => `/admin/pengadaan?bagian=${b}${t ? `&tahun=${t}` : ""}`;
const RO = "Server mode internet bersifat baca saja.";

export async function ajukanUsulan(fd: FormData) {
  const se = await sesiHalaman("Viewer");
  if (modeBaca()) return pesan(url("usulan"), "error", RO);
  const v = skemaUsulan.safeParse({
    tahun: fd.get("tahun"), unitKerjaId: fd.get("unitKerjaId") || null, ruangan: s(fd, "ruangan", 120) || undefined, namaAlat: s(fd, "namaAlat", 200), sifat: fd.get("sifat"),
    jumlah: fd.get("jumlah") || 1, hargaSatuan: fd.get("hargaSatuan") || 0, gantiUsia: fd.get("gantiUsia") === "" || fd.get("gantiUsia") == null ? null : fd.get("gantiUsia"),
    gantiKondisi: s(fd, "gantiKondisi", 30) || null, alasan: s(fd, "alasan", 1000) || undefined,
    skorUrgensi: fd.get("skorUrgensi") || 3, skorExisting: fd.get("skorExisting") || 3, skorPeruntukan: fd.get("skorPeruntukan") || 3,
  });
  if (!v.success) return pesan(url("usulan"), "error", pesanZod(v.error));
  const d = v.data;
  const kunci = await unitTerkunci();
  if (kunci?.id && d.unitKerjaId == null) d.unitKerjaId = kunci.id;
  if (kunci?.id && d.unitKerjaId !== kunci.id) return pesan(url("usulan", d.tahun), "error", `Anda hanya dapat mengusulkan untuk unit ${kunci.nama}.`);
  await prisma.usulanPengadaan.create({ data: {
    tahun: d.tahun, unitKerjaId: d.unitKerjaId, ruangan: d.ruangan ?? null, namaAlat: d.namaAlat, sifat: d.sifat, jumlah: d.jumlah, hargaSatuan: d.hargaSatuan,
    gantiUsia: d.sifat === "Ganti" ? d.gantiUsia : null, gantiKondisi: d.sifat === "Ganti" ? d.gantiKondisi : null, alasan: d.alasan ?? null, pengusul: se.user.email ?? "",
    skorUrgensi: d.skorUrgensi, skorExisting: d.skorExisting, skorPeruntukan: d.skorPeruntukan,
    skorFinal: skorAkhir(skorSkala(d.skorUrgensi, d.skorExisting, d.skorPeruntukan), null),
  } });
  await audit("usulan.ajukan", { email: se.user.email, ip: ipDari(await headers()), objek: d.namaAlat });
  revalidatePath("/admin/pengadaan"); pesan(url("usulan", d.tahun), "ok", `Usulan ${d.namaAlat} diajukan.`);
}

export async function batalkanUsulan(fd: FormData) {
  const se = await sesiHalaman("Viewer");
  if (modeBaca()) return pesan(url("usulan"), "error", RO);
  const u = await prisma.usulanPengadaan.findUnique({ where: { id: Number(fd.get("id")) || 0 } });
  if (!u) return pesan(url("usulan"), "error", "Usulan tidak ditemukan.");
  if (u.status !== "Diajukan") return pesan(url("usulan", u.tahun), "error", "Hanya usulan berstatus Diajukan yang dapat dibatalkan.");
  if (u.pengusul !== se.user.email && !cukup(se.user.peran, "Admin")) return pesan(url("usulan", u.tahun), "error", "Hanya pengusul atau Admin yang dapat membatalkan.");
  await prisma.usulanPengadaan.delete({ where: { id: u.id } });
  await audit("usulan.batal", { email: se.user.email, objek: u.namaAlat });
  revalidatePath("/admin/pengadaan"); pesan(url("usulan", u.tahun), "ok", "Usulan dibatalkan.");
}

export async function verifikasiUsulan(fd: FormData) {
  const se = await sesiHalaman("Admin"); await izin(se, "setujui", url("nominasi"));
  const v = skemaVerifikasi.safeParse({
    id: fd.get("id"), status: fd.get("status"), jumlahSetuju: fd.get("jumlahSetuju") || 0, kabidUrgensi: fd.get("kabidUrgensi") || 3, kabidExisting: fd.get("kabidExisting") || 3, kabidPeruntukan: fd.get("kabidPeruntukan") || 3,
    sumberDana: s(fd, "sumberDana", 40) || undefined, masukPagu: fd.get("masukPagu") === "on", sesuaiIndikator: fd.get("sesuaiIndikator") === "on", sesuaiProgram: fd.get("sesuaiProgram") === "on",
    sesuaiAspak: fd.get("sesuaiAspak") === "on", sesuaiLegal: fd.get("sesuaiLegal") === "on", catatan: s(fd, "catatan", 500) || undefined,
  });
  if (!v.success) return pesan(url("nominasi"), "error", pesanZod(v.error));
  const d = v.data;
  const u = await prisma.usulanPengadaan.findUnique({ where: { id: d.id } });
  if (!u) return pesan(url("nominasi"), "error", "Usulan tidak ditemukan.");
  if (d.status === "Disetujui" && d.jumlahSetuju < 1) return pesan(url("nominasi", u.tahun), "error", "Jumlah disetujui minimal 1.");
  if (d.jumlahSetuju > u.jumlah) return pesan(url("nominasi", u.tahun), "error", `Jumlah disetujui melebihi usulan (${u.jumlah}).`);
  const akhir = skorAkhir(skorSkala(u.skorUrgensi, u.skorExisting, u.skorPeruntukan), skorSkala(d.kabidUrgensi, d.kabidExisting, d.kabidPeruntukan));
  await prisma.usulanPengadaan.update({ where: { id: d.id }, data: {
    status: d.status, jumlahSetuju: d.status === "Disetujui" ? d.jumlahSetuju : 0, verifikator: se.user.email, verifikasiPada: new Date(), catatan: d.catatan ?? null,
    kabidUrgensi: d.kabidUrgensi, kabidExisting: d.kabidExisting, kabidPeruntukan: d.kabidPeruntukan, sesuaiIndikator: d.sesuaiIndikator, sesuaiProgram: d.sesuaiProgram,
    sesuaiAspak: d.sesuaiAspak, sesuaiLegal: d.sesuaiLegal, skorFinal: akhir, masukPagu: d.status === "Disetujui" && d.masukPagu, sumberDana: d.sumberDana ?? null,
  } });
  await audit("usulan.verifikasi", { email: se.user.email, ip: ipDari(await headers()), objek: `${u.namaAlat}: ${d.status}` });
  revalidatePath("/admin/pengadaan"); pesan(url("nominasi", u.tahun), "ok", `${u.namaAlat}: ${d.status}.`);
}

export async function simpanPagu(fd: FormData) {
  const se = await sesiHalaman("Admin"); await izin(se, "ubah", url("pagu"));
  const tahun = Number(fd.get("tahun")), sumberDana = s(fd, "sumberDana", 40), nilai = Number(fd.get("nilai"));
  if (!Number.isInteger(tahun) || tahun < 2020 || tahun > 2100 || !sumberDana || !Number.isFinite(nilai) || nilai < 0) return pesan(url("pagu"), "error", "Tahun, sumber dana, dan nilai pagu (≥ 0) wajib valid.");
  await prisma.paguBelanja.upsert({ where: { tahun_sumberDana: { tahun, sumberDana } }, create: { tahun, sumberDana, nilai }, update: { nilai } });
  await audit("pagu.simpan", { email: se.user.email, objek: `${tahun} ${sumberDana}` });
  revalidatePath("/admin/pengadaan"); pesan(url("pagu", tahun), "ok", `Pagu ${sumberDana} ${tahun} disimpan.`);
}
