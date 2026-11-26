/** Kebutuhan sparepart: jadwal preventif aktif yang jatuh tempo dalam N hari × suku cadang master tugasnya, dibandingkan stok. */
import { prisma } from "./prisma";

/** "Filter HEPA x 2", "Baterai 9V (3)", "Selang O2" → { nama, jumlah }. */
export function uraiSukuCadang(teks: string | null | undefined) {
  return (teks ?? "").split(/\r?\n/).map((b) => b.trim()).filter(Boolean).map((b) => {
    const m = b.match(/^(.*?)\s*(?:[x×*]\s*(\d+)|\((\d+)\))\s*$/i);
    const nama = (m?.[1] ?? b).trim(), jumlah = Number(m?.[2] ?? m?.[3] ?? 1) || 1;
    return { nama, jumlah };
  }).filter((x) => x.nama.length > 1);
}

const kunci = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

export async function kebutuhanSparepart(hari = 90, kini = new Date()) {
  const batas = new Date(kini.getTime() + hari * 86_400_000);
  const [jadwal, stok] = await Promise.all([
    prisma.jadwalPreventif.findMany({
      where: { aktif: true, berikutnya: { lte: batas }, tugas: { sukuCadang: { not: null } }, alat: { aktif: true } },
      select: { berikutnya: true, intervalHari: true, tugas: { select: { nama: true, sukuCadang: true } } },
    }),
    prisma.barangStok.findMany({ where: { aktif: true, jenis: { in: ["Sparepart", "BHP-BMHP"] } }, select: { kode: true, nama: true, stok: true, satuan: true } }),
  ]);
  const per = new Map<string, { nama: string; butuh: number; jadwal: number; tugas: Set<string> }>();
  for (const j of jadwal) {
    // jumlah kejadian dalam rentang: jatuh tempo pertama + pengulangan sesuai interval
    if (!j.berikutnya) continue;
    let n = 0; for (let t = j.berikutnya.getTime(); t <= batas.getTime() && n < 50; t += Math.max(1, j.intervalHari) * 86_400_000) n++;
    for (const sc of uraiSukuCadang(j.tugas?.sukuCadang)) {
      const k = kunci(sc.nama);
      const e = per.get(k) ?? { nama: sc.nama, butuh: 0, jadwal: 0, tugas: new Set<string>() };
      e.butuh += sc.jumlah * n; e.jadwal += n; e.tugas.add(j.tugas!.nama); per.set(k, e);
    }
  }
  return [...per.values()].map((e) => {
    const cocok = stok.filter((b) => kunci(b.nama).includes(kunci(e.nama)) || kunci(e.nama).includes(kunci(b.nama)));
    const tersedia = cocok.reduce((a, b) => a + b.stok, 0);
    return { nama: e.nama, butuh: e.butuh, jadwal: e.jadwal, tugas: [...e.tugas], tersedia, kurang: Math.max(0, e.butuh - tersedia), barang: cocok.map((b) => b.kode), satuan: cocok[0]?.satuan ?? "pcs" };
  }).sort((a, b) => b.kurang - a.kurang || b.butuh - a.butuh);
}
