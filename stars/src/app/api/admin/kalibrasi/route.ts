import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sesiApi } from "@/lib/sesi";
import { audit, ipDari } from "@/lib/audit";
import { hapusJikaYatim, periksaSertifikat, simpanSertifikat } from "@/lib/kalibrasi-berkas";
import { dataKalibrasi, pesanZod, skemaBarisKalibrasi } from "@/lib/kalibrasi-simpan";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/admin/kalibrasi (multipart: file?, baris=<JSON array>) — Operator+.
 * Satu berkas sertifikat (opsional) untuk 1..300 alat. Catatan alat + tanggal yang sudah ada DIPERBARUI
 * (mis. hasil impor Trilux tanpa sertifikat), selain itu dibuat baru. Masa berlaku kosong = tanggal + 12 bulan.
 */
export async function POST(req: NextRequest) {
  const { sesi, tolak } = await sesiApi("Operator");
  if (tolak) return tolak;
  if (process.env.STARS_MODE === "internet") return NextResponse.json({ error: "Server mode internet bersifat baca saja." }, { status: 403 });
  const fd = await req.formData();

  let mentah: unknown;
  try { mentah = JSON.parse(String(fd.get("baris") ?? "[]")); } catch { return NextResponse.json({ error: "Data baris tidak valid." }, { status: 400 }); }
  const parsed = z.array(skemaBarisKalibrasi).min(1, "Tidak ada baris untuk disimpan").max(300, "Maksimal 300 alat per berkas").safeParse(mentah);
  if (!parsed.success) return NextResponse.json({ error: pesanZod(parsed.error) }, { status: 400 });
  const baris = parsed.data;
  const ids = [...new Set(baris.map((b) => b.alatId))];
  if (ids.length !== baris.length) return NextResponse.json({ error: "Alat yang sama dipilih lebih dari sekali untuk berkas ini." }, { status: 400 });
  const alat = await prisma.alat.findMany({ where: { id: { in: ids } }, select: { id: true, kode: true } });
  if (alat.length !== ids.length) return NextResponse.json({ error: "Ada alat yang tidak dikenal." }, { status: 400 });

  const file = fd.get("file");
  let berkasData: { berkas: string; namaBerkas: string; tipeBerkas: string; ukuranBerkas: number; diunggahOleh: string | null } | null = null;
  if (file instanceof File && file.size > 0) {
    const b = await periksaSertifikat(file);
    if ("error" in b) return NextResponse.json({ error: b.error }, { status: b.status });
    try {
      berkasData = { berkas: await simpanSertifikat(b), namaBerkas: b.nama, tipeBerkas: b.mime, ukuranBerkas: b.ukuran, diunggahOleh: sesi.user.email ?? null };
    } catch (err) {
      return NextResponse.json({ error: `Gagal menyimpan berkas: ${err instanceof Error ? err.message : String(err)}` }, { status: 500 });
    }
  }

  const berkasLama: (string | null)[] = [];
  let baru = 0, diperbarui = 0;
  try {
    await prisma.$transaction(async (tx) => {
      for (const b of baris) {
        const data = { ...dataKalibrasi(b), ...(berkasData ?? {}) };
        const ada = await tx.kalibrasi.findFirst({ where: { alatId: b.alatId, tanggal: data.tanggal }, orderBy: { id: "desc" } });
        if (ada) {
          if (berkasData && ada.berkas !== berkasData.berkas) berkasLama.push(ada.berkas);
          await tx.kalibrasi.update({ where: { id: ada.id }, data });
          diperbarui++;
        } else {
          await tx.kalibrasi.create({ data: { alatId: b.alatId, ...data } });
          baru++;
        }
      }
    });
  } catch (err) {
    if (berkasData) await hapusJikaYatim(berkasData.berkas);
    return NextResponse.json({ error: `Gagal menyimpan: ${err instanceof Error ? err.message : String(err)}` }, { status: 500 });
  }
  for (const l of berkasLama) await hapusJikaYatim(l);

  const kode = alat.map((a) => a.kode);
  await audit("kalibrasi.simpan", {
    email: sesi.user.email, ip: ipDari(req.headers), objek: kode.slice(0, 5).join(", ") + (kode.length > 5 ? ` +${kode.length - 5}` : ""),
    detail: `${baru} baru, ${diperbarui} diperbarui; tgl ${[...new Set(baris.map((b) => b.tanggal))].join(", ")}${berkasData ? `; sertifikat ${berkasData.namaBerkas}` : ""}`,
  });
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: `${baru + diperbarui} catatan kalibrasi tersimpan (${baru} baru, ${diperbarui} diperbarui).`, baru, diperbarui });
}
