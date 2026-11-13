"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ChevronDown, DoorOpen, Loader2, Plus, Printer, QrCode, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { badgeKondisi, JENIS_ALAT, KONDISI_ALAT, RISIKO_ALAT } from "@/lib/pemeliharaan";
import { buatAlat, buatRuangan, ubahAlat, type StatusAksi } from "@/app/admin/alat/actions";
import { QrAlat } from "./qr-alat";

type Unit = { id: number; nama: string };
export type RuanganRingkas = { id: number; nama: string; gedung: string | null; unitKerjaId: number; unitKerja: { nama: string } };
export type Alat = {
  id: number; kode: string; nama: string; merek: string | null; model: string | null; nomorSeri: string | null;
  unitKerjaId: number; unitKerja: { nama: string }; ruanganId: number | null; ruangan: { nama: string } | null;
  lokasi: string | null; kategori: string | null; jenis: string; risiko: string | null; tahunPerolehan: number | null;
  hargaPerolehan: number | null; usiaTeknis: number | null; garansiSampai: string | Date | null;
  kondisi: string; catatan: string | null; _count: { permintaan: number; perintah: number };
  kodeAspak: string | null; noUrutAset: string | null; instalasi: string | null; pelayanan: string | null; tahunPembelian: number | null; tahunPembukuan: number | null;
  pendanaan: string | null; teknologi: string | null; kelasRisiko: string | null; akl: string | null; produsen: string | null; distributor: string | null;
  tanggalUjiFungsi: string | Date | null; umurPemakaian: string | null;
};

const tglInput = (d: string | Date | null | undefined) => (d ? new Date(d).toISOString().slice(0, 10) : "");

function Pesan({ status }: { status: StatusAksi }) {
  if (!status) return null;
  return status.error
    ? <p role="alert" className="flex items-center gap-1.5 text-xs text-red-700"><XCircle className="size-3.5" /> {status.error}</p>
    : <p className="flex items-center gap-1.5 text-xs text-emerald-700"><CheckCircle2 className="size-3.5" /> {status.ok}</p>;
}

