"use server";

import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { sesiHalaman } from "@/lib/sesi";
import { audit, ipDari } from "@/lib/audit";
import { folderSitus, simpanGambarSitus } from "@/lib/situs-server";
import type { GrupTautan, InfoSitus } from "@/lib/situs";

const balik = (q: string): never => redirect(`/admin/situs?${q}`);
const s = (fd: FormData, k: string, n = 300) => String(fd.get(k) ?? "").trim().slice(0, n);
const url = (v: string) => (/^(https?:\/\/|\/)/.test(v) ? v : "");

/** Baris tautan: "Label | Label EN | /tautan" per baris; grup dipisah baris "## Judul | Judul EN". */
function uraiGrup(t: string): GrupTautan[] {
  const grup: GrupTautan[] = [];
  for (const b of t.split(/\r?\n/).map((x) => x.trim()).filter(Boolean)) {
    if (b.startsWith("##")) { const [j, je] = b.slice(2).split("|").map((x) => x.trim()); grup.push({ judul: j, judulEn: je || undefined, tautan: [] }); continue; }
    const p = b.split("|").map((x) => x.trim());
    const href = url(p[p.length - 1]); if (!href || !grup.length) continue;
    grup[grup.length - 1].tautan.push({ label: p[0], labelEn: p.length > 2 ? p[1] : undefined, href });
  }
  return grup.slice(0, 6);
}

export async function simpanInfo(fd: FormData) {
  const se = await sesiHalaman("Admin");
  const info: InfoSitus = {
    alamat: s(fd, "alamat"), telepon: s(fd, "telepon", 40), whatsapp: s(fd, "whatsapp", 20).replace(/[^\d]/g, ""), email: s(fd, "email", 120), peta: url(s(fd, "peta", 600)),
    sosial: { facebook: url(s(fd, "facebook")), instagram: url(s(fd, "instagram")), x: url(s(fd, "x")), youtube: url(s(fd, "youtube")), tiktok: url(s(fd, "tiktok")) },
    aplikasiAndroid: url(s(fd, "aplikasiAndroid")), aplikasiIos: url(s(fd, "aplikasiIos")),
    grup: uraiGrup(String(fd.get("grup") ?? "")), bantuanTeks: s(fd, "bantuanTeks", 30) || "Bantuan?", tampilBilahAtas: fd.get("tampilBilahAtas") === "on",
  };
  await prisma.pengaturanSitus.upsert({ where: { kunci: "info" }, create: { kunci: "info", nilai: JSON.stringify(info) }, update: { nilai: JSON.stringify(info) } });
  await audit("situs.info", { email: se.user.email, ip: ipDari(await headers()) });
  revalidatePath("/", "layout");
  balik("ok=" + encodeURIComponent("Bilah situs disimpan."));
}

export async function tambahPengumuman(fd: FormData) {
  const se = await sesiHalaman("Admin");
  const judul = s(fd, "judul", 120);
  if (!judul) return balik("error=" + encodeURIComponent("Judul wajib diisi."));
  const f = fd.get("gambar");
  let gambar: string | null = null;
  if (f instanceof File && f.size > 0) { const r = await simpanGambarSitus(f); if (typeof r !== "string") return balik("error=" + encodeURIComponent(r.error)); gambar = r; }
  const tgl = (k: string) => { const v = s(fd, k, 10); return v ? new Date(`${v}T${k === "selesai" ? "23:59:59" : "00:00:00"}+07:00`) : null; };
  await prisma.pengumuman.create({ data: { judul, gambar, tautan: url(s(fd, "tautan", 500)) || null, mulai: tgl("mulai"), selesai: tgl("selesai"), urut: Number(fd.get("urut")) || 0 } });
  await audit("situs.pengumuman", { email: se.user.email, ip: ipDari(await headers()), objek: judul });
  revalidatePath("/admin/situs");
  balik("ok=" + encodeURIComponent("Pengumuman ditambahkan."));
}

export async function ubahPengumuman(fd: FormData) {
  await sesiHalaman("Admin");
  const id = Number(fd.get("id")) || 0, aksi = String(fd.get("aksi"));
  const p = await prisma.pengumuman.findUnique({ where: { id } });
  if (!p) return balik("error=Tidak+ditemukan");
  if (aksi === "hapus") { await prisma.pengumuman.delete({ where: { id } }); if (p.gambar) await unlink(join(folderSitus(), p.gambar)).catch(() => {}); }
  else await prisma.pengumuman.update({ where: { id }, data: { aktif: !p.aktif } });
  revalidatePath("/admin/situs");
  balik("ok=" + encodeURIComponent(aksi === "hapus" ? "Dihapus." : p.aktif ? "Dinonaktifkan." : "Diaktifkan."));
}
