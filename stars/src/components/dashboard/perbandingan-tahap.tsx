import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { getPerbandinganTahap } from "@/lib/queries";
import { cn, formatNumber, formatRupiah } from "@/lib/utils";

type Baris = Awaited<ReturnType<typeof getPerbandinganTahap>>[number];

/** Tabel tahap-ke-tahap untuk mode "Semua Tahapan": tiap tahap = revisi anggaran, tidak dijumlahkan. */
export function PerbandinganTahap({ data, tahun, className }: { data: Baris[]; tahun: number; className?: string }) {
  if (data.length === 0) return null;
  return (
    <Card className={cn("mb-6", className)}>
      <CardHeader>
        <CardTitle>Perbandingan per Tahap {tahun}</CardTitle>
        <CardDescription>Setiap tahap adalah revisi anggaran, jadi tidak dijumlahkan. Angka total memakai tahap terakhir (pagu final).</CardDescription>
      </CardHeader>
      <CardContent className="px-0 pb-2">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Tahap</TableHead><TableHead className="text-right">Paket</TableHead><TableHead className="text-right">Nilai</TableHead>
              <TableHead className="hidden text-right md:table-cell">Terserap</TableHead><TableHead className="text-right">Selisih dari tahap sebelumnya</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((b) => (
              <TableRow key={b.tahap} className={b.final ? "bg-teal-50/60" : undefined}>
                <TableCell className="font-medium text-navy-800">{b.tahap} {b.final && <Badge variant="teal" className="ml-1">Pagu final</Badge>}</TableCell>
                <TableCell className="text-right tabular-nums">{formatNumber(b.paket)}</TableCell>
                <TableCell className="whitespace-nowrap text-right tabular-nums">{formatRupiah(b.nilai)}</TableCell>
                <TableCell className="hidden whitespace-nowrap text-right tabular-nums text-muted-foreground md:table-cell">{formatRupiah(b.terserap)}</TableCell>
                <TableCell className={cn("whitespace-nowrap text-right tabular-nums", b.selisih === null ? "text-muted-foreground" : b.selisih < 0 ? "text-red-700" : "text-emerald-700")}>
                  {b.selisih === null ? "—" : `${b.selisih > 0 ? "+" : ""}${formatRupiah(b.selisih)}`}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
