import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { sesiHalaman } from "@/lib/sesi";
import { cukup } from "@/lib/peran";
import { STATUS_MUTASI } from "@/lib/mutasi";
import { MutasiPanel } from "@/components/admin/mutasi-panel";

export const metadata: Metadata = { title: "Relokasi & Mutasi Alat" };
export const dynamic = "force-dynamic";

/** Relokasi (pindah ruangan) & mutasi (pindah unit) alat: ajukan → setujui → serah terima → lokasi alat diperbarui. */
export default async function MutasiPage({ searchParams }: { searchParams: Promise<{ alat?: string; status?: string }> }) {
  const s = await sesiHalaman("Viewer");
  const sp = await searchParams;
  const kunci = s.user.unitKerja && !cukup(s.user.peran, "Admin") ? s.user.unitKerja : null;
  const status = STATUS_MUTASI.includes(sp.status as never) ? sp.status! : "";
  const [daftar, units, ruangan, pilih] = await Promise.all([
    prisma.mutasiAlat.findMany({
      where: { ...(status ? { status } : {}), ...(kunci ? { OR: [{ dariUnit: kunci }, { keUnit: kunci }] } : {}) },
      orderBy: [{ createdAt: "desc" }], take: 200, include: { alat: { select: { kode: true, nama: true, merek: true, model: true, nomorSeri: true } } },
    }),
    prisma.unitKerja.findMany({ where: { NOT: { nama: "TIDAK ADA" } }, orderBy: { urut: "asc" }, select: { id: true, nama: true } }),
    prisma.ruangan.findMany({ where: { aktif: true }, orderBy: { nama: "asc" }, select: { id: true, nama: true, unitKerjaId: true } }),
    sp.alat ? prisma.alat.findFirst({ where: { kode: sp.alat, aktif: true }, select: { id: true, kode: true, nama: true, unitKerja: { select: { nama: true } }, ruangan: { select: { nama: true } } } }) : null,
  ]);
  const op = cukup(s.user.peran, "Operator") && process.env.STARS_MODE !== "internet";
  return (
    <MutasiPanel
      bolehKelola={op} admin={cukup(s.user.peran, "Admin")} email={s.user.email ?? ""} status={status}
      units={units} ruangan={ruangan}
      pilih={pilih ? { id: pilih.id, label: `${pilih.kode} · ${pilih.nama} · ${pilih.unitKerja.nama}${pilih.ruangan ? ` / ${pilih.ruangan.nama}` : ""}` } : null}
      daftar={daftar.map((m) => ({
        id: m.id, nomor: m.nomor, jenis: m.jenis, status: m.status, alasan: m.alasan, kondisi: m.kondisi,
        alat: `${m.alat.kode} · ${m.alat.nama}${m.alat.merek ? ` · ${m.alat.merek}` : ""}${m.alat.model ? ` ${m.alat.model}` : ""}${m.alat.nomorSeri ? ` · SN ${m.alat.nomorSeri}` : ""}`,
        dari: `${m.dariUnit}${m.dariRuangan ? ` / ${m.dariRuangan}` : ""}`, ke: `${m.keUnit}${m.keRuangan ? ` / ${m.keRuangan}` : ""}`,
        diajukanOleh: m.diajukanOleh, dibuat: m.createdAt.toISOString(), diputuskanOleh: m.diputuskanOleh, diputuskanPada: m.diputuskanPada?.toISOString() ?? null,
        catatan: m.catatanKeputusan, diterimaOleh: m.diterimaOleh, diterimaPada: m.diterimaPada?.toISOString() ?? null,
      }))}
    />
  );
}
