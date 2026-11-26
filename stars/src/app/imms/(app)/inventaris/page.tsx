import { sesiImms } from "@/lib/imms-sesi";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { AMBANG_EM, hitungEm, kerusakanPerAlat } from "@/lib/imms";
import { Cari, Hal, Kosong, Lencana, Tabel } from "@/components/imms/ui";

const PER = 50;

export default async function Inventaris({ searchParams }: { searchParams: Promise<{ q?: string; unit?: string; kondisi?: string; hal?: string }> }) {
  await sesiImms();
  const sp = await searchParams;
  const s = await auth();
  const hal = Math.max(1, Number(sp.hal) || 1);
  const q = (sp.q ?? "").trim();
  const unitTerkunci = s?.user.peran === "Viewer" ? s.user.unitKerjaId : null;
  const where: Prisma.AlatWhereInput = {
    aktif: true,
    ...(q ? { OR: [{ nama: { contains: q } }, { kode: { contains: q } }, { merek: { contains: q } }, { model: { contains: q } }, { nomorSeri: { contains: q } }] } : {}),
    ...(unitTerkunci ? { unitKerjaId: unitTerkunci } : sp.unit ? { unitKerjaId: Number(sp.unit) } : {}),
    ...(sp.kondisi ? { kondisi: sp.kondisi } : {}),
  };
  const [total, alat, unit] = await Promise.all([
    prisma.alat.count({ where }),
    prisma.alat.findMany({ where, orderBy: [{ nama: "asc" }], skip: (hal - 1) * PER, take: PER, include: { unitKerja: { select: { nama: true } }, ruangan: { select: { nama: true } } } }),
    prisma.unitKerja.findMany({ orderBy: { urut: "asc" }, select: { id: true, nama: true } }),
  ]);
  const rusak = await kerusakanPerAlat(alat.map((a) => a.id));
  const dasar = `/imms/inventaris?q=${encodeURIComponent(q)}&unit=${sp.unit ?? ""}&kondisi=${sp.kondisi ?? ""}`;
  return (
    <div>
      <Cari q={q} placeholder="Cari nama, kode, merek, tipe, nomor seri…">
        {!unitTerkunci && (
          <select name="unit" defaultValue={sp.unit ?? ""} className="!w-auto" aria-label="Unit kerja">
            <option value="">Semua unit</option>{unit.map((u) => <option key={u.id} value={u.id}>{u.nama}</option>)}
          </select>
        )}
        <select name="kondisi" defaultValue={sp.kondisi ?? ""} className="!w-auto" aria-label="Kondisi">
          <option value="">Semua kondisi</option>{["Baik", "Rusak Ringan", "Rusak Berat", "Afkir"].map((k) => <option key={k}>{k}</option>)}
        </select>
      </Cari>
      {alat.length === 0 ? <div className="kaca panel"><Kosong>Tidak ada alat yang cocok.</Kosong></div> : (
        <Tabel>
          <thead><tr><th>Kode</th><th>Nama alat</th><th>Merek / tipe</th><th>No. seri</th><th>Lokasi</th><th>Kondisi</th><th>EM</th></tr></thead>
          <tbody>
            {alat.map((a) => {
              const e = hitungEm(a, rusak.get(a.id) ?? 0);
              return (
                <tr key={a.id}>
                  <td className="whitespace-nowrap"><Link className="tautan font-medium" href={`/imms/inventaris/${encodeURIComponent(a.kode)}`}>{a.kode}</Link></td>
                  <td>{a.nama}</td>
                  <td className="redup">{[a.merek, a.model].filter(Boolean).join(" / ") || "—"}</td>
                  <td className="redup">{a.nomorSeri ?? "—"}</td>
                  <td className="redup">{a.ruangan?.nama ?? a.lokasi ?? a.unitKerja.nama}</td>
                  <td><Lencana t={a.kondisi} /></td>
                  <td>{e.total == null ? <span className="redup2">—</span> : <Lencana t={String(e.total)} nada={e.total >= AMBANG_EM ? "biru" : ""} />}</td>
                </tr>
              );
            })}
          </tbody>
        </Tabel>
      )}
      <Hal hal={hal} total={total} per={PER} dasar={dasar} />
    </div>
  );
}