function Medan({ a, units, ruangan }: { a?: Alat; units: Unit[]; ruangan: RuanganRingkas[] }) {
  const L = "grid gap-1 text-xs text-muted-foreground";
  return (
    <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
      <label className={L}>Kode inventaris *<Input name="kode" defaultValue={a?.kode ?? ""} required maxLength={60} className="h-9" /></label>
      <label className={`${L} sm:col-span-2`}>Nama alat *<Input name="nama" defaultValue={a?.nama ?? ""} required maxLength={200} className="h-9" /></label>
      <label className={L}>Jenis
        <Select name="jenis" defaultValue={a?.jenis ?? "Medik"} className="h-9">{JENIS_ALAT.map((j) => <option key={j} value={j}>{j}</option>)}</Select>
      </label>
      <label className={L}>Merek<Input name="merek" defaultValue={a?.merek ?? ""} maxLength={120} className="h-9" /></label>
      <label className={L}>Model<Input name="model" defaultValue={a?.model ?? ""} maxLength={120} className="h-9" /></label>
      <label className={L}>Nomor seri<Input name="nomorSeri" defaultValue={a?.nomorSeri ?? ""} maxLength={120} className="h-9" /></label>
      <label className={L}>Kategori<Input name="kategori" defaultValue={a?.kategori ?? ""} maxLength={120} className="h-9" placeholder="mis. Life support" /></label>
      <label className={L}>Unit kerja *
        <Select name="unitKerjaId" defaultValue={a?.unitKerjaId ?? ""} required className="h-9">
          <option value="" disabled>— pilih —</option>
          {units.map((u) => <option key={u.id} value={u.id}>{u.nama}</option>)}
        </Select>
      </label>
      <label className={L}>Ruangan
        <Select name="ruanganId" defaultValue={a?.ruanganId ?? ""} className="h-9">
          <option value="">— tidak ditentukan —</option>
          {ruangan.map((r) => <option key={r.id} value={r.id}>{r.unitKerja.nama} · {r.nama}{r.gedung ? ` (${r.gedung})` : ""}</option>)}
        </Select>
      </label>
      <label className={L}>Rincian lokasi<Input name="lokasi" defaultValue={a?.lokasi ?? ""} maxLength={200} className="h-9" /></label>
      <label className={L}>Risiko (EM)
        <Select name="risiko" defaultValue={a?.risiko ?? ""} className="h-9"><option value="">— belum —</option>{RISIKO_ALAT.map((r) => <option key={r} value={r}>{r}</option>)}</Select>
      </label>
      <label className={L}>Tahun perolehan<Input name="tahunPerolehan" type="number" min={1950} max={2100} defaultValue={a?.tahunPerolehan ?? ""} className="h-9" /></label>
      <label className={L}>Harga perolehan (Rp)<Input name="hargaPerolehan" type="number" min={0} step={1000} defaultValue={a?.hargaPerolehan ?? ""} className="h-9" /></label>
      <label className={L}>Usia teknis (tahun)<Input name="usiaTeknis" type="number" min={0} max={100} defaultValue={a?.usiaTeknis ?? ""} className="h-9" /></label>
      <label className={L}>Garansi sampai<Input name="garansiSampai" type="date" defaultValue={tglInput(a?.garansiSampai)} className="h-9" /></label>
      <label className={L}>Kondisi
        <Select name="kondisi" defaultValue={a?.kondisi ?? "Baik"} className="h-9">{KONDISI_ALAT.map((k) => <option key={k} value={k}>{k}</option>)}</Select>
      </label>
      <label className={L}>Kode ASPAK / Trilux<Input name="kodeAspak" defaultValue={a?.kodeAspak ?? ""} maxLength={40} className="h-9" placeholder="mis. 20902005" /></label>
      <label className={L}>Pendanaan<Input name="pendanaan" defaultValue={a?.pendanaan ?? ""} maxLength={80} className="h-9" placeholder="BLUD / APBD / DAK / Hibah" /></label>
      <label className={L}>No. AKL<Input name="akl" defaultValue={a?.akl ?? ""} maxLength={120} className="h-9" /></label>
      <label className={L}>Tanggal uji fungsi<Input name="tanggalUjiFungsi" type="date" defaultValue={tglInput(a?.tanggalUjiFungsi)} className="h-9" /></label>
      <label className={L}>Produsen<Input name="produsen" defaultValue={a?.produsen ?? ""} maxLength={160} className="h-9" /></label>
      <label className={L}>Distributor<Input name="distributor" defaultValue={a?.distributor ?? ""} maxLength={160} className="h-9" /></label>
      <label className={`${L} sm:col-span-3 lg:col-span-2`}>Catatan<Input name="catatan" defaultValue={a?.catatan ?? ""} maxLength={1000} className="h-9" /></label>
      {a && (a.instalasi || a.pelayanan || a.teknologi || a.kelasRisiko || a.umurPemakaian || a.noUrutAset) && (
        <p className="text-xs text-muted-foreground sm:col-span-3 lg:col-span-4">
          <span className="font-medium">Data impor Trilux:</span> {[a.instalasi && `Instalasi ${a.instalasi}`, a.pelayanan && `Pelayanan ${a.pelayanan}`, a.noUrutAset && `No urut aset ${a.noUrutAset}`, a.tahunPembelian && `Beli ${a.tahunPembelian}`, a.tahunPembukuan && `Buku ${a.tahunPembukuan}`, a.teknologi && `Teknologi ${a.teknologi}`, a.kelasRisiko && `Kelas risiko ${a.kelasRisiko}`, a.umurPemakaian && `Umur pakai ${a.umurPemakaian}`].filter(Boolean).join(" · ")}
        </p>
      )}
    </div>
  );
}

function TautanLabel({ href }: { href: string }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:underline"><QrCode className="size-3.5" /> Cetak label QR</a>;
}

