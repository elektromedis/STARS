import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { keXlsx } from "@/lib/export";
import { JENIS, KOLOM_TEMPLATE } from "@/lib/impor";
import { TAHAP_URUT } from "@/lib/filter";
import { kePdf, type KolomPdf } from "@/lib/pdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/admin/template → template Excel STARS (sheet paket, unit_kerja, petunjuk).
 * GET /api/admin/template?format=pdf → formulir kosong siap cetak untuk pengisian manual oleh unit.
 */
export async function GET(req: NextRequest) {
  const units = await prisma.unitKerja.findMany({ orderBy: { urut: "asc" } });

  if (req.nextUrl.searchParams.get("format") === "pdf") {
    const kolom: KolomPdf[] = [
      { kunci: "no", label: "No", lebar: 8, rata: "center" },
      { kunci: "nama_paket", label: "Nama Paket / Pekerjaan" },
      { kunci: "uraian", label: "Uraian", lebar: 30 },
      { kunci: "unit_kerja", label: "Unit Kerja", lebar: 24 },
      { kunci: "vol1", label: "Vol", lebar: 10, rata: "center" },
      { kunci: "satuan1", label: "Satuan", lebar: 14 },
      { kunci: "vol2", label: "Vol 2", lebar: 10, rata: "center" },
      { kunci: "satuan2", label: "Satuan 2", lebar: 14 },
      { kunci: "harga_satuan", label: "Harga Satuan (Rp)", lebar: 26, rata: "right" },
      { kunci: "nilai", label: "Nilai (Rp)", lebar: 26, rata: "right" },
      { kunci: "prioritas", label: "Prioritas", lebar: 15, rata: "center" },
    ];
    const buf = kePdf({
      judul: "Formulir Usulan Paket (Isian Manual)",
      subjudul: `Tahun anggaran: ............  Tahap: ${TAHAP_URUT.join(" / ")}  Jenis: ${JENIS.join(" / ")}`,
      kolom,
      baris: [],
      barisKosong: 14,
      orientasi: "l",
      catatan: [
        "Formulir ini untuk pengumpulan usulan secara tertulis. Setelah terkumpul, salin ke template Excel STARS (unduh di Admin -> Ekspor & Template) lalu impor di Admin -> Impor.",
        "Satu baris = satu paket/pekerjaan. Nilai = Vol x Vol 2 x Harga Satuan.",
        `Unit kerja harus salah satu dari ${units.length} unit resmi: ${units.map((u) => u.nama).join(", ")}.`,
        "Prioritas diisi PP 1 (sangat mendesak), PP 2, atau PP 3. Kolom kategori tidak perlu diisi (ditentukan otomatis saat impor).",
        "Tanda tangan kepala unit: ................................  Tanggal: ....../....../............",
      ],
    });
    return new NextResponse(new Uint8Array(buf), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": 'attachment; filename="STARS_formulir_paket.pdf"' },
    });
  }

  const kosong = Object.fromEntries(KOLOM_TEMPLATE.map((k) => [k, ""]));
  const contoh = [
    { ...kosong, tahun: 2026, tahap: "Perubahan", jenis: "Pemeliharaan", sumber_dana: "BLUD", nama_rekening: "2.6.2001 Biaya Jasa Kalibrasi Alat Kesehatan / Alat Penunjang Medik BLUD", nama_paket: "Jasa Pengujian dan Kalibrasi Baby Incubator", uraian: "Pengujian dan atau Kalibrasi", unit_kerja: "PERINA", vol1: 4, satuan1: "Unit", vol2: 1, satuan2: "Kali", harga_satuan: 929040, nilai: 3716160, serapan: "Ya", prioritas: "PP 1", kategori: "Pengujian & Kalibrasi" },
    { ...kosong, tahun: 2026, tahap: "Perubahan", jenis: "Pemeliharaan", sumber_dana: "BLUD", nama_rekening: "2.6.2002 Pemeliharaan Alat Kesehatan / Alat Penunjang Medik BLUD", nama_paket: "Sparepart Humidifier CPAP", uraian: "Suku Cadang", unit_kerja: "HCU-ICU", vol1: 1, satuan1: "Set", vol2: 1, satuan2: "Kali", harga_satuan: 16800000, nilai: 16800000, serapan: "Tidak", prioritas: "PP 2", kategori: "" },
  ];
  const petunjuk = [
    { bagian: "Umum", keterangan: "Isi sheet 'paket'. Baris 1 = header (jangan diubah), satu baris = satu paket. Dua baris contoh boleh dihapus." },
    { bagian: "kode", keterangan: "Kosongkan untuk paket baru (dibuat otomatis, mis. PM-2026-PB-0083). Isi bila memperbarui paket yang sudah ada (ambil dari hasil ekspor)." },
    { bagian: "tahun", keterangan: "Tahun anggaran 4 digit, mis. 2026. WAJIB." },
    { bagian: "tahap", keterangan: `Salah satu dari: ${TAHAP_URUT.join(" | ")}. WAJIB.` },
    { bagian: "jenis", keterangan: `${JENIS.join(" | ")}. Kosong = Pemeliharaan.` },
    { bagian: "nama_paket", keterangan: "Nama barang/jasa atau pekerjaan. WAJIB." },
    { bagian: "unit_kerja", keterangan: "Harus salah satu dari 28 unit pada sheet 'unit_kerja' (huruf besar/kecil bebas). WAJIB. Lokasi gabungan seperti 'ICU, IGD' akan dipetakan ke unit pertama dengan peringatan." },
    { bagian: "vol1, satuan1, vol2, satuan2", keterangan: "Volume dan satuan, mis. 4 Unit x 1 Kali. Kosong = 1." },
    { bagian: "harga_satuan, nilai", keterangan: "Angka rupiah tanpa titik/koma ribuan (boleh format Rp 1.234.567). nilai WAJIB atau bisa dihitung dari vol1 × vol2 × harga_satuan. Nilai 0 tidak dimuat." },
    { bagian: "serapan", keterangan: "Ya/Tidak (atau TRUE/FALSE, 1/0). Kosong = Tidak." },
    { bagian: "kategori", keterangan: "Boleh kosong; akan ditebak dari rekening/uraian (Pengujian & Kalibrasi, Pemeliharaan Alat Kesehatan, Suku Cadang & Aksesori, Kontrak Servis, Jasa Perbaikan & Servis, Sarana & Prasarana, Belanja Modal Alkes)." },
    { bagian: "Duplikat", keterangan: "Baris dengan kode sama, atau tanpa kode tetapi tahun+tahap+nama_paket+unit_kerja+nama_rekening sudah ada, akan MEMPERBARUI data lama, bukan menggandakan." },
    { bagian: "Proses", keterangan: "Di halaman Admin → Impor: pilih berkas → Periksa (pratinjau + daftar error per baris) → Simpan (hanya aktif bila nol error). Semua baris disimpan dalam satu transaksi." },
  ];
  const buf = keXlsx([
    { nama: "paket", baris: contoh },
    { nama: "unit_kerja", baris: units.map((u, i) => ({ no: i + 1, unit_kerja: u.nama })) },
    { nama: "petunjuk", baris: petunjuk },
  ]);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="STARS_template_paket.xlsx"',
    },
  });
}
