"use server";
import { bolehAksi } from "@/lib/role";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { cariIkatemi, tebakIkatemi } from "@/lib/klasifikasi-ikatemi";
import { sesiApi } from "@/lib/sesi";
import { audit, ipDari } from "@/lib/audit";
import { skemaAlat, skemaRuangan } from "@/lib/pemeliharaan";

export type StatusAksi = { ok?: string; error?: string } | undefined;

const ip = async () => ipDari(await headers());
const pesanZod = (e: z.ZodError) => e.issues.map((i) => i.message).join("; ");

async function penjaga() {
  const { sesi, tolak } = await sesiApi("Operator");
  if (tolak) return { sesi: null, pesan: "Memerlukan peran Operator atau lebih tinggi." };
  if (process.env.STARS_MODE === "internet") return { sesi: null, pesan: "Server mode internet bersifat baca saja." };
  return { sesi, pesan: null };
}

function bacaForm(fd: FormData) {
  return skemaAlat.safeParse({
    kode: fd.get("kode"), nama: fd.get("nama"), merek: fd.get("merek") || undefined, model: fd.get("model") || undefined,
    nomorSeri: fd.get("nomorSeri") || undefined, unitKerjaId: fd.get("unitKerjaId"), ruanganId: fd.get("ruanganId") || null,
    lokasi: fd.get("lokasi") || undefined, kategori: fd.get("kategori") || undefined, jenis: fd.get("jenis") || "Medik",
    risiko: fd.get("risiko") || null, tahunPerolehan: fd.get("tahunPerolehan") || null, hargaPerolehan: fd.get("hargaPerolehan") || null,
    usiaTeknis: fd.get("usiaTeknis") || null, garansiSampai: fd.get("garansiSampai") || null, kondisi: fd.get("kondisi") || "Baik",
    catatan: fd.get("catatan") || undefined, kodeAspak: fd.get("kodeAspak") || undefined, pendanaan: fd.get("pendanaan") || undefined,
    akl: fd.get("akl") || undefined, produsen: fd.get("produsen") || undefined, distributor: fd.get("distributor") || undefined,
    tanggalUjiFungsi: fd.get("tanggalUjiFungsi") || null,
    statusOperasi: fd.get("statusOperasi") || "Beroperasi", alasanTidakOperasi: fd.get("statusOperasi") === "Tidak beroperasi" ? fd.get("alasanTidakOperasi") || null : null,
    dayaListrik: fd.get("dayaListrik") || null, versiPerangkatLunak: fd.get("versiPerangkatLunak") || undefined, emdnKode: fd.get("emdnKode") || undefined, gmdnKode: fd.get("gmdnKode") || undefined, udi: fd.get("udi") || undefined, dayaWatt: fd.get("dayaWatt") || null, kategoriLimbah: fd.get("kategoriLimbah") || null, negaraAsal: fd.get("negaraAsal") || undefined,
    tahunProduksi: fd.get("tahunProduksi") || null, penanggungJawab: fd.get("penanggungJawab") || undefined, kontakPenanggungJawab: fd.get("kontakPenanggungJawab") || undefined,
    tanggalInstalasi: fd.get("tanggalInstalasi") || null, hasilUjiTerima: fd.get("hasilUjiTerima") || undefined, penyediaServis: fd.get("penyediaServis") || undefined,
    kontrakServis: fd.get("kontrakServis") || undefined, kontrakServisSampai: fd.get("kontrakServisSampai") || null, persyaratanOperasi: fd.get("persyaratanOperasi") || undefined,
    aksesori: fd.get("aksesori") || undefined, penggunaAlat: fd.getAll("penggunaAlat").map(String).filter(Boolean).join(", ") || undefined,
    riwayatRecall: fd.get("riwayatRecall") || undefined, pembuanganKhusus: fd.get("pembuanganKhusus") === "on",
    tanggalInventarisasi: fd.get("tanggalInventarisasi") || null,
    emFungsi: fd.get("emFungsi") || null, emRisiko: fd.get("emRisiko") || null, emPemeliharaan: fd.get("emPemeliharaan") || null,
    emrMisiKritis: fd.get("emrMisiKritis") || null, emrUtilisasi: fd.get("emrUtilisasi") || null,
    ikatemiNama: fd.get("ikatemiNama") || undefined,
  });
}

