import { join } from "node:path";
import { prisma } from "./prisma";
import { adalahJenis, type StatusDokumen } from "./dokumen";

export const folderDokumen = () => join(process.env.UPLOAD_DIR || join(process.cwd(), "uploads"), "dokumen");

/** Status dokumen untuk sekumpulan kode paket (satu kueri). */
export async function getStatusDokumen(kode: string[]): Promise<Map<string, StatusDokumen>> {
  const peta = new Map<string, StatusDokumen>();
  if (kode.length === 0) return peta;
  const rows = await prisma.dokumenPaket.findMany({
    where: { paketKode: { in: kode } }, orderBy: { createdAt: "desc" }, select: { id: true, paketKode: true, jenis: true },
  });
  for (const r of rows) {
    if (!adalahJenis(r.jenis)) continue;
    const s = peta.get(r.paketKode) ?? {};
    const ada = s[r.jenis];
    s[r.jenis] = ada ? { id: ada.id, jumlah: ada.jumlah + 1 } : { id: r.id, jumlah: 1 };
    peta.set(r.paketKode, s);
  }
  return peta;
}
