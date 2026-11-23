import { NextResponse, type NextRequest } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";
import { audit, ipDari } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { halamanDariTeks, simpanDokumen } from "@/lib/pengetahuan";
import { sesiApi } from "@/lib/sesi";

export const dynamic = "force-dynamic";
const MAKS = 40 * 1024 * 1024;

async function bacaBerkas(f: File) {
  const buf = new Uint8Array(await f.arrayBuffer());
  if (/\.(txt|md)$/i.test(f.name)) return halamanDariTeks(new TextDecoder().decode(buf));
  if (!/\.pdf$/i.test(f.name)) return null;
  try {
    const { text } = await extractText(await getDocumentProxy(buf), { mergePages: false });
    const h = (text as string[]).map((teks, i) => ({ halaman: i + 1, teks }));
    return h.reduce((n, x) => n + x.teks.trim().length, 0) / Math.max(1, h.length) < 80 ? null : h;
  } catch { return null; }
}

/** Admin mengunggah PDF berteks atau .txt/.md ke basis pengetahuan. */
export async function POST(req: NextRequest) {
  const { sesi, tolak } = await sesiApi("Admin");
  if (tolak) return tolak;
  const balik = (k: "ok" | "error", t: string) => NextResponse.redirect(new URL(`/admin/pengetahuan?${k}=${encodeURIComponent(t)}`, req.nextUrl.origin), 303);
  if (process.env.STARS_MODE === "internet") return balik("error", "Server mode internet bersifat baca saja.");
  const fd = await req.formData().catch(() => null);
  const berkas = (fd?.getAll("berkas") ?? []).filter((f): f is File => f instanceof File && f.size > 0).slice(0, 60);
  if (!berkas.length) return balik("error", "Pilih berkas PDF, TXT, atau MD.");
  const jenis = String(fd?.get("jenis") ?? "Pedoman").trim().slice(0, 40) || "Pedoman";
  const judulIsian = berkas.length === 1 ? String(fd?.get("judul") ?? "").trim().slice(0, 200) : "";
  const ada = new Set((await prisma.dokumenPengetahuan.findMany({ select: { judul: true } })).map((d) => d.judul));
  let masuk = 0;
  const gagal: string[] = [];
  for (const f of berkas) {
    const judul = judulIsian || f.name.replace(/\.[^.]+$/, "").slice(0, 200);
    if (ada.has(judul)) { gagal.push(`${judul} (sudah ada)`); continue; }
    if (f.size > MAKS) { gagal.push(`${judul} (lebih dari 40 MB)`); continue; }
    const halaman = await bacaBerkas(f);
    if (!halaman) { gagal.push(`${judul} (tidak ada teks; PDF scan perlu OCR)`); continue; }
    const h = await simpanDokumen(judul, jenis, halaman, sesi!.user?.email ?? null);
    if (!h) { gagal.push(`${judul} (kosong)`); continue; }
    ada.add(judul);
    masuk++;
    await audit("PENGETAHUAN_TAMBAH", { email: sesi!.user?.email, objek: judul, detail: `${h.potongan} potongan`, ip: ipDari(req.headers) });
  }
  if (!masuk) return balik("error", `Tidak ada dokumen ditambahkan: ${gagal.join("; ").slice(0, 500)}`);
  return balik("ok", `${masuk} dokumen ditambahkan.${gagal.length ? ` Dilewati: ${gagal.join("; ").slice(0, 400)}` : ""}`);
}
