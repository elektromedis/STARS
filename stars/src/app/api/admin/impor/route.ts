import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bacaExcel, validasi } from "@/lib/impor";
import { simpanImpor, tentukanKode } from "@/lib/impor-simpan";
import { sesiApi } from "@/lib/sesi";
import { cukup } from "@/lib/peran";
import { audit, ipDari } from "@/lib/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAKS_BYTE = 10 * 1024 * 1024;

/**
 * POST /api/admin/impor  (multipart: file=.xlsx, mode=validasi|simpan)
 * - validasi (Viewer+): baca + periksa, kembalikan ringkasan, error, peringatan, pratinjau. Tidak menulis apa pun.
 * - simpan (Operator+): ulangi validasi, lalu simpan bila nol error (satu transaksi) dan catat di LogImpor + AuditLog.
 * Operator dengan unit kerja tertentu hanya boleh menyimpan baris unitnya sendiri.
 */
export async function POST(req: NextRequest) {
  const { sesi, tolak } = await sesiApi("Viewer");
  if (tolak) return tolak;
  const form = await req.formData();
  const file = form.get("file");
  const mode = form.get("mode") === "simpan" ? "simpan" : "validasi";
  if (mode === "simpan" && process.env.STARS_MODE === "internet") return NextResponse.json({ error: "Server mode internet bersifat baca saja; simpan data di server intranet." }, { status: 403 });
  if (mode === "simpan" && !cukup(sesi.user.peran, "Operator")) return NextResponse.json({ error: "Menyimpan memerlukan peran Operator atau lebih tinggi." }, { status: 403 });
  if (!(file instanceof File)) return NextResponse.json({ error: "Berkas tidak ditemukan (field `file`)." }, { status: 400 });
  if (!/\.(xlsx|xlsm|xls|csv)$/i.test(file.name)) return NextResponse.json({ error: "Format harus .xlsx (atau .csv)." }, { status: 400 });
  if (file.size > MAKS_BYTE) return NextResponse.json({ error: "Ukuran berkas melebihi 10 MB." }, { status: 413 });

  const buffer = Buffer.from(await file.arrayBuffer());
  let hasil;
  try {
    const daftarUnit = (await prisma.unitKerja.findMany({ orderBy: { urut: "asc" } })).map((u) => u.nama);
    const { baris, ...info } = bacaExcel(buffer);
    hasil = validasi(baris, daftarUnit, info);
  } catch (err) {
    return NextResponse.json({ error: `Berkas tidak dapat dibaca: ${err instanceof Error ? err.message : String(err)}` }, { status: 422 });
  }

  // Pembatasan unit untuk Operator
  if (sesi.user.unitKerja && !cukup(sesi.user.peran, "Admin")) {
    const unitSaya = sesi.user.unitKerja;
    const lain = hasil.valid.filter((b) => b.unitKerja !== unitSaya);
    for (const b of lain) hasil.errors.push({ baris: b.baris, kolom: "unit_kerja", pesan: `Akun Anda hanya boleh mengunggah unit ${unitSaya}, baris ini untuk ${b.unitKerja}` });
    hasil.valid = hasil.valid.filter((b) => b.unitKerja === unitSaya);
    hasil.errors.sort((a, b) => a.baris - b.baris);
    hasil.totalNilai = hasil.valid.reduce((a, b) => a + b.nilai, 0);
  }

  const siap = await tentukanKode(hasil.valid);
  const ringkas = {
    sheet: hasil.sheet,
    totalBaris: hasil.totalBaris,
    barisValid: siap.length,
    barisBaru: siap.filter((b) => b.status === "baru").length,
    barisDiperbarui: siap.filter((b) => b.status === "diperbarui").length,
    barisError: new Set(hasil.errors.map((e) => e.baris)).size,
    totalNilai: hasil.totalNilai,
    kolomDikenali: hasil.kolomDikenali,
    kolomTidakDikenali: hasil.kolomTidakDikenali,
    errors: hasil.errors.slice(0, 300),
    warnings: hasil.warnings.slice(0, 300),
    pratinjau: siap.slice(0, 20).map((b) => ({ kode: b.kode, status: b.status, tahun: b.tahun, tahap: b.tahap, namaPaket: b.namaPaket, unitKerja: b.unitKerja, kategori: b.kategori, nilai: b.nilai, serapan: b.serapan })),
  };

  if (mode === "validasi") return NextResponse.json({ mode, ...ringkas });

  if (hasil.errors.length > 0) return NextResponse.json({ mode, ...ringkas, error: "Masih ada error. Perbaiki berkas lalu unggah ulang." }, { status: 422 });
  if (siap.length === 0) return NextResponse.json({ mode, ...ringkas, error: "Tidak ada baris yang bisa disimpan." }, { status: 422 });

  // simpan salinan berkas asli untuk audit (di luar folder public)
  let berkasTersimpan: string | null = null;
  try {
    const dir = process.env.UPLOAD_DIR || join(process.cwd(), "uploads");
    await mkdir(dir, { recursive: true });
    const nama = `${new Date().toISOString().replace(/[:.]/g, "-")}_${file.name.replace(/[^\w.\-]+/g, "_")}`;
    await writeFile(join(dir, nama), buffer);
    berkasTersimpan = nama;
  } catch { /* penyimpanan salinan bersifat opsional */ }

  const ip = ipDari(req.headers);
  try {
    const simpan = await simpanImpor(siap, { namaBerkas: file.name, ukuranByte: file.size, pengguna: sesi.user.email, berkasTersimpan, barisError: ringkas.barisError });
    await audit("impor.simpan", { email: sesi.user.email, ip, objek: file.name, detail: `${simpan.barisBaru} baru, ${simpan.barisDiperbarui} diperbarui, total ${simpan.totalNilai}` });
    return NextResponse.json({ mode, ...ringkas, simpan });
  } catch (err) {
    await audit("impor.gagal", { email: sesi.user.email, ip, objek: file.name, detail: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ mode, ...ringkas, error: `Penyimpanan gagal, tidak ada data yang berubah: ${err instanceof Error ? err.message : String(err)}` }, { status: 500 });
  }
}
