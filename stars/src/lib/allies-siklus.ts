/**
 * ALLIES — Agen pengelolaan alat medik STARS (tanpa AI eksternal: aturan + data STARS).
 * Definisi siklus hidup alat kesehatan di rumah sakit, dari Analisa Kebutuhan s.d. Penghapusan,
 * lalu kembali ke Analisa Kebutuhan (penggantian). Aman dipakai di komponen klien (tanpa prisma).
 *
 * Rujukan (folder "B. REGULASI DAN KEBIJAKAN" Elektromedis): WHO Medical Device Technical Series 2011
 * (Needs assessment, HTA, Procurement process, Inventory, Maintenance programme, CMMS), WHO "How to Manage"
 * Healthcare Technology Guide 1–6 (2005), Depkes 2001 Pedoman Operasional & Pemeliharaan Alkes dan
 * Pedoman Pengujian & Kalibrasi, serta peraturan nasional yang disebut per tahap. Nomor peraturan wajib
 * dicek ulang ke JDIH sebelum dikutip di dokumen resmi (bisa sudah diubah/diganti).
 */
import type { LucideIcon } from "lucide-react";
import { ClipboardCheck, ClipboardList, Gauge, PackageCheck, Recycle, Scale, ShieldAlert, ShoppingCart, Stethoscope, Wrench } from "lucide-react";

export type Fase = "pre" | "post";
export type IdTahap =
  | "kebutuhan" | "perencanaan" | "penilaian" | "pengadaan" | "penerimaan"
  | "operasional" | "pemeliharaan" | "kalibrasi" | "surveilans" | "penghapusan";

export type Tahap = {
  id: IdTahap;
  no: number;
  fase: Fase;
  nama: string;
  ringkas: string;
  ikon: LucideIcon;
  /** Menu STARS yang mengerjakan tahap ini. */
  menu: { label: string; href: string }[];
  /** Daftar periksa (dibaca petugas). */
  periksa: string[];
  /** Dokumen/keluaran tahap. */
  keluaran: string[];
  rujukan: string[];
  kataKunci: string[];
};

export const LABEL_FASE: Record<Fase, string> = { pre: "Pre-Market (sebelum alat dipakai)", post: "Post-Market (selama & akhir masa pakai)" };

