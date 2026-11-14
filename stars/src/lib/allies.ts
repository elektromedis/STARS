/**
 * ALLIES — mesin analisis siklus hidup alat (server). Tanpa AI eksternal: semua kesimpulan dihitung dari data STARS
 * dengan aturan yang bisa dijelaskan (setiap skor disertai alasannya). Data pelapor/pribadi tidak pernah dibaca.
 */
import { prisma } from "./prisma";
import { statusKalibrasi, type StatusKalibrasi } from "./kalibrasi";
import { keputusan, SIKLUS, TAHAP, UMUR_TEKNIS_BAWAAN, type IdTahap, type KunciKeputusan } from "./allies-siklus";

const HARI = 86_400_000;
const PENERIMAAN = ["BA_PENERIMAAN", "BA_UJI_FUNGSI", "BA_UJI_COBA"];

export type AnalisaAlat = {
  id: number; kode: string; nama: string; merek: string | null; model: string | null; unit: string; jenis: string;
  kondisi: string; aktif: boolean; risiko: string | null;
  tahun: number | null; umur: number | null; umurTeknis: number; umurAsumsi: boolean;
  harga: number | null; biaya: number; kerusakan12: number; woTerbuka: number; laporanTerbuka: number;
  kal: StatusKalibrasi; kalBerlaku: string | null; penerimaanLengkap: boolean; preventifTempo: boolean; punyaJadwal: boolean;
  tahap: IdTahap; skor: number; keputusan: KunciKeputusan; alasan: string[]; saran: string[];
};