function BarisAlat({ a, units, ruangan, bolehKelola, label, alamat }: { a: Alat; units: Unit[]; ruangan: RuanganRingkas[]; bolehKelola: boolean; label: string; alamat: string }) {
  const [st, aksi, pend] = useActionState<StatusAksi, FormData>(ubahAlat, undefined);
  return (
    <details className="group border-b last:border-b-0">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-muted/40">
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
        <span className="font-mono text-xs text-muted-foreground">{a.kode}</span>
        <QrAlat kode={a.kode} nama={a.nama} keterangan={`${a.unitKerja.nama}${a.ruangan ? ` · ${a.ruangan.nama}` : ""}`} alamat={alamat} labelHref={label} ukuran={34} />
        <span className="min-w-0 flex-1 truncate font-medium text-navy-800">{a.nama}{a.merek ? <span className="font-normal text-muted-foreground"> · {a.merek}{a.model ? ` ${a.model}` : ""}</span> : null}</span>
        <span className="hidden text-xs text-muted-foreground md:block">{a.unitKerja.nama}{a.ruangan ? ` · ${a.ruangan.nama}` : ""}</span>
        <Badge variant={a.jenis === "Medik" ? "teal" : "outline"}>{a.jenis}</Badge>
        <Badge variant={badgeKondisi[a.kondisi] ?? "outline"}>{a.kondisi}</Badge>
      </summary>
      {bolehKelola ? (
        <form action={aksi} className="grid gap-2 bg-muted/20 px-4 py-4">
          <input type="hidden" name="id" value={a.id} />
          <Medan a={a} units={units} ruangan={ruangan} />
          <div className="flex items-center justify-between gap-2">
            <span className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">{a._count.permintaan} laporan · {a._count.perintah} perintah kerja <TautanLabel href={label} /></span>
            <div className="flex items-center gap-3"><Pesan status={st} /><Button type="submit" size="sm" variant="teal" disabled={pend}>{pend ? <Loader2 className="animate-spin" /> : null} Simpan perubahan</Button></div>
          </div>
        </form>
      ) : (
        <div className="grid gap-1 bg-muted/20 px-4 py-3 text-sm sm:grid-cols-2">
          <p><span className="text-muted-foreground">Nomor seri:</span> {a.nomorSeri ?? "—"}</p>
          <p><span className="text-muted-foreground">Kategori:</span> {a.kategori ?? "—"} · <span className="text-muted-foreground">Risiko:</span> {a.risiko ?? "—"}</p>
          <p><span className="text-muted-foreground">Perolehan:</span> {a.tahunPerolehan ?? "—"} · <span className="text-muted-foreground">Usia teknis:</span> {a.usiaTeknis ?? "—"} th</p>
          <p><span className="text-muted-foreground">Garansi sampai:</span> {a.garansiSampai ? new Date(a.garansiSampai).toLocaleDateString("id-ID") : "—"}</p>
          <p className="sm:col-span-2"><TautanLabel href={label} /></p>
        </div>
      )}
    </details>
  );
}

function FormRuangan({ units }: { units: Unit[] }) {
  const [st, aksi, pend] = useActionState<StatusAksi, FormData>(buatRuangan, undefined);
  return (
    <form action={aksi} className="grid gap-2 border-t px-5 py-4 sm:grid-cols-5 sm:items-end">
      <label className="grid gap-1 text-xs text-muted-foreground">Unit kerja *
        <Select name="unitKerjaId" defaultValue="" required className="h-9"><option value="" disabled>— pilih —</option>{units.map((u) => <option key={u.id} value={u.id}>{u.nama}</option>)}</Select>
      </label>
      <label className="grid gap-1 text-xs text-muted-foreground">Nama ruangan *<Input name="nama" required maxLength={120} className="h-9" placeholder="mis. Ruang NICU" /></label>
      <label className="grid gap-1 text-xs text-muted-foreground">Gedung / lantai<Input name="gedung" maxLength={120} className="h-9" placeholder="mis. Gedung A Lt. 2" /></label>
      <label className="grid gap-1 text-xs text-muted-foreground">Kepala ruangan<Input name="kepala" maxLength={120} className="h-9" /></label>
      <div className="flex items-center justify-between gap-2"><Pesan status={st} /><Button type="submit" size="sm" variant="teal" disabled={pend}>{pend ? <Loader2 className="animate-spin" /> : <Plus />} Tambah</Button></div>
    </form>
  );
}

