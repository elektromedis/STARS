"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell, Copy, ExternalLink, FileUp, FlaskConical, KeyRound, Loader2, MapPin, Pencil, Plug, Plus, Radio, RefreshCw, Save, Search, Trash2, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { durasi, fNilai, fRentang, JENIS_LOKASI, LABEL_ALARM, relatif, tglJamWib, type JenisAlarm, type KunciStatusPantau } from "@/lib/monitoring";
import type { AlarmDaftar } from "@/lib/monitoring-data";
import { unggahDenganKemajuan } from "@/lib/gambar";
import { AkuiAlarm, kirim, Pesan } from "./aksi";
import { LencanaStatus } from "./grafik";
import { cn } from "@/lib/utils";

export type LokasiCms = {
  id: number; kode: string; nama: string; jenis: string; deskripsi: string | null; unitKerjaId: number | null; unit: string | null; alatId: number | null; alat: { kode: string; nama: string } | null;
  suhuMin: number | null; suhuMaks: number | null; lembapMin: number | null; lembapMaks: number | null; tundaAlarm: number; batasPutusMenit: number;
  penanggungJawab: string | null; aktif: boolean; terakhirWaktu: string | null; suhu: number | null; lembap: number | null;
  status: KunciStatusPantau; jumlahBacaan: number; sensor: { id: number; serial: string } | null;
};
export type SensorCms = { id: number; serial: string; nama: string | null; model: string | null; lokasiId: number | null; lokasi: { kode: string; nama: string } | null; tokenPetunjuk: string | null; terakhirTerhubung: string | null; baterai: number | null; sinyal: number | null; aktif: boolean };
type Tab = "lokasi" | "sensor" | "alarm" | "impor" | "integrasi";
type Hasil = { ok?: string; error?: string } | null;

const TAB: { k: Tab; l: string; ikon: typeof MapPin }[] = [
  { k: "lokasi", l: "Lokasi pantau", ikon: MapPin }, { k: "sensor", l: "Sensor", ikon: Radio }, { k: "alarm", l: "Alarm", ikon: Bell },
  { k: "impor", l: "Impor data logger", ikon: FileUp }, { k: "integrasi", l: "Integrasi & uji", ikon: Plug },
];
const ID_ALAT = "daftar-alat-monitoring";
const menitSejak = (iso: string | null) => (iso ? Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 60_000)) : null);
const angkaTeks = (v: number | null) => (v == null ? "" : String(v));
const Label = ({ t, children, className }: { t: string; children: React.ReactNode; className?: string }) => (
  <label className={cn("grid gap-1 text-xs font-medium text-navy-800", className)}><span>{t}</span>{children}</label>
);

function SalinTeks({ teks, label = "Salin" }: { teks: string; label?: string }) {
  const [disalin, setDisalin] = useState(false);
  return (
    <Button type="button" variant="outline" size="sm" onClick={async () => {
      try { await navigator.clipboard.writeText(teks); } catch {
        const t = document.createElement("textarea"); t.value = teks; document.body.appendChild(t); t.select(); try { document.execCommand("copy"); } catch { /* */ } t.remove();
      }
      setDisalin(true); setTimeout(() => setDisalin(false), 1500);
    }}><Copy /> {disalin ? "Tersalin" : label}</Button>
  );
}

function Kode({ children }: { children: string }) {
  return <pre className="max-w-full overflow-x-auto whitespace-pre rounded-md bg-navy-950 p-3 text-xs leading-relaxed text-navy-50">{children}</pre>;
}

// ================================================================ formulir lokasi
type IsianLokasi = {
  nama: string; jenis: string; deskripsi: string; unitKerjaId: string; alatTeks: string; suhuMin: string; suhuMaks: string; lembapMin: string; lembapMaks: string;
  tundaAlarm: string; batasPutusMenit: string; penanggungJawab: string; aktif: boolean;
};
const labelAlat = (a: { kode: string; nama: string; unit?: string }) => `${a.nama} — ${a.kode}${a.unit ? ` — ${a.unit}` : ""}`;

