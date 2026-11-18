"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { sesiApi } from "@/lib/sesi";
import { audit, ipDari } from "@/lib/audit";
import { skemaBarang, skemaMutasi } from "@/lib/stok";

export type StatusAksi = { ok?: string; error?: string } | undefined;
const pesanZod = (e: { issues: { message: string }[] }) => [...new Set(e.issues.map((i) => i.message))].join("; ");

async function penjaga() {
  const { sesi, tolak } = await sesiApi("Operator");
  if (tolak) return { sesi: null, pesan: "Memerlukan peran Operator atau lebih tinggi." };
  if (process.env.STARS_MODE === "internet") return { sesi: null, pesan: "Server mode internet bersifat baca saja." };
  return { sesi, pesan: null };
}

/** Tambah (id kosong) atau ubah barang. Stok awal untuk barang baru dicatat sebagai mutasi "Masuk". */
export async function simpanBarang(_p: StatusAksi, fd: FormData): Promise<StatusAksi> {
  const { sesi, pesan } = await penjaga();
  if (!sesi) return { error: pesan! };
  const v = skemaBarang.safeParse({
    kode: fd.get("kode"), nama: fd.get("nama"), jenis: fd.get("jenis"), satuan: fd.get("satuan") || "pcs", stokMinimum: fd.get("stokMinimum") || 0,
    lokasi: fd.get("lokasi") || undefined, nomorLot: fd.get("nomorLot") || undefined, alatTerkait: fd.get("alatTerkait") || undefined,
    pemasok: fd.get("pemasok") || undefined, catatan: fd.get("catatan") || undefined,
    kedaluwarsa: fd.get("kedaluwarsa") || null, kalibrasiSampai: fd.get("kalibrasiSampai") || null, harga: fd.get("harga") || null,
  });
  if (!v.success) return { error: pesanZod(v.error) };
  const id = Number(fd.get("id")) || null;
  const bentrok = await prisma.barangStok.findUnique({ where: { kode: v.data.kode } });
  if (bentrok && bentrok.id !== id) return { error: `Kode ${v.data.kode} sudah dipakai.` };
  const oleh = sesi.user.email ?? null;
  if (id) {
    await prisma.barangStok.update({ where: { id }, data: { ...v.data, harga: v.data.harga ?? null, kedaluwarsa: v.data.kedaluwarsa ?? null, kalibrasiSampai: v.data.kalibrasiSampai ?? null } });
  } else {
    const awal = Math.max(0, Math.trunc(Number(fd.get("stokAwal")) || 0));
    await prisma.barangStok.create({
      data: { ...v.data, harga: v.data.harga ?? null, kedaluwarsa: v.data.kedaluwarsa ?? null, kalibrasiSampai: v.data.kalibrasiSampai ?? null, stok: awal,
        mutasi: awal ? { create: { jenis: "Masuk", jumlah: awal, stokSetelah: awal, keterangan: "Stok awal", oleh } } : undefined },
    });
  }
  await audit(id ? "stok.ubah" : "stok.tambah", { email: oleh, ip: ipDari(await headers()), objek: v.data.kode, detail: v.data.nama });
  revalidatePath("/admin/stok");
  return { ok: `${v.data.nama} ${id ? "diperbarui" : "ditambahkan"}.` };
}

/** Catat barang masuk / keluar / penyesuaian (stok fisik). Stok tidak boleh minus. */
export async function catatMutasi(_p: StatusAksi, fd: FormData): Promise<StatusAksi> {
  const { sesi, pesan } = await penjaga();
  if (!sesi) return { error: pesan! };
  const v = skemaMutasi.safeParse({ barangId: fd.get("barangId"), jenis: fd.get("jenis"), jumlah: fd.get("jumlah"), keterangan: fd.get("keterangan") || undefined });
  if (!v.success) return { error: pesanZod(v.error) };
  const { barangId, jenis, jumlah, keterangan } = v.data;
  if (jenis !== "Penyesuaian" && jumlah <= 0) return { error: "Jumlah harus lebih dari 0." };
  try {
    const b = await prisma.$transaction(async (tx) => {
      const x = await tx.barangStok.findUnique({ where: { id: barangId } });
      if (!x) throw new Error("Barang tidak ditemukan.");
      const baru = jenis === "Masuk" ? x.stok + jumlah : jenis === "Keluar" ? x.stok - jumlah : jumlah;
      if (baru < 0) throw new Error(`Stok tidak cukup (tersedia ${x.stok} ${x.satuan}).`);
      await tx.mutasiStok.create({ data: { barangId, jenis, jumlah: jenis === "Penyesuaian" ? baru - x.stok : jumlah, stokSetelah: baru, keterangan, oleh: sesi.user.email ?? null } });
      return tx.barangStok.update({ where: { id: barangId }, data: { stok: baru } });
    });
    await audit("stok.mutasi", { email: sesi.user.email, ip: ipDari(await headers()), objek: b.kode, detail: `${jenis} ${jumlah} → stok ${b.stok}` });
    revalidatePath("/admin/stok");
    return { ok: `${jenis} tercatat. Stok ${b.nama} sekarang ${b.stok} ${b.satuan}.` };
  } catch (e) { return { error: e instanceof Error ? e.message : String(e) }; }
}
