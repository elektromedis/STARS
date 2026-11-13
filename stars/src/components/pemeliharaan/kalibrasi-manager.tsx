"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, CheckCircle2, FileText, FileUp, Loader2, Pencil, Plus, Save, Search, Sparkles, Trash2, X, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { berlakuOtomatis, INTERVAL_KALIBRASI_BULAN, isoTanggal, PILIHAN_INTERVAL, statusKalibrasi, TERIMA_SERTIFIKAT, tglIndo } from "@/lib/kalibrasi";
import { cn } from "@/lib/utils";

export type AlatPilihan = { id: number; kode: string; nama: string; nomorSeri: string | null; unit: string; ruangan: string | null };
export type CatatanKalibrasi = {
  id: number; alatId: number; tanggal: string | Date; kalibrator: string; petugas: string | null; metode: string | null; laik: boolean;
  nomorSertifikat: string | null; berlakuSampai: string | Date | null; keterangan: string | null; berkas: string | null; namaBerkas: string | null;
  alat: { kode: string; nama: string; unitKerja: { nama: string } };
};
export type PerluPerhatian = { alatId: number; kode: string; nama: string; unit: string; laik: boolean; berlakuSampai: string | Date | null };

type Baris = {
  kunci: string; berkasKunci: string | null; alatId: number | null; tanggal: string; berlaku: string; berlakuManual: boolean;
  kalibrator: string; nomor: string; laik: boolean; otomatis: string[]; via?: string; galat?: string;
};
type InfoBerkas = { kunci: string; file: File; status: "membaca" | "siap" | "galat"; pesan?: string; teksTerbaca?: boolean };
type HasilBaca = {
  namaBerkas: string; teksTerbaca: boolean; catatan: string | null; alat: { id: number; via: string }[];
  saran: { tanggal: string | null; berlakuSampai: string | null; nomorSertifikat: string | null; kalibrator: string | null; laik: boolean | null };
};

const ID_DAFTAR = "daftar-alat-kalibrasi";
const KUNCI_LEMBAGA = "stars-kalibrator-terakhir";
const KUNCI_INTERVAL = "stars-interval-kalibrasi";
let nomorKunci = 0;
const kunciBaru = () => `k${++nomorKunci}`; // crypto.randomUUID tidak tersedia di http (IP LAN)

const labelAlat = (a: AlatPilihan) => `${a.nama} — ${a.kode}${a.nomorSeri && a.nomorSeri !== a.kode ? ` (SN ${a.nomorSeri})` : ""} — ${a.unit}`;
const bacaLokal = (k: string) => { try { return window.localStorage.getItem(k); } catch { return null; } };
const tulisLokal = (k: string, v: string) => { try { window.localStorage.setItem(k, v); } catch { /* penyimpanan diblokir */ } };

function Pesan({ ok, error }: { ok?: string | null; error?: string | null }) {
  if (error) return <p role="alert" className="flex items-start gap-1.5 text-xs text-red-700"><XCircle className="mt-px size-3.5 shrink-0" /> {error}</p>;
  if (ok) return <p role="status" className="flex items-start gap-1.5 text-xs text-emerald-700"><CheckCircle2 className="mt-px size-3.5 shrink-0" /> {ok}</p>;
  return null;
}

/** Kotak pilih alat dengan pencarian (datalist): ketik nama, kode, nomor seri, atau unit. */
function PilihAlat({ peta, label, nilai, onPilih, wajib = true }: {
  peta: Map<number, AlatPilihan>; label: Map<string, number>; nilai: number | null; onPilih: (id: number | null) => void; wajib?: boolean;
}) {
  const [teks, setTeks] = useState(() => (nilai && peta.get(nilai) ? labelAlat(peta.get(nilai)!) : ""));
  useEffect(() => { if (nilai != null && peta.get(nilai)) setTeks(labelAlat(peta.get(nilai)!)); }, [nilai, peta]);
  const salah = teks.trim() !== "" && nilai == null;
  return (
    <span className="grid gap-0.5">
      <Input list={ID_DAFTAR} value={teks} required={wajib} aria-invalid={salah}
        onChange={(e) => { setTeks(e.target.value); onPilih(label.get(e.target.value) ?? null); }}
        placeholder="Ketik nama alat, kode, nomor seri, atau unit…" className={cn("h-9", salah && "border-red-400 focus-visible:ring-red-300")} />
      {salah && <span className="text-[11px] text-red-700">Pilih alat dari daftar yang muncul.</span>}
    </span>
  );
}

