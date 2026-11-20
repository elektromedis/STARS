"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { sesiHalaman } from "@/lib/sesi";
import { audit, ipDari } from "@/lib/audit";
import { buatTte } from "@/lib/tte";
import { HASIL_LK, nomorLKBaru, type IsiLK } from "@/lib/lembar-kerja";

const s = (fd: FormData, k: string, n = 300) => String(fd.get(k) ?? "").trim().slice(0, n);
const pesan = (url: string, k: "ok" | "error", t: string): never => redirect(`${url}${url.includes("?") ? "&" : "?"}${k}=${encodeURIComponent(t)}`);
const modeBaca = () => process.env.STARS_MODE === "internet";

function bacaIsi(fd: FormData): IsiLK {
  const n = (p: string) => Number(fd.get(p)) || 0;
  return {
    apparatus: Array.from({ length: n("nApp") }, (_, i) => ({ nama: s(fd, `app_nama_${i}`, 120), sn: s(fd, `app_sn_${i}`, 80) })).filter((a) => a.nama),
    kualitatif: Array.from({ length: n("nKual") }, (_, i) => ({ butir: s(fd, `q_butir_${i}`, 120), hasil: (["pass", "fail", "na"].includes(s(fd, `q_${i}`)) ? s(fd, `q_${i}`) : "") as IsiLK["kualitatif"][number]["hasil"] })),
    kuantitatif: Array.from({ length: n("nKuan") }, (_, i) => ({ parameter: s(fd, `k_par_${i}`, 120), kriteria: s(fd, `k_kri_${i}`, 80), set: s(fd, `k_set_${i}`, 40), ukur: s(fd, `k_ukur_${i}`, 40), hasil: (["pass", "fail"].includes(s(fd, `k_${i}`)) ? s(fd, `k_${i}`) : "") as "pass" | "fail" | "" })),
    preventif: Array.from({ length: n("nPm") }, (_, i) => ({ butir: s(fd, `p_butir_${i}`, 120), done: fd.get(`p_${i}`) === "on" })),
  };
}

/** Teknisi (Operator+) menyimpan draf atau mengajukan lembar kerja (TTE Teknisi). */
export async function simpanLK(fd: FormData) {
  const se = await sesiHalaman("Operator");
  if (modeBaca()) return pesan("/admin/lembar-kerja", "error", "Server mode internet bersifat baca saja.");
  const nomorLama = s(fd, "nomor", 20);
  const ajukan = fd.get("aksi") === "ajukan";
  const kegiatan = s(fd, "kegiatan") === "Preventif" ? "Preventif" : "Inspeksi";
  const alat = await prisma.alat.findUnique({ where: { id: Number(fd.get("alatId")) || 0 } });
  if (!alat) return pesan("/admin/lembar-kerja", "error", "Alat tidak ditemukan.");
  const hasil = (HASIL_LK as readonly string[]).includes(s(fd, "hasil")) ? s(fd, "hasil") : "";
  const isi = bacaIsi(fd);
  const balikForm = nomorLama ? `/admin/lembar-kerja/${nomorLama}` : `/admin/lembar-kerja/baru?kegiatan=${kegiatan}&alat=${encodeURIComponent(alat.kode)}`;
  if (ajukan) {
    if (!hasil) return pesan(balikForm, "error", "Pilih status hasil (Lolos / Memerlukan pemeliharaan / Preventable problem / KTD).");
    if (isi.kualitatif.some((q) => !q.hasil)) return pesan(balikForm, "error", "Semua butir Qualitative Tasks wajib diisi Pass / Fail / N.A.");
  }
  const data = {
    kegiatan, tipeInspeksi: s(fd, "tipeInspeksi") === "Acceptance" ? "Acceptance" : "Terjadwal", alatId: alat.id, template: s(fd, "template", 120) || null,
    tanggal: new Date(`${s(fd, "tanggal", 10) || new Date().toISOString().slice(0, 10)}T08:00:00+07:00`), hasil: hasil || "Lolos",
    perhatian: s(fd, "perhatian", 1000) || null, data: JSON.stringify(isi), catatan: s(fd, "catatan", 2000) || null,
  };
  let nomor = nomorLama;
  if (nomorLama) {
    const l = await prisma.lembarKerja.findUnique({ where: { nomor: nomorLama } });
    if (!l) return pesan("/admin/lembar-kerja", "error", "Lembar kerja tidak ditemukan.");
    if (!["Draf", "Ditolak"].includes(l.status)) return pesan(balikForm, "error", "Lembar kerja yang sudah diajukan/disetujui tidak bisa diubah.");
    await prisma.lembarKerja.update({ where: { nomor }, data: { ...data, status: "Draf", alasanTolak: ajukan ? null : l.alasanTolak } });
  } else {
    nomor = await nomorLKBaru();
    await prisma.lembarKerja.create({ data: { ...data, nomor, pemeriksa: se.user.name || se.user.email || "Teknisi", emailPemeriksa: se.user.email ?? null } });
  }
  const ip = ipDari(await headers());
  if (ajukan) {
    await prisma.tandaTangan.deleteMany({ where: { nomor } });
    await prisma.lembarKerja.update({ where: { nomor }, data: { status: "Diajukan" } });
    await buatTte({ nomor, peran: "Teknisi", nama: s(fd, "nama", 120) || se.user.name || se.user.email || "Teknisi", identitas: s(fd, "nip", 18).replace(/\D/g, "") ? `NIP. ${s(fd, "nip", 18).replace(/\D/g, "")}` : null, ip });
  }
  await audit(ajukan ? "lk.ajukan" : "lk.simpan", { email: se.user.email, ip, objek: nomor, detail: `${kegiatan} ${alat.kode}` });
  revalidatePath("/admin/lembar-kerja");
  pesan(`/admin/lembar-kerja/${nomor}`, "ok", ajukan ? "Lembar kerja diajukan & ditandatangani teknisi. Menunggu persetujuan PJ Alat Kesehatan." : "Draf disimpan.");
}

