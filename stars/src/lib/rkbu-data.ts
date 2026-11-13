/** Data untuk menu Cetak RKBU (server). */
import { prisma } from "./prisma";
import { getFilterOptions, TAHAP_URUT } from "./filter";
import { bacaIsiRkbu } from "./rkbu-simpan";
import { idBaru, isiBawaan, jumlahBaris, type BarisRkbu, type IsiRkbu } from "./rkbu";

export type FilterPaketRkbu = { tahun: number; tahap: string; jenis?: string | null; unit?: string | null; rekening?: string | null; kategori?: string | null };

/** Pilihan formulir dokumen baru / ambil dari Paket. */
export async function opsiRkbu(unitKunci?: string | null) {
  const w = unitKunci ? { unitKerja: { nama: unitKunci } } : {};
  const [o, rek, sd] = await Promise.all([
    getFilterOptions(unitKunci),
    prisma.paket.groupBy({ by: ["namaRekening"], where: w, orderBy: { namaRekening: "asc" } }),
    prisma.paket.groupBy({ by: ["sumberDana"], where: w }),
  ]);
  return { ...o, rekening: rek.map((r) => r.namaRekening).filter((r) => r.length > 2), sumberDana: sd.map((s) => s.sumberDana), tahap: [...TAHAP_URUT] as string[] };
}

/** Baris Paket → baris RKBU. Jumlah dibiarkan otomatis bila sama dengan perhitungan PPN, selain itu memakai nilai paket apa adanya. */
export async function barisDariPaket(f: FilterPaketRkbu, unitKunci?: string | null) {
  const unit = unitKunci ?? f.unit ?? null;
  const rows = await prisma.paket.findMany({
    where: {
      tahun: f.tahun, tahap: f.tahap,
      ...(f.jenis ? { jenis: f.jenis } : {}),
      ...(unit ? { unitKerja: { nama: unit } } : {}),
      ...(f.rekening ? { namaRekening: f.rekening } : {}),
      ...(f.kategori ? { kategori: f.kategori } : {}),
    },
    orderBy: [{ kode: "asc" }],
    include: { unitKerja: { select: { nama: true } } },
    take: 1000,
  });
  // PPN paling umum dari rasio nilai ÷ (vol1 × vol2 × harga), mis. 1,11 → 11 %
  const hitung = new Map<number, number>();
  for (const r of rows) {
    const dasar = r.vol1 * r.vol2 * r.hargaSatuan;
    if (dasar > 0 && r.nilai > 0) { const p = Math.round((r.nilai / dasar - 1) * 100); if (p >= 0 && p <= 15) hitung.set(p, (hitung.get(p) ?? 0) + 1); }
  }
  const ppn = [...hitung.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? (f.tahun >= 2025 ? 12 : 11);
  const baris: BarisRkbu[] = rows.map((r) => {
    const b: BarisRkbu = {
      id: idBaru(), rekening: r.namaRekening, barang: r.namaPaket, uraian: r.uraian ?? "", lokasi: r.lokasiAsli ?? r.unitKerja.nama, kodeBarang: r.kodeBarang ?? "-",
      vol1: r.vol1, satuan1: r.satuan1 ?? "", vol2: r.vol2, satuan2: r.satuan2 ?? "", harga: r.hargaSatuan, jumlahManual: null,
      prioritas: r.prioritas ?? "", keterangan: r.keterangan ?? "", paketKode: r.kode,
    };
    if (Math.abs(jumlahBaris(b, ppn) - r.nilai) > 1) b.jumlahManual = Math.round(r.nilai);
    return b;
  });
  return { baris, ppn, sumberDana: rows[0]?.sumberDana ?? null };
}

/**
 * Isi dokumen baru: kop, penandatangan, & identitas tetap diambil dari dokumen yang terakhir disimpan
 * (cukup diisi sekali), judul & tahun mengikuti pilihan.
 */
export async function isiBaru(opsi: { jenis: IsiRkbu["jenis"]; tahun: number; tahap: string; unit?: string | null } & ({ dariPaket: false } | ({ dariPaket: true } & FilterPaketRkbu)), unitKunci?: string | null): Promise<IsiRkbu> {
  const paket = opsi.dariPaket ? await barisDariPaket(opsi, unitKunci) : null;
  const isi = isiBawaan({ jenis: opsi.jenis, tahun: opsi.tahun, tahap: opsi.tahap, sumberDana: paket?.sumberDana ?? undefined, ppn: paket?.baris.length ? paket.ppn : undefined });
  const terakhir = await prisma.dokumenRkbu.findFirst({ orderBy: { updatedAt: "desc" }, select: { isi: true } });
  const lama = terakhir ? bacaIsiRkbu(terakhir.isi) : null;
  if (lama) {
    isi.kop = lama.kop;
    isi.pengesahan = { ...lama.pengesahan, tempatTanggal: "" };
    isi.catatan = lama.catatan;
    isi.cetak = lama.cetak;
    isi.identitas = isi.identitas.map((i) => (/nama unit|ppa|rumah sakit/i.test(i.label) && lama.jenis === opsi.jenis ? lama.identitas.find((l) => l.label === i.label) ?? i : i));
  }
  if (paket) isi.baris = paket.baris;
  return isi;
}
