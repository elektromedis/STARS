"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Building2, Camera, CheckCircle2, ExternalLink, History, Loader2, MapPin, ScanQrCode, Search, Send, Video, X, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Combobox, Sorot } from "@/components/ui/combobox";
import { BarisSaranAlat, FotoKecilAlat, useSaranAlat, type AlatSaran } from "@/components/pemeliharaan/cari-alat";
import { PRIORITAS } from "@/lib/pemeliharaan";
import { MAKS_FOTO_LAPOR, MAKS_VIDEO_LAPOR, TERIMA_FOTO_LAPOR, TERIMA_VIDEO_LAPOR, ukuranMb } from "@/lib/lapor-media";
import { urlDetailAlat } from "@/lib/dokumen-alat";
import { bukaScan, tambahLaporanSaya } from "@/lib/lokal";
import { cn } from "@/lib/utils";

type Unit = { id: number; nama: string };
export type SaranLokasi = { teks: string; unitKerjaId: number; gedung: string | null };
/** Alat terdaftar yang dipilih (dari scan QR, tautan ?alat=, atau pencarian). */
export type AlatQr = { id: number; kode: string; nama: string; nomorSeri: string | null; foto: string | null; unitKerjaId: number; unit: string; lokasi: string | null };

const L = "grid gap-1 text-sm font-medium text-navy-800";
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

/** Foto ponsel sering > 5 MB: perkecil di browser (sisi terpanjang 1600 px, JPEG) sebelum dikirim. */
async function perkecilFoto(f: File): Promise<File> {
  if (f.size <= 1.5 * 1024 * 1024) return f;
  try {
    const bmp = await createImageBitmap(f, { imageOrientation: "from-image" });
    const s = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
    c.getContext("2d")?.drawImage(bmp, 0, 0, c.width, c.height);
    bmp.close();
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.85));
    return blob && blob.size < f.size ? new File([blob], f.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : f;
  } catch { return f; }
}

type Kirim = { tahap: "isi" | "kirim" | "selesai"; persen: number; error: string | null; nomor?: string };

