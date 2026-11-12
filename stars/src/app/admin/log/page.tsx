import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { sesiHalaman } from "@/lib/sesi";
import { formatRupiah, formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Log Impor" };
export const dynamic = "force-dynamic";

const tgl = (d: Date) => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(d);

export default async function LogPage() {
  await sesiHalaman("Operator");
  const log = await prisma.logImpor.findMany({ orderBy: { waktu: "desc" }, take: 50 });
  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>#</TableHead><TableHead>Waktu</TableHead><TableHead>Berkas</TableHead><TableHead className="hidden md:table-cell">Pengguna</TableHead>
            <TableHead className="text-right">Baris</TableHead><TableHead className="hidden text-right lg:table-cell">Baru / Diperbarui</TableHead><TableHead className="text-right">Nilai</TableHead><TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {log.length === 0 && <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">Belum ada impor.</TableCell></TableRow>}
          {log.map((l) => (
            <TableRow key={l.id}>
              <TableCell className="text-muted-foreground">{l.id}</TableCell>
              <TableCell className="whitespace-nowrap">{tgl(l.waktu)}</TableCell>
              <TableCell className="max-w-xs"><span className="line-clamp-1" title={l.namaBerkas}>{l.namaBerkas}</span><span className="text-xs text-muted-foreground">{(l.ukuranByte / 1024).toFixed(0)} KB</span></TableCell>
              <TableCell className="hidden md:table-cell">{l.pengguna ?? "-"}</TableCell>
              <TableCell className="text-right tabular-nums">{formatNumber(l.totalBaris)}</TableCell>
              <TableCell className="hidden text-right tabular-nums lg:table-cell">{formatNumber(l.barisBaru)} / {formatNumber(l.barisDiperbarui)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatRupiah(l.totalNilai)}</TableCell>
              <TableCell>
                <Badge variant={l.status === "Berhasil" ? "success" : "danger"} title={l.pesan ?? undefined}>{l.status}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