/** Analisis seluruh alat (opsional dibatasi unit). Ringan: satu kueri per tabel, digabung di memori. */
export async function analisaSemua(unitId?: number | null): Promise<AnalisaAlat[]> {
  const kini = Date.now();
  const whereAlat = unitId ? { unitKerjaId: unitId } : {};
  const setahun = new Date(kini - 365 * HARI);
  const [alat, biaya, wo12, woBuka, wrBuka, kal, dok, jadwal] = await Promise.all([
    prisma.alat.findMany({
      where: whereAlat,
      select: { id: true, kode: true, nama: true, merek: true, model: true, jenis: true, kondisi: true, aktif: true, risiko: true, tahunPerolehan: true, tahunPembelian: true, hargaPerolehan: true, usiaTeknis: true, tanggalUjiFungsi: true, createdAt: true, unitKerja: { select: { nama: true } } },
    }),
    prisma.perintahKerja.groupBy({ by: ["alatId"], where: { alatId: { not: null }, status: { not: "Batal" }, alat: whereAlat }, _sum: { biaya: true } }),
    prisma.perintahKerja.groupBy({ by: ["alatId"], where: { alatId: { not: null }, jenis: "Korektif", status: { not: "Batal" }, createdAt: { gte: setahun }, alat: whereAlat }, _count: { _all: true } }),
    prisma.perintahKerja.groupBy({ by: ["alatId"], where: { alatId: { not: null }, status: { in: ["Terbuka", "Dikerjakan"] }, alat: whereAlat }, _count: { _all: true } }),
    prisma.permintaanKerja.groupBy({ by: ["alatId"], where: { alatId: { not: null }, status: { in: ["Baru", "Ditinjau", "Diproses"] }, alat: whereAlat }, _count: { _all: true } }),
    prisma.kalibrasi.findMany({ where: { alat: whereAlat }, orderBy: [{ tanggal: "desc" }, { id: "desc" }], select: { alatId: true, laik: true, berlakuSampai: true } }),
    prisma.dokumenAlat.groupBy({ by: ["alatId"], where: { jenis: { in: PENERIMAAN }, alat: whereAlat }, _count: { _all: true } }),
    prisma.jadwalPreventif.findMany({ where: { aktif: true, alat: whereAlat }, select: { alatId: true, berikutnya: true } }),
  ]);
  const peta = <T extends { alatId: number | null }>(rows: T[], f: (r: T) => number) => new Map(rows.map((r) => [r.alatId!, f(r)]));
  const mBiaya = peta(biaya, (r) => r._sum.biaya ?? 0);
  const mWo12 = peta(wo12, (r) => r._count._all);
  const mWoBuka = peta(woBuka, (r) => r._count._all);
  const mWrBuka = peta(wrBuka, (r) => r._count._all);
  const mDok = new Map(dok.map((r) => [r.alatId, r._count._all]));
  const mKal = new Map<number, (typeof kal)[number]>();
  for (const k of kal) if (!mKal.has(k.alatId)) mKal.set(k.alatId, k);
  const mJadwal = new Map<number, { tempo: boolean }>();
  for (const j of jadwal) {
    const tempo = Boolean(j.berikutnya && j.berikutnya.getTime() <= kini);
    mJadwal.set(j.alatId, { tempo: (mJadwal.get(j.alatId)?.tempo ?? false) || tempo });
  }
  const tahunIni = new Date().getFullYear();

  return alat.map((a) => {
    const tahun = a.tahunPerolehan ?? a.tahunPembelian ?? null;
    const umur = tahun ? Math.max(0, tahunIni - tahun) : null;
    const umurAsumsi = !a.usiaTeknis;
    const umurTeknis = a.usiaTeknis && a.usiaTeknis > 0 ? a.usiaTeknis : UMUR_TEKNIS_BAWAAN;
    const harga = a.hargaPerolehan && a.hargaPerolehan > 0 ? a.hargaPerolehan : null;
    const b = mBiaya.get(a.id) ?? 0;
    const kerusakan12 = (mWo12.get(a.id) ?? 0);
    const woTerbuka = mWoBuka.get(a.id) ?? 0;
    const laporanTerbuka = mWrBuka.get(a.id) ?? 0;
    const k = mKal.get(a.id) ?? null;
    const kalSt = statusKalibrasi(k, kini);
    const penerimaanLengkap = Boolean(a.tanggalUjiFungsi) || (mDok.get(a.id) ?? 0) > 0;
    const j = mJadwal.get(a.id);

    // ---- skor kelayakan penghapusan (0–100), setiap poin dengan alasannya
    let skor = 0;
    const alasan: string[] = [];
    if (umur != null) {
      const r = umur / umurTeknis;
      const teks = `umur ${umur} th dari umur teknis ${umurTeknis} th${umurAsumsi ? " (asumsi)" : ""}`;
      if (r >= 1.25) { skor += 35; alasan.push(`Melewati umur teknis jauh: ${teks}`); }
      else if (r >= 1) { skor += 28; alasan.push(`Sudah mencapai umur teknis: ${teks}`); }
      else if (r >= 0.8) { skor += 15; alasan.push(`Mendekati umur teknis: ${teks}`); }
    }
    if (a.kondisi === "Afkir") { skor += 40; alasan.push("Kondisi Afkir"); }
    else if (a.kondisi === "Rusak Berat") { skor += 30; alasan.push("Kondisi Rusak Berat"); }
    else if (a.kondisi === "Rusak Ringan") { skor += 10; alasan.push("Kondisi Rusak Ringan"); }
    if (harga && b > 0) {
      const r = b / harga;
      const p = `${Math.round(r * 100)}% harga perolehan`;
      if (r >= 0.5) { skor += 25; alasan.push(`Biaya perbaikan kumulatif ${p} — tidak ekonomis`); }
      else if (r >= 0.3) { skor += 12; alasan.push(`Biaya perbaikan kumulatif ${p}`); }
    }
    if (kerusakan12 >= 4) { skor += 20; alasan.push(`${kerusakan12} perbaikan korektif dalam 12 bulan`); }
    else if (kerusakan12 >= 2) { skor += 10; alasan.push(`${kerusakan12} perbaikan korektif dalam 12 bulan`); }
    if (k && !k.laik) { skor += 15; alasan.push("Hasil uji/kalibrasi terakhir TIDAK LAIK"); }
    else if (kalSt.kunci === "bermasalah") { skor += 5; alasan.push("Sertifikat kalibrasi kedaluwarsa"); }
    skor = Math.min(100, skor);
    const kep = keputusan(skor).kunci;

    // ---- posisi alat dalam siklus
    let tahap: IdTahap;
    if (!a.aktif || a.kondisi === "Afkir" || skor >= 70) tahap = "penghapusan";
    else if (!penerimaanLengkap && kini - a.createdAt.getTime() < 90 * HARI) tahap = "penerimaan";
    else if (woTerbuka > 0 || laporanTerbuka > 0 || a.kondisi.startsWith("Rusak")) tahap = "pemeliharaan";
    else if (a.jenis === "Medik" && (kalSt.kunci === "bermasalah" || kalSt.kunci === "segera" || kalSt.kunci === "belum")) tahap = "kalibrasi";
    else tahap = "operasional";

    // ---- saran tindakan berikutnya
    const saran: string[] = [];
    if (kep === "hapus") saran.push("Buat telaah teknis & ekonomis, ajukan BA usulan penghapusan, lalu masukkan alat pengganti ke Analisa Kebutuhan/RKBU berikutnya");
    else if (kep === "ganti") saran.push("Masukkan penggantian ke perencanaan 1–2 tahun ke depan; bandingkan kandidat pengganti di HTA");
    if (k && !k.laik) saran.push("Tarik dari pelayanan & beri label TIDAK LAIK sampai diperbaiki dan lulus uji ulang");
    else if (kalSt.kunci === "bermasalah") saran.push("Jadwalkan pengujian/kalibrasi ulang segera");
    else if (kalSt.kunci === "segera") saran.push(`Jadwalkan kalibrasi sebelum masa berlaku habis (${kalSt.label})`);
    else if (kalSt.kunci === "belum" && a.jenis === "Medik") saran.push("Belum ada catatan pengujian/kalibrasi — periksa apakah alat ini wajib uji, lalu jadwalkan");
    if (laporanTerbuka > 0 && woTerbuka === 0) saran.push("Ada laporan kerusakan yang belum dibuatkan perintah kerja");
    if (j?.tempo) saran.push("Pemeliharaan preventif sudah jatuh tempo");
    if (!j && a.aktif && a.jenis === "Medik" && a.kondisi !== "Afkir") saran.push("Belum punya jadwal preventif — buat di Admin → Jadwal");
    if (!penerimaanLengkap) saran.push("Lengkapi BA Penerimaan / BA Uji Fungsi di dokumen alat");
    if (umur == null) saran.push("Isi tahun perolehan agar umur alat bisa dinilai");
    if (!harga) saran.push("Isi harga perolehan agar kelayakan ekonomis perbaikan bisa dihitung");

    return {
      id: a.id, kode: a.kode, nama: a.nama, merek: a.merek, model: a.model, unit: a.unitKerja.nama, jenis: a.jenis,
      kondisi: a.kondisi, aktif: a.aktif, risiko: a.risiko, tahun, umur, umurTeknis, umurAsumsi, harga, biaya: b,
      kerusakan12, woTerbuka, laporanTerbuka, kal: kalSt, kalBerlaku: k?.berlakuSampai?.toISOString() ?? null,
      penerimaanLengkap, preventifTempo: Boolean(j?.tempo), punyaJadwal: Boolean(j),
      tahap, skor, keputusan: kep, alasan, saran,
    };
  });
}

