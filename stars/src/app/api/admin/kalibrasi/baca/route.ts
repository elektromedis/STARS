import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sesiApi } from "@/lib/sesi";
import { periksaSertifikat } from "@/lib/kalibrasi-berkas";
import { cocokkanAlat, saranDariTeks, teksPdf, type SaranKalibrasi } from "@/lib/kalibrasi-baca";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/admin/kalibrasi/baca (multipart: file) — Operator+. TIDAK menyimpan apa pun:
 * hanya membaca sertifikat untuk mengisi otomatis formulir (tanggal, berlaku, nomor, lembaga, hasil, alat).
 */
export async function POST(req: NextRequest) {
  const { tolak } = await sesiApi("Operator");
  if (tolak) return tolak;
  if (process.env.STARS_MODE === "internet") return NextResponse.json({ error: "Server mode internet bersifat baca saja." }, { status: 403 });
  const file = (await req.formData()).get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Pilih berkas sertifikat." }, { status: 400 });
  const b = await periksaSertifikat(file);
  if ("error" in b) return NextResponse.json({ error: b.error }, { status: b.status });

  const teks = b.ext === "pdf" ? await teksPdf(b.buf) : null;
  const kosong: SaranKalibrasi = { tanggal: null, berlakuSampai: null, nomorSertifikat: null, kalibrator: null, laik: null, jenis: null };
  const saran = teks ? saranDariTeks(teks) : kosong;
  const daftar = await prisma.alat.findMany({ where: { aktif: true }, select: { id: true, kode: true, nomorSeri: true, noUrutAset: true } });
  const alat = cocokkanAlat(teks ?? "", b.nama, daftar);
  return NextResponse.json({
    namaBerkas: b.nama,
    teksTerbaca: Boolean(teks),
    saran,
    alat,
    catatan: teks ? null : b.ext === "pdf" ? "PDF ini tidak berisi teks (hasil pindai/foto) — isi tanggal & data sertifikat secara manual." : "Gambar tidak dapat dibaca otomatis — isi tanggal & data sertifikat secara manual.",
  });
}
