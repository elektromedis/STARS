import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sesiApi } from "@/lib/sesi";
import { audit, ipDari } from "@/lib/audit";
import { hapusJikaYatim, periksaSertifikat, simpanSertifikat } from "@/lib/kalibrasi-berkas";
import { dataKalibrasi, pesanZod, skemaBarisKalibrasi } from "@/lib/kalibrasi-simpan";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function penjaga(idTeks: string) {
  const { sesi, tolak } = await sesiApi("Operator");
  if (tolak) return { tolak };
  if (process.env.STARS_MODE === "internet") return { tolak: NextResponse.json({ error: "Server mode internet bersifat baca saja." }, { status: 403 }) };
  const id = Number(idTeks);
  if (!Number.isInteger(id) || id <= 0) return { tolak: NextResponse.json({ error: "ID tidak valid." }, { status: 400 }) };
  const k = await prisma.kalibrasi.findUnique({ where: { id }, include: { alat: { select: { kode: true } } } });
  if (!k) return { tolak: NextResponse.json({ error: "Catatan kalibrasi tidak ditemukan." }, { status: 404 }) };
  return { sesi: sesi!, k };
}

/** PATCH (multipart: alatId, tanggal, berlakuSampai, kalibrator, nomorSertifikat, laik=1|0, petugas, metode, keterangan, file?, hapusBerkas=1?) — ubah catatan & ganti/lepas sertifikat. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await penjaga((await params).id);
  if (g.tolak) return g.tolak;
  const { sesi, k } = g;
  const fd = await req.formData();
  const ambil = (n: string) => { const v = fd.get(n); return typeof v === "string" ? v : null; };
  const parsed = skemaBarisKalibrasi.safeParse({
    alatId: ambil("alatId") ?? k.alatId, jenis: ambil("jenis") ?? k.jenis, tanggal: ambil("tanggal"), berlakuSampai: ambil("berlakuSampai"), kalibrator: ambil("kalibrator"),
    nomorSertifikat: ambil("nomorSertifikat"), laik: ambil("laik") === "1", petugas: ambil("petugas"), metode: ambil("metode"), keterangan: ambil("keterangan"),
  });
  if (!parsed.success) return NextResponse.json({ error: pesanZod(parsed.error) }, { status: 400 });
  const alat = await prisma.alat.findUnique({ where: { id: parsed.data.alatId }, select: { kode: true } });
  if (!alat) return NextResponse.json({ error: "Alat tidak dikenal." }, { status: 400 });

  let berkasBaru: { berkas: string | null; namaBerkas: string | null; tipeBerkas: string | null; ukuranBerkas: number | null; diunggahOleh: string | null } | null = null;
  const file = fd.get("file");
  if (file instanceof File && file.size > 0) {
    const b = await periksaSertifikat(file);
    if ("error" in b) return NextResponse.json({ error: b.error }, { status: b.status });
    berkasBaru = { berkas: await simpanSertifikat(b), namaBerkas: b.nama, tipeBerkas: b.mime, ukuranBerkas: b.ukuran, diunggahOleh: sesi.user.email ?? null };
  } else if (ambil("hapusBerkas") === "1") {
    berkasBaru = { berkas: null, namaBerkas: null, tipeBerkas: null, ukuranBerkas: null, diunggahOleh: null };
  }
  try {
    await prisma.kalibrasi.update({ where: { id: k.id }, data: { alatId: parsed.data.alatId, ...dataKalibrasi(parsed.data), ...(berkasBaru ?? {}) } });
  } catch (err) {
    if (berkasBaru?.berkas) await hapusJikaYatim(berkasBaru.berkas);
    return NextResponse.json({ error: `Gagal menyimpan: ${err instanceof Error ? err.message : String(err)}` }, { status: 500 });
  }
  if (berkasBaru && k.berkas !== berkasBaru.berkas) await hapusJikaYatim(k.berkas);
  await audit("kalibrasi.ubah", { email: sesi.user.email, ip: ipDari(req.headers), objek: alat.kode, detail: `#${k.id} tgl ${parsed.data.tanggal}${berkasBaru ? (berkasBaru.berkas ? `; sertifikat ${berkasBaru.namaBerkas}` : "; sertifikat dilepas") : ""}` });
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: `Catatan kalibrasi ${alat.kode} diperbarui.` });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await penjaga((await params).id);
  if (g.tolak) return g.tolak;
  const { sesi, k } = g;
  await prisma.kalibrasi.delete({ where: { id: k.id } });
  await hapusJikaYatim(k.berkas);
  await audit("kalibrasi.hapus", { email: sesi.user.email, ip: ipDari(req.headers), objek: k.alat.kode, detail: `#${k.id} tgl ${k.tanggal.toISOString().slice(0, 10)}${k.namaBerkas ? `; sertifikat ${k.namaBerkas}` : ""}` });
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: "Catatan kalibrasi dihapus." });
}
