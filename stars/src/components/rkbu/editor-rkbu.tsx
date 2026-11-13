"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowDown, ArrowLeft, ArrowUp, Check, ChevronDown, Copy, Database, FileSpreadsheet, ImagePlus, Loader2, Plus, Printer, RotateCcw, Save, Search, Trash2, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  angkaRkbu, barisKosong, GAMBAR_RKBU, idBaru, judulBawaan, jumlahBaris, KOLOM_BAWAAN, KOLOM_RKBU, KOP_BAWAAN, MAKS_LAMPIRAN_RKBU, totalRkbu, ukuranKertas, urlGambarRkbu,
  type BarisRkbu, type IsiRkbu, type KunciKolom,
} from "@/lib/rkbu";
import { TAHAP_URUT } from "@/lib/tahap";
import { perkecilGambar, unggahDenganKemajuan } from "@/lib/gambar";
import { cn } from "@/lib/utils";
import { AmbilPaket, type OpsiRkbu } from "./ambil-paket";
import { BingkaiCetak, type BingkaiApi } from "./bingkai-cetak";
import { DokumenRkbu, gayaCetak } from "./dokumen-rkbu";
import { unduhExcelRkbu } from "./ekspor-excel";

type Awal = { id: number | null; judul: string; isi: IsiRkbu; diperbarui: string | null; oleh: string | null };

const kecil = "h-9 text-sm";
const area = "w-full rounded-md border border-input bg-card px-3 py-2 text-sm";

