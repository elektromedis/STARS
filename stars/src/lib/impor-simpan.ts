/**
 * Bagian impor yang menyentuh basis data: penentuan kode paket dan penyimpanan dalam satu transaksi.
 */
import { prisma } from "./prisma";
import { TAHAP_KODE, type BarisImpor } from "./impor";

export type BarisSiap = BarisImpor & { kode: string; status: "baru" | "diperbarui" };

const kunci = (b: { tahun: number; tahap: string; namaPaket: string; unitKerja: string; namaRekening: string }) =>
  [b.tahun, b.tahap, b.namaPaket.toLowerCase(), b.unitKerja, b.namaRekening.toLowerCase()].join("|");

/**
 * Menentukan kode setiap baris dan apakah baris itu baru atau memperbarui data lama:
 * 1) kode terisi → dipakai apa adanya;
 * 2) kode kosong tetapi (tahun, tahap, nama paket, unit, rekening) sudah ada → pakai kode lama (diperbarui);
 * 3) selain itu → kode baru berurutan, mis. PM-2026-PB-0083.
 */
export async function tentukanKode(valid: BarisImpor[]): Promise<BarisSiap[]> {
  if (valid.length === 0) return [];
  const grup = [...new Set(valid.map((v) => `${v.tahun}|${v.tahap}`))].map((g) => { const [t, th] = g.split("|"); return { tahun: Number(t), tahap: th }; });
  const lama = await prisma.paket.findMany({
    where: { OR: grup }, select: { kode: true, tahun: true, tahap: true, namaPaket: true, namaRekening: true, unitKerja: { select: { nama: true } } },
  });
  const kodeLama = new Set(lama.map((p) => p.kode));
  const kodeDariKunci = new Map(lama.map((p) => [kunci({ ...p, unitKerja: p.unitKerja.nama }), p.kode]));
  const urutan = new Map<string, number>();
  for (const k of kodeLama) {
    const m = /^(.*-)(\d+)$/.exec(k);
    if (m) urutan.set(m[1], Math.max(urutan.get(m[1]) ?? 0, Number(m[2])));
  }
  const kodeDipakai = new Set<string>();
  return valid.map((b) => {
    let kode = b.kode;
    if (!kode) kode = kodeDariKunci.get(kunci(b)) ?? null;
    if (!kode || kodeDipakai.has(kode)) {
      const prefix = `${b.jenis === "Pemeliharaan" ? "PM" : "MD"}-${b.tahun}-${TAHAP_KODE[b.tahap] ?? "XX"}-`;
      const n = (urutan.get(prefix) ?? 0) + 1;
      urutan.set(prefix, n);
      kode = `${prefix}${String(n).padStart(4, "0")}`;
    }
    kodeDipakai.add(kode);
    return { ...b, kode, status: kodeLama.has(kode) ? "diperbarui" : "baru" };
  });
}

export async function simpanImpor(baris: BarisSiap[], meta: { namaBerkas: string; ukuranByte: number; pengguna?: string | null; berkasTersimpan?: string | null; barisError: number }) {
  const units = new Map((await prisma.unitKerja.findMany()).map((u) => [u.nama, u.id]));
  const fallback = units.get("TIDAK ADA");
  const totalNilai = baris.reduce((a, b) => a + b.nilai, 0);
  try {
    await prisma.$transaction(
      async (tx) => {
        for (const { status: _s, baris: _no, unitKerja, ...b } of baris) {
          void _s; void _no;
          const unitKerjaId = units.get(unitKerja) ?? fallback;
          if (!unitKerjaId) throw new Error(`Unit kerja ${unitKerja} tidak ada di basis data`);
          const data = { ...b, unitKerjaId };
          await tx.paket.upsert({ where: { kode: b.kode }, update: data, create: data });
        }
      },
      { timeout: 120_000 }
    );
  } catch (err) {
    await prisma.logImpor.create({
      data: { ...meta, totalBaris: baris.length, barisBaru: 0, barisDiperbarui: 0, totalNilai, status: "Gagal", pesan: err instanceof Error ? err.message : String(err) },
    });
    throw err;
  }
  const barisBaru = baris.filter((b) => b.status === "baru").length;
  const log = await prisma.logImpor.create({
    data: { ...meta, totalBaris: baris.length, barisBaru, barisDiperbarui: baris.length - barisBaru, totalNilai, status: "Berhasil" },
  });
  return { logId: log.id, barisBaru, barisDiperbarui: baris.length - barisBaru, totalNilai };
}