export const SIKLUS: Tahap[] = [
  {
    id: "kebutuhan", no: 1, fase: "pre", nama: "Analisa Kebutuhan", ikon: ClipboardList,
    ringkas: "Menentukan alat apa yang benar-benar dibutuhkan: dari standar pelayanan, data inventaris, alat yang perlu diganti, dan beban layanan.",
    menu: [{ label: "Inventaris (Pemeliharaan)", href: "/pemeliharaan" }, { label: "Kandidat penggantian (ALLIES)", href: "/allies#rekomendasi" }],
    periksa: [
      "Bandingkan inventaris tiap unit dengan standar sarana/prasarana & alat sesuai kelas RS dan layanan",
      "Masukkan alat yang direkomendasikan diganti (umur, biaya perbaikan, tidak laik kalibrasi)",
      "Data beban layanan: jumlah pasien/tindakan, waktu tunggu, rujukan keluar karena alat tidak ada",
      "Kebutuhan sarana pendukung: daya listrik, gas medik, ruang, SDM operator & teknisi",
      "Prioritaskan (keselamatan pasien, kewajiban standar, dampak layanan, ketersediaan anggaran)",
    ],
    keluaran: ["Daftar kebutuhan alat per unit + prioritas", "Justifikasi kebutuhan (KAK/telaah)"],
    rujukan: ["WHO (2011) Needs assessment for medical devices", "WHO (2011) Core medical equipment", "Pedoman teknis bangunan & sarana RS Kemenkes (2012)"],
    kataKunci: ["kebutuhan", "analisa", "analisis", "need", "standar", "usulan"],
  },
  {
    id: "perencanaan", no: 2, fase: "pre", nama: "Perencanaan & Penganggaran", ikon: ClipboardCheck,
    ringkas: "Menyusun RKBU (pengadaan) dan RKPBU (pemeliharaan) beserta nilai, tahap anggaran, dan biaya siklus hidup (bukan hanya harga beli).",
    menu: [{ label: "Perencanaan-Pengadaan", href: "/nilai" }, { label: "Cetak RKBU", href: "/rkbu" }],
    periksa: [
      "Hitung biaya total kepemilikan: harga + instalasi + pelatihan + bahan habis pakai + pemeliharaan + kalibrasi tahunan",
      "Masukkan anggaran pemeliharaan/kalibrasi alat lama ke RKPBU (umumnya ±5–10% nilai alat per tahun)",
      "Sesuaikan dengan tahap anggaran (Penetapan, Pergeseran, Perubahan) dan sumber dana (BLUD/APBD)",
      "Lampirkan referensi harga (e-Katalog, survei harga) dan spesifikasi teknis",
    ],
    keluaran: ["RKBU / RKPBU", "Spesifikasi teknis & referensi harga"],
    rujukan: ["WHO (2005) How to Manage Guide 2 — Plan and budget for healthcare technology", "WHO (2005) How to Manage Guide 6 — Manage the finances of HTM teams"],
    kataKunci: ["rencana", "perencanaan", "anggaran", "rkbu", "rkpbu", "budget", "pagu", "biaya"],
  },
  {
    id: "penilaian", no: 3, fase: "pre", nama: "Penilaian Teknologi (HTA)", ikon: Scale,
    ringkas: "Membandingkan merek/tipe kandidat: keselamatan, keandalan di RS, biaya, spesifikasi, dan dukungan purna jual.",
    menu: [{ label: "HTA — Bandingkan alat", href: "/hta" }],
    periksa: [
      "Minimal 2–3 kandidat merek/tipe yang memenuhi spesifikasi",
      "Riwayat keandalan merek yang sama di RS (jumlah kerusakan, waktu henti)",
      "Ketersediaan suku cadang, teknisi resmi, garansi, dan pelatihan",
      "Kecocokan dengan sarana (daya, gas medik, ukuran ruang) dan alat lain (konsumabel, sistem informasi)",
    ],
    keluaran: ["Lembar banding HTA + rekomendasi merek/tipe"],
    rujukan: ["WHO (2011) Health technology assessment of medical devices"],
    kataKunci: ["hta", "banding", "bandingkan", "merek", "tipe", "penilaian teknologi", "spesifikasi"],
  },
  {
    id: "pengadaan", no: 4, fase: "pre", nama: "Pengadaan", ikon: ShoppingCart,
    ringkas: "Membeli alat yang sudah dinilai, dengan izin edar sah dan kontrak yang memuat garansi, pelatihan, manual, dan suku cadang.",
    menu: [{ label: "Paket & dokumen pendukung", href: "/paket" }],
    periksa: [
      "Alat memiliki izin edar Kemenkes (nomor AKL untuk produk dalam negeri / AKD untuk impor) yang masih berlaku",
      "Kontrak memuat: garansi, pelatihan operator & teknisi, user & service manual, ketersediaan suku cadang (mis. ≥ 5 tahun)",
      "Uji fungsi & kalibrasi awal termasuk dalam lingkup penyedia",
      "Utamakan produk dalam negeri bila setara (P3DN)",
    ],
    keluaran: ["SP/SPK/Kontrak", "Bukti izin edar (AKL/AKD)"],
    rujukan: ["Permenkes No. 62 Tahun 2017 tentang Izin Edar Alat Kesehatan, Alat Kesehatan Diagnostik In Vitro dan PKRT", "WHO (2011) Procurement process resource guide", "WHO (2005) How to Manage Guide 3 — Procure and commission"],
    kataKunci: ["pengadaan", "beli", "pembelian", "kontrak", "izin edar", "akl", "akd", "e-katalog", "katalog", "p3dn"],
  },
  {
    id: "penerimaan", no: 5, fase: "pre", nama: "Penerimaan, Instalasi & Uji Fungsi", ikon: PackageCheck,
    ringkas: "Memeriksa alat yang datang, memasang, menguji fungsi (commissioning), melatih pengguna, lalu mencatatnya ke inventaris.",
    menu: [{ label: "Admin → Daftar alat", href: "/admin/alat" }, { label: "Dokumen alat (Inventaris)", href: "/pemeliharaan" }],
    periksa: [
      "Cocokkan barang dengan kontrak: merek, tipe, nomor seri, kelengkapan aksesori",
      "BA Penerimaan + BA Uji Fungsi + BA Uji Coba ditandatangani",
      "Uji keselamatan listrik & kalibrasi awal (sertifikat) sebelum dipakai ke pasien",
      "Pelatihan operator & teknisi; simpan daftar hadir",
      "Daftarkan ke inventaris STARS (kode inventaris, QR, foto, dokumen penerimaan) dan buat jadwal preventif",
    ],
    keluaran: ["BA Penerimaan, BA Uji Fungsi, BA Uji Coba", "Data inventaris + QR", "Jadwal preventif"],
    rujukan: ["WHO (2011) Introduction to medical equipment inventory management", "WHO (2005) How to Manage Guide 3 — Procure and commission"],
    kataKunci: ["terima", "penerimaan", "instalasi", "pasang", "uji fungsi", "commissioning", "inventaris", "qr"],
  },
  {
    id: "operasional", no: 6, fase: "post", nama: "Operasional & Pelatihan", ikon: Stethoscope,
    ringkas: "Alat dipakai sesuai SOP oleh operator terlatih; kebersihan, penyimpanan, dan bahan habis pakai terjaga.",
    menu: [{ label: "Inventaris & dokumen SOP", href: "/pemeliharaan" }, { label: "Live Monitoring", href: "/monitoring" }],
    periksa: [
      "SOP pemakaian & pembersihan tersedia di dekat alat",
      "Operator baru dilatih; pelatihan ulang bila ada insiden pemakaian",
      "Pemeriksaan harian oleh pengguna (fungsi, alarm, kabel, aksesori)",
      "Kondisi lingkungan sesuai (suhu/kelembapan; untuk kulkas vaksin/darah pantau lewat Live Monitoring)",
    ],
    keluaran: ["SOP", "Catatan pelatihan", "Ceklis harian pengguna"],
    rujukan: ["WHO (2005) How to Manage Guide 4 — Operate healthcare technology effectively and safely"],
    kataKunci: ["operasional", "pakai", "pemakaian", "sop", "pelatihan", "operator", "lingkungan", "suhu"],
  },
  {
    id: "pemeliharaan", no: 7, fase: "post", nama: "Pemeliharaan Preventif & Korektif", ikon: Wrench,
    ringkas: "Pemeliharaan terjadwal mencegah kerusakan; perbaikan korektif dicatat lengkap (tindakan, suku cadang, biaya, waktu henti).",
    menu: [{ label: "Pemeliharaan", href: "/pemeliharaan" }, { label: "Lapor Kerusakan", href: "/lapor" }, { label: "Admin → Jadwal preventif", href: "/admin/jadwal" }],
    periksa: [
      "Setiap alat medik punya jadwal preventif sesuai risiko & rekomendasi pabrikan",
      "Laporan kerusakan ditanggapi dan dibuatkan perintah kerja",
      "Catat biaya & suku cadang tiap perbaikan (dasar keputusan penggantian)",
      "Pantau waktu tanggap & waktu penyelesaian",
    ],
    keluaran: ["Perintah kerja (WO) & lembar kerja", "Riwayat pemeliharaan per alat"],
    rujukan: ["Permenkes No. 15 Tahun 2023 tentang Pemeliharaan Alat Kesehatan di Fasilitas Pelayanan Kesehatan", "WHO (2011) Medical equipment maintenance programme overview", "WHO (2011) Computerized maintenance management systems", "Depkes (2001) Pedoman Operasional & Pemeliharaan Alat Kesehatan"],
    kataKunci: ["pelihara", "pemeliharaan", "preventif", "korektif", "perbaikan", "rusak", "kerusakan", "wo", "perintah kerja", "jadwal"],
  },
  {
    id: "kalibrasi", no: 8, fase: "post", nama: "Pengujian & Kalibrasi", ikon: Gauge,
    ringkas: "Alat diuji/dikalibrasi berkala oleh lembaga berwenang; alat tidak laik tidak boleh dipakai sampai diperbaiki & lulus uji ulang.",
    menu: [{ label: "Pengujian dan Kalibrasi", href: "/kalibrasi" }],
    periksa: [
      "Alat wajib uji/kalibrasi punya sertifikat yang masih berlaku (umumnya 1 tahun)",
      "Jadwalkan ulang ≥ 30 hari sebelum masa berlaku habis",
      "Alat tidak laik: beri label, tarik dari pelayanan, buat perintah kerja",
      "Simpan sertifikat digital di STARS",
    ],
    keluaran: ["Sertifikat pengujian/kalibrasi", "Label laik pakai"],
    rujukan: ["Permenkes No. 54 Tahun 2015 tentang Pengujian dan Kalibrasi Alat Kesehatan", "Depkes (2001) Pedoman Pengujian dan Kalibrasi Alat Kesehatan"],
    kataKunci: ["kalibrasi", "uji", "pengujian", "sertifikat", "laik", "kedaluwarsa", "jatuh tempo", "bpfk", "lpfk"],
  },
  {
    id: "surveilans", no: 9, fase: "post", nama: "Surveilans & Pelaporan Insiden", ikon: ShieldAlert,
    ringkas: "Memantau keselamatan alat selama dipakai: insiden/KTD terkait alat, recall/field safety notice pabrikan, dan alarm lingkungan.",
    menu: [{ label: "Lapor Kerusakan", href: "/lapor" }, { label: "Live Monitoring (alarm)", href: "/monitoring" }],
    periksa: [
      "Insiden/KTD yang melibatkan alat dilaporkan ke tim keselamatan pasien RS dan, bila perlu, ke Kemenkes (pelaporan efek samping alkes)",
      "Alat yang terlibat insiden diamankan (jangan diubah setelan/dibersihkan) untuk investigasi",
      "Pantau pengumuman recall/field safety notice dari distributor/pabrikan untuk merek & tipe yang dimiliki",
      "Tren kerusakan berulang pada merek/tipe yang sama → umpan balik ke HTA berikutnya",
    ],
    keluaran: ["Laporan insiden", "Tindak lanjut recall", "Catatan alarm & tindakan (Live Monitoring)"],
    rujukan: ["WHO — Post-market surveillance and adverse event reporting (folder B.3)", "WHO (2003) Medical device regulations: global overview and guiding principles"],
    kataKunci: ["surveilans", "insiden", "ktd", "kejadian", "adverse", "recall", "keselamatan", "post market", "post-market", "alarm"],
  },
  {
    id: "penghapusan", no: 10, fase: "post", nama: "Evaluasi & Penghapusan", ikon: Recycle,
    ringkas: "Alat yang tidak lagi layak secara teknis/ekonomis diusulkan dihapus dari barang milik daerah, lalu kebutuhannya masuk kembali ke Analisa Kebutuhan.",
    menu: [{ label: "Kandidat penghapusan (ALLIES)", href: "/allies#rekomendasi" }, { label: "Perencanaan-Pengadaan", href: "/nilai" }],
    periksa: [
      "Telaah teknis: umur ≥ umur teknis, rusak berat/tidak ekonomis diperbaiki, tidak laik kalibrasi, suku cadang tidak tersedia",
      "Telaah ekonomis: biaya perbaikan kumulatif dibanding harga alat baru",
      "Berita acara pemeriksaan & usulan penghapusan ke pengelola barang (sesuai aturan BMD)",
      "Penanganan limbah/alat sesuai ketentuan (data pasien di alat dihapus, bahan berbahaya)",
      "Usulkan alat pengganti → kembali ke tahap 1 (Analisa Kebutuhan)",
    ],
    keluaran: ["Telaah teknis/ekonomis", "BA usulan penghapusan", "Usulan penggantian"],
    rujukan: ["Permendagri No. 19 Tahun 2016 tentang Pedoman Pengelolaan Barang Milik Daerah (bagian penghapusan) beserta perubahannya", "WHO (2011) Medical equipment maintenance programme overview (decommissioning)"],
    kataKunci: ["hapus", "penghapusan", "afkir", "ganti", "penggantian", "replace", "decommission", "umur", "tua", "bmd"],
  },
];

export const TAHAP = Object.fromEntries(SIKLUS.map((t) => [t.id, t])) as Record<IdTahap, Tahap>;

/** Ambang rekomendasi penghapusan (skor 0–100 dari src/lib/allies.ts). */
export const KEPUTUSAN = [
  { min: 70, kunci: "hapus", label: "Usulkan penghapusan & penggantian", warna: "#d03b3b" },
  { min: 45, kunci: "ganti", label: "Rencanakan penggantian", warna: "#ec835a" },
  { min: 25, kunci: "pantau", label: "Pantau ketat", warna: "#fab219" },
  { min: 0, kunci: "pertahankan", label: "Pertahankan", warna: "#0ca30c" },
] as const;
export type KunciKeputusan = (typeof KEPUTUSAN)[number]["kunci"];
export const keputusan = (skor: number) => KEPUTUSAN.find((k) => skor >= k.min) ?? KEPUTUSAN[KEPUTUSAN.length - 1];

/** Umur teknis bawaan bila data alat kosong (tahun). Asumsi umum alat elektromedik; ditandai "asumsi" di tampilan. */
export const UMUR_TEKNIS_BAWAAN = 8;