export type RingkasanAllies = Awaited<ReturnType<typeof ringkasanAllies>>;

/** Ringkasan untuk halaman ALLIES & Dashboard. */
export async function ringkasanAllies(unitId?: number | null) {
  const semua = await analisaSemua(unitId);
  const perTahap = Object.fromEntries(SIKLUS.map((t) => [t.id, 0])) as Record<IdTahap, number>;
  for (const a of semua) perTahap[a.tahap]++;
  const perKeputusan: Record<KunciKeputusan, number> = { hapus: 0, ganti: 0, pantau: 0, pertahankan: 0 };
  for (const a of semua) if (a.aktif) perKeputusan[a.keputusan]++;
  const kandidat = semua.filter((a) => a.aktif && (a.keputusan === "hapus" || a.keputusan === "ganti")).sort((x, y) => y.skor - x.skor);
  const pantau = semua.filter((a) => a.aktif && a.keputusan === "pantau").sort((x, y) => y.skor - x.skor);
  // urutan: tidak laik → kedaluwarsa (paling lama dulu) → segera habis (paling dekat dulu)
  const bobotKal = (a: AnalisaAlat) => (a.kal.label === "Tidak laik" ? 0 : a.kal.kunci === "bermasalah" ? 1 : 2);
  const kalibrasi = semua.filter((a) => a.aktif && a.jenis === "Medik" && (a.kal.kunci === "bermasalah" || a.kal.kunci === "segera"))
    .sort((x, y) => bobotKal(x) - bobotKal(y) || (Date.parse(x.kalBerlaku ?? "") || 0) - (Date.parse(y.kalBerlaku ?? "") || 0));
  const dataKurang = semua.filter((a) => a.aktif && (a.tahun == null || a.harga == null)).length;
  return { total: semua.length, aktif: semua.filter((a) => a.aktif).length, perTahap, perKeputusan, kandidat, pantau, kalibrasi, dataKurang, semua };
}

