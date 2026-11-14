import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { sesiHalaman } from "@/lib/sesi";
import { PERAN, PERAN_KETERANGAN } from "@/lib/peran";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormPenggunaBaru, BarisPengguna, BarisPendaftar } from "@/components/admin/pengguna-form";

export const metadata: Metadata = { title: "Pengguna" };
export const dynamic = "force-dynamic";

export default async function PenggunaPage() {
  const s = await sesiHalaman("Admin");
  const [pengguna, units, pendaftar] = await Promise.all([
    prisma.pengguna.findMany({ where: { menunggu: false }, orderBy: [{ aktif: "desc" }, { nama: "asc" }], include: { unitKerja: { select: { nama: true } } } }),
    prisma.unitKerja.findMany({ orderBy: { urut: "asc" }, select: { id: true, nama: true } }),
    prisma.pengguna.findMany({ where: { menunggu: true }, orderBy: { createdAt: "asc" }, include: { unitKerja: { select: { nama: true } } } }),
  ]);
  const superAdmin = s.user.peran === "Super Admin";
  const peranBoleh = superAdmin ? [...PERAN] : PERAN.filter((p) => p !== "Super Admin");

  return (
    <div className="grid gap-4">
      {pendaftar.length > 0 && (
        <Card className="border-amber-300">
          <CardHeader>
            <CardTitle>Menunggu persetujuan ({pendaftar.length})</CardTitle>
            <CardDescription>Pendaftaran mandiri dari halaman Daftar. Periksa identitasnya, tentukan peran & unit, lalu Setujui. Tolak = data pendaftar dihapus.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {pendaftar.map((p) => (
              <BarisPendaftar key={p.id} units={units} peranBoleh={peranBoleh}
                p={{ id: p.id, nama: p.nama, email: p.email, unitKerjaId: p.unitKerjaId, unitKerja: p.unitKerja?.nama ?? null, catatan: p.catatanDaftar, dibuat: p.createdAt.toISOString() }} />
            ))}
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Tambah pengguna</CardTitle>
          <CardDescription>
            {PERAN.map((p) => <span key={p} className="mr-3 inline-block"><strong>{p}</strong>: {PERAN_KETERANGAN[p]}.</span>)}
          </CardDescription>
        </CardHeader>
        <CardContent><FormPenggunaBaru units={units} peranBoleh={peranBoleh} /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Daftar pengguna ({pengguna.length})</CardTitle><CardDescription>Klik Ubah untuk mengganti peran, unit, status aktif, atau menyetel ulang sandi.</CardDescription></CardHeader>
        <CardContent className="grid gap-3">
          {pengguna.map((p) => (
            <BarisPengguna
              key={p.id}
              pengguna={{ id: p.id, nama: p.nama, email: p.email, peran: p.peran, unitKerjaId: p.unitKerjaId, unitKerja: p.unitKerja?.nama ?? null, aktif: p.aktif, terakhirLogin: p.terakhirLogin?.toISOString() ?? null, terkunci: Boolean(p.terkunciSampai && p.terkunciSampai > new Date()) }}
              units={units}
              peranBoleh={p.peran === "Super Admin" && !superAdmin ? [] : peranBoleh}
              sayaSendiri={String(p.id) === s.user.id}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
