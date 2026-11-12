import Link from "next/link";
import { History } from "lucide-react";
import { prisma } from "@/lib/prisma";

const waktu = (d: Date) => new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(d);

/**
 * Baris kecil "data terakhir diperbarui" + impor paket terakhir, agar pengguna bisa memastikan unggahannya sudah masuk.
 * `unit` = akun dibatasi unit: hitungan hanya unit itu dan log impor (dokumen unit lain) disembunyikan.
 */
export async function DataTerbaru({ unit }: { unit?: string | null }) {
  const [agg, log] = await Promise.all([
    prisma.paket.aggregate({ where: unit ? { unitKerja: { nama: unit } } : {}, _max: { updatedAt: true }, _count: { _all: true } }),
    unit ? Promise.resolve(null) : prisma.logImpor.findFirst({
      where: { OR: [{ pesan: null }, { NOT: { pesan: { startsWith: "Impor inventaris alat" } } }] },
      orderBy: { id: "desc" },
      select: { waktu: true, namaBerkas: true, status: true, barisBaru: true, barisDiperbarui: true },
    }),
  ]);
  if (!agg._max.updatedAt) return null;
  return (
    <p className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      <History className="size-3.5" aria-hidden />
      <span>Data paket terakhir berubah <strong className="text-foreground">{waktu(agg._max.updatedAt)} WIB</strong> ({agg._count._all.toLocaleString("id-ID")} baris di semua tahun{unit ? `, unit ${unit}` : ""})</span>
      {log && (
        <span>
          • Impor terakhir: <Link href="/admin/log" className="font-medium text-teal-700 hover:underline">{log.namaBerkas}</Link>, {waktu(log.waktu)} —{" "}
          <span className={log.status === "Berhasil" ? "text-emerald-700" : "text-red-700"}>{log.status}</span>
          {log.status === "Berhasil" && ` (${log.barisBaru} baru, ${log.barisDiperbarui} diperbarui)`}
        </span>
      )}
    </p>
  );
}