/** PJ Alkes / Kepala Instalasi (Admin) menyetujui atau menolak. */
export async function putuskanLK(fd: FormData) {
  const se = await sesiHalaman("Admin");
  const nomor = s(fd, "nomor", 20), url = `/admin/lembar-kerja/${nomor}`;
  if (modeBaca()) return pesan(url, "error", "Server mode internet bersifat baca saja.");
  const l = await prisma.lembarKerja.findUnique({ where: { nomor } });
  if (!l || l.status !== "Diajukan") return pesan(url, "error", "Hanya lembar kerja berstatus Diajukan yang bisa diputuskan.");
  const ip = ipDari(await headers());
  if (fd.get("aksi") === "tolak") {
    const alasan = s(fd, "alasan", 500);
    if (!alasan) return pesan(url, "error", "Tuliskan alasan penolakan.");
    await prisma.tandaTangan.deleteMany({ where: { nomor } });
    await prisma.lembarKerja.update({ where: { nomor }, data: { status: "Ditolak", alasanTolak: alasan } });
    await audit("lk.tolak", { email: se.user.email, ip, objek: nomor, detail: alasan });
    revalidatePath("/admin/lembar-kerja");
    return pesan(url, "ok", "Lembar kerja dikembalikan ke teknisi untuk diperbaiki.");
  }
  const nip = s(fd, "nip", 18).replace(/\D/g, "");
  await buatTte({ nomor, peran: "PjAlkes", nama: s(fd, "nama", 120) || se.user.name || se.user.email || "PJ Alat Kesehatan", identitas: nip ? `NIP. ${nip}` : null, ip });
  await prisma.lembarKerja.update({ where: { nomor }, data: { status: "Disetujui" } });
  // Tindak lanjut otomatis: catat tanggal uji fungsi / perbarui jadwal preventif alat.
  if (l.kegiatan === "Inspeksi") await prisma.alat.update({ where: { id: l.alatId }, data: { tanggalUjiFungsi: l.tanggal } });
  else for (const j of await prisma.jadwalPreventif.findMany({ where: { alatId: l.alatId, aktif: true } }))
    await prisma.jadwalPreventif.update({ where: { id: j.id }, data: { terakhir: l.tanggal, berikutnya: new Date(l.tanggal.getTime() + j.intervalHari * 864e5) } });
  await audit("lk.setujui", { email: se.user.email, ip, objek: nomor });
  revalidatePath("/admin/lembar-kerja");
  pesan(url, "ok", "Lembar kerja disetujui & ditandatangani secara elektronik.");
}

