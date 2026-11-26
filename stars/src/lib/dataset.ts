import type { Filter } from "./filter";
import { getNilaiPerKategori, getNilaiPerUnit, getPaketForExport, getUnitKerjaRows } from "./queries";

/** Baris dataset terbuka (sama untuk XLSX/CSV/DOCX/PPTX dan pratinjau di browser). null = slug tidak dikenal. */
export async function barisDataset(slug: string, filter: Filter): Promise<{ baris: Record<string, unknown>[]; namaDasar: (string | number | null | undefined)[] } | null> {
  switch (slug) {
    case "paket":
      return { baris: await getPaketForExport(filter), namaDasar: ["paket", filter.tahun, filter.tahap, filter.unit] };
    case "nilai-per-unit":
      return { baris: (await getNilaiPerUnit(filter)).map((r, i) => ({ no: i + 1, unit_kerja: r.name, jumlah_paket: r.paket, nilai: r.value })), namaDasar: ["nilai_per_unit", filter.tahun, filter.tahap] };
    case "nilai-per-kategori":
      return { baris: (await getNilaiPerKategori(filter)).map((r, i) => ({ no: i + 1, kategori: r.name, jumlah_paket: r.paket, nilai: r.value })), namaDasar: ["nilai_per_kategori", filter.tahun, filter.tahap, filter.unit] };
    case "unit-kerja":
      return { baris: await getUnitKerjaRows(filter.unitTerkunci ? filter.unit : null), namaDasar: ["unit_kerja"] };
    default:
      return null;
  }
}
