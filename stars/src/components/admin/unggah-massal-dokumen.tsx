"use client";

import { useState } from "react";
import { CheckCircle2, FileUp, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JENIS_UNGGAH_ALAT, TERIMA_DOKUMEN_ALAT } from "@/lib/dokumen-alat";

type Hasil = { berkas: string; dasar: string | null; kata: string | null; jumlah: number; jenis: string; alat: { kode: string; nama: string; model: string | null; nomorSeri: string | null }[] };
const DASAR: Record<string, string> = { seri: "Nomor seri", tipe: "Tipe/model", nama: "Nama alat" };
const pilihKelas = "h-9 rounded-md border bg-background px-2 text-sm";

/** Unggah massal dokumen alat: nama berkas memuat nomor seri, tipe, atau nama alat → otomatis ditautkan. */
export function UnggahMassalDokumen({ bolehSimpan }: { bolehSimpan: boolean }) {
  const [files, setFiles] = useState<File[]>([]);
  const [kunci, setKunci] = useState("otomatis");
  const [jenis, setJenis] = useState("OTOMATIS");
  const [hasil, setHasil] = useState<Hasil[] | null>(null);
  const [status, setStatus] = useState<Record<string, string>>({});
  const [proses, setProses] = useState(false);

  async function cocokkan(fs = files, k = kunci, j = jenis) {
    if (!fs.length) { setHasil(null); return; }
    const fd = new FormData(); fd.set("mode", "cocokkan"); fd.set("kunci", k); fd.set("jenis", j);
    fs.forEach((f) => fd.append("nama", f.name));
    const r = await fetch("/api/admin/alat/dokumen/massal", { method: "POST", body: fd });
    const x = await r.json(); setHasil(x.hasil ?? null); setStatus({});
  }
  async function unggah() {
    setProses(true);
    for (const f of files) {
      const h = hasil?.find((x) => x.berkas === f.name);
      if (!h?.jumlah) { setStatus((s) => ({ ...s, [f.name]: "× dilewati (tidak cocok)" })); continue; }
      const fd = new FormData(); fd.set("file", f); fd.set("kunci", kunci); fd.set("jenis", jenis);
      setStatus((s) => ({ ...s, [f.name]: "…" }));
      const r = await fetch("/api/admin/alat/dokumen/massal", { method: "POST", body: fd });
      const x = await r.json().catch(() => ({ error: "Gagal" }));
      setStatus((s) => ({ ...s, [f.name]: r.ok ? `✓ ${x.ok}` : `× ${x.error}` }));
    }
    setProses(false);
  }
  const cocok = hasil?.filter((h) => h.jumlah).length ?? 0;
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm">Berkas (boleh banyak sekaligus)
          <input type="file" multiple accept={TERIMA_DOKUMEN_ALAT} disabled={!bolehSimpan} className="text-sm"
            onChange={(e) => { const fs = [...(e.target.files ?? [])]; setFiles(fs); cocokkan(fs); }} />
        </label>
        <label className="grid gap-1 text-sm">Cocokkan berdasarkan
          <select className={pilihKelas} value={kunci} onChange={(e) => { setKunci(e.target.value); cocokkan(files, e.target.value); }}>
            <option value="otomatis">Otomatis (nomor seri › tipe › nama)</option>
            <option value="seri">Nomor seri (1 alat)</option>
            <option value="tipe">Tipe / model (semua alat bertipe sama)</option>
            <option value="nama">Nama alat (semua alat bernama sama)</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">Jenis dokumen
          <select className={pilihKelas} value={jenis} onChange={(e) => { setJenis(e.target.value); cocokkan(files, kunci, e.target.value); }}>
            <option value="OTOMATIS">Otomatis dari nama berkas</option>
            {JENIS_UNGGAH_ALAT.map((j) => <option key={j.kode} value={j.kode}>{j.label}</option>)}
          </select>
        </label>
        <Button variant="teal" disabled={!bolehSimpan || !cocok || proses} onClick={unggah}>{proses ? <Loader2 className="animate-spin" /> : <FileUp />} Unggah {cocok} berkas cocok</Button>
      </div>
      <p className="text-xs text-muted-foreground">Contoh nama berkas: <code>SN12345_BA_Penerimaan.pdf</code>, <code>B450_User_Manual.pdf</code> (tipe), <code>Infusion Pump SOP.pdf</code> (nama). Kata kunci jenis yang dikenali: user manual, service manual, SOP, AKD/AKL, kontrak, garansi, BA penerimaan/BAST, uji fungsi, uji coba, SP pemeliharaan/perbaikan.</p>
      {hasil && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left"><tr><th className="px-3 py-2">Berkas</th><th className="px-3 py-2">Cocok dengan</th><th className="px-3 py-2">Jenis</th><th className="px-3 py-2">Alat</th><th className="px-3 py-2">Status</th></tr></thead>
            <tbody>
              {hasil.map((h) => (
                <tr key={h.berkas} className="border-t align-top">
                  <td className="px-3 py-2 font-medium">{h.berkas}</td>
                  <td className="px-3 py-2">{h.dasar ? <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 className="size-4" /> {DASAR[h.dasar]}</span> : <span className="inline-flex items-center gap-1 text-red-700"><XCircle className="size-4" /> Tidak cocok</span>}</td>
                  <td className="px-3 py-2">{JENIS_UNGGAH_ALAT.find((j) => j.kode === h.jenis)?.singkat ?? h.jenis}</td>
                  <td className="px-3 py-2 text-xs">{h.jumlah ? <>{h.alat.map((a) => `${a.kode} · ${a.nama}${a.nomorSeri ? ` · SN ${a.nomorSeri}` : ""}`).join("; ")}{h.jumlah > h.alat.length ? ` … (+${h.jumlah - h.alat.length})` : ""} <strong>({h.jumlah} alat)</strong></> : "-"}</td>
                  <td className="px-3 py-2 text-xs">{status[h.berkas] ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