const ISIAN_OTOMATIS: Record<string, string> = { alat: "alat", tanggal: "tanggal", berlaku: "berlaku", nomor: "nomor sertifikat", lembaga: "lembaga", hasil: "hasil" };

function BarisInput({ b, peta, label, ubah, hapus }: { b: Baris; peta: Map<number, AlatPilihan>; label: Map<string, number>; ubah: (p: Partial<Baris>) => void; hapus: () => void }) {
  const L = "grid gap-1 text-xs text-muted-foreground";
  const oto = (f: string) => b.otomatis.includes(f) && <Sparkles className="inline size-3 text-teal-600" aria-label="diisi otomatis dari sertifikat" />;
  return (
    <div className={cn("grid gap-2 rounded-lg border bg-card p-3", b.galat && "border-red-300 bg-red-50/40")}>
      <div className="flex items-start gap-2">
        <label className={cn(L, "flex-1")}><span>Alat * {oto("alat")}{b.via && <span className="ml-1 text-teal-700">(cocok lewat {b.via})</span>}</span>
          <PilihAlat peta={peta} label={label} nilai={b.alatId} onPilih={(id) => ubah({ alatId: id, galat: undefined })} />
        </label>
        <Button type="button" variant="ghost" size="icon" className="mt-4 shrink-0" onClick={hapus} title="Buang baris ini" aria-label="Buang baris ini"><X className="size-4" /></Button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.5fr_1.2fr_auto]">
        <label className={L}><span>Tanggal kalibrasi * {oto("tanggal")}</span>
          <Input type="date" required value={b.tanggal} max={isoTanggal(new Date())} className="h-9" onChange={(e) => ubah({ tanggal: e.target.value, galat: undefined })} />
        </label>
        <label className={L}><span>Berlaku sampai {oto("berlaku")}{!b.berlakuManual && b.berlaku && <span className="text-teal-700"> (otomatis)</span>}</span>
          <Input type="date" value={b.berlaku} min={b.tanggal || undefined} className="h-9" onChange={(e) => ubah({ berlaku: e.target.value, berlakuManual: e.target.value !== "", galat: undefined })} />
        </label>
        <label className={L}><span>Lembaga kalibrator * {oto("lembaga")}</span>
          <Input required maxLength={160} value={b.kalibrator} placeholder="mis. BPFK Jakarta / LPFK" className="h-9" onChange={(e) => ubah({ kalibrator: e.target.value, galat: undefined })} />
        </label>
        <label className={L}><span>Nomor sertifikat {oto("nomor")}</span>
          <Input maxLength={120} value={b.nomor} className="h-9" onChange={(e) => ubah({ nomor: e.target.value })} />
        </label>
        <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" checked={b.laik} onChange={(e) => ubah({ laik: e.target.checked })} /> <span>LAIK pakai {oto("hasil")}</span></label>
      </div>
      {b.galat && <Pesan error={b.galat} />}
    </div>
  );
}

