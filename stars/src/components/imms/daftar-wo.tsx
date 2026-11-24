import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fmtTgl, PRIORITAS_WHO, TAHAP_PERBAIKAN, tahapPerbaikan, batasSelesai } from "@/lib/imms";
import { Kosong, Lencana, Tabel } from "./ui";

/** Daftar perintah kerja (dipakai menu Terencana, Inspeksi, Perintah Kerja, Persetujuan). */
export async function DaftarWo({ where, kosong }: { where: Prisma.PerintahKerjaWhereInput; kosong: string }) {
  const wo = await prisma.perintahKerja.findMany({ where, orderBy: [{ createdAt: "desc" }], take: 300, include: { alat: { select: { nama: true, kode: true, unitKerja: { select: { nama: true } } } }, teknisi: { select: { nama: true } } } });
  if (wo.length === 0) return <div className="kaca panel"><Kosong>{kosong}</Kosong></div>;
  const kini = new Date();
  return (
    <Tabel>
      <thead><tr><th>Nomor</th><th>Jenis</th><th>Alat</th><th>Tahap / status</th><th>Prioritas</th><th>Teknisi</th><th>Dibuat</th></tr></thead>
      <tbody>{wo.map((w) => {
        const lewat = w.jenis === "Korektif" && !["Selesai", "Batal"].includes(w.status) && batasSelesai(w.createdAt, w.prioritas) < kini;
        return (
          <tr key={w.id}>
            <td className="whitespace-nowrap"><Link className="tautan font-medium" href={`/imms/perbaikan/${w.nomor}`}>{w.nomor}</Link></td>
            <td><Lencana t={w.jenis === "Preventif" ? "Terencana" : w.jenis} nada={w.jenis === "Preventif" ? "hijau" : undefined} /></td>
            <td>{w.alat?.nama ?? w.deskripsi}<div className="redup2 text-[11px]">{w.alat?.unitKerja.nama}</div></td>
            <td>
              <Lencana t={w.status} />{" "}
              {w.jenis === "Korektif" && w.status !== "Batal" && <span className="redup text-[12px]">{TAHAP_PERBAIKAN[tahapPerbaikan(w)]}</span>}
              {w.usulanStatus && <> <Lencana t={`Usulan ${w.usulanStatus.toLowerCase()}`} nada={w.usulanStatus === "Diajukan" ? "kuning" : w.usulanStatus === "Disetujui" ? "hijau" : "merah"} /></>}
            </td>
            <td><span style={lewat ? { color: "var(--merah)", fontWeight: 600 } : undefined}>{lewat ? "⚠ " : ""}{w.jenis === "Korektif" ? PRIORITAS_WHO[w.prioritas]?.label ?? w.prioritas : "—"}</span></td>
            <td className="redup">{w.teknisi?.nama ?? "—"}</td>
            <td className="redup whitespace-nowrap">{fmtTgl(w.createdAt)}</td>
          </tr>
        );
      })}</tbody>
    </Tabel>
  );
}
