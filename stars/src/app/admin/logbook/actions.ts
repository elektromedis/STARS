"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { sesiHalaman } from "@/lib/sesi";
import { izin } from "@/lib/izin-admin";
import { audit, ipDari } from "@/lib/audit";
import { s, pesan, modeBaca, tglWib } from "@/lib/aksi-admin";

/** Data aset tambahan alat (Fase A/E): nomor internal, sole agent, penyusutan, kode SIMAK/SIMBADA. */
export async function simpanAsetTambahan(fd: FormData) {
  const se = await sesiHalaman("Operator");
  const kode = s(fd, "kode", 60), url = `/admin/logbook?kode=${encodeURIComponent(kode)}`;
  await izin(se, "ubah", url);
  if (modeBaca()) return pesan(url, "error", "Server mode internet bersifat baca saja.");
  const a = await prisma.alat.findUnique({ where: { kode } });
  if (!a) return pesan("/admin/logbook", "error", "Alat tidak ditemukan.");
  const angka = (k: string) => { const t = s(fd, k, 30); if (!t) return null; const n = Number(t); return Number.isFinite(n) && n >= 0 ? n : NaN; };
  const residu = angka("nilaiResidu"), urut = angka("urutJenis");
  if (Number.isNaN(residu) || Number.isNaN(urut)) return pesan(url, "error", "Nilai residu dan urutan harus angka ≥ 0.");
  if (residu != null && a.hargaPerolehan != null && residu > a.hargaPerolehan) return pesan(url, "error", "Nilai residu tidak boleh melebihi harga perolehan.");
  let penerimaanId: number | null = null;
  const noPnr = s(fd, "penerimaan", 30);
  if (noPnr) { const p = await prisma.penerimaanAlat.findUnique({ where: { nomor: noPnr } }); if (!p) return pesan(url, "error", `Penerimaan ${noPnr} tidak ditemukan.`); penerimaanId = p.id; }
  await prisma.alat.update({ where: { id: a.id }, data: {
    noInternal: s(fd, "noInternal", 60) || null, urutJenis: urut == null ? null : Math.trunc(urut), soleAgent: s(fd, "soleAgent", 160) || null,
    tanggalTerhitung: tglWib(s(fd, "tanggalTerhitung", 10)), nilaiResidu: residu, kodeSimak: s(fd, "kodeSimak", 60) || null, kodeSimbada: s(fd, "kodeSimbada", 60) || null, penerimaanId,
  } });
  await audit("alat.aset", { email: se.user.email, ip: ipDari(await headers()), objek: a.kode });
  revalidatePath("/admin/logbook");
  pesan(url, "ok", "Data aset tambahan disimpan.");
}
