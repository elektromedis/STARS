import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { PaketRow } from "@/lib/queries";
import { formatRupiah } from "@/lib/utils";
import { StatusBadge } from "./status-badge";

export function PackageTable({ rows, kosong = "Tidak ada paket untuk filter ini.", tampilTahap = false }: { rows: PaketRow[]; kosong?: string; tampilTahap?: boolean }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Kode</TableHead><TableHead>Nama Paket</TableHead><TableHead className="hidden md:table-cell">Unit Kerja</TableHead>
          <TableHead className="hidden lg:table-cell">Kategori</TableHead><TableHead className="text-right">Nilai</TableHead><TableHead>Serapan</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 && (
          <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">{kosong}</TableCell></TableRow>
        )}
        {rows.map((p) => (
          <TableRow key={p.kode}>
            <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">{p.kode}{tampilTahap && <span className="mt-0.5 block font-sans text-[11px] text-teal-700">{p.tahap}</span>}</TableCell>
            <TableCell className="min-w-[14rem] max-w-md font-medium text-navy-800">
              <span className="line-clamp-2" title={p.namaPaket}>{p.namaPaket}</span>
              {p.prioritas && <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{p.prioritas} • {p.jenis}</span>}
            </TableCell>
            <TableCell className="hidden md:table-cell">{p.unit}</TableCell>
            <TableCell className="hidden lg:table-cell text-muted-foreground">{p.kategori}</TableCell>
            <TableCell className="whitespace-nowrap text-right tabular-nums">{formatRupiah(p.nilai)}</TableCell>
            <TableCell><StatusBadge serapan={p.serapan} /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