function Bid({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={cn("grid min-w-0 gap-1 text-xs font-medium text-navy-700", className)}><span>{label}</span>{children}</label>;
}

function Panel({ judul, ringkas, terbuka, onToggle, children }: { judul: string; ringkas?: string; terbuka: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card shadow-card">
      <h2>
        <button type="button" onClick={onToggle} aria-expanded={terbuka} className="flex w-full items-center gap-2 px-4 py-3 text-left">
          <span className="text-sm font-semibold text-navy-800">{judul}</span>
          {ringkas && <span className="truncate text-xs text-muted-foreground">{ringkas}</span>}
          <ChevronDown className={cn("ml-auto size-4 shrink-0 transition", terbuka && "rotate-180")} aria-hidden />
        </button>
      </h2>
      {terbuka && <div className="grid gap-3 border-t px-4 py-4">{children}</div>}
    </section>
  );
}

const angkaAtau = (v: string, cadangan = 0) => { const n = Number(v.replace(",", ".")); return Number.isFinite(n) ? n : cadangan; };

export function EditorRkbu({ awal, opsi, bolehUbah, alasanBaca }: { awal: Awal; opsi: OpsiRkbu; bolehUbah: boolean; alasanBaca?: string }) {
  const [id, setId] = useState(awal.id);
  const [judulDok, setJudulDok] = useState(awal.judul);
  const [isi, setIsi] = useState<IsiRkbu>(awal.isi);
  const [versi, setVersi] = useState(awal.diperbarui);
  const [kotor, setKotor] = useState(false); // hanya perubahan yang dibuat pengguna (dokumen baru tanpa sentuhan bisa dibuat ulang)
  const [menyimpan, setMenyimpan] = useState(false);
  const [status, setStatus] = useState<{ ok?: string; error?: string; konflik?: boolean } | null>(null);
  const [aktif, setAktif] = useState<string | null>(null);
  const [buka, setBuka] = useState<Record<string, boolean>>({ tabel: true });
  const [zoom, setZoom] = useState<"pas" | number>("pas");
  const [cari, setCari] = useState("");
  const [ambil, setAmbil] = useState(false);
  const [unggah, setUnggah] = useState<string | null>(null);
  const bingkai = useRef<BingkaiApi>(null);
  const daftarRef = useRef<HTMLUListElement>(null);
  const pratinjau = useDeferredValue(isi);

  const ubah = useCallback((fn: (x: IsiRkbu) => IsiRkbu) => { setIsi(fn); setKotor(true); setStatus(null); }, []);
  const ubahBaris = (bid: string, p: Partial<BarisRkbu>) => ubah((x) => ({ ...x, baris: x.baris.map((b) => (b.id === bid ? { ...b, ...p } : b)) }));
  const toggle = (k: string) => setBuka((b) => ({ ...b, [k]: !b[k] }));
  const total = useMemo(() => totalRkbu(isi), [isi]);
  const u = ukuranKertas(isi.cetak);

  // peringatan saat meninggalkan halaman dengan perubahan belum disimpan
  useEffect(() => {
    if (!kotor || !bolehUbah) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [kotor, bolehUbah]);

  async function simpan(paksa = false) {
    if (!bolehUbah || menyimpan) return;
    setMenyimpan(true); setStatus(null);
    const r = await fetch(id ? `/api/admin/rkbu/${id}` : "/api/admin/rkbu", {
      method: id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ judul: judulDok, isi, versi, paksa }),
    }).catch(() => null);
    const j = (await r?.json().catch(() => ({}))) as { ok?: string; error?: string; id?: number; diperbarui?: string; konflik?: boolean };
    setMenyimpan(false);
    if (r?.ok && j.id) {
      setVersi(j.diperbarui ?? null); setKotor(false); setStatus({ ok: j.ok });
      if (!id) { setId(j.id); window.history.replaceState(null, "", `/rkbu/${j.id}`); }
    } else setStatus({ error: j.error ?? "Gagal menyimpan (periksa koneksi).", konflik: j.konflik });
  }

  // Ctrl/Cmd+S
  const simpanRef = useRef(simpan);
  simpanRef.current = simpan;
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); void simpanRef.current(); } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  function pilihDariPratinjau(bid: string) {
    setAktif(bid); setBuka((b) => ({ ...b, tabel: true })); setCari("");
    window.setTimeout(() => document.getElementById(`baris-${bid}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" }), 50);
  }

  async function unggahGambar(f: File, sisi: number): Promise<string | null> {
    if (!f.type.startsWith("image/") || f.size > GAMBAR_RKBU.maksAsli) { setStatus({ error: "Pilih gambar JPG/PNG (maks 25 MB)." }); return null; }
    try {
      setUnggah("Memperkecil gambar…");
      const b = await perkecilGambar(f, sisi, GAMBAR_RKBU.kualitas);
      const fd = new FormData();
      fd.set("gambar", new File([b], "gambar.jpg", { type: "image/jpeg" }));
      const r = await unggahDenganKemajuan("/api/admin/rkbu/gambar", fd, (p) => setUnggah(`Mengunggah… ${p}%`));
      if (r.status === 200) return String(r.data.gambar);
      setStatus({ error: String(r.data.error ?? `Gagal mengunggah (kode ${r.status}).`) });
    } catch { setStatus({ error: "Gambar tidak dapat diproses." }); } finally { setUnggah(null); }
    return null;
  }

  function aturPpn(v: number) {
    ubah((x) => ({ ...x, ppn: v, kolom: { ...x.kolom, kelompokHarga: /\(\s*[\d.,]+\s*%\s*\)/.test(x.kolom.kelompokHarga) ? x.kolom.kelompokHarga.replace(/\(\s*[\d.,]+\s*%\s*\)/, `(${v}%)`) : x.kolom.kelompokHarga } }));
  }

  function aturMeta(p: Partial<Pick<IsiRkbu, "jenis" | "tahun" | "tahap">>) {
    ubah((x) => {
      const lamaBawaan = judulBawaan(x.jenis, x.tahap, x.tahun);
      const baru = { ...x, ...p };
      const sama = x.judul.length === 3 && x.judul.every((j, i) => j === lamaBawaan[i]);
      return sama ? { ...baru, judul: judulBawaan(baru.jenis, baru.tahap, baru.tahun) } : baru;
    });
  }

  const pindah = <T,>(arr: T[], i: number, arah: -1 | 1) => { const j = i + arah; if (j < 0 || j >= arr.length) return arr; const a = [...arr]; [a[i], a[j]] = [a[j], a[i]]; return a; };
  const tampilBaris = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return isi.baris.map((b, i) => ({ b, i })).filter(({ b }) => !q || `${b.barang} ${b.uraian} ${b.lokasi} ${b.rekening} ${b.keterangan}`.toLowerCase().includes(q));
  }, [isi.baris, cari]);
  const daftarSatuan = useMemo(() => [...new Set(["Unit", "Set", "Paket", "Kali", "Bulan", "Tahun", "Buah", ...isi.baris.flatMap((b) => [b.satuan1, b.satuan2])].filter(Boolean))], [isi.baris]);
  const daftarRekening = useMemo(() => [...new Set([...isi.baris.map((b) => b.rekening), ...opsi.rekening].filter(Boolean))], [isi.baris, opsi.rekening]);

  const namaBerkas = judulDok.trim() || `${isi.jenis === "Pengadaan" ? "RKBU" : "RKPBU"} ${isi.tahap} ${isi.tahun}`;

  return (
    <div className="grid gap-4">
      {/* ── Bilah alat ── */}
      <div className="sticky top-16 z-20 -mx-1 flex flex-wrap items-center gap-2 rounded-xl border bg-card/95 p-2 shadow-card backdrop-blur">
        <Button asChild variant="ghost" size="sm"><Link href="/rkbu"><ArrowLeft /> <span className="hidden sm:inline">Daftar</span></Link></Button>
        <Input aria-label="Nama dokumen" value={judulDok} onChange={(e) => { setJudulDok(e.target.value); setKotor(true); }} maxLength={200} className="h-9 min-w-[12rem] flex-1 text-sm font-semibold" placeholder="Nama dokumen, mis. RKPBU Elektromedik Perubahan 2026" />
        <span className={cn("hidden text-xs md:inline", kotor || id === null ? "text-amber-700" : "text-emerald-700")} aria-live="polite">
          {menyimpan ? "Menyimpan…" : kotor || id === null ? (bolehUbah ? "Belum disimpan" : "Perubahan hanya untuk cetak") : <span className="inline-flex items-center gap-1"><Check className="size-3.5" /> Tersimpan</span>}
        </span>
        <Button type="button" variant="teal" size="sm" onClick={() => simpan()} disabled={!bolehUbah || menyimpan} title={bolehUbah ? "Simpan (Ctrl+S)" : alasanBaca}>{menyimpan ? <Loader2 className="animate-spin" /> : <Save />} Simpan</Button>
        <Button type="button" size="sm" onClick={() => bingkai.current?.cetak(namaBerkas)}><Printer /> Cetak / Simpan PDF</Button>
        <Button type="button" variant="outline" size="sm" onClick={() => unduhExcelRkbu(isi, namaBerkas)}><FileSpreadsheet /> Excel</Button>
        <Select aria-label="Perbesaran pratinjau" value={String(zoom)} onChange={(e) => setZoom(e.target.value === "pas" ? "pas" : Number(e.target.value))} className="h-9 w-28 text-sm">
          <option value="pas">Pas lebar</option><option value="0.5">50%</option><option value="0.75">75%</option><option value="1">100%</option><option value="1.25">125%</option>
        </Select>
      </div>
      {(status || !bolehUbah) && (
        <div role={status?.error ? "alert" : "status"} className={cn("flex flex-wrap items-center gap-3 rounded-lg px-3 py-2 text-sm", status?.error ? "bg-red-50 text-red-800" : status?.ok ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900")}>
          {status?.error ?? status?.ok ?? alasanBaca}
          {status?.konflik && <Button type="button" size="sm" variant="outline" onClick={() => simpan(true)}>Timpa dengan versi saya</Button>}
        </div>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[400px_minmax(0,1fr)] [&>*]:min-w-0">
        {/* ── Panel isian ── */}
        <div className="grid content-start gap-3 lg:sticky lg:top-32 lg:max-h-[calc(100dvh-9rem)] lg:overflow-y-auto lg:pb-24 lg:pr-1">
          <Panel judul="Dokumen" ringkas={`${isi.jenis} · ${isi.tahap} ${isi.tahun}`} terbuka={Boolean(buka.dokumen)} onToggle={() => toggle("dokumen")}>
            <div className="grid grid-cols-3 gap-2">
              <Bid label="Jenis"><Select value={isi.jenis} onChange={(e) => aturMeta({ jenis: e.target.value as IsiRkbu["jenis"] })} className={kecil}><option>Pemeliharaan</option><option>Pengadaan</option></Select></Bid>
              <Bid label="Tahap"><Select value={isi.tahap} onChange={(e) => aturMeta({ tahap: e.target.value })} className={kecil}>{[...new Set([...TAHAP_URUT, isi.tahap])].map((t) => <option key={t}>{t}</option>)}</Select></Bid>
              <Bid label="Tahun"><Input type="number" min={2000} max={2100} value={isi.tahun} onChange={(e) => aturMeta({ tahun: Math.round(angkaAtau(e.target.value, isi.tahun)) })} className={kecil} /></Bid>
            </div>
            <p className="text-xs text-muted-foreground">Judul dokumen ikut berubah selama belum Anda ubah manual.</p>
          </Panel>

          <Panel judul={`Tabel kebutuhan (${isi.baris.length} baris)`} ringkas={`Rp ${angkaRkbu(total)}`} terbuka={Boolean(buka.tabel)} onToggle={() => toggle("tabel")}>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => { const b = barisKosong(); ubah((x) => ({ ...x, baris: [...x.baris, b] })); setAktif(b.id); setCari(""); }}><Plus /> Baris</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setAmbil(true)}><Database /> Ambil dari data Paket</Button>
              {isi.baris.length > 0 && <Button type="button" size="sm" variant="ghost" onClick={() => { if (window.confirm(`Hapus semua ${isi.baris.length} baris?`)) ubah((x) => ({ ...x, baris: [] })); }}><Trash2 /> Kosongkan</Button>}
            </div>
            <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2">
              <span className="text-xs font-medium text-navy-700">PPN (%)</span>
              <Input type="number" min={0} max={100} step="0.5" value={isi.ppn} onChange={(e) => aturPpn(angkaAtau(e.target.value, isi.ppn))} className={cn(kecil, "w-24")} aria-label="PPN persen" />
            </div>
            <p className="text-xs text-muted-foreground">Jumlah = Vol 1 × Vol 2 × Harga satuan × (1 + PPN). Klik baris di pratinjau untuk mengubahnya.</p>
            {isi.baris.length > 8 && (
              <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari baris (barang, lokasi, rekening)…" className={cn(kecil, "pl-9")} aria-label="Cari baris" /></div>
            )}
            <ul ref={daftarRef} className="grid gap-1.5">
              {tampilBaris.map(({ b, i }) => (
                <li key={b.id} id={`baris-${b.id}`} className={cn("rounded-lg border", aktif === b.id ? "border-teal-400 bg-teal-50/40" : "bg-card")}>
                  <div className="flex items-center gap-1 p-1.5">
                    <button type="button" onClick={() => setAktif((a) => (a === b.id ? null : b.id))} aria-expanded={aktif === b.id} className="min-w-0 flex-1 rounded px-1.5 py-0.5 text-left">
                      <span className="flex items-baseline gap-1.5"><span className="text-xs tabular-nums text-muted-foreground">{i + 1}.</span><span className="truncate text-sm font-medium text-navy-800">{b.barang || "(barang/jasa belum diisi)"}</span></span>
                      <span className="block truncate text-xs text-muted-foreground">{b.lokasi || "—"} · Rp {angkaRkbu(jumlahBaris(b, isi.ppn))}{b.jumlahManual !== null ? " (manual)" : ""}</span>
                    </button>
                    <Button type="button" variant="ghost" size="icon" className="size-7" disabled={i === 0} onClick={() => ubah((x) => ({ ...x, baris: pindah(x.baris, i, -1) }))} aria-label={`Naikkan baris ${i + 1}`}><ArrowUp className="size-3.5" /></Button>
                    <Button type="button" variant="ghost" size="icon" className="size-7" disabled={i === isi.baris.length - 1} onClick={() => ubah((x) => ({ ...x, baris: pindah(x.baris, i, 1) }))} aria-label={`Turunkan baris ${i + 1}`}><ArrowDown className="size-3.5" /></Button>
                    <Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => { const c = { ...b, id: idBaru(), paketKode: undefined }; ubah((x) => ({ ...x, baris: [...x.baris.slice(0, i + 1), c, ...x.baris.slice(i + 1)] })); setAktif(c.id); }} aria-label={`Gandakan baris ${i + 1}`}><Copy className="size-3.5" /></Button>
                    <Button type="button" variant="ghost" size="icon" className="size-7 text-red-700" onClick={() => ubah((x) => ({ ...x, baris: x.baris.filter((y) => y.id !== b.id) }))} aria-label={`Hapus baris ${i + 1}`}><Trash2 className="size-3.5" /></Button>
                  </div>
                  {aktif === b.id && (
                    <div className="grid grid-cols-2 gap-2 border-t p-3">
                      <Bid label="Kode rekening" className="col-span-2"><Input list="rkbu-rekening" value={b.rekening} onChange={(e) => ubahBaris(b.id, { rekening: e.target.value })} className={kecil} placeholder="2.6.2002 Pemeliharaan Alat Kesehatan / Alat" /></Bid>
                      <Bid label={isi.kolom.barang} className="col-span-2"><textarea rows={2} value={b.barang} onChange={(e) => ubahBaris(b.id, { barang: e.target.value })} className={area} /></Bid>
                      <Bid label={isi.kolom.uraian} className="col-span-2"><textarea rows={3} value={b.uraian} onChange={(e) => ubahBaris(b.id, { uraian: e.target.value })} className={area} /></Bid>
                      <Bid label={isi.kolom.lokasi}><Input value={b.lokasi} onChange={(e) => ubahBaris(b.id, { lokasi: e.target.value })} className={kecil} /></Bid>
                      <Bid label={isi.kolom.kodeBarang}><Input value={b.kodeBarang} onChange={(e) => ubahBaris(b.id, { kodeBarang: e.target.value })} className={kecil} /></Bid>
                      <Bid label="Vol 1"><Input type="number" min={0} step="any" value={b.vol1} onChange={(e) => ubahBaris(b.id, { vol1: angkaAtau(e.target.value) })} className={kecil} /></Bid>
                      <Bid label="Satuan 1"><Input list="rkbu-satuan" value={b.satuan1} onChange={(e) => ubahBaris(b.id, { satuan1: e.target.value })} className={kecil} /></Bid>
                      <Bid label="Vol 2"><Input type="number" min={0} step="any" value={b.vol2} onChange={(e) => ubahBaris(b.id, { vol2: angkaAtau(e.target.value) })} className={kecil} /></Bid>
                      <Bid label="Satuan 2"><Input list="rkbu-satuan" value={b.satuan2} onChange={(e) => ubahBaris(b.id, { satuan2: e.target.value })} className={kecil} /></Bid>
                      <Bid label="Harga satuan (Rp, sebelum PPN)" className="col-span-2"><Input type="number" min={0} step="1" value={b.harga} onChange={(e) => ubahBaris(b.id, { harga: angkaAtau(e.target.value) })} className={kecil} /></Bid>
                      <label className="col-span-2 flex items-center gap-2 text-xs text-navy-700">
                        <input type="checkbox" checked={b.jumlahManual === null} onChange={(e) => ubahBaris(b.id, { jumlahManual: e.target.checked ? null : jumlahBaris({ ...b, jumlahManual: null }, isi.ppn) })} className="size-4 accent-teal-600" />
                        Jumlah dihitung otomatis {b.jumlahManual === null && <b className="ml-auto tabular-nums">Rp {angkaRkbu(jumlahBaris(b, isi.ppn))}</b>}
                      </label>
                      {b.jumlahManual !== null && <Bid label="Jumlah (Rp, manual)" className="col-span-2"><Input type="number" min={0} step="1" value={b.jumlahManual} onChange={(e) => ubahBaris(b.id, { jumlahManual: angkaAtau(e.target.value) })} className={kecil} /></Bid>}
                      <Bid label={isi.kolom.prioritas}><Input list="rkbu-prioritas" value={b.prioritas} onChange={(e) => ubahBaris(b.id, { prioritas: e.target.value })} className={kecil} /></Bid>
                      <Bid label={isi.kolom.keterangan}><Input value={b.keterangan} onChange={(e) => ubahBaris(b.id, { keterangan: e.target.value })} className={kecil} /></Bid>
                      {b.paketKode && <p className="col-span-2 text-[11px] text-muted-foreground">Dari paket {b.paketKode}. Perubahan di sini tidak mengubah data Paket.</p>}
                    </div>
                  )}
                </li>
              ))}
              {cari && tampilBaris.length === 0 && <li className="text-sm text-muted-foreground">Tidak ada baris cocok.</li>}
            </ul>
            <datalist id="rkbu-satuan">{daftarSatuan.map((s) => <option key={s} value={s} />)}</datalist>
            <datalist id="rkbu-prioritas">{["PP 1", "PP 2", "PP 3"].map((s) => <option key={s} value={s} />)}</datalist>
            <datalist id="rkbu-rekening">{daftarRekening.map((s) => <option key={s} value={s} />)}</datalist>
          </Panel>

          <Panel judul="Judul & identitas" terbuka={Boolean(buka.judul)} onToggle={() => toggle("judul")}>
            {isi.judul.map((j, i) => (
              <div key={i} className="flex gap-1">
                <Input aria-label={`Judul baris ${i + 1}`} value={j} onChange={(e) => ubah((x) => ({ ...x, judul: x.judul.map((y, k) => (k === i ? e.target.value : y)) }))} className={cn(kecil, "font-semibold")} />
                <Button type="button" variant="ghost" size="icon" className="size-9" onClick={() => ubah((x) => ({ ...x, judul: x.judul.filter((_, k) => k !== i) }))} aria-label={`Hapus judul baris ${i + 1}`}><X className="size-4" /></Button>
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              {isi.judul.length < 6 && <Button type="button" variant="outline" size="sm" onClick={() => ubah((x) => ({ ...x, judul: [...x.judul, ""] }))}><Plus /> Baris judul</Button>}
              <Button type="button" variant="ghost" size="sm" onClick={() => ubah((x) => ({ ...x, judul: judulBawaan(x.jenis, x.tahap, x.tahun) }))}><RotateCcw /> Judul bawaan</Button>
            </div>
            <p className="pt-1 text-xs font-semibold text-navy-800">Identitas (di atas tabel)</p>
            {isi.identitas.map((it, i) => (
              <div key={i} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto] gap-1">
                <Input aria-label={`Label identitas ${i + 1}`} value={it.label} onChange={(e) => ubah((x) => ({ ...x, identitas: x.identitas.map((y, k) => (k === i ? { ...y, label: e.target.value } : y)) }))} className={kecil} />
                <Input aria-label={`Isi identitas ${i + 1}`} value={it.nilai} onChange={(e) => ubah((x) => ({ ...x, identitas: x.identitas.map((y, k) => (k === i ? { ...y, nilai: e.target.value } : y)) }))} className={kecil} />
                <Button type="button" variant="ghost" size="icon" className="size-9" onClick={() => ubah((x) => ({ ...x, identitas: x.identitas.filter((_, k) => k !== i) }))} aria-label={`Hapus identitas ${i + 1}`}><X className="size-4" /></Button>
              </div>
            ))}
            {isi.identitas.length < 12 && <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => ubah((x) => ({ ...x, identitas: [...x.identitas, { label: "", nilai: "" }] }))}><Plus /> Identitas</Button>}
          </Panel>

          <Panel judul="Kop surat" ringkas={isi.kop.tampil ? (isi.kop.logo ? "dengan logo" : "tanpa logo") : "disembunyikan"} terbuka={Boolean(buka.kop)} onToggle={() => toggle("kop")}>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isi.kop.tampil} onChange={(e) => ubah((x) => ({ ...x, kop: { ...x.kop, tampil: e.target.checked } }))} className="size-4 accent-teal-600" /> Tampilkan kop surat</label>
            <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- gambar dari API sendiri */}
              {isi.kop.logo ? <img src={urlGambarRkbu(isi.kop.logo)!} alt="Logo kop" className="size-14 object-contain" /> : <span className="flex size-14 items-center justify-center rounded-full border-2 border-dashed text-[10px] text-muted-foreground">Logo</span>}
              <div className="grid gap-1">
                <Button asChild variant="outline" size="sm" disabled={!bolehUbah || Boolean(unggah)}>
                  <label className={cn("cursor-pointer", !bolehUbah && "pointer-events-none opacity-50")}>{unggah ? <Loader2 className="animate-spin" /> : <ImagePlus />} {isi.kop.logo ? "Ganti logo" : "Unggah logo"}
                    <input type="file" accept="image/*" className="sr-only" disabled={!bolehUbah} onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (!f) return; const g = await unggahGambar(f, GAMBAR_RKBU.sisiLogo); if (g) ubah((x) => ({ ...x, kop: { ...x.kop, logo: g } })); }} />
                  </label>
                </Button>
                {isi.kop.logo && <Button type="button" variant="ghost" size="sm" onClick={() => ubah((x) => ({ ...x, kop: { ...x.kop, logo: null } }))}><Trash2 /> Lepas logo</Button>}
              </div>
              <p className="w-full text-xs text-muted-foreground">Mis. lambang Pemprov DKI Jakarta (PNG/JPG). Cukup sekali — dokumen baru memakai kop dokumen terakhir.</p>
            </div>
            {(["pemerintah", "nama", "alamat", "kontak", "kota", "kodePos"] as const).map((k) => (
              <Bid key={k} label={{ pemerintah: "Instansi induk", nama: "Nama rumah sakit", alamat: "Alamat & telepon", kontak: "Website & e-mail", kota: "Kota", kodePos: "Kode pos (kanan)" }[k]}>
                <Input value={isi.kop[k]} onChange={(e) => ubah((x) => ({ ...x, kop: { ...x.kop, [k]: e.target.value } }))} className={kecil} />
              </Bid>
            ))}
            <Button type="button" variant="ghost" size="sm" className="justify-self-start" onClick={() => ubah((x) => ({ ...x, kop: { ...KOP_BAWAAN, logo: x.kop.logo, tampil: x.kop.tampil } }))}><RotateCcw /> Teks kop bawaan</Button>
          </Panel>

          <Panel judul="Tanda tangan" ringkas={`${isi.pengesahan.ttd.length} penandatangan`} terbuka={Boolean(buka.ttd)} onToggle={() => toggle("ttd")}>
            <Bid label="Kalimat pembuka"><Input value={isi.pengesahan.pembuka} onChange={(e) => ubah((x) => ({ ...x, pengesahan: { ...x.pengesahan, pembuka: e.target.value } }))} className={kecil} /></Bid>
            <Bid label="Tempat & tanggal (di atas penandatangan terakhir, opsional)">
              <div className="flex gap-1">
                <Input value={isi.pengesahan.tempatTanggal} onChange={(e) => ubah((x) => ({ ...x, pengesahan: { ...x.pengesahan, tempatTanggal: e.target.value } }))} placeholder="Jakarta, 13 November 2026" className={kecil} />
                <Button type="button" variant="outline" size="sm" onClick={() => ubah((x) => ({ ...x, pengesahan: { ...x.pengesahan, tempatTanggal: `Jakarta, ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}` } }))}>Hari ini</Button>
              </div>
            </Bid>
            {isi.pengesahan.ttd.map((t, i) => (
              <div key={i} className="grid gap-2 rounded-lg border p-3">
                <div className="flex items-center justify-between"><span className="text-xs font-semibold text-navy-800">Penandatangan {i + 1}</span>
                  <span className="flex gap-0.5">
                    <Button type="button" variant="ghost" size="icon" className="size-7" disabled={i === 0} onClick={() => ubah((x) => ({ ...x, pengesahan: { ...x.pengesahan, ttd: pindah(x.pengesahan.ttd, i, -1) } }))} aria-label={`Geser penandatangan ${i + 1} ke kiri`}><ArrowUp className="size-3.5 -rotate-90" /></Button>
                    <Button type="button" variant="ghost" size="icon" className="size-7" disabled={i === isi.pengesahan.ttd.length - 1} onClick={() => ubah((x) => ({ ...x, pengesahan: { ...x.pengesahan, ttd: pindah(x.pengesahan.ttd, i, 1) } }))} aria-label={`Geser penandatangan ${i + 1} ke kanan`}><ArrowDown className="size-3.5 -rotate-90" /></Button>
                    <Button type="button" variant="ghost" size="icon" className="size-7 text-red-700" onClick={() => ubah((x) => ({ ...x, pengesahan: { ...x.pengesahan, ttd: x.pengesahan.ttd.filter((_, k) => k !== i) } }))} aria-label={`Hapus penandatangan ${i + 1}`}><Trash2 className="size-3.5" /></Button>
                  </span>
                </div>
                <Bid label="Jabatan (boleh beberapa baris)"><textarea rows={3} value={t.jabatan} onChange={(e) => ubah((x) => ({ ...x, pengesahan: { ...x.pengesahan, ttd: x.pengesahan.ttd.map((y, k) => (k === i ? { ...y, jabatan: e.target.value } : y)) } }))} className={area} /></Bid>
                <div className="grid grid-cols-2 gap-2">
                  <Bid label="Nama"><Input value={t.nama} onChange={(e) => ubah((x) => ({ ...x, pengesahan: { ...x.pengesahan, ttd: x.pengesahan.ttd.map((y, k) => (k === i ? { ...y, nama: e.target.value } : y)) } }))} className={kecil} /></Bid>
                  <Bid label="NIP"><Input value={t.nip} inputMode="numeric" onChange={(e) => ubah((x) => ({ ...x, pengesahan: { ...x.pengesahan, ttd: x.pengesahan.ttd.map((y, k) => (k === i ? { ...y, nip: e.target.value } : y)) } }))} className={kecil} /></Bid>
                </div>
              </div>
            ))}
            {isi.pengesahan.ttd.length < 4 && <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => ubah((x) => ({ ...x, pengesahan: { ...x.pengesahan, ttd: [...x.pengesahan.ttd, { jabatan: "", nama: "", nip: "" }] } }))}><Plus /> Penandatangan</Button>}
            <p className="text-xs text-muted-foreground">Nama & NIP cukup diisi sekali; dokumen baru menyalin dari dokumen terakhir yang disimpan.</p>
          </Panel>

          <Panel judul="Catatan kaki" ringkas={`${isi.catatan.filter((c) => c.trim()).length} catatan`} terbuka={Boolean(buka.catatan)} onToggle={() => toggle("catatan")}>
            {isi.catatan.map((c, i) => (
              <div key={i} className="flex gap-1">
                <textarea aria-label={`Catatan ${i + 1}`} rows={2} value={c} onChange={(e) => ubah((x) => ({ ...x, catatan: x.catatan.map((y, k) => (k === i ? e.target.value : y)) }))} className={area} />
                <Button type="button" variant="ghost" size="icon" className="size-9 shrink-0" onClick={() => ubah((x) => ({ ...x, catatan: x.catatan.filter((_, k) => k !== i) }))} aria-label={`Hapus catatan ${i + 1}`}><X className="size-4" /></Button>
              </div>
            ))}
            {isi.catatan.length < 12 && <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => ubah((x) => ({ ...x, catatan: [...x.catatan, ""] }))}><Plus /> Catatan</Button>}
          </Panel>

          <Panel judul="Lampiran" ringkas={`${isi.lampiran.length} gambar · 2 per halaman`} terbuka={Boolean(buka.lampiran)} onToggle={() => toggle("lampiran")}>
            {isi.lampiran.map((l, i) => (
              <div key={l.id} className="grid gap-2 rounded-lg border p-3">
                <div className="flex items-center justify-between"><span className="text-xs font-semibold text-teal-700">LAMPIRAN {i + 1}</span>
                  <span className="flex gap-0.5">
                    <Button type="button" variant="ghost" size="icon" className="size-7" disabled={i === 0} onClick={() => ubah((x) => ({ ...x, lampiran: pindah(x.lampiran, i, -1) }))} aria-label={`Naikkan lampiran ${i + 1}`}><ArrowUp className="size-3.5" /></Button>
                    <Button type="button" variant="ghost" size="icon" className="size-7" disabled={i === isi.lampiran.length - 1} onClick={() => ubah((x) => ({ ...x, lampiran: pindah(x.lampiran, i, 1) }))} aria-label={`Turunkan lampiran ${i + 1}`}><ArrowDown className="size-3.5" /></Button>
                    <Button type="button" variant="ghost" size="icon" className="size-7 text-red-700" onClick={() => ubah((x) => ({ ...x, lampiran: x.lampiran.filter((y) => y.id !== l.id) }))} aria-label={`Hapus lampiran ${i + 1}`}><Trash2 className="size-3.5" /></Button>
                  </span>
                </div>
                <Bid label="Judul lampiran"><Input value={l.judul} onChange={(e) => ubah((x) => ({ ...x, lampiran: x.lampiran.map((y) => (y.id === l.id ? { ...y, judul: e.target.value } : y)) }))} placeholder="Mis. Penawaran harga e-Katalog" className={kecil} /></Bid>
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element -- gambar dari API sendiri */}
                  {l.gambar ? <img src={urlGambarRkbu(l.gambar)!} alt="" className="h-14 w-20 rounded border object-contain" /> : <span className="flex h-14 w-20 items-center justify-center rounded border border-dashed text-[10px] text-muted-foreground">Belum ada</span>}
                  <Button asChild variant="outline" size="sm"><label className={cn("cursor-pointer", !bolehUbah && "pointer-events-none opacity-50")}><ImagePlus /> {l.gambar ? "Ganti gambar" : "Unggah gambar"}
                    <input type="file" accept="image/*" className="sr-only" disabled={!bolehUbah} onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (!f) return; const g = await unggahGambar(f, GAMBAR_RKBU.sisi); if (g) ubah((x) => ({ ...x, lampiran: x.lampiran.map((y) => (y.id === l.id ? { ...y, gambar: g } : y)) })); }} />
                  </label></Button>
                </div>
              </div>
            ))}
            {unggah && <p className="text-xs text-muted-foreground" aria-live="polite">{unggah}</p>}
            {isi.lampiran.length < MAKS_LAMPIRAN_RKBU && <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => ubah((x) => ({ ...x, lampiran: [...x.lampiran, { id: idBaru(), judul: "", gambar: null }] }))}><Plus /> Lampiran</Button>}
            <p className="text-xs text-muted-foreground">Lampiran dicetak di halaman tegak terpisah (2 gambar per halaman) dengan kop yang sama.</p>
          </Panel>

          <Panel judul="Judul kolom" terbuka={Boolean(buka.kolom)} onToggle={() => toggle("kolom")}>
            <div className="grid grid-cols-2 gap-2">
              {([...KOLOM_RKBU, "kelompokJumlah", "kelompokHarga"] as (KunciKolom | "kelompokJumlah" | "kelompokHarga")[]).map((k, i) => (
                <Bid key={k} label={k === "kelompokJumlah" ? "Kelompok kolom 7–11" : k === "kelompokHarga" ? "Kelompok kolom 12–13" : `Kolom ${i + 1}`}>
                  <Input value={isi.kolom[k]} onChange={(e) => ubah((x) => ({ ...x, kolom: { ...x.kolom, [k]: e.target.value } }))} className={kecil} />
                </Bid>
              ))}
            </div>
            <Button type="button" variant="ghost" size="sm" className="justify-self-start" onClick={() => ubah((x) => ({ ...x, kolom: { ...KOLOM_BAWAAN, uraian: x.jenis === "Pengadaan" ? "Uraian / Spesifikasi" : KOLOM_BAWAAN.uraian, kelompokHarga: `Harga Plus PPN (${x.ppn}%)` } }))}><RotateCcw /> Judul kolom bawaan</Button>
          </Panel>

          <Panel judul="Pengaturan cetak" ringkas={`${isi.cetak.kertas} ${isi.cetak.orientasi === "landscape" ? "lanskap" : "tegak"} · ${isi.cetak.huruf} pt`} terbuka={Boolean(buka.cetak)} onToggle={() => toggle("cetak")}>
            <div className="grid grid-cols-3 gap-2">
              <Bid label="Kertas"><Select value={isi.cetak.kertas} onChange={(e) => ubah((x) => ({ ...x, cetak: { ...x.cetak, kertas: e.target.value as "A4" | "F4" } }))} className={kecil}><option value="A4">A4</option><option value="F4">F4 / Folio</option></Select></Bid>
              <Bid label="Orientasi"><Select value={isi.cetak.orientasi} onChange={(e) => ubah((x) => ({ ...x, cetak: { ...x.cetak, orientasi: e.target.value as "landscape" | "portrait" } }))} className={kecil}><option value="landscape">Lanskap</option><option value="portrait">Tegak</option></Select></Bid>
              <Bid label="Huruf tabel (pt)"><Input type="number" min={6} max={12} step="0.5" value={isi.cetak.huruf} onChange={(e) => ubah((x) => ({ ...x, cetak: { ...x.cetak, huruf: Math.min(12, Math.max(6, angkaAtau(e.target.value, 8))) } }))} className={kecil} /></Bid>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isi.cetak.nomorHalaman} onChange={(e) => ubah((x) => ({ ...x, cetak: { ...x.cetak, nomorHalaman: e.target.checked } }))} className="size-4 accent-teal-600" /> Nomor halaman (Halaman x dari y)</label>
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={Boolean(isi.cetak.barisUtuh)} onChange={(e) => ubah((x) => ({ ...x, cetak: { ...x.cetak, barisUtuh: e.target.checked } }))} className="mt-0.5 size-4 accent-teal-600" /> <span>Jaga setiap baris tabel utuh dalam satu halaman <span className="block text-xs text-muted-foreground">Lebih rapi, tetapi uraian yang panjang membuat banyak ruang kosong & halaman bertambah.</span></span></label>
            <p className="text-xs text-muted-foreground">Di dialog cetak pilih <b>Simpan sebagai PDF</b> untuk berkas PDF, dan matikan &quot;Header dan footer&quot; browser agar rapi. Kepala tabel otomatis berulang di setiap halaman.</p>
          </Panel>
        </div>

        {/* ── Pratinjau ── */}
        <div className="grid min-w-0 gap-2">
          <p className="text-xs text-muted-foreground">Pratinjau {isi.cetak.kertas} {isi.cetak.orientasi === "landscape" ? "lanskap" : "tegak"} ({u.lebar} × {u.tinggi} mm). Pembagian halaman final tampil di dialog cetak.</p>
          <BingkaiCetak ref={bingkai} gaya={gayaCetak(pratinjau)} lebarMm={u.lebar} zoom={zoom} label="Pratinjau dokumen RKBU">
            <DokumenRkbu isi={pratinjau} aktif={aktif} onPilihBaris={pilihDariPratinjau} />
          </BingkaiCetak>
        </div>
      </div>

      {ambil && (
        <AmbilPaket opsi={opsi} awal={{ tahun: isi.tahun, tahap: isi.tahap, jenis: isi.jenis }} onTutup={() => setAmbil(false)}
          onAmbil={(baris, ppn, mode) => {
            if (mode === "ganti" && isi.baris.length && !window.confirm(`Ganti ${isi.baris.length} baris yang ada dengan ${baris.length} baris paket?`)) return;
            ubah((x) => ({ ...x, baris: mode === "ganti" ? baris : [...x.baris, ...baris] }));
            if (mode === "ganti" || !isi.baris.length) aturPpn(ppn);
            setAmbil(false); setAktif(null);
          }} />
      )}
    </div>
  );
}
