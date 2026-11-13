/** Ubah baris ProdukHta menjadi isian formulir editor (server → klien). */
import { prisma } from "./prisma";
import { bacaSpesifikasi } from "./hta";
import type { ProdukForm } from "@/components/hta/editor-produk";

const t = (v: string | number | null | undefined) => (v === null || v === undefined ? "" : typeof v === "number" ? v.toLocaleString("id-ID", { maximumFractionDigits: 2 }) : v);

export async function formProduk(ids: number[]): Promise<Map<number, ProdukForm>> {
  const rows = ids.length ? await prisma.produkHta.findMany({ where: { id: { in: ids } } }) : [];
  return new Map(rows.map((p) => [p.id, {
    id: p.id, nama: p.nama, merek: p.merek ?? "", model: p.model ?? "", harga: t(p.harga), garansiBulan: t(p.garansiBulan), usiaTeknis: t(p.usiaTeknis),
    tkdn: t(p.tkdn), akl: t(p.akl), asal: t(p.asal), penyedia: t(p.penyedia), tautan: t(p.tautan), catatan: t(p.catatan),
    spesifikasi: bacaSpesifikasi(p.spesifikasi), foto: p.foto,
  }]));
}

/** Nama parameter spesifikasi yang sudah pernah dipakai (saran agar konsisten antarproduk). */
export async function saranParameter() {
  const rows = await prisma.produkHta.findMany({ where: { spesifikasi: { not: null } }, select: { spesifikasi: true } });
  const m = new Map<string, string>();
  for (const r of rows) for (const s of bacaSpesifikasi(r.spesifikasi)) if (!m.has(s.parameter.toLowerCase())) m.set(s.parameter.toLowerCase(), s.parameter);
  return [...m.values()].sort((a, b) => a.localeCompare(b, "id"));
}