// ------------------------------------------------------------------ Tanya ALLIES (pencocokan maksud)

export type BlokJawaban =
  | { jenis: "teks"; isi: string }
  | { jenis: "daftar"; judul?: string; butir: { teks: string; sub?: string; href?: string; nada?: "bahaya" | "awas" | "baik" }[] }
  | { jenis: "langkah"; judul: string; butir: string[] }
  | { jenis: "tautan"; butir: { label: string; href: string }[] };

export type Jawaban = { blok: BlokJawaban[]; saran: string[] };

const SARAN_AWAL = ["Alat mana yang sebaiknya dihapus/diganti?", "Kalibrasi apa yang jatuh tempo?", "Apa saja tahap siklus alat?", "Laporan kerusakan yang belum selesai", "Syarat pengadaan alat baru", "Cara melapor insiden alat"];

const normal = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
const ada = (t: string, kata: string[]) => kata.some((k) => t.includes(k));
const labelAlat = (a: AnalisaAlat) => `${a.nama}${a.merek || a.model ? ` — ${[a.merek, a.model].filter(Boolean).join(" ")}` : ""}`;

function blokTahap(id: IdTahap, jml?: number): BlokJawaban[] {
  const t = TAHAP[id];
  return [
    { jenis: "teks", isi: `**Tahap ${t.no} · ${t.nama}** (${t.fase === "pre" ? "Pre-Market" : "Post-Market"}) — ${t.ringkas}${jml != null ? ` Saat ini ${jml} alat berada di tahap ini.` : ""}` },
    { jenis: "langkah", judul: "Daftar periksa", butir: t.periksa },
    { jenis: "daftar", judul: "Rujukan", butir: t.rujukan.map((r) => ({ teks: r })) },
    { jenis: "tautan", butir: t.menu },
  ];
}