/** Formulir isian satu catatan (ubah) — dikirim sebagai multipart ke PATCH /api/admin/kalibrasi/<id>. */
function UbahKalibrasi({ k, peta, label, interval, selesai }: { k: CatatanKalibrasi; peta: Map<number, AlatPilihan>; label: Map<string, number>; interval: number; selesai: () => void }) {
  const router = useRouter();
  const [alatId, setAlatId] = useState<number | null>(k.alatId);
  const [tanggal, setTanggal] = useState(isoTanggal(k.tanggal));
  const [berlaku, setBerlaku] = useState(isoTanggal(k.berlakuSampai));
  const [berlakuManual, setBerlakuManual] = useState(Boolean(k.berlakuSampai) && isoTanggal(k.berlakuSampai) !== berlakuOtomatis(isoTanggal(k.tanggal), interval));
  const [st, setSt] = useState<{ ok?: string; error?: string } | null>(null);
  const [pend, setPend] = useState(false);
  const L = "grid gap-1 text-xs text-muted-foreground";

  async function kirim(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!alatId) { setSt({ error: "Pilih alat dari daftar." }); return; }
    const fd = new FormData(e.currentTarget);
    fd.set("alatId", String(alatId)); fd.set("tanggal", tanggal); fd.set("berlakuSampai", berlaku);
    fd.set("laik", fd.get("laik") === "on" ? "1" : "0");
    setPend(true); setSt(null);
    try {
      const res = await fetch(`/api/admin/kalibrasi/${k.id}`, { method: "PATCH", body: fd });
      const j = await res.json().catch(() => ({ error: `Galat ${res.status}` }));
      if (!res.ok) { setSt({ error: j.error ?? `Galat ${res.status}` }); return; }
      setSt({ ok: j.ok }); router.refresh(); selesai();
    } catch { setSt({ error: "Gagal terhubung ke server." }); } finally { setPend(false); }
  }

  return (
    <form onSubmit={kirim} className="grid gap-2 bg-muted/30 p-3 sm:grid-cols-2 lg:grid-cols-4">
      <label className={cn(L, "sm:col-span-2 lg:col-span-4")}>Alat *<PilihAlat peta={peta} label={label} nilai={alatId} onPilih={setAlatId} /></label>
      <label className={L}>Tanggal kalibrasi *<Input type="date" required value={tanggal} max={isoTanggal(new Date())} className="h-9" onChange={(e) => { setTanggal(e.target.value); if (!berlakuManual) setBerlaku(berlakuOtomatis(e.target.value, interval)); }} /></label>
      <label className={L}><span>Berlaku sampai{!berlakuManual && <span className="text-teal-700"> (otomatis +{interval} bln)</span>}</span><Input type="date" value={berlaku} min={tanggal || undefined} className="h-9" onChange={(e) => { setBerlaku(e.target.value); setBerlakuManual(e.target.value !== ""); }} /></label>
      <label className={L}>Lembaga kalibrator *<Input name="kalibrator" required maxLength={160} defaultValue={k.kalibrator} className="h-9" /></label>
      <label className={L}>Nomor sertifikat<Input name="nomorSertifikat" maxLength={120} defaultValue={k.nomorSertifikat ?? ""} className="h-9" /></label>
      <label className={L}>Petugas<Input name="petugas" maxLength={120} defaultValue={k.petugas ?? ""} className="h-9" /></label>
      <label className={L}>Metode<Input name="metode" maxLength={160} defaultValue={k.metode ?? ""} className="h-9" /></label>
      <label className={cn(L, "sm:col-span-2")}>Keterangan<Input name="keterangan" maxLength={1000} defaultValue={k.keterangan ?? ""} className="h-9" /></label>
      <label className={cn(L, "sm:col-span-2")}>{k.berkas ? "Ganti sertifikat (PDF/JPG/PNG)" : "Lampirkan sertifikat (PDF/JPG/PNG)"}<Input name="file" type="file" accept={TERIMA_SERTIFIKAT} className="h-9 py-1.5 text-xs" /></label>
      <div className="flex flex-col justify-end gap-1 text-sm sm:col-span-2">
        <label className="flex items-center gap-2"><input type="checkbox" name="laik" defaultChecked={k.laik} /> Hasil: <strong>LAIK</strong> pakai</label>
        {k.berkas && <label className="flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" name="hapusBerkas" value="1" /> Lepas sertifikat terlampir ({k.namaBerkas})</label>}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2 sm:col-span-2 lg:col-span-4">
        <Pesan ok={st?.ok} error={st?.error} />
        <Button type="button" variant="ghost" size="sm" onClick={selesai}>Batal</Button>
        <Button type="submit" size="sm" variant="teal" disabled={pend}>{pend ? <Loader2 className="animate-spin" /> : <Save />} Simpan perubahan</Button>
      </div>
    </form>
  );
}

