import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { UNIT_KERJA } from "./unit-kerja";
import { audit } from "./audit";

/** Idempoten: aman dijalankan tiap start. */
export async function bootstrap() {
  // 1) master unit kerja
  const ada = await prisma.unitKerja.count();
  if (ada === 0) {
    await prisma.unitKerja.createMany({ data: UNIT_KERJA.map((nama, i) => ({ nama, urut: i })) });
    console.log("[bootstrap] 28 unit kerja dibuat");
  }

  // 2) Super Admin pertama bila belum ada pengguna sama sekali
  const jumlah = await prisma.pengguna.count();
  if (jumlah === 0) {
    const email = (process.env.SUPERADMIN_EMAIL ?? "").trim().toLowerCase();
    const sandi = process.env.SUPERADMIN_PASSWORD ?? "";
    if (!email || sandi.length < 8) {
      console.warn("[bootstrap] Belum ada pengguna. Isi SUPERADMIN_EMAIL dan SUPERADMIN_PASSWORD (min. 8 karakter) di .env lalu mulai ulang untuk membuat Super Admin pertama.");
      return;
    }
    await prisma.pengguna.create({ data: { email, nama: process.env.SUPERADMIN_NAMA ?? "Super Admin", sandiHash: await bcrypt.hash(sandi, 12), peran: "Super Admin" } });
    await audit("pengguna.buat", { email: "sistem", objek: email, detail: "Super Admin pertama dari env" });
    console.log(`[bootstrap] Super Admin ${email} dibuat. Segera ganti sandinya lewat Admin → Pengguna.`);
  }
}
