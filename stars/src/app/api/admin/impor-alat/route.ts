import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bacaExcelAlat, simpanAlat, tandaiStatus, validasiAlat } from "@/lib/impor-alat";
import { sesiApi } from "@/lib/sesi";
import { cukup } from "@/lib/peran";
import { audit, ipDari } from "@/lib/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const MAKS_BYTE = 15 * 1024 * 1024;

/** POST /api/admin/impor-alat (multipart: file=.xlsx/.xls/.csv, mode=validasi|simpan) — impor inventaris alat (format Trilux atau template STARS). */
export async function POST(req: NextRequest) {
  const { sesi, tolak } = await sesiApi("Viewer");
  if (tolak) return tolak;
  const form = await req.formData();
  const file = form.get("file");
  const mode = form.get("mode") === "simpan" ? "simpan" : "validasi";
  if (mode === "simpan" && process.env.STARS_MODE === "internet") return NextResponse.json({ error: "Server mode internet bersifat baca saja." }, { status: 403 });
  if (mode === "simpan" && !cukup(sesi.user.peran, "Operator")) return NextResponse.json({ error: "Menyimpan memerlukan peran Operator atau lebih tinggi." }, { status: 403 });
  if (!(file instanceof File)) return NextResponse.json({ error: "Berkas tidak ditemukan (field `file`)." }, { status: 400 });
  if (!/\.(xlsx|xlsm|xls|csv)$/i.test(file.name)) return NextResponse.json({ error: "Format harus .xlsx/.xls (atau .csv)." }, { status: 400 });
  if (file.size > MAKS_BYTE) return NextResponse.json({ error: "Ukuran berkas melebihi 15 MB." }, { status: 413 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const daftarUnit = (await prisma.unitKerja.findMany({ orderBy: { urut: "asc" } })).map((u) => u.nama);
  let dibaca; let hasil;
  try { dibaca = bacaExcelAlat(buffer); hasil = validasiAlat(dibaca.baris, daftarUnit); }
  catch (err) { return NextResponse.json({ error: `Berkas tidak dapat dibaca: ${err instanceof Error ? err.message : String(err)}` }, { status: 422 }); }

  if (sesi.user.unitKerja && !cukup(sesi.user.peran, "Admin")) {
    const saya = sesi.user.unitKerja;
    for (const b of hasil.valid.filter((b) => b.unitKerja !== saya)) hasil.errors.push({ baris: b.baris, kolom: "unit_kerja", pesan: `Akun Anda hanya boleh mengunggah unit ${saya}, baris ini untuk ${b.unitKerja}` });
    hasil.valid = hasil.valid.filter((b) => b.unitKerja === saya);
  }
  hasil.errors.sort((a, b) => a.baris - b.baris);
  await tandaiStatus(hasil.valid);
  const ringkas = {
    sheet: dibaca.sheet, barisHeader: dibaca.barisHeader, totalBaris: dibaca.baris.length, barisValid: hasil.valid.length,
    barisBaru: hasil.valid.filter((b) => b.status === "baru").length, barisDiperbarui: hasil.valid.filter((b) => b.status === "diperbarui").length,
    barisError: new Set(hasil.errors.map((e) => e.baris)).size, kolomDikenali: dibaca.kolomDikenali, kolomTidakDikenali: dibaca.kolomTidakDikenali,
    unitTidakAda: hasil.valid.filter((b) => b.unitKerja === "TIDAK ADA").length, kalibrasi: hasil.valid.filter((b) => b.tanggalKalibrasi).length,
    errors: hasil.errors.slice(0, 300), warnings: hasil.warnings.slice(0, 300),
    pratinjau: hasil.valid.slice(0, 25).map((b) => ({ kode: b.kode, status: b.status, nama: b.nama, merek: b.merek, unitKerja: b.unitKerja, ruangan: b.ruangan, kondisi: b.kondisi, kalibrasi: b.tanggalKalibrasi ? b.tanggalKalibrasi.toISOString().slice(0, 10) : null })),
  };
  if (mode === "validasi") return NextResponse.json({ mode, ...ringkas });
  if (hasil.errors.length > 0) return NextResponse.json({ mode, ...ringkas, error: "Masih ada error. Perbaiki berkas lalu unggah ulang." }, { status: 422 });
  if (hasil.valid.length === 0) return NextResponse.json({ mode, ...ringkas, error: "Tidak ada baris yang bisa disimpan." }, { status: 422 });

  let berkasTersimpan: string | null = null;
  try {
    const dir = process.env.UPLOAD_DIR || join(process.cwd(), "uploads");
    await mkdir(dir, { recursive: true });
    const nama = `${new Date().toISOString().replace(/[:.]/g, "-")}_alat_${file.name.replace(/[^\w.\-]+/g, "_")}`;
    await writeFile(join(dir, nama), buffer); berkasTersimpan = nama;
  } catch { /* opsional */ }
  const ip = ipDari(req.headers);
  try {
    const simpan = await simpanAlat(hasil.valid, { namaBerkas: file.name, ukuranByte: file.size, pengguna: sesi.user.email, berkasTersimpan, barisError: ringkas.barisError });
    await audit("alat.impor", { email: sesi.user.email, ip, objek: file.name, detail: `${simpan.barisBaru} baru, ${simpan.barisDiperbarui} diperbarui, ${simpan.ruanganBaru} ruangan, ${simpan.kalibrasiBaru} kalibrasi` });
    return NextResponse.json({ mode, ...ringkas, simpan });
  } catch (err) {
    await audit("alat.impor.gagal", { email: sesi.user.email, ip, objek: file.name, detail: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ mode, ...ringkas, error: `Penyimpanan gagal, tidak ada data yang berubah: ${err instanceof Error ? err.message : String(err)}` }, { status: 500 });
  }
}
