import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { PaketRow } from "@/lib/queries";
import { cn, formatRupiah } from "@/lib/utils";
import { StatusBadge } from "./status-badge";

/**
 * `ringkas` = untuk kartu sempit (dashboard): kolom Kode, Unit & Kategori dilipat ke bawah nama paket
 * agar kolom Nilai (rupiah lengkap) dan Serapan tetap muat.
 */
export function PackageTable({ rows, kosong = "Tidak ada paket untuk filter ini.", tampilTahap = false, ringkas = false }: { rows: PaketRow[]; kosong?: string; tampilTahap?: boolean; ringkas?: boolean }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {!ringkas && <TableHead>Kode</TableHead>}
          <TableHead>Nama Paket</TableHead>{!ringkas && <TableHead className="hidden md:table-cell">Unit Kerja</TableHead>}
          {!ringkas && <TableHead className="hidden lg:table-cell">Kategori</TableHead>}
          <TableHead className="text-right">Nilai</TableHead><TableHead>Serapan</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 && (
          <TableRow><TableCell colSpan={ringkas ? 3 : 6} className="py-10 text-center text-muted-foreground">{kosong}</TableCell></TableRow>
        )}
        {rows.map((p) => (
          <TableRow key={p.kode}>
            {!ringkas && (
              <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">{p.kode}{tampilTahap && <span className="mt-0.5 block font-sans text-[11px] text-teal-700">{p.tahap}</span>}</TableCell>
            )}
            <TableCell className={cn("max-w-md font-medium text-navy-800", ringkas ? "min-w-[12rem]" : "min-w-[14rem]")}>
              <span className="line-clamp-2" title={p.namaPaket}>{p.namaPaket}</span>
              {ringkas ? (
                <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                  <span className="font-mono">{p.kode}</span>{tampilTahap && <span className="text-teal-700"> • {p.tahap}</span>} • {p.unit} • {p.kategori}
                </span>
              ) : (
                p.prioritas && <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{p.prioritas} • {p.jenis}</span>
              )}
            </TableCell>
            {!ringkas && <TableCell className="hidden md:table-cell">{p.unit}</TableCell>}
            {!ringkas && <TableCell className="hidden lg:table-cell text-muted-foreground">{p.kategori}</TableCell>}
            <TableCell className="whitespace-nowrap text-right tabular-nums">{formatRupiah(p.nilai)}</TableCell>
            <TableCell><StatusBadge serapan={p.serapan} /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
