"use client";

import { useActionState, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { hapusDataPaket, type StatusAksi } from "@/app/admin/sistem/actions";
import { formatNumber, formatRupiah } from "@/lib/utils";

type Grup = { tahun: number; tahap: string; baris: number; nilai: number };
const kunci = (g: Pick<Grup, "tahun" | "tahap">) => `${g.tahun}|${g.tahap}`;

export function HapusDataPaket({ data, boleh }: { data: Grup[]; boleh: boolean }) {
  const [status, aksi, pending] = useActionState<StatusAksi, FormData>(hapusDataPaket, undefined);
  const [pilih, setPilih] = useState<Set<string>>(new Set());
  const [konfirmasi, setKonfirmasi] = useState("");
  const tahunIni = new Date().getFullYear();
  const total = useMemo(() => data.filter((g) => pilih.has(kunci(g))).reduce((a, g) => a + g.baris, 0), [data, pilih]);

  function ubah(k: string, v: boolean) {
    setPilih((s) => { const n = new Set(s); if (v) n.add(k); else n.delete(k); return n; });
  }

  return (
    <form action={aksi} onSubmit={(e) => { if (!window.confirm(`Hapus ${total} paket secara permanen? Salinan basis data dibuat otomatis sebelum menghapus.`)) e.preventDefault(); }} className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setPilih(new Set(data.filter((g) => g.tahun !== tahunIni).map(kunci)))}>Pilih semua selain tahun {tahunIni}</Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setPilih(new Set())}>Kosongkan pilihan</Button>
      </div>
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader><TableRow className="hover:bg-transparent"><TableHead className="w-10" /><TableHead>Tahun</TableHead><TableHead>Tahap</TableHead><TableHead className="text-right">Paket</TableHead><TableHead className="text-right">Nilai</TableHead></TableRow></TableHeader>
          <TableBody>
            {data.length === 0 && <TableRow><TableCell colSpan={5} className="py-6 text-center text-muted-foreground">Belum ada data paket.</TableCell></TableRow>}
            {data.map((g) => {
              const k = kunci(g);
              return (
                <TableRow key={k} className={pilih.has(k) ? "bg-red-50" : undefined}>
                  <TableCell><input type="checkbox" name="grup" value={k} checked={pilih.has(k)} onChange={(e) => ubah(k, e.target.checked)} aria-label={`Pilih ${g.tahap} ${g.tahun}`} className="size-4 accent-red-600" /></TableCell>
                  <TableCell className="font-medium">{g.tahun}</TableCell>
                  <TableCell>{g.tahap}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(g.baris)}</TableCell>
                  <TableCell className="whitespace-nowrap text-right tabular-nums">{formatRupiah(g.nilai)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <label className="grid gap-1 text-xs text-muted-foreground">
          Ketik <strong className="text-red-700">HAPUS</strong> untuk konfirmasi
          <Input name="konfirmasi" value={konfirmasi} onChange={(e) => setKonfirmasi(e.target.value)} className="h-9 w-48" autoComplete="off" disabled={!boleh} />
        </label>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{pilih.size} kelompok • <strong className="text-red-700">{formatNumber(total)} paket</strong> akan dihapus</span>
          <Button type="submit" className="bg-red-600 text-white hover:bg-red-700" disabled={!boleh || pending || pilih.size === 0 || konfirmasi.trim() !== "HAPUS"}>
            {pending ? <Loader2 className="animate-spin" /> : <Trash2 />} Hapus permanen
          </Button>
        </div>
      </div>
      {status?.error && <p role="alert" className="flex items-start gap-2 text-sm text-red-700"><XCircle className="mt-0.5 size-4 shrink-0" /> {status.error}</p>}
      {status?.ok && <p className="flex items-start gap-2 text-sm text-emerald-700"><CheckCircle2 className="mt-0.5 size-4 shrink-0" /> <span className="break-all">{status.ok}</span></p>}
    </form>
  );
}
