import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, Boxes, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/dashboard/pagination";
import { badgeKondisi, JENIS_ALAT, KONDISI_ALAT } from "@/lib/pemeliharaan";
import { FILTER_KALIBRASI, tglIndo } from "@/lib/kalibrasi";
import type { BarisInventaris, KolomInventaris } from "@/lib/inventaris";
import { cn } from "@/lib/utils";
import { QrAlat } from "./qr-alat";

export const JANGKAR_INVENTARIS = "inventaris";

export type ParamInventaris = { q: string; unit: string; jenis: string; kondisi: string; kal: string; urut: KolomInventaris; arah: "asc" | "desc" };

/** Query string tanpa nilai kosong (dan tanpa urut/arah bawaan). */
function keQuery(p: Partial<ParamInventaris>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) if (v) q.set(k, String(v));
  return q;
}

function KepalaUrut({ kolom, label, p, className }: { kolom: KolomInventaris; label: string; p: ParamInventaris; className?: string }) {
  const aktif = p.urut === kolom;
  const arahBaru = aktif ? (p.arah === "asc" ? "desc" : "asc") : "asc";
  const q = keQuery({ ...p, urut: kolom, arah: arahBaru });
  const Ikon = !aktif ? ArrowUpDown : p.arah === "asc" ? ArrowUp : ArrowDown;
  return (
    <TableHead className={className} aria-sort={aktif ? (p.arah === "asc" ? "ascending" : "descending") : "none"}>
      <Link href={`?${q.toString()}#${JANGKAR_INVENTARIS}`} scroll={false} title={`Urutkan menurut ${label.toLowerCase()}`}
        className={cn("group inline-flex items-center gap-1 rounded transition-colors hover:text-teal-700", aktif && "text-teal-700")}>
        {label}
        <Ikon className={cn("size-3.5 shrink-0 transition-opacity", aktif ? "opacity-100" : "opacity-35 group-hover:opacity-80")} aria-hidden />
      </Link>
    </TableHead>
  );
}

/**
 * Bagian "Inventaris Alat Kesehatan" di menu Pemeliharaan (publik). Filter memakai formulir GET biasa
 * (tetap jalan tanpa JavaScript); QR tiap alat ada di antara kode dan nama alat.
 */
