import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, FileCheck2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Arah, KolomUrut, PaketRow } from "@/lib/queries";
import { JENIS_DOKUMEN } from "@/lib/dokumen";
import { cn, formatRupiah } from "@/lib/utils";
import { StatusBadge } from "./status-badge";

/** Pengurutan aktif + query string halaman saat ini (tanpa urut/arah/page) untuk membuat tautan header. */
export type Pengurutan = { urut: KolomUrut; arah: Arah; query: string };

function KepalaUrut({ kolom, label, pengurutan, className }: { kolom: KolomUrut; label: string; pengurutan?: Pengurutan; className?: string }) {
  if (!pengurutan) return <TableHead className={className}>{label}</TableHead>;
  const aktif = pengurutan.urut === kolom;
  // Klik pertama: nilai/serapan dari terbesar, kolom teks dari A-Z; klik berikutnya membalik arah.
  const arahBaru: Arah = aktif ? (pengurutan.arah === "asc" ? "desc" : "asc") : kolom === "nilai" || kolom === "serapan" ? "desc" : "asc";
  const q = new URLSearchParams(pengurutan.query);
  q.set("urut", kolom); q.set("arah", arahBaru); q.delete("page");
  const Ikon = !aktif ? ArrowUpDown : pengurutan.arah === "asc" ? ArrowUp : ArrowDown;
  return (
    <TableHead className={className} aria-sort={aktif ? (pengurutan.arah === "asc" ? "ascending" : "descending") : "none"}>
      <Link href={`?${q.toString()}`} scroll={false} title={`Urutkan menurut ${label.toLowerCase()}`}
        className={cn("group inline-flex items-center gap-1 rounded transition-colors hover:text-teal-700", aktif && "text-teal-700")}>
        {label}
        <Ikon className={cn("size-3.5 shrink-0 transition-opacity", aktif ? "opacity-100" : "opacity-35 group-hover:opacity-80")} aria-hidden />
      </Link>
    </TableHead>
  );
}

/**
 * `ringkas` = untuk kartu sempit (dashboard): kolom Kode, Unit & Kategori dilipat ke bawah nama komponen.
 * `dokumen` = tampilkan 5 kolom dokumen pendukung (kategori pindah ke bawah nama komponen agar muat).
 * `pengurutan` = header dapat diklik untuk mengurutkan (panah kecil).
 */
export function PackageTable({ rows, kosong = "Tidak ada paket untuk filter ini.", tampilTahap = false, ringkas = false, dokumen = false, pengurutan }: {
  rows: PaketRow[]; kosong?: string; tampilTahap?: boolean; ringkas?: boolean; dokumen?: boolean; pengurutan?: Pengurutan;
}) {
  const tampilKategori = !ringkas && !dokumen;
  const jumlahKolom = ringkas ? 3 : 5 + (tampilKategori ? 1 : 0) + (dokumen ? JENIS_DOKUMEN.length : 0);
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {!ringkas && <KepalaUrut kolom="kode" label="Kode" pengurutan={pengurutan} />}
          <KepalaUrut kolom="nama" label="Nama Komponen" pengurutan={pengurutan} />
          {!ringkas && <KepalaUrut kolom="unit" label="Unit Kerja" pengurutan={pengurutan} className="hidden md:table-cell" />}
          {tampilKategori && <KepalaUrut kolom="kategori" label="Kategori" pengurutan={pengurutan} className="hidden lg:table-cell" />}
          <KepalaUrut kolom="nilai" label="Nilai" pengurutan={pengurutan} className="text-right" />
          <KepalaUrut kolom="serapan" label="Serapan" pengurutan={pengurutan} />
          {dokumen && JENIS_DOKUMEN.map((j) => (
            <TableHead key={j.kode} className="w-[4.5rem] whitespace-normal px-1.5 text-center text-[10px] leading-tight">{j.judulKolom}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 && (
          <TableRow><TableCell colSpan={jumlahKolom} className="py-10 text-center text-muted-foreground">{kosong}</TableCell></TableRow>
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
              ) : (p.prioritas || dokumen) && (
                <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{[p.prioritas, p.jenis, dokumen ? p.kategori : null].filter(Boolean).join(" • ")}</span>
              )}
            </TableCell>
            {!ringkas && <TableCell className="hidden md:table-cell">{p.unit}</TableCell>}
            {tampilKategori && <TableCell className="hidden lg:table-cell text-muted-foreground">{p.kategori}</TableCell>}
            <TableCell className="whitespace-nowrap text-right tabular-nums">{formatRupiah(p.nilai)}</TableCell>
            <TableCell><StatusBadge serapan={p.serapan} /></TableCell>
            {dokumen && JENIS_DOKUMEN.map((j) => {
              const d = p.dokumen?.[j.kode];
              return (
                <TableCell key={j.kode} className="px-1.5 text-center">
                  {d ? (
                    <a href={`/api/dokumen/${d.id}`} target="_blank" rel="noopener noreferrer" title={`Buka ${j.label}${d.jumlah > 1 ? ` (${d.jumlah} berkas, terbaru)` : ""}`}
                      className="inline-flex items-center gap-0.5 rounded-md p-1 text-teal-700 transition-colors hover:bg-teal-50">
                      <FileCheck2 className="size-4" aria-label={`${j.label} tersedia`} />
                      {d.jumlah > 1 && <span className="text-[10px] font-semibold tabular-nums">{d.jumlah}</span>}
                    </a>
                  ) : (
                    <span className="text-muted-foreground/50" title={`${j.label} belum diunggah`} aria-label={`${j.label} belum ada`}>—</span>
                  )}
                </TableCell>
              );
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
