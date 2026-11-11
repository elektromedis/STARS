/**
 * Seed basis data dari prisma/data/paket.json (hasil scripts/konversi-rkpbu.py).
 * Jalankan: npm run db:seed   (idempoten: baris dengan kode sama diperbarui, bukan digandakan)
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type PaketJson = {
  kode: string; tahun: number; tahap: string; jenis: string; sumberDana: string;
  namaRekening: string; namaPaket: string; uraian: string | null; unitKerja: string; lokasiAsli: string | null;
  kodeBarang: string | null; vol1: number; satuan1: string | null; vol2: number; satuan2: string | null;
  hargaSatuan: number; nilai: number; serapan: boolean; prioritas: string | null; linkHarga: string | null;
  keterangan: string | null; kategori: string;
};

async function main() {
  const raw = JSON.parse(readFileSync(join(__dirname, "data", "paket.json"), "utf8")) as { unitKerja: string[]; paket: PaketJson[] };

  // 1) Master unit kerja
  for (const [i, nama] of raw.unitKerja.entries()) {
    await prisma.unitKerja.upsert({ where: { nama }, update: { urut: i }, create: { nama, urut: i } });
  }
  const units = new Map((await prisma.unitKerja.findMany()).map((u) => [u.nama, u.id]));
  const fallback = units.get("TIDAK ADA")!;

  // 2) Paket (upsert per kode, dalam batch transaksi)
  const BATCH = 100;
  for (let i = 0; i < raw.paket.length; i += BATCH) {
    const chunk = raw.paket.slice(i, i + BATCH);
    await prisma.$transaction(
      chunk.map(({ unitKerja, ...p }) => {
        const data = { ...p, unitKerjaId: units.get(unitKerja) ?? fallback };
        return prisma.paket.upsert({ where: { kode: p.kode }, update: data, create: data });
      })
    );
    process.stdout.write(`  ${Math.min(i + BATCH, raw.paket.length)}/${raw.paket.length}\r`);
  }
  const total = await prisma.paket.count();
  console.log(`\nSeed selesai: ${raw.unitKerja.length} unit kerja, ${total} paket di basis data.`);

  // 3) Super Admin pertama (hanya bila belum ada pengguna; sandi tidak ditimpa saat seed ulang)
  if ((await prisma.pengguna.count()) === 0) {
    const email = (process.env.SUPERADMIN_EMAIL ?? "").trim().toLowerCase();
    const sandi = process.env.SUPERADMIN_PASSWORD ?? "";
    if (email && sandi.length >= 8) {
      const bcrypt = await import("bcryptjs");
      await prisma.pengguna.create({ data: { email, nama: process.env.SUPERADMIN_NAMA ?? "Super Admin", sandiHash: await bcrypt.hash(sandi, 12), peran: "Super Admin" } });
      console.log(`Super Admin ${email} dibuat dari .env`);
    } else {
      console.warn("SUPERADMIN_EMAIL/SUPERADMIN_PASSWORD belum diisi di .env → akun admin belum dibuat (akan dicoba lagi saat server start).");
    }
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