function Riwayat({ data, bolehKelola, peta, label, interval }: { data: CatatanKalibrasi[]; bolehKelola: boolean; peta: Map<number, AlatPilihan>; label: Map<string, number>; interval: number }) {
  const router = useRouter();
  const [cari, setCari] = useState("");
  const [semua, setSemua] = useState(false);
  const [ubahId, setUbahId] = useState<number | null>(null);
  const [hapusSt, setHapusSt] = useState<{ id: number; pesan: string } | null>(null);
  const [menghapus, setMenghapus] = useState<number | null>(null);
  const saring = useMemo(() => {
    const q = cari.trim().toLowerCase();
    if (!q) return data;
    return data.filter((k) => [k.alat.nama, k.alat.kode, k.alat.unitKerja.nama, k.kalibrator, k.nomorSertifikat ?? "", k.namaBerkas ?? ""].some((v) => v.toLowerCase().includes(q)));
  }, [cari, data]);
  const tampil = semua ? saring : saring.slice(0, 100);
  const kolom = bolehKelola ? 7 : 6;

  async function hapus(k: CatatanKalibrasi) {
    if (!window.confirm(`Hapus catatan kalibrasi ${k.alat.nama} (${k.alat.kode}) tanggal ${tglIndo(k.tanggal)}?`)) return;
    setMenghapus(k.id); setHapusSt(null);
    try {
      const res = await fetch(`/api/admin/kalibrasi/${k.id}`, { method: "DELETE" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) setHapusSt({ id: k.id, pesan: j.error ?? `Galat ${res.status}` });
      else router.refresh();
    } catch { setHapusSt({ id: k.id, pesan: "Gagal terhubung ke server." }); } finally { setMenghapus(null); }
  }

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
        <div><CardTitle>Riwayat kalibrasi ({data.length})</CardTitle><CardDescription>Catatan terbaru menentukan status alat. Klik nomor sertifikat untuk membuka berkasnya.</CardDescription></div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari alat, kode, unit, lembaga, nomor…" className="h-9 pl-9" aria-label="Cari riwayat kalibrasi" />
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        {saring.length === 0 ? <p className="px-4 py-6 text-center text-sm text-muted-foreground">{data.length ? "Tidak ada catatan yang cocok." : "Belum ada catatan kalibrasi."}</p> : (
          <Table>
            <TableHeader><TableRow className="hover:bg-transparent"><TableHead>Tanggal</TableHead><TableHead>Alat</TableHead><TableHead className="hidden md:table-cell">Kalibrator</TableHead><TableHead>Sertifikat</TableHead><TableHead>Berlaku s/d</TableHead><TableHead>Status</TableHead>{bolehKelola && <TableHead />}</TableRow></TableHeader>
            <TableBody>
              {tampil.map((k) => {
                const m = statusKalibrasi(k);
                return [
                  <TableRow key={k.id}>
                    <TableCell className="whitespace-nowrap text-xs">{tglIndo(k.tanggal)}</TableCell>
                    <TableCell><div className="font-medium text-navy-800">{k.alat.nama}</div><div className="font-mono text-xs text-muted-foreground">{k.alat.kode} · {k.alat.unitKerja.nama}</div></TableCell>
                    <TableCell className="hidden text-xs md:table-cell">{k.kalibrator}{k.metode ? <div className="text-muted-foreground">{k.metode}</div> : null}</TableCell>
                    <TableCell className="text-xs">
                      {k.berkas ? (
                        <a href={`/api/kalibrasi/${k.id}/sertifikat`} target="_blank" rel="noopener noreferrer" title={k.namaBerkas ?? "Sertifikat"} className="inline-flex items-center gap-1 font-medium text-teal-700 hover:underline">
                          <FileText className="size-3.5 shrink-0" /> <span className="font-mono">{k.nomorSertifikat || "Lihat"}</span>
                        </a>
                      ) : <span className="font-mono text-muted-foreground">{k.nomorSertifikat ?? "—"}</span>}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">{tglIndo(k.berlakuSampai)}</TableCell>
                    <TableCell><Badge variant={m.variant}>{m.label}</Badge></TableCell>
                    {bolehKelola && (
                      <TableCell className="whitespace-nowrap text-right">
                        <Button size="sm" variant="ghost" title="Ubah" aria-label={`Ubah catatan ${k.alat.kode}`} onClick={() => setUbahId(ubahId === k.id ? null : k.id)}><Pencil /></Button>
                        <Button size="sm" variant="ghost" title="Hapus" aria-label={`Hapus catatan ${k.alat.kode}`} disabled={menghapus === k.id} onClick={() => hapus(k)}>{menghapus === k.id ? <Loader2 className="animate-spin" /> : <Trash2 className="text-red-600" />}</Button>
                        {hapusSt?.id === k.id && <span className="block text-xs text-red-700">{hapusSt.pesan}</span>}
                      </TableCell>
                    )}
                  </TableRow>,
                  ubahId === k.id && (
                    <TableRow key={`ubah-${k.id}`} className="hover:bg-transparent"><TableCell colSpan={kolom} className="p-0"><UbahKalibrasi k={k} peta={peta} label={label} interval={interval} selesai={() => setUbahId(null)} /></TableCell></TableRow>
                  ),
                ];
              })}
            </TableBody>
          </Table>
        )}
        {!semua && saring.length > tampil.length && (
          <div className="border-t p-3 text-center"><Button variant="outline" size="sm" onClick={() => setSemua(true)}>Tampilkan semua ({saring.length})</Button></div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * CMS Kalibrasi: unggah sertifikat (boleh banyak sekaligus) → isian dibaca otomatis dari PDF (tanggal, berlaku,
 * nomor, lembaga, hasil, alat lewat nomor seri/kode) → periksa → simpan. Masa berlaku kosong = tanggal + interval.
 */
export function KalibrasiManager({ data, alat, perlu, bolehKelola }: { data: CatatanKalibrasi[]; alat: AlatPilihan[]; perlu: PerluPerhatian[]; bolehKelola: boolean }) {
  const router = useRouter();
  const peta = useMemo(() => new Map(alat.map((a) => [a.id, a])), [alat]);
  const label = useMemo(() => new Map(alat.map((a) => [labelAlat(a), a.id])), [alat]);
  const [baris, setBaris] = useState<Baris[]>([]);
  const [berkas, setBerkas] = useState<InfoBerkas[]>([]);
  const [interval, setIntervalBulan] = useState<number>(INTERVAL_KALIBRASI_BULAN);
  const [lembagaTerakhir, setLembagaTerakhir] = useState("");
  const [menyimpan, setMenyimpan] = useState(false);
  const [hasil, setHasil] = useState<{ ok?: string; error?: string } | null>(null);
  const masukan = useRef<HTMLInputElement>(null);
  const kotakInput = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const i = Number(bacaLokal(KUNCI_INTERVAL));
    if ((PILIHAN_INTERVAL as readonly number[]).includes(i)) setIntervalBulan(i);
    setLembagaTerakhir(bacaLokal(KUNCI_LEMBAGA) ?? "");
  }, []);

  const ubahBaris = (kunci: string, p: Partial<Baris>) => setBaris((bs) => bs.map((b) => {
    if (b.kunci !== kunci) return b;
    const n = { ...b, ...p };
    if (p.tanggal !== undefined && !n.berlakuManual) n.berlaku = berlakuOtomatis(n.tanggal, interval);
    return n;
  }));
  const gantiInterval = (i: number) => {
    setIntervalBulan(i); tulisLokal(KUNCI_INTERVAL, String(i));
    setBaris((bs) => bs.map((b) => (b.berlakuManual ? b : { ...b, berlaku: berlakuOtomatis(b.tanggal, i) })));
  };
  const barisKosong = (p: Partial<Baris> = {}): Baris => ({ kunci: kunciBaru(), berkasKunci: null, alatId: null, tanggal: "", berlaku: "", berlakuManual: false, kalibrator: lembagaTerakhir, nomor: "", laik: true, otomatis: [], ...p });
  const tambahManual = (alatId: number | null = null) => {
    setBaris((bs) => [...bs, barisKosong({ alatId })]);
    setHasil(null);
    requestAnimationFrame(() => kotakInput.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  async function pilihBerkas(files: FileList | null) {
    if (!files?.length) return;
    setHasil(null);
    const daftar = Array.from(files);
    const info = daftar.map((file) => ({ kunci: kunciBaru(), file, status: "membaca" as const }));
    setBerkas((b) => [...b, ...info]);
    for (const f of info) {
      const fd = new FormData(); fd.set("file", f.file);
      let j: HasilBaca | { error: string };
      try {
        const res = await fetch("/api/admin/kalibrasi/baca", { method: "POST", body: fd });
        j = await res.json().catch(() => ({ error: `Galat ${res.status}` }));
        if (!res.ok && !("error" in j)) j = { error: `Galat ${res.status}` };
      } catch { j = { error: "Gagal terhubung ke server." }; }
      if ("error" in j) { const pesan = j.error; setBerkas((b) => b.map((x) => (x.kunci === f.kunci ? { ...x, status: "galat", pesan } : x))); continue; }
      const hb = j;
      const s = hb.saran;
      const otomatis = [s.tanggal && "tanggal", s.berlakuSampai && "berlaku", s.nomorSertifikat && "nomor", s.kalibrator && "lembaga", s.laik !== null && "hasil"].filter(Boolean) as string[];
      const tanggal = s.tanggal ?? "";
      const dasar = { berkasKunci: f.kunci, tanggal, berlaku: s.berlakuSampai ?? berlakuOtomatis(tanggal, interval), berlakuManual: Boolean(s.berlakuSampai), kalibrator: s.kalibrator ?? lembagaTerakhir, nomor: s.nomorSertifikat ?? "", laik: s.laik ?? true };
      const baru = hb.alat.length
        ? hb.alat.map((a) => barisKosong({ ...dasar, alatId: a.id, via: a.via, otomatis: [...otomatis, "alat"] }))
        : [barisKosong({ ...dasar, otomatis })];
      setBaris((bs) => [...bs, ...baru]);
      const ringkas = hb.teksTerbaca
        ? `Teks terbaca — ${otomatis.length ? `terisi otomatis: ${otomatis.map((o) => ISIAN_OTOMATIS[o]).join(", ")}` : "tidak ada isian yang dikenali"}; ${hb.alat.length ? `${hb.alat.length} alat cocok` : "alat belum cocok, pilih manual"}.`
        : `${hb.catatan ?? "Isi manual."}${hb.alat.length ? ` ${hb.alat.length} alat cocok dari nama berkas.` : ""}`;
      setBerkas((b) => b.map((x) => (x.kunci === f.kunci ? { ...x, status: "siap", teksTerbaca: hb.teksTerbaca, pesan: ringkas } : x)));
    }
  }

  function buangBerkas(kunci: string) {
    setBerkas((b) => b.filter((x) => x.kunci !== kunci));
    setBaris((bs) => bs.filter((x) => x.berkasKunci !== kunci));
  }

  async function simpanSemua() {
    setHasil(null);
    // Periksa isian wajib di sisi klien dulu (server tetap memeriksa ulang).
    const periksa = baris.map((b) => ({
      ...b,
      galat: !b.alatId ? "Pilih alat." : !b.tanggal ? "Isi tanggal kalibrasi." : !b.kalibrator.trim() ? "Isi lembaga kalibrator." : b.berlaku && b.berlaku < b.tanggal ? "Berlaku sampai tidak boleh sebelum tanggal kalibrasi." : undefined,
    }));
    if (periksa.some((b) => b.galat)) { setBaris(periksa); setHasil({ error: "Lengkapi baris bertanda merah." }); return; }
    setMenyimpan(true);
    const kelompok = new Map<string | null, Baris[]>();
    for (const b of baris) kelompok.set(b.berkasKunci, [...(kelompok.get(b.berkasKunci) ?? []), b]);
    let tersimpan = 0;
    const galat: string[] = [];
    const lembagaDipakai = baris.find((b) => b.kalibrator.trim())?.kalibrator.trim();
    for (const [bk, isi] of kelompok) {
      const fd = new FormData();
      const f = bk ? berkas.find((x) => x.kunci === bk) : null;
      if (f) fd.set("file", f.file);
      fd.set("baris", JSON.stringify(isi.map((b) => ({ alatId: b.alatId, tanggal: b.tanggal, berlakuSampai: b.berlaku || null, kalibrator: b.kalibrator.trim(), nomorSertifikat: b.nomor.trim() || null, laik: b.laik }))));
      try {
        const res = await fetch("/api/admin/kalibrasi", { method: "POST", body: fd });
        const j = await res.json().catch(() => ({ error: `Galat ${res.status}` }));
        if (!res.ok) {
          const pesan = `${f ? `${f.file.name}: ` : ""}${j.error ?? `Galat ${res.status}`}`;
          galat.push(pesan);
          setBaris((bs) => bs.map((b) => (b.berkasKunci === bk ? { ...b, galat: j.error ?? `Galat ${res.status}` } : b)));
          continue;
        }
        tersimpan += (j.baru ?? 0) + (j.diperbarui ?? 0);
        setBaris((bs) => bs.filter((b) => b.berkasKunci !== bk));
        if (bk) setBerkas((b) => b.filter((x) => x.kunci !== bk));
      } catch {
        galat.push(`${f ? `${f.file.name}: ` : ""}Gagal terhubung ke server.`);
      }
    }
    if (lembagaDipakai) { tulisLokal(KUNCI_LEMBAGA, lembagaDipakai); setLembagaTerakhir(lembagaDipakai); }
    setMenyimpan(false);
    setHasil({ ok: tersimpan ? `${tersimpan} catatan kalibrasi tersimpan; tanggal kalibrasi & masa berlaku alat sudah diperbarui.` : undefined, error: galat.length ? galat.join(" • ") : undefined });
    if (tersimpan) router.refresh();
  }

  const tanpaBerkas = baris.filter((b) => b.berkasKunci === null);
  const sibukBaca = berkas.some((b) => b.status === "membaca");

  return (
    <div className="grid gap-4">
      {bolehKelola && (
        <datalist id={ID_DAFTAR}>{alat.map((a) => <option key={a.id} value={labelAlat(a)} />)}</datalist>
      )}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><BadgeCheck className="size-4 text-teal-700" /> Perlu perhatian ({perlu.length})</CardTitle>
          <CardDescription>Alat yang kalibrasi terakhirnya tidak laik, kedaluwarsa, atau habis ≤ 30 hari.{bolehKelola && perlu.length > 0 && " Klik alat untuk mencatat kalibrasi barunya."}</CardDescription></CardHeader>
        {perlu.length > 0 && (
          <CardContent className="flex flex-wrap gap-1.5 pt-0 text-xs">
            {perlu.map((k) => {
              const m = statusKalibrasi(k);
              const isi = <>{k.nama} <span className="font-mono text-muted-foreground">{k.kode}</span> <Badge variant={m.variant}>{m.label}</Badge></>;
              return bolehKelola
                ? <button key={k.alatId} type="button" onClick={() => tambahManual(k.alatId)} title={`Catat kalibrasi ${k.nama} (${k.unit})`} className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition hover:border-teal-400 hover:bg-teal-50">{isi}</button>
                : <span key={k.alatId} className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1">{isi}</span>;
            })}
          </CardContent>
        )}
      </Card>

      {bolehKelola && (
        <Card ref={kotakInput} id="input-kalibrasi" className="scroll-mt-24">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileUp className="size-4 text-teal-700" /> Input kalibrasi &amp; sertifikat</CardTitle>
            <CardDescription>
              Unggah sertifikat (PDF/JPG/PNG, boleh banyak sekaligus). Dari PDF berteks, STARS mengisi otomatis tanggal kalibrasi, masa berlaku, nomor
              sertifikat, lembaga, hasil, dan alat (dicocokkan lewat nomor seri/kode). Periksa isiannya, lalu simpan — status kalibrasi alat langsung diperbarui.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex flex-wrap items-end gap-3">
              <input ref={masukan} type="file" multiple accept={TERIMA_SERTIFIKAT} className="sr-only" onChange={(e) => { pilihBerkas(e.target.files); e.target.value = ""; }} aria-label="Pilih berkas sertifikat kalibrasi" />
              <Button type="button" variant="teal" onClick={() => masukan.current?.click()}><FileUp /> Unggah sertifikat</Button>
              <Button type="button" variant="outline" onClick={() => tambahManual()}><Plus /> Catat tanpa berkas</Button>
              <label className="ml-auto grid gap-1 text-xs text-muted-foreground">Masa berlaku otomatis
                <Select value={String(interval)} onChange={(e) => gantiInterval(Number(e.target.value))} className="h-9 w-52">
                  {PILIHAN_INTERVAL.map((i) => <option key={i} value={i}>{i} bulan{i === INTERVAL_KALIBRASI_BULAN ? " (bawaan)" : ""}</option>)}
                </Select>
              </label>
            </div>

            {berkas.map((f) => {
              const isi = baris.filter((b) => b.berkasKunci === f.kunci);
              return (
                <section key={f.kunci} className="grid gap-2 rounded-xl border border-dashed p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <FileText className="size-4 shrink-0 text-teal-700" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-navy-800" title={f.file.name}>{f.file.name}</span>
                    {f.status === "membaca" && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="size-3.5 animate-spin" /> Membaca sertifikat…</span>}
                    {f.status === "siap" && <Button type="button" variant="ghost" size="sm" onClick={() => setBaris((bs) => [...bs, barisKosong({ berkasKunci: f.kunci, tanggal: isi[0]?.tanggal ?? "", berlaku: isi[0]?.berlaku ?? "", berlakuManual: isi[0]?.berlakuManual ?? false, kalibrator: isi[0]?.kalibrator ?? lembagaTerakhir, nomor: isi[0]?.nomor ?? "", laik: isi[0]?.laik ?? true })])}><Plus /> Alat lain di sertifikat ini</Button>}
                    <Button type="button" variant="ghost" size="icon" onClick={() => buangBerkas(f.kunci)} title="Buang berkas ini" aria-label={`Buang berkas ${f.file.name}`}><X className="size-4" /></Button>
                  </div>
                  {f.pesan && <p className={cn("text-xs", f.status === "galat" ? "text-red-700" : f.teksTerbaca ? "text-teal-800" : "text-amber-700")}>{f.pesan}</p>}
                  {isi.map((b) => <BarisInput key={b.kunci} b={b} peta={peta} label={label} ubah={(p) => ubahBaris(b.kunci, p)} hapus={() => setBaris((bs) => bs.filter((x) => x.kunci !== b.kunci))} />)}
                </section>
              );
            })}

            {tanpaBerkas.length > 0 && (
              <section className="grid gap-2 rounded-xl border border-dashed p-3">
                <p className="text-sm font-medium text-navy-800">Tanpa berkas sertifikat</p>
                {tanpaBerkas.map((b) => <BarisInput key={b.kunci} b={b} peta={peta} label={label} ubah={(p) => ubahBaris(b.kunci, p)} hapus={() => setBaris((bs) => bs.filter((x) => x.kunci !== b.kunci))} />)}
              </section>
            )}

            {(baris.length > 0 || hasil) && (
              <div className="flex flex-wrap items-center justify-end gap-3 border-t pt-3">
                <Pesan ok={hasil?.ok} error={hasil?.error} />
                {baris.length > 0 && (
                  <Button type="button" variant="teal" onClick={simpanSemua} disabled={menyimpan || sibukBaca}>
                    {menyimpan ? <Loader2 className="animate-spin" /> : <Save />} Simpan {baris.length} catatan
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Riwayat data={data} bolehKelola={bolehKelola} peta={peta} label={label} interval={interval} />
    </div>
  );
}
