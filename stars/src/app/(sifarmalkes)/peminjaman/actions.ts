"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { cukup } from "@/lib/peran";
import { audit, ipDari } from "@/lib/audit";
import { buatTte, samarkan, type PeranTte } from "@/lib/tte";

const balik = (q: string): never => redirect(`/peminjaman?${q}`);
const tgl = (s: FormDataEntryValue | null) => { const d = new Date(`${String(s ?? "")}T08:00:00+07:00`); return Number.isNaN(d.getTime()) ? null : d; };

async function sesiWajib() {
  const s = await auth();
  if (!s?.user) redirect("/login?callbackUrl=/peminjaman");
  if (process.env.STARS_MODE === "internet") balik("error=" + encodeURIComponent("Server mode internet bersifat baca saja."));
  return s;
}

export async function ajukanPeminjaman(fd: FormData) {
  const s = await sesiWajib();
  const alatId = Number(fd.get("alatId")), keUnitId = Number(fd.get("keUnitId"));
  const peminjam = String(fd.get("peminjam") ?? "").trim().slice(0, 120), keperluan = String(fd.get("keperluan") ?? "").trim().slice(0, 500);
  const mulai = tgl(fd.get("tanggalPinjam")), kembali = tgl(fd.get("rencanaKembali"));
  const alat = Number.isInteger(alatId) ? await prisma.alat.findUnique({ where: { id: alatId }, select: { id: true, unitKerjaId: true, aktif: true } }) : null;
  if (!alat?.aktif) return balik("error=" + encodeURIComponent("Pilih alat yang valid."));
  if (!Number.isInteger(keUnitId) || keUnitId === alat.unitKerjaId) return balik("error=" + encodeURIComponent("Unit peminjam harus berbeda dari unit pemilik alat."));
  if (peminjam.length < 3 || keperluan.length < 3) return balik("error=" + encodeURIComponent("Nama peminjam & keperluan wajib diisi."));
  if (!mulai || !kembali || kembali < mulai) return balik("error=" + encodeURIComponent("Tanggal kembali harus setelah tanggal pinjam."));
  const bentrok = await prisma.peminjaman.findFirst({ where: { alatId, status: { in: ["Diajukan", "Disetujui", "Dipinjam"] }, tanggalPinjam: { lte: kembali }, rencanaKembali: { gte: mulai } } });
  if (bentrok) return balik("error=" + encodeURIComponent(`Alat sudah dipesan pada rentang itu (${bentrok.nomor}).`));
  const th = new Date().getFullYear();
  const n = await prisma.peminjaman.count({ where: { nomor: { startsWith: `PJ-${th}-` } } });
  const nomor = `PJ-${th}-${String(n + 1).padStart(4, "0")}`;
  await prisma.peminjaman.create({ data: { nomor, alatId, dariUnitId: alat.unitKerjaId, keUnitId, peminjam, pemohonEmail: s.user.email ?? null, keperluan, tanggalPinjam: mulai, rencanaKembali: kembali } });
  await audit("peminjaman.ajukan", { email: s.user.email, ip: ipDari(await headers()), objek: nomor });
  revalidatePath("/peminjaman");
  balik("ok=" + encodeURIComponent(`${nomor} diajukan. Menunggu persetujuan unit pemilik / elektromedis.`));
}

/** Langkah alur: setujui (TTE Pemberi) → serahkan (TTE Penerima) → kembalikan (TTE Pengembalian); atau tolak. */
export async function langkahPeminjaman(fd: FormData) {
  const s = await sesiWajib();
  const nomor = String(fd.get("nomor") ?? ""), aksi = String(fd.get("aksi") ?? "");
  const p = await prisma.peminjaman.findUnique({ where: { nomor } });
  if (!p) return balik("error=" + encodeURIComponent("Peminjaman tidak ditemukan."));
  const operator = cukup(s.user.peran, "Operator");
  const atur: Record<string, { dari: string; ke: string; peran?: PeranTte; operator: boolean }> = {
    setujui: { dari: "Diajukan", ke: "Disetujui", peran: "Pemberi", operator: true },
    tolak: { dari: "Diajukan", ke: "Ditolak", operator: true },
    serahkan: { dari: "Disetujui", ke: "Dipinjam", peran: "Penerima", operator: false },
    kembalikan: { dari: "Dipinjam", ke: "Dikembalikan", peran: "Pengembalian", operator: true },
  };
  const a = atur[aksi];
  if (!a || p.status !== a.dari) return balik("error=" + encodeURIComponent(`Aksi tidak sesuai status ${p.status}.`));
  if (a.operator && !operator) return balik("error=" + encodeURIComponent("Hanya Operator/Admin elektromedis yang boleh melakukan ini."));
  if (!a.operator && !operator && s.user.unitKerjaId !== p.keUnitId && s.user.email !== p.pemohonEmail) return balik("error=" + encodeURIComponent("Hanya unit peminjam yang menerima alat."));
  const kondisi = String(fd.get("kondisi") ?? "").trim().slice(0, 200) || null, catatan = String(fd.get("catatan") ?? "").trim().slice(0, 500) || null;
  if (aksi === "kembalikan" && !kondisi) return balik("error=" + encodeURIComponent("Isi kondisi alat saat dikembalikan."));
  await prisma.peminjaman.update({ where: { nomor }, data: { status: a.ke, ...(catatan ? { catatan } : {}), ...(aksi === "kembalikan" ? { tanggalKembali: new Date(), kondisiKembali: kondisi } : {}) } });
  if (a.peran) await buatTte({ nomor, peran: a.peran, nama: s.user.name ?? s.user.email ?? "Petugas", identitas: samarkan(s.user.email), ip: ipDari(await headers()) });
  await audit(`peminjaman.${aksi}`, { email: s.user.email, ip: ipDari(await headers()), objek: nomor });
  revalidatePath("/peminjaman");
  balik("ok=" + encodeURIComponent(`${nomor}: ${a.ke}${a.peran ? " — ditandatangani secara elektronik" : ""}.`));
}
