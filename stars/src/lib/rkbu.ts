/**
 * Dokumen RKBU/RKPBU siap cetak (aman dipakai di browser & server).
 * Isi dokumen disimpan sebagai JSON di DokumenRkbu.isi; semua teks dapat diubah di editor.
 */

export type BarisRkbu = {
  id: string;
  rekening: string;
  barang: string;
  uraian: string;
  lokasi: string;
  kodeBarang: string;
  vol1: number;
  satuan1: string;
  vol2: number;
  satuan2: string;
  /** Harga satuan sebelum PPN (kolom "Satuan (Rp)"). */
  harga: number;
  /** null = jumlah dihitung otomatis (vol1 × vol2 × harga × (1 + PPN)); angka = diisi manual. */
  jumlahManual: number | null;
  prioritas: string;
  keterangan: string;
  /** Kode paket asal (bila diambil dari data Paket). */
  paketKode?: string;
};

export type Penandatangan = { jabatan: string; nama: string; nip: string };
export type Lampiran = { id: string; judul: string; gambar: string | null };

export const KOLOM_RKBU = ["no", "rekening", "barang", "uraian", "lokasi", "kodeBarang", "vol1", "satuan1", "x", "vol2", "satuan2", "harga", "jumlah", "prioritas", "keterangan"] as const;
export type KunciKolom = (typeof KOLOM_RKBU)[number];

export type IsiRkbu = {
  versi: 1;
  jenis: "Pemeliharaan" | "Pengadaan";
  tahun: number;
  tahap: string;
  kop: { tampil: boolean; logo: string | null; pemerintah: string; nama: string; alamat: string; kontak: string; kota: string; kodePos: string };
  judul: string[];
  identitas: { label: string; nilai: string }[];
  kolom: Record<KunciKolom, string> & { kelompokJumlah: string; kelompokHarga: string };
  ppn: number;
  baris: BarisRkbu[];
  catatan: string[];
  pengesahan: { pembuka: string; tempatTanggal: string; ttd: Penandatangan[] };
  lampiran: Lampiran[];
  /** barisUtuh = baris tabel tidak boleh terpotong antarhalaman (lebih rapi, tetapi boros kertas bila uraian panjang). */
  cetak: { kertas: "A4" | "F4"; orientasi: "landscape" | "portrait"; huruf: number; nomorHalaman: boolean; barisUtuh?: boolean };
};

export const JENIS_RKBU = ["Pemeliharaan", "Pengadaan"] as const;
export const MAKS_BARIS_RKBU = 1000;
export const MAKS_LAMPIRAN_RKBU = 30;
/** Gambar lampiran/logo: diperkecil di browser lalu disimpan di UPLOAD_DIR/rkbu. */
export const GAMBAR_RKBU = { sisi: 1800, sisiLogo: 600, kualitas: 0.85, maksAsli: 25 * 1024 * 1024, maksUnggah: 4 * 1024 * 1024 };
export const POLA_GAMBAR_RKBU = /^[0-9a-f-]{36}\.(jpg|png|webp)$/i;
export const urlGambarRkbu = (nama: string | null | undefined) => (nama ? `/api/rkbu/gambar/${nama}` : null);

export const idBaru = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);

export function judulBawaan(jenis: IsiRkbu["jenis"], tahap: string, tahun: number): string[] {
  return [
    jenis === "Pengadaan" ? "RENCANA KEBUTUHAN BARANG UNIT (RKBU)" : "RENCANA KEBUTUHAN PEMELIHARAAN BARANG UNIT (RKPBU)",
    `TAHAP ${tahap.toUpperCase()}`,
    `TAHUN ANGGARAN ${tahun}`,
  ];
}

export const KOLOM_BAWAAN: IsiRkbu["kolom"] = {
  no: "No", rekening: "Kode Rekening", barang: "Barang/Jasa", uraian: "Uraian Pemeliharaan", lokasi: "Lokasi", kodeBarang: "Kode Barang",
  vol1: "Vol 1", satuan1: "Satuan", x: "x", vol2: "Vol 2", satuan2: "Satuan", harga: "Satuan (Rp)", jumlah: "Jumlah (Rp)",
  prioritas: "Prioritas", keterangan: "Keterangan", kelompokJumlah: "Jumlah Barang", kelompokHarga: "Harga Plus PPN (11%)",
};

/** Kop surat RSUD Cipayung (sesuai template Dialog Kinerja). Logo diunggah sekali dari editor. */
export const KOP_BAWAAN: IsiRkbu["kop"] = {
  tampil: true,
  logo: null,
  pemerintah: "PEMERINTAH PROVINSI DAERAH KHUSUS IBUKOTA JAKARTA DINAS KESEHATAN",
  nama: "RUMAH SAKIT UMUM DAERAH CIPAYUNG",
  alamat: "Jl. Mini III RT. 04 RW.03, Kel. Bambu Apus, Jakarta Timur Telp. (021) 85506588",
  kontak: "Website : rsudcipayung.jakarta.go.id   E-mail : rsudcipayung@jakarta.go.id",
  kota: "J A K A R T A",
  kodePos: "KodePos : 13890",
};