export async function hapusLK(fd: FormData) {
  const se = await sesiHalaman("Operator");
  const nomor = s(fd, "nomor", 20);
  const l = await prisma.lembarKerja.findUnique({ where: { nomor } });
  if (!l) return pesan("/admin/lembar-kerja", "error", "Tidak ditemukan.");
  const admin = ["Admin", "Super Admin"].includes(se.user.peran ?? "");
  if (!admin && (l.status !== "Draf" || l.emailPemeriksa !== se.user.email)) return pesan(`/admin/lembar-kerja/${nomor}`, "error", "Hanya draf milik sendiri (atau Admin) yang bisa dihapus.");
  await prisma.tandaTangan.deleteMany({ where: { nomor } });
  await prisma.lembarKerja.delete({ where: { nomor } });
  await audit("lk.hapus", { email: se.user.email, ip: ipDari(await headers()), objek: nomor });
  revalidatePath("/admin/lembar-kerja");
  pesan("/admin/lembar-kerja", "ok", `${nomor} dihapus.`);
}

/** Pemeliharaan promotif (Pasal 3 ayat 3). */
export async function tambahPromotif(fd: FormData) {
  const se = await sesiHalaman("Operator");
  const url = "/admin/lembar-kerja?kegiatan=Promotif";
  const kode = s(fd, "kodeAlat", 60);
  const alat = kode ? await prisma.alat.findUnique({ where: { kode }, include: { unitKerja: true } }) : null;
  const namaAlat = alat?.nama ?? s(fd, "namaAlat", 120);
  const materi = s(fd, "materi", 500), pemateri = s(fd, "pemateri", 120);
  if (!namaAlat || !materi || !pemateri) return pesan(url, "error", "Alat, materi, dan pemateri wajib diisi.");
  await prisma.kegiatanPromotif.create({ data: { tanggal: new Date(`${s(fd, "tanggal", 10) || new Date().toISOString().slice(0, 10)}T08:00:00+07:00`), alatId: alat?.id ?? null, namaAlat, unit: alat?.unitKerja.nama ?? (s(fd, "unit", 120) || null), materi, pemateri, peserta: Math.max(0, Number(fd.get("peserta")) || 0), catatan: s(fd, "catatan", 1000) || null } });
  await audit("lk.promotif", { email: se.user.email, ip: ipDari(await headers()), objek: namaAlat });
  revalidatePath("/admin/lembar-kerja");
  pesan(url, "ok", "Kegiatan promotif dicatat.");
}
export async function hapusPromotif(fd: FormData) {
  await sesiHalaman("Admin");
  await prisma.kegiatanPromotif.delete({ where: { id: Number(fd.get("id")) || 0 } }).catch(() => null);
  revalidatePath("/admin/lembar-kerja");
  pesan("/admin/lembar-kerja?kegiatan=Promotif", "ok", "Dihapus.");
}

/** CMS template per jenis alat (Admin). */
export async function simpanTemplate(fd: FormData) {
  const se = await sesiHalaman("Admin");
  const id = Number(fd.get("id")) || 0, nama = s(fd, "nama", 120);
  const url = "/admin/lembar-kerja/template";
  if (!nama) return pesan(url, "error", "Nama jenis alat wajib diisi.");
  const data = { nama, kataKunci: s(fd, "kataKunci", 300) || null, halaman: Number(fd.get("halaman")) || null, kualitatif: s(fd, "kualitatif", 4000), kuantitatif: s(fd, "kuantitatif", 2000), preventif: s(fd, "preventif", 2000), lengkap: fd.get("lengkap") === "on", aktif: fd.get("aktif") !== "off" };
  try {
    if (id) await prisma.templateLembarKerja.update({ where: { id }, data }); else await prisma.templateLembarKerja.create({ data });
  } catch { return pesan(url, "error", "Nama jenis alat sudah ada."); }
  await audit("lk.template", { email: se.user.email, ip: ipDari(await headers()), objek: nama });
  revalidatePath(url);
  pesan(`${url}?q=${encodeURIComponent(nama)}`, "ok", `Template ${nama} disimpan.`);
}
