import { NextResponse, type NextRequest } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";
import { audit, ipDari } from "@/lib/audit";
import { halamanDariTeks, simpanDokumen } from "@/lib/pengetahuan";
import { sesiApi } from "@/lib/sesi";

export const dynamic = "force-dynamic";
const MAKS = 40 * 1024 * 1024;

/** Admin mengunggah PDF berteks atau .txt/.md ke basis pengetahuan. */
export async function POST(req: NextRequest) {
  const { sesi, tolak } = await sesiApi("Admin");
  if (tolak) return tolak;
  const balik = (k: "ok" | "error", t: string) => NextResponse.redirect(new URL(`/admin/pengetahuan?${k}=${encodeURIComponent(t)}`, req.nextUrl.origin), 303);
  if (process.env.STARS_MODE === "internet") return balik("error", "Server mode internet bersifat baca saja.");
  const fd = await req.formData().catch(() => null);
  const f = fd?.get("berkas");
  if (!(f instanceof File) || !f.size) return balik("error", "Pilih berkas PDF, TXT, atau MD.");
  if (f.size > MAKS) return balik("error", "Ukuran berkas maksimal 40 MB.");
  const judul = String(fd?.get("judul") ?? "").trim().slice(0, 200) || f.name.replace(/\.[^.]+$/, "");
  const jenis = String(fd?.get("jenis") ?? "Pedoman").trim().slice(0, 40) || "Pedoman";
  const buf = new Uint8Array(await f.arrayBuffer());
  let halaman: { halaman: number; teks: string }[];
  if (/\.pdf$/i.test(f.name)) {
    try {
      const { text } = await extractText(await getDocumentProxy(buf), { mergePages: false });
      halaman = (text as string[]).map((teks, i) => ({ halaman: i + 1, teks }));
    } catch { return balik("error", "PDF tidak dapat dibaca."); }
    const huruf = halaman.reduce((n, h) => n + h.teks.trim().length, 0);
    if (huruf / Math.max(1, halaman.length) < 80) return balik("error", "PDF ini hasil scan tanpa teks. Lakukan OCR lalu unggah hasilnya.");
  } else if (/\.(txt|md)$/i.test(f.name)) halaman = halamanDariTeks(new TextDecoder().decode(buf));
  else return balik("error", "Format harus PDF, TXT, atau MD.");
  const h = await simpanDokumen(judul, jenis, halaman, sesi!.user?.email ?? null);
  if (!h) return balik("error", "Tidak ada teks yang bisa disimpan.");
  await audit("PENGETAHUAN_TAMBAH", { email: sesi!.user?.email, objek: judul, detail: `${h.potongan} potongan`, ip: ipDari(req.headers) });
  return balik("ok", `${judul} ditambahkan (${halaman.length} halaman).`);
}