export function isiBawaan(opsi: { jenis: IsiRkbu["jenis"]; tahun: number; tahap: string; sumberDana?: string; unit?: string; ppn?: number }): IsiRkbu {
  const ppn = opsi.ppn ?? (opsi.tahun >= 2025 ? 12 : 11);
  return {
    versi: 1,
    jenis: opsi.jenis,
    tahun: opsi.tahun,
    tahap: opsi.tahap,
    kop: { ...KOP_BAWAAN },
    judul: judulBawaan(opsi.jenis, opsi.tahap, opsi.tahun),
    identitas: [
      { label: "Nama Rumah Sakit", nilai: "RSUD CIPAYUNG" },
      { label: "Sumber Anggaran", nilai: opsi.sumberDana ?? "BLUD" },
      { label: "Nama Unit", nilai: opsi.unit ?? "Elektromedik" },
      { label: "PPA", nilai: opsi.jenis === "Pengadaan" ? "Pengelola Perencanaan Anggaran Pengadaan Alat Kesehatan" : "Pengelola Perencanaan Anggaran Pemeliharaan Alat Kesehatan" },
    ],
    kolom: { ...KOLOM_BAWAAN, uraian: opsi.jenis === "Pengadaan" ? "Uraian / Spesifikasi" : "Uraian Pemeliharaan", kelompokHarga: `Harga Plus PPN (${ppn}%)` },
    ppn,
    baris: [],
    catatan: [
      "* diisi sesuai kebutuhan selama 1 tahun + 3 Bulan untuk APBD Murni dan 1 tahun untuk BLUD",
      "** diisi sesuai Kebutuhan dan Program Kerja RSUD Cipayung",
    ],
    pengesahan: {
      pembuka: "Telah diteliti dan disetujui oleh :",
      tempatTanggal: "",
      ttd: [
        { jabatan: "Direktur\nRSUD Cipayung", nama: "", nip: "" },
        { jabatan: "Kepala Seksi Pelayanan Penunjang\nRSUD Cipayung", nama: "", nip: "" },
        { jabatan: `Pengelola Perencanaan dan Anggaran ${opsi.jenis === "Pengadaan" ? "Pengadaan" : "Pemeliharaan"} Alat Kesehatan\nRSUD Cipayung`, nama: "", nip: "" },
      ],
    },
    lampiran: [],
    cetak: { kertas: "A4", orientasi: "landscape", huruf: 8, nomorHalaman: true, barisUtuh: false },
  };
}

export const barisKosong = (): BarisRkbu => ({
  id: idBaru(), rekening: "", barang: "", uraian: "", lokasi: "", kodeBarang: "-", vol1: 1, satuan1: "Unit", vol2: 1, satuan2: "Kali",
  harga: 0, jumlahManual: null, prioritas: "", keterangan: "",
});

/** Jumlah per baris: manual bila diisi, selain itu vol1 × vol2 × harga × (1 + PPN), dibulatkan ke rupiah. */
export function jumlahBaris(b: Pick<BarisRkbu, "vol1" | "vol2" | "harga" | "jumlahManual">, ppn: number) {
  if (b.jumlahManual !== null && Number.isFinite(b.jumlahManual)) return b.jumlahManual;
  return Math.round((Number(b.vol1) || 0) * (Number(b.vol2) || 0) * (Number(b.harga) || 0) * (1 + (Number(ppn) || 0) / 100));
}
export const totalRkbu = (isi: Pick<IsiRkbu, "baris" | "ppn">) => isi.baris.reduce((a, b) => a + jumlahBaris(b, isi.ppn), 0);

/** 17620324 → "17,620,324" (format angka seperti kertas kerja RKPBU). */
export const angkaRkbu = (n: number) => (Number.isFinite(n) ? Math.round(n).toLocaleString("en-US") : "0");
/** 1 → "1", 1.5 → "1.5", 0.25 → "0.25"; volume ditampilkan apa adanya (mis. 1.0000 di kertas kerja = 1). */
export const volRkbu = (n: number) => (Number.isInteger(n) ? n.toLocaleString("en-US") : Number(n.toFixed(4)).toString());

/** Semua nama gambar (logo + lampiran) yang dirujuk dokumen — untuk membersihkan berkas yatim. */
export const gambarDirujuk = (isi: Pick<IsiRkbu, "kop" | "lampiran">) => [isi.kop.logo, ...isi.lampiran.map((l) => l.gambar)].filter((g): g is string => Boolean(g));

/** Ukuran kertas (mm) untuk CSS @page. F4 = 215 × 330 mm (kertas folio Indonesia). */
export function ukuranKertas(c: IsiRkbu["cetak"]) {
  const [p, l] = c.kertas === "F4" ? [215, 330] : [210, 297];
  return c.orientasi === "landscape" ? { lebar: l, tinggi: p } : { lebar: p, tinggi: l };
}