const KUNCI_ALAMAT = "stars-url-publik";
/** Alamat lokal/HTTP tidak bisa dibuka (atau kameranya ditolak) dari HP di luar jaringan ini. */
const alamatLokal = (u: string) => /^http:\/\//i.test(u) || /\/\/(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(u);

function CetakLabelQr({ units, ruangan, alamat, setAlamat, ukuran, setUkuran, jumlahAlat }: {
  units: Unit[]; ruangan: RuanganRingkas[]; alamat: string; setAlamat: (v: string) => void; ukuran: "kecil" | "besar"; setUkuran: (v: "kecil" | "besar") => void; jumlahAlat: number;
}) {
  const [unit, setUnit] = useState(units.length === 1 ? units[0].nama : "");
  const [ruanganId, setRuanganId] = useState("");
  const [mulai, setMulai] = useState(1);
  const pilihanRuangan = ruangan.filter((r) => !unit || r.unitKerja.nama === unit);
  const q = new URLSearchParams({ ukuran, mulai: String(mulai), alamat });
  if (unit) q.set("unit", unit);
  if (ruanganId) q.set("ruangan", ruanganId);
  const L = "grid gap-1 text-xs text-muted-foreground";
  return (
    <Card>
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-2 p-5 text-sm font-semibold text-navy-800">
          <QrCode className="size-4 text-teal-700" aria-hidden /> Cetak label QR alat
          <span className="ml-auto text-xs font-normal text-muted-foreground">QR menunjuk tepat ke satu alat → formulir lapor kerusakan terisi otomatis</span>
        </summary>
        <div className="grid gap-3 border-t px-5 py-4">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <label className={L}>Unit kerja
              <Select value={unit} onChange={(e) => { setUnit(e.target.value); setRuanganId(""); }} className="h-9">
                {units.length > 1 && <option value="">Semua unit ({jumlahAlat} alat)</option>}
                {units.map((u) => <option key={u.id} value={u.nama}>{u.nama}</option>)}
              </Select>
            </label>
            <label className={L}>Ruangan
              <Select value={ruanganId} onChange={(e) => setRuanganId(e.target.value)} className="h-9">
                <option value="">Semua ruangan</option>
                {pilihanRuangan.map((r) => <option key={r.id} value={r.id}>{r.unitKerja.nama} · {r.nama}</option>)}
              </Select>
            </label>
            <label className={L}>Ukuran label
              <Select value={ukuran} onChange={(e) => setUkuran(e.target.value === "besar" ? "besar" : "kecil")} className="h-9">
                <option value="kecil">Kecil 63,5 × 38,1 mm (21 per A4)</option>
                <option value="besar">Besar 99,1 × 67,7 mm (8 per A4)</option>
              </Select>
            </label>
            <label className={L}>Mulai dari label ke-
              <Input type="number" min={1} max={ukuran === "besar" ? 8 : 21} value={mulai} onChange={(e) => setMulai(Math.max(1, Number(e.target.value) || 1))} className="h-9" />
            </label>
          </div>
          <label className={L}>Alamat STARS yang ditanam di QR (harus bisa dibuka dari HP)
            <Input value={alamat} onChange={(e) => setAlamat(e.target.value.trim())} placeholder="https://nama-pc.tailnet.ts.net" className="h-9 font-mono text-xs" />
          </label>
          {alamatLokal(alamat) && (
            <p className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900"><AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              Alamat ini hanya berlaku di laptop/jaringan ini. Agar QR bisa dipindai kamera HP dari mana saja, isi alamat https publik STARS (mis. alamat Tailscale).</p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">Cetak pada kertas stiker A4 tanpa skala (&quot;Ukuran sebenarnya / 100%&quot;). Garis putus-putus = batas potong.</p>
            <Button asChild variant="teal"><a href={`/api/admin/alat/label?${q.toString()}`} target="_blank" rel="noopener noreferrer"><Printer /> Cetak PDF label</a></Button>
          </div>
        </div>
      </details>
    </Card>
  );
}

export function AlatManager({ data, units, ruangan, bolehKelola, alamatPublik }: { data: Alat[]; units: Unit[]; ruangan: RuanganRingkas[]; bolehKelola: boolean; alamatPublik: string }) {
  const [st, aksi, pend] = useActionState<StatusAksi, FormData>(buatAlat, undefined);
  const [alamat, setAlamatState] = useState(alamatPublik);
  const [ukuran, setUkuran] = useState<"kecil" | "besar">("kecil");
  useEffect(() => {
    let simpan: string | null = null;
    try { simpan = window.localStorage.getItem(KUNCI_ALAMAT); } catch { /* penyimpanan diblokir */ }
    if (simpan) setAlamatState(simpan);
    else if (!alamatPublik) setAlamatState(window.location.origin);
  }, [alamatPublik]);
  const setAlamat = (v: string) => { setAlamatState(v); try { window.localStorage.setItem(KUNCI_ALAMAT, v); } catch { /* abaikan */ } };
  const labelSatu = (id: number) => `/api/admin/alat/label?${new URLSearchParams({ id: String(id), ukuran, alamat }).toString()}`;
  return (
    <div className="grid gap-4">
      {data.length > 0 && <CetakLabelQr units={units} ruangan={ruangan} alamat={alamat} setAlamat={setAlamat} ukuran={ukuran} setUkuran={setUkuran} jumlahAlat={data.length} />}
      <Card>
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center gap-2 p-5 text-sm font-semibold text-navy-800">
            <DoorOpen className="size-4 text-teal-700" aria-hidden /> Ruangan ({ruangan.length})
            <span className="ml-auto text-xs font-normal text-muted-foreground">klik untuk buka</span>
          </summary>
          {ruangan.length > 0 && (
            <ul className="flex flex-wrap gap-1.5 border-t px-5 py-3 text-xs">
              {ruangan.map((r) => <li key={r.id} className="rounded-full border bg-muted/40 px-2.5 py-1"><span className="text-muted-foreground">{r.unitKerja.nama} ·</span> {r.nama}{r.gedung ? <span className="text-muted-foreground"> ({r.gedung})</span> : null}</li>)}
            </ul>
          )}
          {bolehKelola && <FormRuangan units={units} />}
        </details>
      </Card>

      {bolehKelola && (
        <Card>
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center gap-2 p-5 text-sm font-semibold text-navy-800">
              <Plus className="size-4 text-teal-700 transition-transform group-open:rotate-45" aria-hidden /> Tambah alat baru
            </summary>
            <form action={aksi} className="grid gap-3 border-t px-5 py-4">
              <Medan units={units} ruangan={ruangan} />
              <div className="flex items-center justify-between gap-2"><Pesan status={st} /><Button type="submit" variant="teal" disabled={pend}>{pend ? <Loader2 className="animate-spin" /> : <Plus />} Tambah</Button></div>
            </form>
          </details>
        </Card>
      )}

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4">
          <CardTitle>Daftar alat ({data.length})</CardTitle>
          {bolehKelola && <Button variant="outline" size="sm" asChild><Link href="/admin/impor#alat">Impor dari Excel Trilux</Link></Button>}
        </CardHeader>
        <CardContent className="px-0">
          {data.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">Belum ada alat terdaftar.</p>
          ) : (
            <div className="overflow-hidden rounded-lg border">{data.map((a) => <BarisAlat key={a.id} a={a} units={units} ruangan={ruangan} bolehKelola={bolehKelola} label={labelSatu(a.id)} alamat={alamat} />)}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
