import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sesiApi } from "@/lib/sesi";
import { audit, ipDari } from "@/lib/audit";
import { adalahJenis, labelJenis, MAKS_DOKUMEN, TIPE_DOKUMEN } from "@/lib/dokumen";
import { folderDokumen } from "@/lib/dokumen-data";
import { aksesKelolaPaket } from "@/lib/dokumen-akses";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST /api/admin/dokumen (multipart: file, paketKode, jenis, nomor?, tanggal?, keterangan?) — unggah dokumen paket (Operator+). */
export async function POST(req: NextRequest) {
  const { sesi, tolak } = await sesiApi("Operator");
  if (tolak) return tolak;
  const fd = await req.formData();
  const file = fd.get("file");
  const kode = String(fd.get("paketKode") ?? "").trim();
  const jenis = fd.get("jenis");
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "Pilih berkas dokumen." }, { status: 400 });
  if (!adalahJenis(jenis)) return NextResponse.json({ error: "Jenis dokumen tidak dikenal." }, { status: 400 });
  if (file.size > MAKS_DOKUMEN) return NextResponse.json({ error: "Ukuran berkas melebihi 15 MB." }, { status: 413 });

  const { paket, pesan } = await aksesKelolaPaket(sesi, kode);
  if (!paket) return NextResponse.json({ error: pesan }, { status: 403 });

  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  const tipe = TIPE_DOKUMEN[ext];
  if (!tipe) return NextResponse.json({ error: "Format harus PDF, JPG, PNG, DOCX, atau XLSX." }, { status: 400 });
  const buf = Buffer.from(await file.arrayBuffer());
  if (!tipe.tanda.some((t) => t.every((b, i) => buf[i] === b))) return NextResponse.json({ error: `Isi berkas tidak cocok dengan format .${ext}.` }, { status: 400 });

  const nomor = String(fd.get("nomor") ?? "").trim().slice(0, 120) || null;
  const ket = String(fd.get("keterangan") ?? "").trim().slice(0, 500) || null;
  const tglTeks = String(fd.get("tanggal") ?? "").trim();
  const tanggal = /^\d{4}-\d{2}-\d{2}$/.test(tglTeks) ? new Date(`${tglTeks}T00:00:00Z`) : null;

  const berkas = `${randomUUID()}.${ext}`;
  try {
    await mkdir(folderDokumen(), { recursive: true });
    await writeFile(join(folderDokumen(), berkas), buf);
  } catch (err) {
    return NextResponse.json({ error: `Gagal menyimpan berkas: ${err instanceof Error ? err.message : String(err)}` }, { status: 500 });
  }
  const dok = await prisma.dokumenPaket.create({
    data: { paketKode: paket.kode, jenis, namaBerkas: file.name.slice(0, 200), berkas, tipe: tipe.mime, ukuran: file.size, nomor, tanggal, keterangan: ket, diunggahOleh: sesi.user.email },
  });
  await audit("dokumen.unggah", { email: sesi.user.email, ip: ipDari(req.headers), objek: paket.kode, detail: `${labelJenis(jenis)}: ${file.name} (${file.size} byte)` });
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: `${labelJenis(jenis)} tersimpan.`, id: dok.id });
}
