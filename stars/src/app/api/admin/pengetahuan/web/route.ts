import { NextResponse, type NextRequest } from "next/server";
import { ambilWeb } from "@/lib/ambil-web";
import { audit, ipDari } from "@/lib/audit";
import { simpanDokumen } from "@/lib/pengetahuan";
import { prisma } from "@/lib/prisma";
import { sesiApi } from "@/lib/sesi";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Admin menambahkan hingga 10 link web publik ke basis pengetahuan. */
export async function POST(req: NextRequest) {
  const { sesi, tolak } = await sesiApi("Admin");
  if (tolak) return tolak;
  const balik = (k: "ok" | "error", t: string) => new NextResponse(null, { status: 303, headers: { Location: `/admin/pengetahuan?${k}=${encodeURIComponent(t)}` } });
  if (process.env.STARS_MODE === "internet") return balik("error", "Server mode internet bersifat baca saja.");
  const fd = await req.formData().catch(() => null);
  const tautan = [...new Set(String(fd?.get("tautan") ?? "").split(/\s+/).map((x) => x.trim()).filter(Boolean))];
  if (!tautan.length) return balik("error", "Masukkan minimal satu link web.");
  if (tautan.length > 10) return balik("error", "Maksimal 10 link sekali proses.");
  const jenis = String(fd?.get("jenis") ?? "Lainnya").trim().slice(0, 40) || "Lainnya";
  const judulIsian = tautan.length === 1 ? String(fd?.get("judul") ?? "").trim().slice(0, 200) : "";
  const ada = new Set((await prisma.dokumenPengetahuan.findMany({ select: { judul: true } })).map((d) => d.judul));
  let masuk = 0;
  const gagal: string[] = [];
  for (const alamat of tautan) {
    const label = alamat.slice(0, 70);
    try {
      const w = await ambilWeb(alamat);
      const judul = judulIsian || w.judul;
      if (ada.has(judul)) { gagal.push(`${label} (judul sudah ada)`); continue; }
      if (await prisma.potonganPengetahuan.findFirst({ where: { teks: { startsWith: `Sumber: ${w.sumber}\n` } }, select: { id: true } })) { gagal.push(`${label} (link sudah ada)`); continue; }
      const h = await simpanDokumen(judul, jenis, w.halaman, sesi!.user?.email ?? null);
      if (!h) { gagal.push(`${label} (kosong)`); continue; }
      ada.add(judul);
      masuk++;
      await audit("PENGETAHUAN_TAMBAH", { email: sesi!.user?.email, objek: judul, detail: `Web ${w.sumber.slice(0, 180)}, ${h.potongan} potongan`, ip: ipDari(req.headers) });
    } catch (e) {
      gagal.push(`${label} (${e instanceof Error ? e.message : "gagal"})`);
    }
  }
  if (!masuk) return balik("error", `Tidak ada link ditambahkan: ${gagal.join("; ").slice(0, 500)}`);
  return balik("ok", `${masuk} link ditambahkan.${gagal.length ? ` Dilewati: ${gagal.join("; ").slice(0, 400)}` : ""}`);
}