type DataAlat = ReturnType<typeof bacaForm> extends { success: true; data: infer D } | { success: false } ? D : never;
/** Klasifikasi IKATEMI dari nama baku; risiko STARS (Tinggi/Sedang/Rendah) ikut disetel bila dipilih. */
function dataIkatemi(nama: string | undefined, risikoLama: string | null) {
  const k = cariIkatemi(nama);
  return {
    ikatemiNama: k?.nama ?? null, ikatemiFungsi: k?.fungsi ?? null, ikatemiTeknologi: k?.teknologi ?? null, ikatemiRisiko: k?.risiko ?? null,
    risiko: k ? (k.risiko === "Menengah" ? "Sedang" : k.risiko) : risikoLama,
  };
}

/** Klasifikasikan otomatis (IKATEMI No. 1/2023) semua alat aktif yang belum berklasifikasi, berdasarkan nama alat. */
export async function klasifikasiOtomatis(): Promise<StatusAksi> {
  const { sesi, pesan } = await penjaga();
  if (!sesi) return { error: pesan ?? "Tidak diizinkan." };
  const alat = await prisma.alat.findMany({ where: { aktif: true, ikatemiNama: null }, select: { id: true, nama: true, risiko: true } });
  let n = 0;
  for (const a of alat) {
    const k = tebakIkatemi(a.nama);
    if (!k) continue;
    await prisma.alat.update({ where: { id: a.id }, data: dataIkatemi(k.nama, a.risiko) });
    n++;
  }
  await audit("alat.ikatemi.otomatis", { email: sesi.user.email, ip: ipDari(await headers()), detail: `${n} dari ${alat.length} alat diklasifikasikan` });
  revalidatePath("/admin/alat");
  return { ok: `${n} dari ${alat.length} alat belum berklasifikasi berhasil dicocokkan dengan klasifikasi IKATEMI. Sisanya pilih manual di form alat.` };
}

function rapikan(d: DataAlat) {
  return {
    ...d, merek: d.merek || null, model: d.model || null, nomorSeri: d.nomorSeri || null, ruanganId: d.ruanganId ?? null,
    lokasi: d.lokasi || null, kategori: d.kategori || null, tahunPerolehan: d.tahunPerolehan ?? null,
    hargaPerolehan: d.hargaPerolehan ?? null, usiaTeknis: d.usiaTeknis ?? null, garansiSampai: d.garansiSampai ?? null, catatan: d.catatan || null,
    kodeAspak: d.kodeAspak || null, pendanaan: d.pendanaan || null, akl: d.akl || null, produsen: d.produsen || null, distributor: d.distributor || null,
    tanggalUjiFungsi: d.tanggalUjiFungsi ?? null,
    alasanTidakOperasi: d.alasanTidakOperasi ?? null, dayaListrik: d.dayaListrik ?? null, versiPerangkatLunak: d.versiPerangkatLunak || null, emdnKode: d.emdnKode || null, gmdnKode: d.gmdnKode || null, udi: d.udi || null, dayaWatt: d.dayaWatt ?? null, kategoriLimbah: d.kategoriLimbah ?? null,
    negaraAsal: d.negaraAsal || null, tahunProduksi: d.tahunProduksi ?? null, penanggungJawab: d.penanggungJawab || null, kontakPenanggungJawab: d.kontakPenanggungJawab || null,
    tanggalInstalasi: d.tanggalInstalasi ?? null, hasilUjiTerima: d.hasilUjiTerima || null, penyediaServis: d.penyediaServis || null, kontrakServis: d.kontrakServis || null,
    kontrakServisSampai: d.kontrakServisSampai ?? null, persyaratanOperasi: d.persyaratanOperasi || null, aksesori: d.aksesori || null, penggunaAlat: d.penggunaAlat || null,
    riwayatRecall: d.riwayatRecall || null, tanggalInventarisasi: d.tanggalInventarisasi ?? null,
    emFungsi: d.emFungsi ?? null, emRisiko: d.emRisiko ?? null, emPemeliharaan: d.emPemeliharaan ?? null,
    emrMisiKritis: d.emrMisiKritis ?? null, emrUtilisasi: d.emrUtilisasi ?? null,
    ...dataIkatemi(d.ikatemiNama, d.risiko ?? null),
    emDinilaiPada: d.emFungsi != null && d.emRisiko != null && d.emPemeliharaan != null ? new Date() : null,
  };
}