/** Menjawab pertanyaan bebas dengan aturan; tiap jawaban berdasar data STARS terkini. */
export async function jawabAllies(pesan: string, unitId?: number | null): Promise<Jawaban> {
  const t = normal(pesan).slice(0, 300);
  if (!t) return { blok: [{ jenis: "teks", isi: "Silakan ketik pertanyaan, misalnya nama/kode alat atau \"kalibrasi jatuh tempo\"." }], saran: SARAN_AWAL };
  const r = await ringkasanAllies(unitId);

  // 1) kode inventaris atau nama alat disebut → kartu siklus alat
  const kataAlat = t.split(" ").filter((w) => w.length >= 3);
  const cocokKode = r.semua.find((a) => t.includes(normal(a.kode)) && normal(a.kode).length >= 3);
  if (cocokKode || ada(t, ["alat ", "cek ", "status "])) {
    const kandidat = cocokKode ? [cocokKode] : r.semua.filter((a) => kataAlat.some((w) => !["alat", "cek", "status", "yang", "dan"].includes(w) && normal(`${a.nama} ${a.merek ?? ""} ${a.model ?? ""}`).includes(w))).slice(0, 6);
    if (kandidat.length === 1) {
      const a = kandidat[0];
      return {
        blok: [
          { jenis: "teks", isi: `**${labelAlat(a)}** (${a.kode}, ${a.unit}) berada di tahap **${TAHAP[a.tahap].no}. ${TAHAP[a.tahap].nama}**. Skor kelayakan penghapusan **${a.skor}/100** → ${keputusan(a.skor).label}.` },
          ...(a.alasan.length ? [{ jenis: "daftar" as const, judul: "Dasar penilaian", butir: a.alasan.map((x) => ({ teks: x })) }] : []),
          ...(a.saran.length ? [{ jenis: "langkah" as const, judul: "Saran tindakan", butir: a.saran }] : []),
          { jenis: "tautan", butir: [{ label: "Buka kartu siklus alat", href: `/allies?alat=${encodeURIComponent(a.kode)}#alat` }, { label: "Detail alat", href: `/alat?kode=${encodeURIComponent(a.kode)}` }] },
        ],
        saran: ["Alat mana yang sebaiknya dihapus/diganti?", "Kalibrasi apa yang jatuh tempo?"],
      };
    }
    if (kandidat.length > 1) {
      return {
        blok: [{ jenis: "daftar", judul: `Ada ${kandidat.length} alat yang cocok — pilih salah satu:`, butir: kandidat.map((a) => ({ teks: labelAlat(a), sub: `${a.kode} · ${a.unit} · tahap ${TAHAP[a.tahap].nama}`, href: `/allies?alat=${encodeURIComponent(a.kode)}#alat` })) }],
        saran: kandidat.slice(0, 3).map((a) => `Cek alat ${a.kode}`),
      };
    }
  }

  // 2) penghapusan / penggantian
  if (ada(t, ["hapus", "afkir", "ganti", "penggantian", "replace", "tua", "umur", "tidak ekonomis"])) {
    const daftar = r.kandidat.slice(0, 10);
    return {
      blok: [
        { jenis: "teks", isi: daftar.length ? `Ada **${r.kandidat.length} alat** yang layak dipertimbangkan untuk penggantian/penghapusan (${r.perKeputusan.hapus} usul hapus, ${r.perKeputusan.ganti} rencana ganti). Skor dihitung dari umur vs umur teknis, kondisi, biaya perbaikan kumulatif, frekuensi rusak 12 bulan, dan hasil kalibrasi.` : "Belum ada alat yang memenuhi kriteria penggantian/penghapusan menurut data STARS saat ini." },
        ...(daftar.length ? [{ jenis: "daftar" as const, judul: "Prioritas teratas", butir: daftar.map((a) => ({ teks: `${labelAlat(a)} — skor ${a.skor}`, sub: `${a.kode} · ${a.unit} · ${a.alasan.slice(0, 2).join("; ")}`, href: `/allies?alat=${encodeURIComponent(a.kode)}#alat`, nada: a.keputusan === "hapus" ? "bahaya" as const : "awas" as const })) }] : []),
        ...(r.dataKurang ? [{ jenis: "teks" as const, isi: `Catatan: ${r.dataKurang} alat aktif belum punya tahun dan/atau harga perolehan, sehingga penilaiannya belum lengkap.` }] : []),
        ...blokTahap("penghapusan").slice(1, 2),
        { jenis: "tautan", butir: [{ label: "Lihat semua rekomendasi", href: "/allies#rekomendasi" }, { label: "Masukkan ke RKBU", href: "/rkbu" }] },
      ],
      saran: ["Syarat pengadaan alat baru", "Bandingkan merek di HTA", "Apa itu Analisa Kebutuhan?"],
    };
  }

  // 3) kalibrasi
  if (ada(t, ["kalibrasi", "sertifikat", "laik", "uji ", "pengujian", "kedaluwarsa", "jatuh tempo"])) {
    const daftar = r.kalibrasi.slice(0, 12);
    return {
      blok: [
        { jenis: "teks", isi: daftar.length ? `**${r.kalibrasi.length} alat medik** perlu tindakan kalibrasi (kedaluwarsa/tidak laik atau habis ≤ 30 hari).` : "Tidak ada alat medik dengan kalibrasi kedaluwarsa atau habis ≤ 30 hari." },
        ...(daftar.length ? [{ jenis: "daftar" as const, butir: daftar.map((a) => ({ teks: labelAlat(a), sub: `${a.kode} · ${a.unit} · ${a.kal.label}`, href: `/alat?kode=${encodeURIComponent(a.kode)}`, nada: a.kal.kunci === "bermasalah" ? "bahaya" as const : "awas" as const })) }] : []),
        ...blokTahap("kalibrasi").slice(1),
      ],
      saran: ["Alat mana yang sebaiknya dihapus/diganti?", "Laporan kerusakan yang belum selesai"],
    };
  }

  // 4) kerusakan / pemeliharaan
  if (ada(t, ["rusak", "kerusakan", "perbaikan", "laporan", "wo ", "perintah kerja", "preventif", "pelihara", "jadwal"])) {
    const terbuka = r.semua.filter((a) => a.woTerbuka + a.laporanTerbuka > 0 || a.preventifTempo).slice(0, 12);
    return {
      blok: [
        { jenis: "teks", isi: `Saat ini **${r.perTahap.pemeliharaan} alat** di tahap Pemeliharaan (laporan/perintah kerja terbuka atau kondisi rusak); ${r.semua.filter((a) => a.preventifTempo).length} alat preventifnya jatuh tempo.` },
        ...(terbuka.length ? [{ jenis: "daftar" as const, butir: terbuka.map((a) => ({ teks: labelAlat(a), sub: `${a.kode} · ${a.unit} · ${[a.laporanTerbuka ? `${a.laporanTerbuka} laporan` : "", a.woTerbuka ? `${a.woTerbuka} WO` : "", a.preventifTempo ? "preventif jatuh tempo" : ""].filter(Boolean).join(" · ")}`, href: `/alat?kode=${encodeURIComponent(a.kode)}`, nada: "awas" as const })) }] : []),
        ...blokTahap("pemeliharaan").slice(1),
      ],
      saran: ["Kalibrasi apa yang jatuh tempo?", "Alat mana yang sebaiknya dihapus/diganti?"],
    };
  }

  // 5) tahap tertentu disebut
  const tahap = SIKLUS.find((s) => ada(t, s.kataKunci.map(normal)));
  if (tahap) return { blok: blokTahap(tahap.id, r.perTahap[tahap.id]), saran: SARAN_AWAL.slice(0, 3) };

  // 6) siklus umum
  if (ada(t, ["siklus", "tahap", "alur", "lifecycle", "pre market", "premarket", "post", "daur"])) {
    return {
      blok: [
        { jenis: "teks", isi: "Siklus alat kesehatan di RS menurut ALLIES: **Pre-Market** (1–5) menyiapkan alat sebelum dipakai; **Post-Market** (6–10) menjaga alat tetap aman selama dipakai sampai dihapus — lalu kebutuhannya kembali ke tahap 1." },
        { jenis: "daftar", butir: SIKLUS.map((s) => ({ teks: `${s.no}. ${s.nama}`, sub: `${s.fase === "pre" ? "Pre-Market" : "Post-Market"} · ${r.perTahap[s.id]} alat`, href: `/allies#tahap-${s.id}` })) },
      ],
      saran: ["Apa itu Analisa Kebutuhan?", "Syarat pengadaan alat baru", "Cara melapor insiden alat"],
    };
  }

  // 7) ringkasan / sapaan / tidak dikenali
  const sapa = ada(t, ["halo", "hai", "hi ", "selamat", "assalam", "pagi", "siang", "sore", "malam", "bantu", "help", "ringkas"]);
  return {
    blok: [
      { jenis: "teks", isi: `${sapa ? "Halo! " : "Maaf, saya belum memahami pertanyaan itu. "}Saya **ALLIES**, agen pengelolaan alat medik STARS. Saya membaca data inventaris, pemeliharaan, kalibrasi, dan perencanaan untuk membantu siklus alat dari Analisa Kebutuhan sampai Penghapusan.` },
      { jenis: "daftar", judul: "Ringkasan saat ini", butir: [
        { teks: `${r.aktif} alat aktif dianalisis`, sub: `${r.perTahap.pemeliharaan} di pemeliharaan · ${r.perTahap.kalibrasi} perlu kalibrasi · ${r.perTahap.penghapusan} di evaluasi/penghapusan` },
        { teks: `${r.kandidat.length} kandidat penggantian/penghapusan`, href: "/allies#rekomendasi", nada: r.kandidat.length ? "awas" : "baik" },
        { teks: `${r.kalibrasi.length} alat medik perlu tindakan kalibrasi`, nada: r.kalibrasi.length ? "awas" : "baik" },
      ] },
      { jenis: "teks", isi: "Coba tanyakan: nama atau kode alat, \"kalibrasi jatuh tempo\", \"alat yang perlu diganti\", atau nama tahap (mis. \"pengadaan\", \"penghapusan\")." },
    ],
    saran: SARAN_AWAL,
  };
}

export const SARAN_PEMBUKA = SARAN_AWAL;
