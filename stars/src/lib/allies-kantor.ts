/** Data Kantor AI: tugas nyata tiap Karyawan AI, dihitung dari analisis ALLIES. */
import { ringkasanAllies, type AnalisaAlat } from "./allies";
import { KARYAWAN, type IdKaryawan } from "./allies-karyawan";

export type TugasKantor = { judul: string; sub: string; href: string };
export type DivisiKantor = { id: IdKaryawan; nama: string; bidang: string; total: number; tugas: TugasKantor[] };

const t = (a: AnalisaAlat, sub: string): TugasKantor => ({ judul: a.nama, sub: `${a.kode} · ${a.unit} · ${sub}`, href: `/allies?alat=${encodeURIComponent(a.kode)}#alat` });

export async function dataKantor(unitId: number | null): Promise<DivisiKantor[]> {
  const r = await ringkasanAllies(unitId);
  const aktif = r.semua.filter((a) => a.aktif);
  const daftar: Record<IdKaryawan, TugasKantor[]> = {
    inventaris: aktif.filter((a) => a.umur == null || !a.harga || !a.penerimaanLengkap).map((a) => t(a, a.umur == null ? "tahun belum diisi" : !a.harga ? "harga belum diisi" : "BA penerimaan belum ada")),
    pemeliharaan: aktif.filter((a) => a.woTerbuka + a.laporanTerbuka > 0 || a.preventifTempo).map((a) => t(a, a.woTerbuka + a.laporanTerbuka > 0 ? `${a.woTerbuka} WO, ${a.laporanTerbuka} laporan` : "preventif jatuh tempo")),
    kalibrasi: r.kalibrasi.map((a) => t(a, a.kal.label)),
    perencanaan: r.kandidat.map((a) => t(a, `skor ${a.skor}`)),
    umum: [],
  };
  const lain = (["inventaris", "pemeliharaan", "kalibrasi", "perencanaan"] as const);
  daftar.umum = lain.flatMap((id) => daftar[id].length ? [{ judul: `Koordinasi ${KARYAWAN.find((k) => k.id === id)!.nama}`, sub: `${daftar[id].length} tugas terbuka`, href: `/allies/kantor?petugas=${id}` }] : []);
  return KARYAWAN.map((k) => ({ id: k.id, nama: k.nama, bidang: k.bidang, total: daftar[k.id].length, tugas: daftar[k.id].slice(0, 12) }));
}
