"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Database, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { angkaRkbu, jumlahBaris, type BarisRkbu } from "@/lib/rkbu";

export type OpsiRkbu = { tahunTahap: { tahun: number; tahap: string[] }[]; units: string[]; kategori: string[]; rekening: string[] };

/** Dialog: ambil baris dari data Paket (Perencanaan-Pengadaan) lalu tambahkan / ganti isi tabel. */
export function AmbilPaket({ opsi, awal, onAmbil, onTutup }: {
  opsi: OpsiRkbu; awal: { tahun: number; tahap: string; jenis: string };
  onAmbil: (baris: BarisRkbu[], ppn: number, mode: "tambah" | "ganti") => void; onTutup: () => void;
}) {
  const ada = opsi.tahunTahap.some((t) => t.tahun === awal.tahun && t.tahap.includes(awal.tahap));
  const [tt, setTt] = useState(ada ? `${awal.tahun}|${awal.tahap}` : opsi.tahunTahap[0] ? `${opsi.tahunTahap[0].tahun}|${opsi.tahunTahap[0].tahap.at(-1)}` : "");
  const [jenis, setJenis] = useState(awal.jenis);
  const [unit, setUnit] = useState("");
  const [rekening, setRekening] = useState("");
  const [kategori, setKategori] = useState("");
  const [hasil, setHasil] = useState<{ baris: BarisRkbu[]; ppn: number } | null>(null);
  const [memuat, setMemuat] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const tutupRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    tutupRef.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onTutup(); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onTutup]);

  useEffect(() => {
    if (!tt) return;
    const [tahun, tahap] = tt.split("|");
    const q = new URLSearchParams({ tahun, tahap, jenis, unit, rekening, kategori });
    const ac = new AbortController();
    setMemuat(true); setGalat(null);
    fetch(`/api/rkbu/paket?${q}`, { signal: ac.signal })
      .then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.error ?? "Gagal memuat paket."); setHasil(j); })
      .catch((e) => { if (!ac.signal.aborted) { setGalat(e instanceof Error ? e.message : "Gagal memuat."); setHasil(null); } })
      .finally(() => { if (!ac.signal.aborted) setMemuat(false); });
    return () => ac.abort();
  }, [tt, jenis, unit, rekening, kategori]);

  const total = hasil ? hasil.baris.reduce((a, b) => a + jumlahBaris(b, hasil.ppn), 0) : 0;
  const pilih = (label: string, nilai: string, ubah: (v: string) => void, daftar: string[], semua = "Semua") => (
    <label className="grid gap-1 text-xs font-medium text-navy-700">{label}
      <Select value={nilai} onChange={(e) => ubah(e.target.value)} className="h-9 text-sm font-normal">
        <option value="">{semua}</option>{daftar.map((d) => <option key={d} value={d}>{d}</option>)}
      </Select>
    </label>
  );

  return createPortal(
    <div className="fixed inset-0 z-[75] flex items-end justify-center bg-navy-950/60 backdrop-blur-sm sm:items-center sm:p-4" onClick={onTutup}>
      <div role="dialog" aria-modal="true" aria-label="Ambil dari data Paket" onClick={(e) => e.stopPropagation()} className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-card shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
          <div><h2 className="flex items-center gap-2 font-semibold text-navy-800"><Database className="size-4 text-teal-700" /> Ambil dari data Paket</h2>
            <p className="text-xs text-muted-foreground">Baris diambil dari menu Paket; setelah masuk tabel semuanya bisa diubah tanpa mengubah data Paket.</p></div>
          <Button ref={tutupRef} variant="ghost" size="icon" onClick={onTutup} aria-label="Tutup"><X className="size-5" /></Button>
        </div>
        <div className="grid gap-3 overflow-y-auto px-5 py-4 sm:grid-cols-2 [&>*]:min-w-0">
          <label className="grid gap-1 text-xs font-medium text-navy-700">Tahun & tahap anggaran
            <Select value={tt} onChange={(e) => setTt(e.target.value)} className="h-9 text-sm font-normal">
              {opsi.tahunTahap.flatMap((t) => t.tahap.map((tp) => <option key={`${t.tahun}|${tp}`} value={`${t.tahun}|${tp}`}>{t.tahun} — {tp}</option>))}
            </Select>
          </label>
          {pilih("Jenis paket", jenis, setJenis, ["Pemeliharaan", "Pengadaan"], "Semua jenis")}
          {pilih("Unit kerja / lokasi", unit, setUnit, opsi.units, "Semua unit")}
          {pilih("Kategori", kategori, setKategori, opsi.kategori, "Semua kategori")}
          <div className="sm:col-span-2">{pilih("Kode rekening", rekening, setRekening, opsi.rekening, "Semua rekening")}</div>
          <div className="rounded-lg border bg-muted/40 p-3 text-sm sm:col-span-2" aria-live="polite">
            {memuat ? <span className="flex items-center gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Memuat paket…</span>
              : galat ? <span className="text-red-700">{galat}</span>
              : hasil ? (
                <>
                  <p><b>{hasil.baris.length}</b> paket · total <b>Rp {angkaRkbu(total)}</b> · PPN terdeteksi <b>{hasil.ppn}%</b></p>
                  {hasil.baris.length > 0 && <ul className="mt-2 list-disc pl-5 text-xs text-muted-foreground">{hasil.baris.slice(0, 5).map((b) => <li key={b.id} className="truncate">{b.barang} — {b.lokasi}</li>)}{hasil.baris.length > 5 && <li>… dan {hasil.baris.length - 5} lainnya</li>}</ul>}
                </>
              ) : null}
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t px-5 py-3">
          <Button variant="outline" onClick={onTutup}>Batal</Button>
          <Button variant="outline" disabled={!hasil?.baris.length || memuat} onClick={() => hasil && onAmbil(hasil.baris, hasil.ppn, "tambah")}>Tambahkan ke tabel</Button>
          <Button variant="teal" disabled={!hasil?.baris.length || memuat} onClick={() => hasil && onAmbil(hasil.baris, hasil.ppn, "ganti")}>Ganti seluruh baris</Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
