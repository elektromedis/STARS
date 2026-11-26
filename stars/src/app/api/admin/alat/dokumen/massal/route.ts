import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sesiApi } from "@/lib/sesi";
import { audit, ipDari } from "@/lib/audit";
import { bolehAksi } from "@/lib/role";
import { adalahJenisDokumenAlat, infoJenisDokumenAlat } from "@/lib/dokumen-alat";
import { hapusDokumenAlatJikaYatim, periksaDokumenAlat, simpanDokumenAlat } from "@/lib/alat-berkas";
import { cocokkan, muatAlatCocok, type KunciCocok } from "@/lib/dokumen-massal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const KUNCI = ["otomatis", "seri", "tipe", "nama"];

/**
 * POST /api/admin/alat/dokumen/massal — Operator+.
 *  mode=cocokkan (nama[]=…, kunci, jenis): pratinjau pasangan berkas → alat tanpa mengunggah.
 *  mode=simpan (file, kunci, jenis): simpan satu berkas ke semua alat yang cocok (nomor seri → 1 alat; tipe/nama → semua alat sejenis).
 */
export async function POST(req: NextRequest) {
  const { sesi, tolak } = await sesiApi("Operator");
  if (tolak) return tolak;
  if (!(await bolehAksi(sesi.user.id, "impor"))) return NextResponse.json({ error: "Peran Anda tidak diizinkan mengunggah massal." }, { status: 403 });
  if (process.env.STARS_MODE === "internet") return NextResponse.json({ error: "Server mode internet bersifat baca saja." }, { status: 403 });
  const fd = await req.formData();
  const kunci = (KUNCI.includes(String(fd.get("kunci"))) ? String(fd.get("kunci")) : "otomatis") as KunciCocok;
  const jenis = String(fd.get("jenis") ?? "OTOMATIS");
  if (jenis !== "OTOMATIS" && !adalahJenisDokumenAlat(jenis)) return NextResponse.json({ error: "Jenis dokumen tidak dikenal." }, { status: 400 });
  const semua = await muatAlatCocok(prisma);

  if (fd.get("mode") === "cocokkan") {
    const nama = fd.getAll("nama").map(String).slice(0, 500);
    return NextResponse.json({ hasil: nama.map((n) => { const h = cocokkan(n, semua, kunci, jenis); return { ...h, jumlah: h.alat.length, alat: h.alat.slice(0, 5) }; }) });
  }

  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "Berkas kosong." }, { status: 400 });
  const h = cocokkan(file.name, semua, kunci, jenis);
  if (!h.alat.length) return NextResponse.json({ error: "Tidak ada alat yang cocok dengan nama berkas ini." }, { status: 404 });
  const b = await periksaDokumenAlat(file);
  if ("error" in b) return NextResponse.json({ error: b.error }, { status: b.status });
  let berkas: string;
  try { berkas = await simpanDokumenAlat(b); } catch (err) { return NextResponse.json({ error: `Gagal menyimpan berkas: ${err instanceof Error ? err.message : String(err)}` }, { status: 500 }); }
  try {
    await prisma.dokumenAlat.createMany({ data: h.alat.map((a) => ({ alatId: a.id, jenis: h.jenis, namaBerkas: b.nama, berkas, tipe: b.mime, ukuran: b.ukuran, keterangan: `Unggah massal (${h.dasar}: ${h.kata})`, diunggahOleh: sesi.user.email ?? null })) });
  } catch (err) {
    await hapusDokumenAlatJikaYatim(berkas);
    return NextResponse.json({ error: `Gagal menyimpan: ${err instanceof Error ? err.message : String(err)}` }, { status: 500 });
  }
  const label = infoJenisDokumenAlat(h.jenis)?.label ?? h.jenis;
  await audit("alat.dokumen", { email: sesi.user.email, ip: ipDari(req.headers), objek: h.alat[0].kode, detail: `Unggah massal ${label}: ${b.nama} → ${h.alat.length} alat (${h.dasar})` });
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: `${label} → ${h.alat.length} alat`, jumlah: h.alat.length });
}