export function LaporForm({ units, lokasi: daftarLokasi, kandidat = [], pesanQr = null }: { units: Unit[]; lokasi: SaranLokasi[]; kandidat?: AlatQr[]; pesanQr?: string | null }) {
  const awal = kandidat.length === 1 ? kandidat[0] : null;
  const [alat, setAlat] = useState<AlatQr | null>(awal);
  const [namaAlat, setNamaAlat] = useState(awal?.nama ?? kandidat[0]?.nama ?? "");
  const [unitId, setUnitId] = useState(awal ? String(awal.unitKerjaId) : "");
  const [unitTeks, setUnitTeks] = useState(awal?.unit ?? "");
  const [unitSalah, setUnitSalah] = useState(false);
  const [lokasi, setLokasi] = useState(awal?.lokasi ?? "");
  // true = isi lokasi berasal dari alat terpilih (boleh ditimpa saat alat diganti); false = diketik/dipilih pengguna
  const [lokasiDariAlat, setLokasiDariAlat] = useState(Boolean(awal?.lokasi));
  const [foto, setFoto] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [pesanMedia, setPesanMedia] = useState<string | null>(null);
  const [kirim, setKirim] = useState<Kirim>({ tahap: "isi", persen: 0, error: null });
  const formRef = useRef<HTMLFormElement>(null);

  const fotoUrl = useMemo(() => (foto ? URL.createObjectURL(foto) : null), [foto]);
  const videoUrl = useMemo(() => (video ? URL.createObjectURL(video) : null), [video]);
  useEffect(() => () => { if (fotoUrl) URL.revokeObjectURL(fotoUrl); }, [fotoUrl]);
  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl); }, [videoUrl]);

  // --- 1) alat ---
  const { saran: saranAlat, memuat } = useSaranAlat(namaAlat, { unitId: unitId || null, lewati: alat?.nama ?? null });
  function pilihAlat(a: AlatSaran | AlatQr) {
    const nama = "merek" in a ? (a.merek ? `${a.nama} (${a.merek})` : a.nama) : a.nama;
    const lok = "ruangan" in a ? a.ruangan : a.lokasi;
    setAlat({ id: a.id, kode: a.kode, nama, nomorSeri: a.nomorSeri, foto: a.foto, unitKerjaId: a.unitKerjaId, unit: a.unit, lokasi: lok });
    setNamaAlat(nama); setUnitId(String(a.unitKerjaId)); setUnitTeks(a.unit); setUnitSalah(false);
    if (lok && (!lokasi.trim() || lokasiDariAlat)) { setLokasi(lok); setLokasiDariAlat(true); }
  }

  // --- 2) unit kerja ---
  const namaUnitTerpilih = units.find((u) => String(u.id) === unitId)?.nama ?? null;
  const saranUnit = useMemo(() => {
    const k = norm(unitTeks);
    return (k && unitTeks !== namaUnitTerpilih ? units.filter((u) => norm(u.nama).includes(k)) : units).slice(0, 60);
  }, [unitTeks, units, namaUnitTerpilih]);
  function ketikUnit(v: string) {
    setUnitTeks(v); setUnitSalah(false);
    const pas = units.find((u) => norm(u.nama) === norm(v));
    setUnitId(pas ? String(pas.id) : "");
  }

  // --- 3) rincian lokasi ---
  const saranLokasi = useMemo(() => {
    const k = norm(lokasi);
    const u = Number(unitId) || null;
    if (!u && k.length < 2) return [];
    return daftarLokasi.filter((l) => (!u || l.unitKerjaId === u) && (!k || norm(l.teks).includes(k)) && norm(l.teks) !== k).slice(0, 12);
  }, [lokasi, unitId, daftarLokasi]);
  const namaUnit = (id: number) => units.find((u) => u.id === id)?.nama ?? "";

  // --- 4) foto & video ---
  async function pilihFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; e.target.value = ""; setPesanMedia(null);
    if (!f) return;
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { setPesanMedia("Foto harus berformat JPG, PNG, atau WEBP."); return; }
    const kecil = await perkecilFoto(f);
    if (kecil.size > MAKS_FOTO_LAPOR) { setPesanMedia(`Foto ${ukuranMb(kecil.size)} — melebihi 5 MB.`); return; }
    setFoto(kecil);
  }
  function pilihVideo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; e.target.value = ""; setPesanMedia(null);
    if (!f) return;
    if (!/^video\/(mp4|quicktime|webm)$/.test(f.type) && !/\.(mp4|mov|webm)$/i.test(f.name)) { setPesanMedia("Video harus berformat MP4, MOV, atau WEBM."); return; }
    if (f.size > MAKS_VIDEO_LAPOR) { setPesanMedia(`Video ${ukuranMb(f.size)} — melebihi 20 MB. Rekam lebih singkat (±10–20 detik).`); return; }
    setVideo(f);
  }

  function kirimLaporan(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (unitTeks.trim() && !unitId) { setUnitSalah(true); setKirim({ tahap: "isi", persen: 0, error: "Unit kerja tidak ditemukan. Pilih dari daftar, atau kosongkan isian unit." }); return; }
    const fd = new FormData(e.currentTarget);
    fd.set("alatId", alat ? String(alat.id) : "");
    fd.set("unitKerjaId", unitId);
    if (foto) fd.set("foto", foto);
    if (video) fd.set("video", video);
    setKirim({ tahap: "kirim", persen: 0, error: null });
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/lapor");
    xhr.upload.onprogress = (ev) => { if (ev.lengthComputable) setKirim((k) => ({ ...k, persen: Math.round((ev.loaded / ev.total) * 100) })); };
    xhr.onload = () => {
      let data: { nomor?: string; kodeLacak?: string; error?: string } = {};
      try { data = JSON.parse(xhr.responseText); } catch { /* bukan JSON */ }
      if (xhr.status === 200 && data.nomor && data.kodeLacak) {
        tambahLaporanSaya({ nomor: data.nomor, kode: data.kodeLacak, namaAlat: String(fd.get("namaAlat") ?? ""), waktu: new Date().toISOString() });
        setKirim({ tahap: "selesai", persen: 100, error: null, nomor: data.nomor });
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else setKirim({ tahap: "isi", persen: 0, error: data.error ?? `Gagal mengirim (kode ${xhr.status}).` });
    };
    xhr.onerror = () => setKirim({ tahap: "isi", persen: 0, error: "Koneksi terputus saat mengirim. Periksa jaringan lalu coba lagi." });
    xhr.send(fd);
  }

  if (kirim.tahap === "selesai" && kirim.nomor) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <CheckCircle2 className="mx-auto size-12 text-emerald-600" aria-hidden />
        <h2 className="mt-3 text-lg font-bold text-navy-800">Laporan terkirim. Terima kasih!</h2>
        <p className="mt-1 text-sm text-muted-foreground">Nomor laporan Anda — simpan untuk menanyakan status ke petugas:</p>
        <p className="mt-2 inline-block rounded-lg border border-emerald-300 bg-white px-4 py-2 font-mono text-lg font-bold text-emerald-700">{kirim.nomor}</p>
        <p className="mt-4 text-sm text-muted-foreground">Status laporan bisa dipantau di menu <strong>Riwayat</strong> dan <strong>Notifikasi</strong> pada perangkat ini. Untuk kerusakan darurat, tetap hubungi petugas secara langsung.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button variant="teal" asChild><Link href="/riwayat"><History /> Lacak di Riwayat</Link></Button>
          <Button variant="outline" asChild><a href="/lapor">Lapor lagi</a></Button>
          <Button variant="outline" asChild><Link href="/">Kembali ke beranda</Link></Button>
        </div>
      </div>
    );
  }

  const mengirim = kirim.tahap === "kirim";
  return (
    <form ref={formRef} onSubmit={kirimLaporan} className="grid gap-4 rounded-2xl border bg-card p-4 shadow-card sm:p-6 [&>*]:min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Ketik nama alat, unit, atau lokasi — pilihan muncul otomatis.</p>
        <Button type="button" variant="outline" size="sm" onClick={bukaScan}><ScanQrCode /> Scan QR alat</Button>
      </div>
      {kirim.error && (
        <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"><XCircle className="mt-0.5 size-4 shrink-0" /> {kirim.error}</p>
      )}
      {pesanQr && (
        <p className="flex items-start gap-2 rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm text-teal-900"><ScanQrCode className="mt-0.5 size-4 shrink-0" /> {pesanQr}</p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 [&>*]:min-w-0">
        {kandidat.length > 1 && (
          <label className={cn(L, "sm:col-span-2")}>
            Pilih alat sesuai QR
            <Select value={alat ? String(alat.id) : ""} onChange={(e) => { const a = kandidat.find((k) => String(k.id) === e.target.value); if (a) pilihAlat(a); else setAlat(null); }}>
              <option value="">— pilih unit alat yang dimaksud ({kandidat.length} cocok) —</option>
              {kandidat.map((k) => <option key={k.id} value={k.id}>{k.nama} — {k.lokasi ? `${k.lokasi}, ` : ""}{k.unit}</option>)}
            </Select>
          </label>
        )}

        <div className={cn(L, "sm:col-span-2")}>
          <label htmlFor="lapor-alat">Nama / jenis alat yang bermasalah <span className="text-red-600">*</span></label>
          <Combobox
            id="lapor-alat" name="namaAlat" required maxLength={200} value={namaAlat} ikon={<Search className="size-4" />}
            placeholder="Cari nama alat, merek, atau nomor seri… (mis. Infusion Pump, Ventilator)"
            onValueChange={(v) => { setNamaAlat(v); if (alat && v !== alat.nama) setAlat(null); }}
            saran={saranAlat} kunciSaran={(a) => a.id} memuat={memuat} onPilih={pilihAlat}
            renderSaran={(a) => <BarisSaranAlat a={a} kunci={namaAlat} />}
            kosong={<>Tidak ada alat terdaftar yang cocok{unitId ? " di unit ini" : ""}. Nama yang Anda ketik tetap bisa dikirim.</>}
          />
          {alat ? (
            <div className="flex items-center gap-3 rounded-lg border border-teal-200 bg-teal-50/60 p-2.5 font-normal">
              <FotoKecilAlat foto={alat.foto} nama={alat.nama} ukuran={44} />
              <div className="min-w-0 flex-1 text-xs text-muted-foreground">
                <p className="truncate text-sm font-semibold text-navy-800">{alat.nama}</p>
                <p className="truncate">{alat.nomorSeri ? <>SN <span className="font-mono">{alat.nomorSeri}</span> · </> : null}{alat.unit}{alat.lokasi ? ` · ${alat.lokasi}` : ""}</p>
                <Link href={urlDetailAlat(alat.kode)} className="inline-flex items-center gap-1 font-medium text-teal-700 hover:underline">Lihat detail inventaris <ExternalLink className="size-3" /></Link>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => { setAlat(null); setNamaAlat(""); }} aria-label="Bukan alat ini, ganti"><X /> Ganti</Button>
            </div>
          ) : (
            <span className="text-xs font-normal text-muted-foreground">Pilih dari daftar agar laporan langsung tertaut ke alat terdaftar. Alat yang belum terdaftar cukup diketik namanya.</span>
          )}
        </div>

        <div className={L}>
          <label htmlFor="lapor-unit">Unit kerja / lokasi</label>
          <Combobox
            id="lapor-unit" value={unitTeks} ikon={<Building2 className="size-4" />} placeholder="Cari unit kerja… (opsional)" bukaSaatFokus
            onValueChange={ketikUnit} onBlur={() => setUnitSalah(Boolean(unitTeks.trim() && !unitId))} aria-invalid={unitSalah}
            saran={saranUnit} kunciSaran={(u) => u.id} onPilih={(u) => { setUnitId(String(u.id)); setUnitTeks(u.nama); setUnitSalah(false); }}
            renderSaran={(u) => <span className={cn(String(u.id) === unitId && "font-semibold text-teal-800")}><Sorot teks={u.nama} kunci={unitTeks === namaUnitTerpilih ? "" : unitTeks} /></span>}
            kosong="Unit tidak ditemukan — periksa ejaan."
          />
          {unitSalah && <span className="text-xs font-normal text-red-700">Pilih unit dari daftar, atau kosongkan.</span>}
        </div>

        <div className={L}>
          <label htmlFor="lapor-lokasi">Rincian lokasi</label>
          <Combobox
            id="lapor-lokasi" name="lokasi" maxLength={200} value={lokasi} ikon={<MapPin className="size-4" />} bukaSaatFokus
            placeholder={unitId ? "Pilih/ketik ruangan, mis. Ruang PERINA, bed 3" : "Ketik ruangan, mis. Ruang PERINA, bed 3"}
            onValueChange={(v) => { setLokasi(v); setLokasiDariAlat(false); }} saran={saranLokasi} kunciSaran={(l) => `${l.unitKerjaId}|${l.teks}`} onPilih={(l) => { setLokasi(l.teks); setLokasiDariAlat(false); }}
            renderSaran={(l) => (
              <span className="block">
                <span className="block text-navy-800"><Sorot teks={l.teks} kunci={lokasi} /></span>
                {(!unitId || l.gedung) && <span className="block text-xs text-muted-foreground">{[!unitId ? namaUnit(l.unitKerjaId) : null, l.gedung].filter(Boolean).join(" · ")}</span>}
              </span>
            )}
          />
        </div>

        <label className={L}>
          Nama pelapor <span className="text-red-600">*</span>
          <Input name="pelapor" required maxLength={120} placeholder="Nama Anda" autoComplete="name" />
        </label>
        <label className={L}>
          Kontak (HP/ekstensi)
          <Input name="kontak" maxLength={120} placeholder="mis. 0812xxxx / ext. 123" autoComplete="tel" inputMode="tel" />
        </label>
        <label className={cn(L, "sm:col-span-2")}>
          Uraian keluhan / kerusakan <span className="text-red-600">*</span>
          <textarea name="keluhan" required maxLength={2000} rows={4}
            className="flex w-full rounded-md border border-input bg-card px-3 py-2 text-sm placeholder:text-muted-foreground"
            placeholder="Jelaskan gejala, kapan terjadi, dan dampaknya ke pelayanan." />
        </label>
        <label className={L}>
          Tingkat urgensi
          <Select name="prioritas" defaultValue="Normal">
            {PRIORITAS.map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
        </label>

        <fieldset className="grid gap-1.5 text-sm">
          <legend className="mb-1 font-medium text-navy-800">Foto / video (opsional)</legend>
          <div className="grid grid-cols-2 gap-2">
            <label className={cn("flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-input bg-card px-2 text-sm font-medium text-teal-700 transition hover:border-teal-400 hover:bg-teal-50 focus-within:ring-2 focus-within:ring-teal-300", foto && "border-teal-300 bg-teal-50")}>
              <Camera className="size-4" aria-hidden /> {foto ? "Ganti foto" : "Foto"}
              <input type="file" accept={TERIMA_FOTO_LAPOR} className="sr-only" onChange={pilihFoto} aria-describedby="ket-media" />
            </label>
            <label className={cn("flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-input bg-card px-2 text-sm font-medium text-teal-700 transition hover:border-teal-400 hover:bg-teal-50 focus-within:ring-2 focus-within:ring-teal-300", video && "border-teal-300 bg-teal-50")}>
              <Video className="size-4" aria-hidden /> {video ? "Ganti video" : "Video"}
              <input type="file" accept={TERIMA_VIDEO_LAPOR} className="sr-only" onChange={pilihVideo} aria-describedby="ket-media" />
            </label>
          </div>
          <span id="ket-media" className="text-xs text-muted-foreground">Foto JPG/PNG maks 5 MB (foto besar diperkecil otomatis) · Video MP4/MOV/WEBM maks 20 MB (±10–20 detik).</span>
          {pesanMedia && <span role="alert" className="text-xs text-red-700">{pesanMedia}</span>}
        </fieldset>

        {(foto || video) && (
          <div className="flex flex-wrap gap-3 sm:col-span-2">
            {foto && fotoUrl && (
              <figure className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element -- pratinjau lokal (blob:) */}
                <img src={fotoUrl} alt="Pratinjau foto" className="h-28 w-36 rounded-lg border object-cover" />
                <figcaption className="mt-1 text-xs text-muted-foreground">Foto · {ukuranMb(foto.size)}</figcaption>
                <button type="button" onClick={() => setFoto(null)} aria-label="Hapus foto" className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-navy-800 text-white shadow"><X className="size-3.5" /></button>
              </figure>
            )}
            {video && videoUrl && (
              <figure className="relative">
                <video src={videoUrl} controls playsInline preload="metadata" className="h-28 w-48 rounded-lg border bg-black object-contain" />
                <figcaption className="mt-1 max-w-48 truncate text-xs text-muted-foreground">Video · {ukuranMb(video.size)}</figcaption>
                <button type="button" onClick={() => setVideo(null)} aria-label="Hapus video" className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-navy-800 text-white shadow"><X className="size-3.5" /></button>
              </figure>
            )}
          </div>
        )}
      </div>

      {mengirim && (foto || video) && (
        <div className="grid gap-1" aria-live="polite">
          <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-teal-500 transition-[width]" style={{ width: `${kirim.persen}%` }} /></div>
          <p className="text-xs text-muted-foreground">Mengunggah lampiran… {kirim.persen}%</p>
        </div>
      )}

      <div className="flex flex-col-reverse items-stretch justify-between gap-3 pt-1 sm:flex-row sm:items-center">
        <p className="text-xs text-muted-foreground">Data ini dipakai untuk penanganan pemeliharaan alat, bukan dipublikasikan.</p>
        <Button type="submit" variant="teal" size="lg" disabled={mengirim}>
          {mengirim ? <Loader2 className="animate-spin" /> : <Send />} Kirim laporan
        </Button>
      </div>
    </form>
  );
}