function FormLokasi({ awal, unit, alat, onSelesai }: { awal: LokasiCms | null; unit: { id: number; nama: string }[]; alat: { id: number; kode: string; nama: string; unit: string }[]; onSelesai: (pesan: string) => void }) {
  const router = useRouter();
  const [proses, mulai] = useTransition();
  const [hasil, setHasil] = useState<Hasil>(null);
  const petaAlat = useMemo(() => new Map(alat.map((a) => [labelAlat(a), a.id])), [alat]);
  const [v, setV] = useState<IsianLokasi>(() => awal ? {
    nama: awal.nama, jenis: awal.jenis, deskripsi: awal.deskripsi ?? "", unitKerjaId: awal.unitKerjaId ? String(awal.unitKerjaId) : "",
    alatTeks: awal.alat ? labelAlat({ ...awal.alat, unit: alat.find((a) => a.id === awal.alatId)?.unit }) : "",
    suhuMin: angkaTeks(awal.suhuMin), suhuMaks: angkaTeks(awal.suhuMaks), lembapMin: angkaTeks(awal.lembapMin), lembapMaks: angkaTeks(awal.lembapMaks),
    tundaAlarm: String(awal.tundaAlarm), batasPutusMenit: String(awal.batasPutusMenit), penanggungJawab: awal.penanggungJawab ?? "", aktif: awal.aktif,
  } : { nama: "", jenis: "Kulkas", deskripsi: "", unitKerjaId: "", alatTeks: "", suhuMin: "2", suhuMaks: "8", lembapMin: "", lembapMaks: "", tundaAlarm: "2", batasPutusMenit: "15", penanggungJawab: "", aktif: true });
  const set = (k: keyof IsianLokasi, x: string | boolean) => setV((o) => ({ ...o, [k]: x }));
  const alatId = v.alatTeks.trim() ? petaAlat.get(v.alatTeks.trim()) ?? null : null;
  const alatSalah = v.alatTeks.trim() !== "" && alatId == null;

  function gantiJenis(j: string) {
    const p = JENIS_LOKASI.find((x) => x.nama === j);
    setV((o) => ({ ...o, jenis: j, ...(p ? { suhuMin: angkaTeks(p.suhuMin), suhuMaks: angkaTeks(p.suhuMaks), lembapMin: angkaTeks(p.lembapMin), lembapMaks: angkaTeks(p.lembapMaks) } : {}) }));
  }
  function simpan(e: React.FormEvent) {
    e.preventDefault();
    if (alatSalah) { setHasil({ error: "Pilih alat dari daftar saran, atau kosongkan." }); return; }
    const num = (s: string) => (s.trim() === "" ? null : s.trim());
    const body = {
      nama: v.nama, jenis: v.jenis, deskripsi: v.deskripsi, unitKerjaId: v.unitKerjaId ? Number(v.unitKerjaId) : null, alatId,
      suhuMin: num(v.suhuMin), suhuMaks: num(v.suhuMaks), lembapMin: num(v.lembapMin), lembapMaks: num(v.lembapMaks),
      tundaAlarm: Number(v.tundaAlarm), batasPutusMenit: Number(v.batasPutusMenit), penanggungJawab: v.penanggungJawab, aktif: v.aktif,
    };
    mulai(async () => {
      const h = await kirim(awal ? `/api/admin/monitoring/lokasi/${awal.id}` : "/api/admin/monitoring/lokasi", body, awal ? "PUT" : "POST");
      setHasil(h);
      if (h.ok) { onSelesai(h.ok); router.refresh(); }
    });
  }
  const preset = JENIS_LOKASI.find((x) => x.nama === v.jenis);
  return (
    <form onSubmit={simpan} className="grid gap-3 rounded-xl border bg-muted/30 p-4">
      <p className="font-semibold text-navy-800">{awal ? `Ubah ${awal.kode}` : "Lokasi pantau baru"}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Label t="Nama lokasi *" className="sm:col-span-2"><Input value={v.nama} onChange={(e) => set("nama", e.target.value)} required minLength={2} maxLength={160} placeholder="mis. Kulkas Vaksin Farmasi Rawat Jalan" /></Label>
        <Label t="Jenis (mengisi batas contoh)"><Select value={v.jenis} onChange={(e) => gantiJenis(e.target.value)}>{JENIS_LOKASI.map((j) => <option key={j.nama} value={j.nama}>{j.nama}</option>)}</Select></Label>
        <Label t="Unit kerja"><Select value={v.unitKerjaId} onChange={(e) => set("unitKerjaId", e.target.value)}><option value="">— tidak ada —</option>{unit.map((u) => <option key={u.id} value={u.id}>{u.nama}</option>)}</Select></Label>
      </div>
      {preset && <p className="-mt-1 text-xs text-muted-foreground">{preset.keterangan}. Batas di bawah hanya contoh umum — sesuaikan dengan SOP RS &amp; petunjuk pabrikan.</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Label t="Suhu minimum (°C)"><Input type="number" step="0.1" inputMode="decimal" value={v.suhuMin} onChange={(e) => set("suhuMin", e.target.value)} placeholder="kosong = tanpa batas" /></Label>
        <Label t="Suhu maksimum (°C)"><Input type="number" step="0.1" inputMode="decimal" value={v.suhuMaks} onChange={(e) => set("suhuMaks", e.target.value)} placeholder="kosong = tanpa batas" /></Label>
        <Label t="Kelembapan min (%RH)"><Input type="number" step="1" min={0} max={100} value={v.lembapMin} onChange={(e) => set("lembapMin", e.target.value)} placeholder="opsional" /></Label>
        <Label t="Kelembapan maks (%RH)"><Input type="number" step="1" min={0} max={100} value={v.lembapMaks} onChange={(e) => set("lembapMaks", e.target.value)} placeholder="opsional" /></Label>
        <Label t="Alarm setelah … bacaan berturut-turut"><Input type="number" min={1} max={60} required value={v.tundaAlarm} onChange={(e) => set("tundaAlarm", e.target.value)} /></Label>
        <Label t="Terputus bila tanpa data > … menit (0 = abaikan)"><Input type="number" min={0} max={10080} required value={v.batasPutusMenit} onChange={(e) => set("batasPutusMenit", e.target.value)} /></Label>
        <Label t="Penanggung jawab"><Input value={v.penanggungJawab} onChange={(e) => set("penanggungJawab", e.target.value)} maxLength={200} placeholder="nama / jabatan" /></Label>
        <Label t="Alat inventaris yang dipantau">
          <Input list={ID_ALAT} value={v.alatTeks} onChange={(e) => set("alatTeks", e.target.value)} aria-invalid={alatSalah} placeholder="ketik nama / kode alat (opsional)" />
          {alatSalah && <span className="text-[11px] text-red-700">Pilih dari daftar saran.</span>}
        </Label>
      </div>
      <Label t="Keterangan"><textarea value={v.deskripsi} onChange={(e) => set("deskripsi", e.target.value)} maxLength={1000} rows={2} className="rounded-md border border-input bg-card px-3 py-2 text-sm font-normal" placeholder="mis. kulkas 2 pintu di ruang farmasi lantai 1, isi vaksin program imunisasi" /></Label>
      <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={v.aktif} onChange={(e) => set("aktif", e.target.checked)} className="size-4" /> Aktif dipantau</label>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" variant="teal" disabled={proses}>{proses ? <Loader2 className="animate-spin" /> : <Save />} {awal ? "Simpan perubahan" : "Tambah lokasi"}</Button>
        <Button type="button" variant="ghost" onClick={() => onSelesai("")}><X /> Batal</Button>
        <Pesan ok={hasil?.ok} error={hasil?.error} />
      </div>
      <datalist id={ID_ALAT}>{alat.map((a) => <option key={a.id} value={labelAlat(a)} />)}</datalist>
    </form>
  );
}

// ================================================================ formulir sensor
function FormSensor({ awal, lokasi, onSelesai, onToken }: { awal: SensorCms | null; lokasi: LokasiCms[]; onSelesai: (p: string) => void; onToken: (t: { serial: string; token: string }) => void }) {
  const router = useRouter();
  const [proses, mulai] = useTransition();
  const [hasil, setHasil] = useState<Hasil>(null);
  const [v, setV] = useState({ serial: awal?.serial ?? "", nama: awal?.nama ?? "", model: awal?.model ?? "", lokasiId: awal?.lokasiId ? String(awal.lokasiId) : "", aktif: awal?.aktif ?? true });
  const tujuan = lokasi.find((l) => String(l.id) === v.lokasiId);
  const diganti = tujuan?.sensor && tujuan.sensor.id !== awal?.id ? tujuan.sensor.serial : null;
  return (
    <form className="grid gap-3 rounded-xl border bg-muted/30 p-4" onSubmit={(e) => {
      e.preventDefault();
      mulai(async () => {
        const h = await kirim(awal ? `/api/admin/monitoring/sensor/${awal.id}` : "/api/admin/monitoring/sensor", { ...v, lokasiId: v.lokasiId ? Number(v.lokasiId) : null }, awal ? "PUT" : "POST");
        setHasil(h);
        if (h.ok) { if (h.data?.token) onToken({ serial: v.serial, token: h.data.token }); onSelesai(h.ok); router.refresh(); }
      });
    }}>
      <p className="font-semibold text-navy-800">{awal ? `Ubah sensor ${awal.serial}` : "Daftarkan sensor"}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Label t="Nomor seri / ID sensor *"><Input value={v.serial} onChange={(e) => setV({ ...v, serial: e.target.value })} required minLength={2} maxLength={80} placeholder="mis. ESP32-FARMASI-01 atau SN logger" /></Label>
        <Label t="Nama"><Input value={v.nama} onChange={(e) => setV({ ...v, nama: e.target.value })} maxLength={120} placeholder="opsional" /></Label>
        <Label t="Model"><Input value={v.model} onChange={(e) => setV({ ...v, model: e.target.value })} maxLength={120} placeholder="mis. ESP32 + SHT31" /></Label>
        <Label t="Pasang di lokasi"><Select value={v.lokasiId} onChange={(e) => setV({ ...v, lokasiId: e.target.value })}><option value="">— belum dipasang —</option>{lokasi.map((l) => <option key={l.id} value={l.id}>{l.kode} — {l.nama}{l.sensor && l.sensor.id !== awal?.id ? ` (kini: ${l.sensor.serial})` : ""}</option>)}</Select></Label>
      </div>
      {diganti && <p className="text-xs text-amber-800">Lokasi {tujuan!.kode} sedang memakai sensor {diganti}. Menyimpan akan <strong>mengganti</strong> sensor itu; riwayat bacaan tetap milik lokasi.</p>}
      <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={v.aktif} onChange={(e) => setV({ ...v, aktif: e.target.checked })} className="size-4" /> Aktif (boleh mengirim data)</label>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" variant="teal" disabled={proses}>{proses ? <Loader2 className="animate-spin" /> : <Save />} {awal ? "Simpan" : "Daftarkan & buat token"}</Button>
        <Button type="button" variant="ghost" onClick={() => onSelesai("")}><X /> Batal</Button>
        <Pesan ok={hasil?.ok} error={hasil?.error} />
      </div>
    </form>
  );
}

function contohKirim(alamat: string, token: string) {
  const url = `${alamat.replace(/\/+$/, "")}/api/iot/bacaan`;
  return {
    url,
    curl: `curl -X POST "${url}" \\\n  -H "Authorization: Bearer ${token}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"suhu": 4.6, "lembap": 55, "baterai": 90}'`,
    ps: `Invoke-RestMethod -Method Post -Uri "${url}" \`\n  -Headers @{ Authorization = "Bearer ${token}" } \`\n  -ContentType "application/json" \`\n  -Body '{"suhu": 4.6, "lembap": 55}'`,
  };
}

function KotakToken({ t, alamat, onTutup }: { t: { serial: string; token: string }; alamat: string; onTutup: () => void }) {
  const c = contohKirim(alamat, t.token);
  return (
    <div role="alert" className="grid gap-2 rounded-xl border-2 border-amber-400 bg-amber-50 p-4 text-sm text-amber-950">
      <p className="flex items-center gap-2 font-semibold"><KeyRound className="size-4" /> Token API sensor {t.serial} — simpan SEKARANG</p>
      <p className="text-xs">Token ini hanya ditampilkan sekali. Tanamkan di perangkat/gateway sebagai header <code>Authorization: Bearer …</code>. Bila hilang, buat token baru (token lama otomatis tidak berlaku).</p>
      <div className="flex flex-wrap items-center gap-2"><code className="break-all rounded bg-white px-2 py-1 font-mono text-xs text-navy-900">{t.token}</code><SalinTeks teks={t.token} label="Salin token" /></div>
      <details className="text-xs"><summary className="cursor-pointer font-medium">Contoh kirim bacaan uji (curl / PowerShell)</summary><div className="mt-2 grid gap-2"><Kode>{c.curl}</Kode><Kode>{c.ps}</Kode></div></details>
      <Button type="button" size="sm" variant="outline" className="justify-self-start" onClick={onTutup}>Sudah saya simpan</Button>
    </div>
  );
}

// ================================================================ impor data logger
type Pratinjau = {
  berkas: string; serial: string | null; model: string | null; kolom: { waktu: string; suhu: string | null; lembap: string | null }; urutan: string; urutanPasti: boolean; peringatan: string[];
  jumlah: number; awal: string; akhir: string; suhu: { min: number; maks: number } | null; lembap: { min: number; maks: number } | null; contoh: { waktu: string; suhu: number | null; lembap: number | null }[];
};
function PanelImpor({ lokasi, awal }: { lokasi: LokasiCms[]; awal: number | null }) {
  const router = useRouter();
  const [lokasiId, setLokasiId] = useState(awal ? String(awal) : lokasi[0] ? String(lokasi[0].id) : "");
  const [berkas, setBerkas] = useState<File | null>(null);
  const [urutan, setUrutan] = useState("auto");
  const [pr, setPr] = useState<Pratinjau | null>(null);
  const [hasil, setHasil] = useState<Hasil>(null);
  const [kemajuan, setKemajuan] = useState<number | null>(null);
  const masukan = useRef<HTMLInputElement>(null);
  async function jalan(simpan: boolean, urut = urutan) {
    if (!berkas || !lokasiId) return;
    const fd = new FormData();
    fd.set("lokasiId", lokasiId); fd.set("file", berkas); fd.set("urutan", urut); if (simpan) fd.set("simpan", "1");
    setHasil(null); setKemajuan(0);
    const r = await unggahDenganKemajuan("/api/admin/monitoring/impor", fd, setKemajuan);
    setKemajuan(null);
    if (r.status !== 200) { setHasil({ error: String(r.data.error ?? `Gagal (${r.status}).`) }); return; }
    if (simpan) { setHasil({ ok: String(r.data.ok) }); setPr(null); setBerkas(null); if (masukan.current) masukan.current.value = ""; router.refresh(); }
    else setPr(r.data.pratinjau as Pratinjau);
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><FileUp className="size-4 text-teal-700" /> Impor berkas data logger</CardTitle>
        <CardDescription>Untuk logger USB / tanpa WiFi (mis. LogTag TRIX-8, HAXO-8): unduh data dengan LogTag Analyzer, ekspor ke CSV/TXT/Excel, lalu impor di sini. Bacaan yang waktunya sudah ada dilewati, jadi aman mengimpor ulang berkas yang tumpang tindih.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_12rem]">
          <Label t="Lokasi tujuan"><Select value={lokasiId} onChange={(e) => { setLokasiId(e.target.value); setPr(null); }}>{lokasi.map((l) => <option key={l.id} value={l.id}>{l.kode} — {l.nama}</option>)}</Select></Label>
          <Label t="Berkas (CSV, TXT, Excel; maks 25 MB)"><input ref={masukan} type="file" accept=".csv,.txt,.tsv,.xlsx,.xls,.xlsm,.ods" onChange={(e) => { setBerkas(e.target.files?.[0] ?? null); setPr(null); setHasil(null); }} className="text-sm file:mr-3 file:rounded-md file:border file:bg-card file:px-3 file:py-1.5 file:text-sm" /></Label>
          <Label t="Urutan tanggal"><Select value={urutan} onChange={(e) => { setUrutan(e.target.value); if (pr) void jalan(false, e.target.value); }}>
            <option value="auto">Otomatis</option><option value="DMY">Hari/Bulan/Tahun</option><option value="MDY">Bulan/Hari/Tahun</option><option value="YMD">Tahun-Bulan-Hari</option>
          </Select></Label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" disabled={!berkas || !lokasiId || kemajuan != null} onClick={() => jalan(false)}>{kemajuan != null && !pr ? <Loader2 className="animate-spin" /> : <Search />} Pratinjau</Button>
          {kemajuan != null && <span className="text-xs text-muted-foreground">Mengunggah {kemajuan}%…</span>}
          <Pesan ok={hasil?.ok} error={hasil?.error} />
        </div>
        {pr && (
          <div className="grid gap-3 rounded-lg border p-3 text-sm">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
              <dt className="text-muted-foreground">Berkas</dt><dd className="break-all">{pr.berkas}{pr.serial ? ` · logger ${pr.serial}` : ""}{pr.model ? ` (${pr.model})` : ""}</dd>
              <dt className="text-muted-foreground">Kolom terbaca</dt><dd>waktu: <strong>{pr.kolom.waktu}</strong>{pr.kolom.suhu && <> · suhu: <strong>{pr.kolom.suhu}</strong></>}{pr.kolom.lembap && <> · lembap: <strong>{pr.kolom.lembap}</strong></>}</dd>
              <dt className="text-muted-foreground">Bacaan</dt><dd><strong>{pr.jumlah.toLocaleString("id-ID")}</strong> · {tglJamWib(pr.awal)} – {tglJamWib(pr.akhir)} WIB</dd>
              {pr.suhu && <><dt className="text-muted-foreground">Suhu</dt><dd>{fNilai("suhu", pr.suhu.min)} – {fNilai("suhu", pr.suhu.maks)}</dd></>}
              {pr.lembap && <><dt className="text-muted-foreground">Kelembapan</dt><dd>{fNilai("lembap", pr.lembap.min)} – {fNilai("lembap", pr.lembap.maks)}</dd></>}
              <dt className="text-muted-foreground">Urutan tanggal</dt><dd>{pr.urutan === "DMY" ? "Hari/Bulan/Tahun" : pr.urutan === "MDY" ? "Bulan/Hari/Tahun" : "Tahun-Bulan-Hari"}{!pr.urutanPasti && <strong className="text-amber-800"> (ambigu — periksa contoh di bawah)</strong>}</dd>
            </dl>
            {pr.peringatan.length > 0 && <ul className="list-disc pl-5 text-xs text-amber-800">{pr.peringatan.map((p) => <li key={p}>{p}</li>)}</ul>}
            <div className="overflow-x-auto"><table className="text-xs"><thead><tr className="text-left text-muted-foreground"><th className="pr-4">Waktu (WIB)</th><th className="pr-4 text-right">Suhu</th><th className="text-right">Kelembapan</th></tr></thead>
              <tbody>{pr.contoh.map((c) => <tr key={c.waktu}><td className="pr-4 tabular-nums">{tglJamWib(c.waktu)}</td><td className="pr-4 text-right tabular-nums">{fNilai("suhu", c.suhu, 2)}</td><td className="text-right tabular-nums">{fNilai("lembap", c.lembap, 1)}</td></tr>)}</tbody></table></div>
            <Button type="button" variant="teal" className="justify-self-start" disabled={kemajuan != null} onClick={() => jalan(true)}>{kemajuan != null ? <Loader2 className="animate-spin" /> : <FileUp />} Impor {pr.jumlah.toLocaleString("id-ID")} bacaan ke {lokasi.find((l) => String(l.id) === lokasiId)?.kode}</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ================================================================ integrasi & uji
function PanelIntegrasi({ lokasi, alamat, bolehAdmin }: { lokasi: LokasiCms[]; alamat: string; bolehAdmin: boolean }) {
  const router = useRouter();
  const [proses, mulai] = useTransition();
  const [uji, setUji] = useState({ lokasiId: lokasi[0] ? String(lokasi[0].id) : "", suhu: "5", lembap: "" });
  const [hasil, setHasil] = useState<Hasil>(null);
  const [hapus, setHapus] = useState<Hasil>(null);
  const c = contohKirim(alamat, "<TOKEN_SENSOR>");
  const json = `{\n  "suhu": 4.6,            // °C (alias: temperature, temp)\n  "lembap": 55,           // %RH (alias: humidity, rh) — opsional\n  "waktu": "2026-11-14T10:00:00+07:00",  // opsional, default = waktu server\n  "baterai": 87,          // % opsional\n  "sinyal": -61           // dBm opsional\n}\n\n// kiriman tertunda (setelah WiFi pulih), maks 5.000:\n{ "bacaan": [ { "waktu": 1763089200, "suhu": 4.5 }, { "waktu": 1763089260, "suhu": 4.6 } ] }`;
  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Plug className="size-4 text-teal-700" /> Cara sensor mengirim data</CardTitle>
          <CardDescription>Sensor apa pun yang bisa mengirim HTTPS (ESP32/ESP8266 + SHT31/DHT22/DS18B20, gateway LoRa/Zigbee, PLC) cukup mengirim JSON tiap 1 menit ke alamat ini dengan token sensornya. Panduan lengkap & contoh program ESP32 ada di <code>docs/MONITORING-IOT.md</code>.</CardDescription></CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <div className="flex flex-wrap items-center gap-2"><span className="font-medium">Alamat:</span><code className="break-all rounded bg-muted px-2 py-1 text-xs">POST {c.url}</code><SalinTeks teks={c.url} /></div>
          <p>Header: <code className="rounded bg-muted px-1 text-xs">Authorization: Bearer &lt;token sensor&gt;</code> dan <code className="rounded bg-muted px-1 text-xs">Content-Type: application/json</code>. Token dibuat saat mendaftarkan sensor (tab Sensor).</p>
          <Kode>{json}</Kode>
          <details><summary className="cursor-pointer font-medium">Contoh curl &amp; PowerShell</summary><div className="mt-2 grid gap-2"><Kode>{c.curl}</Kode><Kode>{c.ps}</Kode></div></details>
          <p className="text-xs text-muted-foreground">Balasan: <code className="break-all">{`{"ok":true,"lokasi":"LP-001","diterima":1,"duplikat":0,"status":"normal"}`}</code>. Kode 401 = token salah, 409 = sensor belum dipasang di lokasi, 429 = terlalu sering (&gt; 240 kiriman/menit).</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><FlaskConical className="size-4 text-teal-700" /> Kirim bacaan uji</CardTitle>
          <CardDescription>Mencoba alur alarm tanpa sensor. Bacaan uji ditandai &ldquo;uji&rdquo; dan bisa dihapus sekaligus.</CardDescription></CardHeader>
        <CardContent className="grid gap-3">
          <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); mulai(async () => { const h = await kirim("/api/admin/monitoring/uji", { lokasiId: Number(uji.lokasiId), suhu: uji.suhu === "" ? null : uji.suhu, lembap: uji.lembap === "" ? null : uji.lembap }); setHasil(h); if (h.ok) router.refresh(); }); }}>
            <Label t="Lokasi" className="min-w-[14rem]"><Select value={uji.lokasiId} onChange={(e) => setUji({ ...uji, lokasiId: e.target.value })}>{lokasi.map((l) => <option key={l.id} value={l.id}>{l.kode} — {l.nama}</option>)}</Select></Label>
            <Label t="Suhu (°C)" className="w-28"><Input type="number" step="0.1" value={uji.suhu} onChange={(e) => setUji({ ...uji, suhu: e.target.value })} /></Label>
            <Label t="Kelembapan (%RH)" className="w-32"><Input type="number" step="1" min={0} max={100} value={uji.lembap} onChange={(e) => setUji({ ...uji, lembap: e.target.value })} placeholder="opsional" /></Label>
            <Button type="submit" variant="teal" disabled={proses || !uji.lokasiId}>{proses ? <Loader2 className="animate-spin" /> : <FlaskConical />} Kirim</Button>
            <Pesan ok={hasil?.ok} error={hasil?.error} />
          </form>
          {bolehAdmin && uji.lokasiId && (
            <div className="flex flex-wrap items-center gap-2 border-t pt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => {
                const l = lokasi.find((x) => String(x.id) === uji.lokasiId);
                if (!l || !window.confirm(`Hapus SEMUA bacaan uji di ${l.kode} — ${l.nama}? Alarm yang belum diakui akan dihitung ulang.`)) return;
                mulai(async () => { const h = await kirim(`/api/admin/monitoring/lokasi/${l.id}/bacaan?sumber=uji`, {}, "DELETE"); setHapus(h); if (h.ok) router.refresh(); });
              }}><Trash2 /> Hapus bacaan uji lokasi ini</Button>
              <Pesan ok={hapus?.ok} error={hapus?.error} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ================================================================ utama
export function MonitoringManager({ lokasi, sensor, alarm, unit, alat, bolehUbah, bolehAdmin, alamat, lokasiAwal, tabAwal }: {
  lokasi: LokasiCms[]; sensor: SensorCms[]; alarm: AlarmDaftar[]; unit: { id: number; nama: string }[]; alat: { id: number; kode: string; nama: string; unit: string }[];
  bolehUbah: boolean; bolehAdmin: boolean; alamat: string; lokasiAwal: number | null; tabAwal: Tab | null;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(tabAwal ?? "lokasi");
  const [formLokasi, setFormLokasi] = useState<LokasiCms | "baru" | null>(() => (lokasiAwal && bolehUbah ? lokasi.find((l) => l.id === lokasiAwal) ?? null : null));
  const [formSensor, setFormSensor] = useState<SensorCms | "baru" | null>(null);
  const [token, setToken] = useState<{ serial: string; token: string } | null>(null);
  const [pesan, setPesan] = useState<Hasil>(null);
  const [proses, mulai] = useTransition();
  const [saringAlarm, setSaringAlarm] = useState<"perlu" | "semua">("perlu");
  const alarmTampil = alarm.filter((a) => saringAlarm === "semua" || !a.diakui || (!a.selesai && a.jenis !== "putus"));
  const perlu = alarm.filter((a) => !a.diakui || (!a.selesai && a.jenis !== "putus")).length;

  const aksi = (url: string, metode: string, konfirmasi: string, sesudah?: (d: { token?: string }) => void) => {
    if (!window.confirm(konfirmasi)) return;
    mulai(async () => { const h = await kirim(url, {}, metode); setPesan(h); if (h.ok) { sesudah?.(h.data ?? {}); router.refresh(); } });
  };

  return (
    <div className="grid gap-4">
      <div role="tablist" aria-label="Bagian monitoring" className="flex gap-1 overflow-x-auto rounded-xl border bg-card p-1 shadow-card">
        {TAB.map((t) => {
          const Ikon = t.ikon;
          return (
            <button key={t.k} type="button" role="tab" aria-selected={tab === t.k} onClick={() => setTab(t.k)}
              className={cn("inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium", tab === t.k ? "bg-teal-600 text-white" : "text-muted-foreground hover:bg-muted")}>
              <Ikon className="size-4" aria-hidden /> {t.l}{t.k === "alarm" && perlu > 0 && <span className={cn("rounded-full px-1.5 text-xs", tab === t.k ? "bg-white/25" : "bg-red-100 text-red-800")}>{perlu}</span>}
            </button>
          );
        })}
        <Link href="/monitoring" className="ml-auto inline-flex items-center gap-1 whitespace-nowrap px-3 py-2 text-sm font-medium text-teal-700 hover:underline"><ExternalLink className="size-4" /> Dashboard langsung</Link>
      </div>
      <Pesan ok={pesan?.ok} error={pesan?.error} />
      {token && <KotakToken t={token} alamat={alamat} onTutup={() => setToken(null)} />}

      {tab === "lokasi" && (
        <Card className="overflow-hidden">
          <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
            <div><CardTitle>Lokasi pantau ({lokasi.length})</CardTitle><CardDescription>Titik yang dipantau: kulkas, freezer, ruang alat. Sensor boleh diganti kapan saja — riwayat tetap milik lokasi.</CardDescription></div>
            {bolehUbah && !formLokasi && <Button variant="teal" onClick={() => setFormLokasi("baru")}><Plus /> Tambah lokasi</Button>}
          </CardHeader>
          {bolehUbah && formLokasi && <div className="px-5 pb-4"><FormLokasi key={formLokasi === "baru" ? "baru" : formLokasi.id} awal={formLokasi === "baru" ? null : formLokasi} unit={unit} alat={alat} onSelesai={(p) => { setFormLokasi(null); setPesan(p ? { ok: p } : null); }} /></div>}
          <div className="overflow-x-auto border-t">
            <Table>
              <TableHeader><TableRow className="hover:bg-transparent">
                <TableHead>Lokasi</TableHead><TableHead>Status</TableHead><TableHead>Batas</TableHead><TableHead>Aturan alarm</TableHead><TableHead>Sensor</TableHead><TableHead className="text-right">Bacaan</TableHead>{bolehUbah && <TableHead className="text-right">Aksi</TableHead>}
              </TableRow></TableHeader>
              <TableBody>
                {lokasi.length === 0 && <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Belum ada lokasi. {bolehUbah ? "Klik “Tambah lokasi”." : ""}</TableCell></TableRow>}
                {lokasi.map((l) => (
                  <TableRow key={l.id} className={cn(!l.aktif && "opacity-60")}>
                    <TableCell className="min-w-[13rem]"><Link href={`/monitoring/${l.kode}`} className="font-medium text-navy-800 hover:text-teal-700 hover:underline">{l.nama}</Link><div className="text-xs text-muted-foreground">{l.kode} · {l.jenis}{l.unit ? ` · ${l.unit}` : ""}{l.alat ? ` · ${l.alat.nama}` : ""}</div></TableCell>
                    <TableCell><LencanaStatus kunci={l.status} /><div className="mt-0.5 text-xs text-muted-foreground">{l.suhu != null ? fNilai("suhu", l.suhu) : ""}{l.lembap != null ? ` · ${fNilai("lembap", l.lembap)}` : ""}{l.terakhirWaktu ? ` · ${relatif(menitSejak(l.terakhirWaktu))}` : ""}</div></TableCell>
                    <TableCell className="whitespace-nowrap text-xs">Suhu {fRentang(l.suhuMin, l.suhuMaks, "suhu")}{(l.lembapMin != null || l.lembapMaks != null) && <div>Lembap {fRentang(l.lembapMin, l.lembapMaks, "lembap")}</div>}</TableCell>
                    <TableCell className="text-xs">{l.tundaAlarm} bacaan berturut-turut<div className="text-muted-foreground">{l.batasPutusMenit > 0 ? `putus > ${l.batasPutusMenit} mnt` : "putus tidak dipantau"}</div></TableCell>
                    <TableCell className="text-xs">{l.sensor ? l.sensor.serial : <span className="text-muted-foreground">belum ada</span>}</TableCell>
                    <TableCell className="text-right tabular-nums">{l.jumlahBacaan.toLocaleString("id-ID")}</TableCell>
                    {bolehUbah && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" title="Ubah" aria-label={`Ubah ${l.kode}`} onClick={() => setFormLokasi(l)}><Pencil /></Button>
                          {bolehAdmin && <Button size="sm" variant="ghost" title="Hapus" aria-label={`Hapus ${l.kode}`} disabled={proses}
                            onClick={() => aksi(`/api/admin/monitoring/lokasi/${l.id}`, "DELETE", `Hapus ${l.kode} — ${l.nama} beserta ${l.jumlahBacaan.toLocaleString("id-ID")} bacaan & seluruh alarmnya? Tindakan ini tidak bisa dibatalkan.\n\nUntuk berhenti memantau tanpa menghapus riwayat, ubah lokasi menjadi nonaktif.`)}><Trash2 className="text-red-600" /></Button>}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {tab === "sensor" && (
        <Card className="overflow-hidden">
          <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
            <div><CardTitle>Sensor ({sensor.length})</CardTitle><CardDescription>Setiap sensor punya token API sendiri. Satu lokasi = satu sensor aktif; memasang sensor baru di lokasi yang sama otomatis menggantikan yang lama.</CardDescription></div>
            {bolehUbah && !formSensor && <Button variant="teal" onClick={() => setFormSensor("baru")}><Plus /> Daftarkan sensor</Button>}
          </CardHeader>
          {bolehUbah && formSensor && <div className="px-5 pb-4"><FormSensor key={formSensor === "baru" ? "baru" : formSensor.id} awal={formSensor === "baru" ? null : formSensor} lokasi={lokasi} onToken={setToken} onSelesai={(p) => { setFormSensor(null); setPesan(p ? { ok: p } : null); }} /></div>}
          <div className="overflow-x-auto border-t">
            <Table>
              <TableHeader><TableRow className="hover:bg-transparent">
                <TableHead>Sensor</TableHead><TableHead>Lokasi</TableHead><TableHead>Token</TableHead><TableHead>Terakhir terhubung</TableHead><TableHead className="text-right">Baterai</TableHead><TableHead className="text-right">Sinyal</TableHead>{bolehUbah && <TableHead className="text-right">Aksi</TableHead>}
              </TableRow></TableHeader>
              <TableBody>
                {sensor.length === 0 && <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Belum ada sensor terdaftar.</TableCell></TableRow>}
                {sensor.map((s) => (
                  <TableRow key={s.id} className={cn(!s.aktif && "opacity-60")}>
                    <TableCell className="min-w-[11rem]"><span className="font-medium text-navy-800">{s.serial}</span><div className="text-xs text-muted-foreground">{[s.nama, s.model].filter(Boolean).join(" · ") || "–"}{!s.aktif ? " · nonaktif" : ""}</div></TableCell>
                    <TableCell className="text-xs">{s.lokasi ? `${s.lokasi.kode} — ${s.lokasi.nama}` : <span className="text-muted-foreground">belum dipasang</span>}</TableCell>
                    <TableCell className="font-mono text-xs">{s.tokenPetunjuk ? `••••${s.tokenPetunjuk}` : "–"}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs">{s.terakhirTerhubung ? <>{relatif(menitSejak(s.terakhirTerhubung))}<div className="text-muted-foreground">{tglJamWib(s.terakhirTerhubung)}</div></> : "belum pernah"}</TableCell>
                    <TableCell className={cn("text-right tabular-nums", s.baterai != null && s.baterai < 20 && "font-semibold text-red-700")}>{s.baterai != null ? `${Math.round(s.baterai)}%` : "–"}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.sinyal != null ? `${s.sinyal} dBm` : "–"}</TableCell>
                    {bolehUbah && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" title="Ubah / pindahkan" aria-label={`Ubah ${s.serial}`} onClick={() => setFormSensor(s)}><Pencil /></Button>
                          <Button size="sm" variant="ghost" title="Buat token baru" aria-label={`Token baru ${s.serial}`} disabled={proses}
                            onClick={() => aksi(`/api/admin/monitoring/sensor/${s.id}/token`, "POST", `Buat token baru untuk ${s.serial}? Token lama langsung tidak berlaku — perangkat harus diisi token baru.`, (d) => d.token && setToken({ serial: s.serial, token: d.token }))}><RefreshCw /></Button>
                          <Button size="sm" variant="ghost" title="Hapus" aria-label={`Hapus ${s.serial}`} disabled={proses}
                            onClick={() => aksi(`/api/admin/monitoring/sensor/${s.id}`, "DELETE", `Hapus sensor ${s.serial}? Bacaan yang sudah tersimpan tetap ada di lokasinya.`)}><Trash2 className="text-red-600" /></Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {tab === "alarm" && (
        <Card className="overflow-hidden">
          <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
            <div><CardTitle>Alarm</CardTitle><CardDescription>Akui alarm dan catat tindakan, produk/alat terdampak, serta pencegahan (catatan insiden). Pengakuan tercatat di log audit.</CardDescription></div>
            <div role="group" aria-label="Saring alarm" className="flex rounded-lg border p-1 text-sm">
              {([["perlu", `Perlu tindakan (${perlu})`], ["semua", "Semua (30 hari)"]] as const).map(([k, l]) => (
                <button key={k} type="button" aria-pressed={saringAlarm === k} onClick={() => setSaringAlarm(k)} className={cn("rounded-md px-3 py-1", saringAlarm === k ? "bg-navy-800 text-white" : "text-muted-foreground hover:bg-muted")}>{l}</button>
              ))}
            </div>
          </CardHeader>
          <div className="overflow-x-auto border-t">
            <Table>
              <TableHeader><TableRow className="hover:bg-transparent"><TableHead>Lokasi</TableHead><TableHead>Kejadian</TableHead><TableHead>Waktu</TableHead><TableHead className="text-right">Puncak</TableHead><TableHead>Pengakuan</TableHead></TableRow></TableHeader>
              <TableBody>
                {alarmTampil.length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">{saringAlarm === "perlu" ? "Tidak ada alarm yang perlu ditindaklanjuti." : "Belum ada alarm."}</TableCell></TableRow>}
                {alarmTampil.map((a) => {
                  const p = a.jenis.startsWith("suhu") ? "suhu" : a.jenis.startsWith("lembap") ? "lembap" : null;
                  return (
                    <TableRow key={a.id} className="align-top">
                      <TableCell className="min-w-[11rem]"><Link href={`/monitoring/${a.lokasi.kode}#alarm`} className="font-medium text-navy-800 hover:text-teal-700 hover:underline">{a.lokasi.nama}</Link><div className="text-xs text-muted-foreground">{a.lokasi.kode}</div></TableCell>
                      <TableCell className="whitespace-nowrap">{LABEL_ALARM[a.jenis as JenisAlarm] ?? a.jenis}{a.batas != null && p && <div className="text-xs text-muted-foreground">batas {fNilai(p, a.batas)}</div>}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs tabular-nums">{tglJamWib(a.mulai)}<div className={cn(!a.selesai && "font-semibold text-red-700")}>{a.selesai ? `selesai, ${durasi(Date.parse(a.selesai) - Date.parse(a.mulai))}` : `berlangsung ${durasi(Date.now() - Date.parse(a.mulai))}`}</div></TableCell>
                      <TableCell className="text-right tabular-nums">{a.puncak != null && p ? fNilai(p, a.puncak) : "–"}</TableCell>
                      <TableCell className="min-w-[16rem]">
                        <div className="grid justify-items-start gap-1.5 text-xs">
                          {a.diakui ? <span><LencanaStatus kunci="normal" label="Diakui" /> <span className="text-muted-foreground">{a.diakuiOleh} · {a.diakuiPada ? tglJamWib(a.diakuiPada) : ""}</span></span> : <LencanaStatus kunci="luar" label="Belum diakui" />}
                          {a.tindakan && <p className="whitespace-pre-line"><strong>Tindakan:</strong> {a.tindakan}</p>}
                          {a.dampak && <p className="whitespace-pre-line"><strong>Dampak:</strong> {a.dampak}</p>}
                          {a.pencegahan && <p className="whitespace-pre-line"><strong>Pencegahan:</strong> {a.pencegahan}</p>}
                          {bolehUbah && <AkuiAlarm a={{ id: a.id, diakui: a.diakui, tindakan: a.tindakan, dampak: a.dampak, pencegahan: a.pencegahan }} />}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {tab === "impor" && (bolehUbah ? (lokasi.length ? <PanelImpor lokasi={lokasi} awal={lokasiAwal} /> : <p className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Tambahkan lokasi pantau terlebih dahulu.</p>)
        : <p className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Impor data memerlukan peran Operator.</p>)}

      {tab === "integrasi" && (bolehUbah ? (lokasi.length ? <PanelIntegrasi lokasi={lokasi} alamat={alamat} bolehAdmin={bolehAdmin} /> : <p className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Tambahkan lokasi pantau terlebih dahulu.</p>)
        : <p className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Bagian ini memerlukan peran Operator.</p>)}
    </div>
  );
}
