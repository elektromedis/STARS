import { prisma } from "@/lib/prisma";
import { baris, kuantBaris, type IsiLK } from "@/lib/lembar-kerja";

export async function alatUntukLK(where: { id?: number; kode?: string }) {
  const a = await prisma.alat.findFirst({ where, include: { unitKerja: true, ruangan: true } });
  return a ? { id: a.id, kode: a.kode, nama: a.nama, merek: a.merek, model: a.model, nomorSeri: a.nomorSeri, unit: a.unitKerja.nama, ruangan: a.ruangan?.nama ?? a.lokasi } : null;
}

export function isiDariTemplate(t: { kualitatif: string; kuantitatif: string; preventif: string }): IsiLK {
  return {
    apparatus: [],
    kualitatif: baris(t.kualitatif).map((butir) => ({ butir, hasil: "" })),
    kuantitatif: kuantBaris(t.kuantitatif).map((k) => ({ ...k, set: "", ukur: "", hasil: "" })),
    preventif: baris(t.preventif).map((butir) => ({ butir, done: false })),
  };
}