export function InventarisAlat({ hasil, p, unitOpsi, kunci, bolehLabel }: {
  hasil: { data: BarisInventaris[]; total: number; page: number; pages: number; pageSize: number };
  p: ParamInventaris; unitOpsi: { nama: string; jumlah: number }[]; kunci: string | null; bolehLabel: boolean;
}) {
  const adaFilter = Boolean(p.q || p.unit || p.jenis || p.kondisi || p.kal);
  return (
    <section id={JANGKAR_INVENTARIS} aria-labelledby="judul-inventaris" className="mt-8 scroll-mt-24">
      <div className="mb-3">
        <h2 id="judul-inventaris" className="flex items-center gap-2 text-xl font-bold text-navy-800"><Boxes className="size-5 text-teal-700" aria-hidden /> Inventaris Alat Kesehatan</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Daftar alat aktif{kunci ? ` unit ${kunci}` : " RSUD Cipayung"} beserta kondisi dan status kalibrasinya. Setiap alat punya QR sendiri:
          klik QR untuk memperbesar, atau scan QR pada alat untuk melapor kerusakan.
        </p>
      </div>
      <Card className="overflow-hidden">
        <form method="get" action={`/pemeliharaan#${JANGKAR_INVENTARIS}`} className="grid gap-3 border-b p-4">
          <input type="hidden" name="urut" value={p.urut} />
          <input type="hidden" name="arah" value={p.arah} />
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input name="q" defaultValue={p.q} placeholder="Cari nama alat, merek, kode, nomor seri, ruangan…" className="pl-9" aria-label="Cari alat" />
            </div>
            <Button type="submit"><Search /> Cari</Button>
            {adaFilter && <Button variant="outline" asChild><Link href={`/pemeliharaan#${JANGKAR_INVENTARIS}`} scroll={false}>Reset</Link></Button>}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {kunci ? (
              <p className="flex h-10 items-center rounded-md border bg-muted/40 px-3 text-sm text-muted-foreground">Unit: <strong className="ml-1 text-navy-800">{kunci}</strong></p>
            ) : (
              <Select name="unit" defaultValue={p.unit} aria-label="Unit kerja">
                <option value="">Semua unit kerja</option>
                {unitOpsi.map((u) => <option key={u.nama} value={u.nama}>{u.nama} ({u.jumlah})</option>)}
              </Select>
            )}
            <Select name="jenis" defaultValue={p.jenis} aria-label="Jenis alat">
              <option value="">Medik &amp; non-medik</option>
              {JENIS_ALAT.map((j) => <option key={j} value={j}>{j}</option>)}
            </Select>
            <Select name="kondisi" defaultValue={p.kondisi} aria-label="Kondisi alat">
              <option value="">Semua kondisi</option>
              {KONDISI_ALAT.map((k) => <option key={k} value={k}>{k}</option>)}
            </Select>
            <Select name="kal" defaultValue={p.kal} aria-label="Status kalibrasi">
              <option value="">Semua status kalibrasi</option>
              {FILTER_KALIBRASI.map((f) => <option key={f.kode} value={f.kode}>{f.label}</option>)}
            </Select>
          </div>
        </form>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <KepalaUrut kolom="kode" label="Kode" p={p} className="hidden sm:table-cell" />
              <TableHead className="w-14 px-2 text-center sm:px-4">QR</TableHead>
              <KepalaUrut kolom="nama" label="Nama Alat" p={p} />
              <KepalaUrut kolom="unit" label="Unit Kerja" p={p} className="hidden md:table-cell" />
              <KepalaUrut kolom="kondisi" label="Kondisi" p={p} className="hidden sm:table-cell" />
              <KepalaUrut kolom="kalibrasi" label="Kalibrasi" p={p} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {hasil.data.length === 0 && (
              <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">{adaFilter ? "Tidak ada alat yang cocok dengan pencarian/filter ini." : "Belum ada alat terdaftar."}</TableCell></TableRow>
            )}
            {hasil.data.map((a) => {
              const lokasi = `${a.unit}${a.ruangan ? ` · ${a.ruangan}` : ""}`;
              return (
                <TableRow key={a.id}>
                  <TableCell className="hidden max-w-[9rem] break-all font-mono text-xs text-muted-foreground sm:table-cell">{a.kode}</TableCell>
                  <TableCell className="px-2 text-center sm:px-4">
                    <span className="inline-flex"><QrAlat kode={a.kode} nama={a.nama} keterangan={lokasi} labelHref={bolehLabel ? `/api/admin/alat/label?id=${a.id}&ukuran=kecil` : undefined} /></span>
                  </TableCell>
                  <TableCell className="max-w-md sm:min-w-[12rem]">
                    <span className="block break-all font-mono text-[11px] text-muted-foreground sm:hidden">{a.kode}</span>
                    <span className="font-medium text-navy-800">{a.nama}</span>
                    {(a.merek || a.model) && <span className="block text-xs text-muted-foreground">{[a.merek, a.model].filter(Boolean).join(" ")}</span>}
                    <span className="block text-xs text-muted-foreground">
                      {a.nomorSeri && a.nomorSeri !== a.kode ? <>SN <span className="font-mono">{a.nomorSeri}</span> • </> : null}{a.jenis}
                      <span className="md:hidden"> • {lokasi}</span>
                    </span>
                    <Badge variant={badgeKondisi[a.kondisi] ?? "outline"} className="mt-1 sm:hidden">{a.kondisi}</Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{a.unit}{a.ruangan && <span className="block text-xs text-muted-foreground">{a.ruangan}</span>}</TableCell>
                  <TableCell className="hidden sm:table-cell"><Badge variant={badgeKondisi[a.kondisi] ?? "outline"}>{a.kondisi}</Badge></TableCell>
                  <TableCell className="whitespace-nowrap pl-1 sm:pl-4">
                    <Badge variant={a.status.variant}>{a.status.label}</Badge>
                    {a.kalibrasi && <span className="mt-0.5 block text-xs text-muted-foreground">{a.kalibrasi.berlakuSampai ? `s/d ${tglIndo(a.kalibrasi.berlakuSampai)}` : `kal. ${tglIndo(a.kalibrasi.tanggal)}`}</span>}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <Pagination page={hasil.page} pages={hasil.pages} total={hasil.total} pageSize={hasil.pageSize} query={keQuery(p)} satuan="alat" jangkar={JANGKAR_INVENTARIS} />
      </Card>
    </section>
  );
}
