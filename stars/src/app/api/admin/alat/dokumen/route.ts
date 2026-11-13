import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sesiApi } from "@/lib/sesi";
import { audit, ipDari } from "@/lib/audit";
import { adalahJenisDokumenAlat, infoJenisDokumenAlat } from "@/lib/dokumen-alat";
import { hapusDokumenAlatJikaYatim, periksaDokumenAlat, simpanDokumenAlat } from "@/lib/alat-berkas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const skema = z.object({
  alatId: z.coerce.number().int().positive(),
  jenis: z.string().refine(adalahJenisDokumenAlat, "Jenis dokumen tidak dikenal"),
  sejenis: z.enum(["0", "1"]).default("0"),
  nomor: z.string().trim().max(120).optional(),
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid").optional(),
  keterangan: z.string().trim().max(500).optional(),
});

/**
 * POST /api/admin/alat/dokumen (multipart: file, alatId, jenis, sejenis=1?, nomor?, tanggal?, keterangan?) — Operator+.
 * sejenis=1 → berkas yang sama juga ditautkan ke semua alat aktif lain dengan nama, merek, dan tipe yang sama
 * (praktis untuk User Manual, Service Manual, SOP, AKD/AKL). Berkas disimpan sekali.
 */
export async function POST(req: NextRequest) {
  const { sesi, tolak } = await sesiApi("Operator");
  if (tolak) return tolak;
  if (process.env.STARS_MODE === "internet") return NextResponse.json({ error: "Server mode internet bersifat baca saja." }, { status: 403 });
  const fd = await req.formData();
  const parsed = skema.safeParse({
    alatId: fd.get("alatId"), jenis: fd.get("jenis"), sejenis: fd.get("sejenis") || "0",
    nomor: fd.get("nomor") || undefined, tanggal: fd.get("tanggal") || undefined, keterangan: fd.get("keterangan") || undefined,
  });
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues.map((i) => i.message).join("; ") }, { status: 400 });
  const d = parsed.data;
  const alat = await prisma.alat.findUnique({ where: { id: d.alatId }, select: { id: true, kode: true, nama: true, merek: true, model: true } });
  if (!alat) return NextResponse.json({ error: "Alat tidak ditemukan." }, { status: 404 });
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "Pilih berkas dokumen." }, { status: 400 });
  const b = await periksaDokumenAlat(file);
  if ("error" in b) return NextResponse.json({ error: b.error }, { status: b.status });

  let target = [alat.id];
  if (d.sejenis === "1") {
    const lain = await prisma.alat.findMany({ where: { aktif: true, nama: alat.nama, merek: alat.merek, model: alat.model, NOT: { id: alat.id } }, select: { id: true }, take: 2000 });
    target = [alat.id, ...lain.map((a) => a.id)];
  }

  let berkas: string;
  try { berkas = await simpanDokumenAlat(b); } catch (err) {
    return NextResponse.json({ error: `Gagal menyimpan berkas: ${err instanceof Error ? err.message : String(err)}` }, { status: 500 });
  }
  try {
    await prisma.dokumenAlat.createMany({
      data: target.map((alatId) => ({
        alatId, jenis: d.jenis, namaBerkas: b.nama, berkas, tipe: b.mime, ukuran: b.ukuran, nomor: d.nomor || null,
        tanggal: d.tanggal ? new Date(`${d.tanggal}T00:00:00Z`) : null, keterangan: d.keterangan || null, diunggahOleh: sesi.user.email ?? null,
      })),
    });
  } catch (err) {
    await hapusDokumenAlatJikaYatim(berkas);
    return NextResponse.json({ error: `Gagal menyimpan: ${err instanceof Error ? err.message : String(err)}` }, { status: 500 });
  }
  const label = infoJenisDokumenAlat(d.jenis)?.label ?? d.jenis;
  await audit("alat.dokumen", { email: sesi.user.email, ip: ipDari(req.headers), objek: alat.kode, detail: `${label}: ${b.nama}${target.length > 1 ? ` (+${target.length - 1} alat sejenis)` : ""}` });
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: target.length > 1 ? `${label} tersimpan untuk ${target.length} alat (alat ini + ${target.length - 1} alat sejenis).` : `${label} tersimpan.`, jumlah: target.length });
}