async function cekRelasi(d: DataAlat): Promise<string | null> {
  if (!(await prisma.unitKerja.findUnique({ where: { id: d.unitKerjaId } }))) return "Unit kerja tidak dikenal.";
  if (d.ruanganId) {
    const r = await prisma.ruangan.findUnique({ where: { id: d.ruanganId } });
    if (!r) return "Ruangan tidak dikenal.";
    if (r.unitKerjaId !== d.unitKerjaId) return "Ruangan itu bukan milik unit kerja yang dipilih.";
  }
  return null;
}

export async function buatRuangan(_prev: StatusAksi, fd: FormData): Promise<StatusAksi> {
  const g = await penjaga();
  if (!g.sesi) return { error: g.pesan! };
  const parsed = skemaRuangan.safeParse({ nama: fd.get("nama"), gedung: fd.get("gedung") || undefined, unitKerjaId: fd.get("unitKerjaId"), kepala: fd.get("kepala") || undefined });
  if (!parsed.success) return { error: pesanZod(parsed.error) };
  const d = parsed.data;
  if (!(await prisma.unitKerja.findUnique({ where: { id: d.unitKerjaId } }))) return { error: "Unit kerja tidak dikenal." };
  if (await prisma.ruangan.findUnique({ where: { nama_unitKerjaId: { nama: d.nama, unitKerjaId: d.unitKerjaId } } })) return { error: `Ruangan ${d.nama} sudah ada di unit itu.` };
  await prisma.ruangan.create({ data: { nama: d.nama, gedung: d.gedung || null, unitKerjaId: d.unitKerjaId, kepala: d.kepala || null } });
  await audit("ruangan.buat", { email: g.sesi.user.email, ip: await ip(), objek: d.nama });
  revalidatePath("/admin/alat");
  return { ok: `Ruangan ${d.nama} ditambahkan.` };
}

export async function buatAlat(_prev: StatusAksi, fd: FormData): Promise<StatusAksi> {
  const g = await penjaga();
  if (!g.sesi) return { error: g.pesan! };
  if (!(await bolehAksi(g.sesi.user.id, "buat"))) return { error: "Peran Anda tidak diizinkan menambah data (atur di Admin → User System)." };
  const parsed = bacaForm(fd);
  if (!parsed.success) return { error: pesanZod(parsed.error) };
  const d = parsed.data;
  if (await prisma.alat.findUnique({ where: { kode: d.kode } })) return { error: `Kode inventaris ${d.kode} sudah terdaftar.` };
  const salah = await cekRelasi(d);
  if (salah) return { error: salah };
  await prisma.alat.create({ data: rapikan(d) });
  await audit("alat.buat", { email: g.sesi.user.email, ip: await ip(), objek: d.kode, detail: d.nama });
  revalidatePath("/admin/alat");
  return { ok: `Alat ${d.kode} ditambahkan.` };
}

export async function ubahAlat(_prev: StatusAksi, fd: FormData): Promise<StatusAksi> {
  const g = await penjaga();
  if (!g.sesi) return { error: g.pesan! };
  if (!(await bolehAksi(g.sesi.user.id, "ubah"))) return { error: "Peran Anda tidak diizinkan mengubah data (atur di Admin → User System)." };
  const id = z.coerce.number().int().positive().safeParse(fd.get("id"));
  if (!id.success) return { error: "ID alat tidak valid." };
  const parsed = bacaForm(fd);
  if (!parsed.success) return { error: pesanZod(parsed.error) };
  const d = parsed.data;
  const alat = await prisma.alat.findUnique({ where: { id: id.data } });
  if (!alat) return { error: "Alat tidak ditemukan." };
  const bentrok = await prisma.alat.findUnique({ where: { kode: d.kode } });
  if (bentrok && bentrok.id !== id.data) return { error: `Kode inventaris ${d.kode} dipakai alat lain.` };
  const salah = await cekRelasi(d);
  if (salah) return { error: salah };
  await prisma.alat.update({ where: { id: id.data }, data: rapikan(d) });
  await audit("alat.ubah", { email: g.sesi.user.email, ip: await ip(), objek: d.kode, detail: `kondisi ${d.kondisi}` });
  revalidatePath("/admin/alat");
  return { ok: `Alat ${d.kode} diperbarui.` };
}
