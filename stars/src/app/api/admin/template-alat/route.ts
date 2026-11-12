import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { keXlsx } from "@/lib/export";

export const dynamic = "force-dynamic";

/** GET /api/admin/template-alat → template inventaris alat (header sama dengan ekspor Trilux + kolom tambahan STARS). */
export async function GET() {
  const units = await prisma.unitKerja.findMany({ orderBy: { urut: "asc" } });
  const contoh = [
    { "No.": 1, Trilux: "20902005", "Alat Kesehatan": "Bed Patient Electric", "No Seri": "2017608HG0071N", "No Inventaris": "INV-2024-0001", "No Urut Asset": "", Merk: "Platinum", Tipe: "PI-608 HG", Keterangan: "", Instalasi: "Instalasi Rawat Inap", Pelayanan: "Rawat Inap", Ruangan: "Kebidanan", "Unit Kerja": "KEBIDANAN", Jenis: "Medik", "Tahun Pembelian": 2024, "Tahun Pembukuan": 2024, "Tahun Perolehan": 2024, Harga: 45000000, Pendanaan: "BLUD", Teknologi: "Sedang", "Kelas Resiko": "Low (rendah)", "Tanggal Uji Fungsi": "2024-10-17", "Tanggal Kalibrasi": "2026-10-17", "Tanggal Expired Kalibrasi": "2027-10-17", AKL: "", Produsen: "PT. Contoh", "Umur Pemakaian": "2 Tahun", Distributor: "PT. Distributor", Status: "Baik" },
  ];
  const petunjuk = [
    { bagian: "Umum", keterangan: "Hasil ekspor Trilux CAMS (judul di baris 1, header di baris 3) bisa diunggah LANGSUNG tanpa diubah. Template ini memakai header yang sama." },
    { bagian: "Kode alat", keterangan: "Kode unik STARS diambil dari No Inventaris → No Urut Asset → No Seri (yang pertama terisi). Baris dengan kode sama akan MEMPERBARUI alat, bukan menggandakan." },
    { bagian: "Unit Kerja", keterangan: "Opsional. Bila kosong, STARS menebak dari Ruangan/Pelayanan/Instalasi (mis. 'Perinatologi' → PERINA). Yang tak cocok masuk TIDAK ADA (lihat peringatan), bisa dibetulkan di Daftar Alat." },
    { bagian: "Status", keterangan: "Baik | Tidak beroperasi (→ Rusak Ringan) | Tidak Berfungsi (→ Rusak Berat) | Afkir." },
    { bagian: "Kelas Resiko", keterangan: "Low (rendah) | Medium (sedang) | Med-High / High (tinggi). Teks asli disimpan, dipetakan ke Rendah/Sedang/Tinggi." },
    { bagian: "Tanggal", keterangan: "Format YYYY-MM-DD atau DD-MM-YYYY atau tanggal Excel. Tanggal Kalibrasi + Expired akan menjadi catatan kalibrasi alat." },
    { bagian: "Jenis", keterangan: "Medik (default) | Non Medik." },
  ];
  const buf = keXlsx([
    { nama: "alat", baris: contoh },
    { nama: "unit_kerja", baris: units.map((u, i) => ({ no: i + 1, unit_kerja: u.nama })) },
    { nama: "petunjuk", baris: petunjuk },
  ]);
  return new NextResponse(new Uint8Array(buf), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": 'attachment; filename="STARS_template_inventaris_alat.xlsx"' } });
}
