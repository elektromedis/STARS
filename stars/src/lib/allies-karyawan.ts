/** Karyawan AI ALLIES: petugas virtual per bidang. Hanya membaca data dan memberi saran; tidak pernah mengubah data. */
export type IdKaryawan = "umum" | "inventaris" | "pemeliharaan" | "kalibrasi" | "perencanaan";

export const KARYAWAN: { id: IdKaryawan; nama: string; bidang: string; fokus: string; saran: string[] }[] = [
  { id: "umum", nama: "ALLIES", bidang: "Koordinator", fokus: "Jawab pertanyaan lintas bidang pengelolaan alat kesehatan dan mulai dari gambaran menyeluruh.", saran: ["Apa prioritas pengelolaan alat minggu ini?", "Ringkas kondisi alat saat ini"] },
  { id: "inventaris", nama: "Petugas Inventaris", bidang: "Data aset", fokus: "Periksa kelengkapan dan kewajaran data aset: tahun, harga, merek, kondisi, dan dokumen penerimaan.", saran: ["Data alat apa yang paling perlu dilengkapi?", "Unit mana yang alat rusaknya terbanyak?"] },
  { id: "pemeliharaan", nama: "Teknisi Pemeliharaan", bidang: "Preventif & korektif", fokus: "Prioritaskan laporan kerusakan, perintah kerja, dan preventif jatuh tempo berdasarkan risiko alat.", saran: ["Perbaikan mana yang harus didahulukan?", "Preventif apa yang sudah jatuh tempo?"] },
  { id: "kalibrasi", nama: "Analis Kalibrasi", bidang: "Uji & kalibrasi", fokus: "Pantau alat yang tidak laik, kedaluwarsa, atau segera habis masa kalibrasinya, lalu susun urutan tindak lanjut.", saran: ["Kalibrasi apa yang paling mendesak?", "Susun rencana kalibrasi 30 hari"] },
  { id: "perencanaan", nama: "Perencana Alkes", bidang: "RKBU & penggantian", fokus: "Telaah kandidat penggantian atau penghapusan dari skor, umur, dan biaya perbaikan sebagai bahan perencanaan.", saran: ["Alat mana yang masuk usulan penggantian?", "Apa dasar prioritas penggantian tahun depan?"] },
];
