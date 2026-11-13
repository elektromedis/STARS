"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, ExternalLink, Info, Pencil, Plus, Printer, RotateCcw, SlidersHorizontal, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import {
  bandingkan, BOBOT_BAWAAN, DOMAIN_HTA, formatNilai, HURUF_PRODUK, LABEL_DOMAIN, MAKS_BANDING, WARNA_PRODUK,
  type BarisBanding, type Bobot, type Domain, type SubjekHta,
} from "@/lib/hta-banding";
import { cn } from "@/lib/utils";
import { BarisSaranProduk, FotoProduk, useCariProduk } from "./cari-produk";
import { EditorProduk, produkKosong, type ProdukForm } from "./editor-produk";

const KUNCI_BOBOT = "stars-hta-bobot";
const urlBanding = (ids: string[]) => (ids.length ? `/hta/banding?${ids.map((i) => `id=${encodeURIComponent(i)}`).join("&")}` : "/hta");

function Huruf({ i, className }: { i: number; className?: string }) {
  return <span className={cn("inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white", className)} style={{ background: WARNA_PRODUK[i] }} aria-hidden>{HURUF_PRODUK[i]}</span>;
}

/** Cincin skor 0–100 (warna = identitas produk; angka memakai tinta teks). */
function CincinSkor({ skor, i }: { skor: number | null; i: number }) {
  const r = 34, kel = 2 * Math.PI * r;
  return (
    <div className="relative size-24 shrink-0" role="img" aria-label={skor === null ? "Skor belum tersedia" : `Skor HTA ${skor} dari 100`}>
      <svg viewBox="0 0 80 80" className="size-full -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="7" />
        {skor !== null && <circle cx="40" cy="40" r={r} fill="none" stroke={WARNA_PRODUK[i]} strokeWidth="7" strokeLinecap="round" strokeDasharray={`${(skor / 100) * kel} ${kel}`} />}
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center leading-none text-white">
        <span className="text-2xl font-extrabold tabular-nums">{skor ?? "—"}</span>
        <span className="mt-0.5 text-[10px] uppercase tracking-wide text-white/70">skor</span>
      </span>
    </div>
  );
}

function TambahPembanding({ ids }: { ids: string[] }) {
  const router = useRouter();
  const [teks, setTeks] = useState("");
  const { hasil, memuat } = useCariProduk(teks);
  return (
    <Combobox value={teks} onValueChange={setTeks} saran={hasil.filter((h) => !ids.includes(h.id))} kunciSaran={(s) => s.id} memuat={memuat}
      renderSaran={(s) => <BarisSaranProduk s={s} kunci={teks} />} onPilih={(s) => router.push(urlBanding([...ids, s.id]))}
      kosong={<span>Tidak ada produk cocok.</span>} ikon={<Plus className="size-4" />} gelap placeholder="Tambah pembanding…" inputClassName="h-11 rounded-full" />
  );
}

export function BandingHta({ subjek, form, bolehKelola, saranParameter }: {
  subjek: SubjekHta[]; form: Record<string, ProdukForm>; bolehKelola: boolean; saranParameter: string[];
}) {
  const router = useRouter();
  const [bobot, setBobot] = useState<Bobot>(BOBOT_BAWAAN);
  const [edit, setEdit] = useState<{ form: ProdukForm; terkunci: boolean } | null>(null);
  const [semuaFakta, setSemuaFakta] = useState(false);
  const ids = subjek.map((s) => s.id);
  const n = subjek.length;

  useEffect(() => {
    try { const b = JSON.parse(localStorage.getItem(KUNCI_BOBOT) ?? "null"); if (b && typeof b === "object") setBobot({ ...BOBOT_BAWAAN, ...b }); } catch { /* abaikan */ }
  }, []);
  function aturBobot(b: Bobot) { setBobot(b); try { localStorage.setItem(KUNCI_BOBOT, JSON.stringify(b)); } catch { /* abaikan */ } }

  const hasil = useMemo(() => bandingkan(subjek, bobot), [subjek, bobot]);
  const domainTampil: Domain[] = [...DOMAIN_HTA.map((d) => d.id), "umum"];
  const nama = (i: number) => subjek[i]?.judul ?? HURUF_PRODUK[i];

  async function hapusData(s: SubjekHta) {
    if (!s.produkId || !window.confirm(s.kandidat ? `Hapus produk kandidat ${s.judul}?` : `Hapus data HTA (harga, spesifikasi) ${s.judul}? Unit di inventaris tidak terhapus.`)) return;
    const r = await fetch(`/api/admin/hta/${s.produkId}`, { method: "DELETE" }).catch(() => null);
    if (r?.ok) { if (s.kandidat) router.push(urlBanding(ids.filter((x) => x !== s.id))); else router.refresh(); }
  }

  const gridKolom = { gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` };

  return (
    <div className="grid gap-6">
      {/* ── Kepala ala versus: foto, nama, skor ── */}
      <section aria-label="Produk yang dibandingkan" className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-black via-[#1b0b38] to-[#4c1d95] p-4 text-white shadow-lg sm:p-6">
        <div className="grid gap-4 md:[grid-template-columns:repeat(var(--kolom),minmax(0,1fr))]" style={{ ["--kolom" as string]: n === 1 ? 2 : n }}>
          {subjek.map((s, i) => (
            <article key={s.id} className="relative flex min-w-0 flex-col items-center gap-3 rounded-xl bg-white/5 p-4 text-center ring-1 ring-white/10">
              {n > 1 && i > 0 && <span className="absolute -left-4 top-1/2 z-10 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white text-xs font-black uppercase text-navy-950 shadow md:flex" aria-hidden>vs</span>}
              <Link href={urlBanding(ids.filter((x) => x !== s.id))} className="absolute right-2 top-2 rounded-full p-1 text-white/60 hover:bg-white/10 hover:text-white" aria-label={`Keluarkan ${s.judul} dari perbandingan`}><X className="size-4" /></Link>
              <div className="flex items-center gap-4">
                <FotoProduk src={s.foto} judul={s.judul} className="size-24 rounded-2xl" />
                {n > 1 && <CincinSkor skor={hasil.skor[i]} i={i} />}
              </div>
              <div className="min-w-0">
                <p className="flex items-center justify-center gap-2"><Huruf i={i} /><span className="text-xs uppercase tracking-wide text-white/70">{s.nama}</span></p>
                <h2 className="mt-1 break-words text-xl font-extrabold leading-tight">{s.judul}</h2>
                <p className="mt-1 text-xs text-white/80">{s.kandidat ? "Kandidat — belum dimiliki RS" : `${s.unit} unit di RSUD Cipayung`}</p>
              </div>
              <div className="mt-auto flex flex-wrap justify-center gap-2">
                {s.tautan && <a href={s.tautan} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs hover:bg-white/20"><ExternalLink className="size-3.5" /> e-Katalog</a>}
                {bolehKelola && (
                  <button type="button" onClick={() => setEdit({ form: form[s.id] ?? produkKosong({ nama: s.nama, merek: s.merek ?? "", model: s.model ?? "" }), terkunci: !s.kandidat })}
                    className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs hover:bg-white/20">
                    <Pencil className="size-3.5" /> {s.produkId ? "Ubah data HTA" : "Lengkapi data HTA"}
                  </button>
                )}
                {bolehKelola && s.produkId && <button type="button" onClick={() => hapusData(s)} className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs hover:bg-white/20" aria-label={`Hapus data HTA ${s.judul}`}><Trash2 className="size-3.5" /></button>}
              </div>
            </article>
          ))}
          {n === 1 && (
            <div className="flex min-w-0 flex-col justify-center gap-2 rounded-xl border border-dashed border-white/25 p-4">
              <p className="text-sm font-semibold">Bandingkan dengan produk lain</p>
              <TambahPembanding ids={ids} />
            </div>
          )}
        </div>
        {n === 2 && <div className="mx-auto mt-4 max-w-md print:hidden"><TambahPembanding ids={ids} /></div>}
        {n > 1 && (
          <p className="mt-4 text-center text-xs text-white/75">
            Skor dari {hasil.kriteriaDipakai} kriteria yang datanya tersedia untuk semua produk, dibobot per domain di bawah. Alat bantu keputusan — bukan pengganti kajian klinis.
          </p>
        )}
      </section>

      {n > 1 && (
        <details className="group rounded-xl border bg-card shadow-card">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold text-navy-800">
            <SlidersHorizontal className="size-4 text-teal-700" aria-hidden /> Bobot domain penilaian
            <span className="ml-1 truncate text-xs font-normal text-muted-foreground">{DOMAIN_HTA.map((d) => `${d.label} ${bobot[d.id]}`).join(" · ")}</span>
            <ChevronDown className="ml-auto size-4 shrink-0 transition group-open:rotate-180" aria-hidden />
          </summary>
          <div className="grid gap-4 border-t px-4 py-4 sm:grid-cols-2 lg:grid-cols-5">
            {DOMAIN_HTA.map((d) => (
              <label key={d.id} className="grid gap-1 text-sm">
                <span className="flex items-center justify-between font-medium text-navy-800">{d.label}<span className="tabular-nums text-muted-foreground">{bobot[d.id]}</span></span>
                <input type="range" min={0} max={5} step={1} value={bobot[d.id]} onChange={(e) => aturBobot({ ...bobot, [d.id]: Number(e.target.value) })} className="accent-teal-600" />
                <span className="text-xs text-muted-foreground">{d.ket}</span>
              </label>
            ))}
            <div className="sm:col-span-2 lg:col-span-5">
              <Button type="button" variant="outline" size="sm" onClick={() => aturBobot(BOBOT_BAWAAN)}><RotateCcw /> Kembalikan bobot bawaan</Button>
              <span className="ml-3 text-xs text-muted-foreground">0 = domain tidak dihitung. Bobot tersimpan di perangkat ini.</span>
            </div>
          </div>
        </details>
      )}

      {/* ── Mengapa lebih unggul ── */}
      {n > 1 && (
        <section aria-labelledby="judul-unggul" className="grid gap-3">
          <h2 id="judul-unggul" className="sr-only">Keunggulan tiap produk</h2>
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, 18rem), 1fr))` }}>
            {subjek.map((s, i) => {
              const f = hasil.fakta[i];
              const tampil = semuaFakta ? f : f.slice(0, 6);
              const lawan = subjek.filter((_, k) => k !== i).map((x) => x.judul).join(n > 2 ? " & " : "");
              return (
                <article key={s.id} className="min-w-0 rounded-xl border bg-card shadow-card">
                  <div className="h-1.5 rounded-t-xl" style={{ background: WARNA_PRODUK[i] }} aria-hidden />
                  <div className="p-4">
                    <h3 className="flex items-start gap-2 font-semibold text-navy-800"><Huruf i={i} className="mt-0.5" /> <span>Mengapa {s.judul} lebih unggul dari {lawan}?</span></h3>
                    {f.length === 0 ? (
                      <p className="mt-3 text-sm text-muted-foreground">Belum ada kriteria di mana produk ini jelas lebih unggul — atau datanya belum diisi.</p>
                    ) : (
                      <ul className="mt-3 grid gap-3">
                        {tampil.map((x) => (
                          <li key={x.id} className="flex gap-2.5">
                            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700" aria-hidden><Check className="size-3.5" /></span>
                            <span className="min-w-0 text-sm">
                              <span className="font-semibold text-navy-900">{x.judul && <><b className="font-extrabold">{x.judul}</b>{" "}</>}{x.teks}</span>
                              <span className="block text-xs text-muted-foreground">{x.detail} · {LABEL_DOMAIN[x.domain]}</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {f.length > 6 && <button type="button" onClick={() => setSemuaFakta((v) => !v)} className="mt-3 text-sm font-medium text-teal-700 hover:underline">{semuaFakta ? "Tampilkan lebih sedikit" : `Lihat semua ${f.length} keunggulan`}</button>}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Ringkasan per domain ── */}
      {n > 1 && (
        <section aria-labelledby="judul-domain" className="rounded-xl border bg-card p-4 shadow-card">
          <h2 id="judul-domain" className="font-semibold text-navy-800">Skor per domain</h2>
          <p className="mb-3 text-xs text-muted-foreground">0–100 per domain; hanya kriteria yang datanya lengkap untuk semua produk.</p>
          <div className="grid gap-3">
            {DOMAIN_HTA.map((d) => {
              const nilai = hasil.skorDomain[d.id];
              const ada = nilai.some((v) => v !== null);
              return (
                <div key={d.id} className="grid gap-1.5 sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-center [&>*]:min-w-0">
                  <span className="text-sm font-medium text-navy-800">{d.label}<span className="ml-1 text-xs font-normal text-muted-foreground">bobot {bobot[d.id]}</span></span>
                  {ada ? (
                    <div className="grid gap-[2px]">
                      {nilai.map((v, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Huruf i={i} className="size-4 text-[9px]" />
                          <div className="h-3 flex-1 overflow-hidden rounded-r-[4px] bg-muted/60">
                            <div className="h-full rounded-r-[4px]" style={{ width: `${Math.round((v ?? 0) * 100)}%`, background: WARNA_PRODUK[i] }} />
                          </div>
                          <span className="w-9 text-right text-xs tabular-nums text-navy-800">{v === null ? "—" : Math.round(v * 100)}</span>
                        </div>
                      ))}
                    </div>
                  ) : <span className="text-xs text-muted-foreground">Belum ada kriteria dengan data lengkap untuk semua produk.</span>}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Detail per domain ── */}
      {domainTampil.map((d) => {
        const baris = hasil.baris.filter((r) => r.domain === d);
        if (!baris.length) return null;
        return (
          <section key={d} aria-labelledby={`dom-${d}`} className="rounded-xl border bg-card shadow-card">
            <div className="grid gap-x-4 px-4 pb-2 pt-4 md:grid-cols-[16rem_minmax(0,1fr)] md:items-end [&>*]:min-w-0">
              <h2 id={`dom-${d}`} className="font-semibold text-navy-800">{LABEL_DOMAIN[d]}</h2>
              {n > 1 && <div className="hidden gap-x-4 md:grid" style={gridKolom}>{subjek.map((s, i) => <span key={s.id} className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-navy-700"><Huruf i={i} /> <span className="truncate">{nama(i)}</span></span>)}</div>}
            </div>
            <div role="table" aria-label={LABEL_DOMAIN[d]} className="px-4 pb-2">
              {baris.map((r) => <BarisDetail key={r.id} r={r} n={n} nama={nama} />)}
            </div>
          </section>
        );
      })}

      {subjek.some((s) => s.catatan) && (
        <section className="rounded-xl border bg-card p-4 shadow-card">
          <h2 className="font-semibold text-navy-800">Catatan tim HTA</h2>
          <ul className="mt-2 grid gap-2">
            {subjek.map((s, i) => s.catatan && <li key={s.id} className="flex gap-2 text-sm"><Huruf i={i} className="mt-0.5" /><span className="whitespace-pre-line">{s.catatan}</span></li>)}
          </ul>
        </section>
      )}

      <section className="rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
        <h2 className="mb-1 flex items-center gap-2 font-semibold text-navy-800"><Info className="size-4" aria-hidden /> Cara STARS menilai</h2>
        <p>Data <b>operasional</b> (kerusakan, lama perbaikan, biaya, kondisi, kalibrasi, dokumen) dihitung otomatis dari semua unit merek & tipe yang sama di Inventaris, 24 bulan terakhir. Data <b>produk</b> (harga, garansi, TKDN, AKL, spesifikasi) diisi tim HTA. Setiap kriteria diberi skor relatif terhadap produk terbaik; kriteria yang datanya kosong pada salah satu produk tidak dihitung. Skor akhir = rata-rata berbobot 5 domain (Keselamatan & Mutu, Keandalan, Ekonomi, Spesifikasi Teknis, Dukungan & Kebijakan).</p>
        <Button type="button" variant="outline" size="sm" className="mt-3 print:hidden" onClick={() => window.print()}><Printer /> Cetak perbandingan</Button>
      </section>

      {edit && (
        <EditorProduk awal={edit.form} kunciTerkunci={edit.terkunci} saranParameter={saranParameter} onTutup={() => setEdit(null)}
          onTersimpan={(baru) => { if (!ids.includes(baru)) router.push(urlBanding([...ids.filter((x) => x !== baru), baru].slice(-MAKS_BANDING))); }} />
      )}
    </div>
  );
}

function BarisDetail({ r, n, nama }: { r: BarisBanding; n: number; nama: (i: number) => string }) {
  const angka = r.format !== "teks" && r.format !== "ya-tidak";
  return (
    <div role="row" className="grid gap-x-4 gap-y-2 border-t py-3 md:grid-cols-[16rem_minmax(0,1fr)] [&>*]:min-w-0">
      <div role="rowheader" className="text-sm">
        <span className="font-medium text-navy-800">{r.label}</span>
        {r.ket && <span className="group relative ml-1 inline-flex align-middle" tabIndex={0} aria-label={r.ket}><Info className="size-3.5 text-muted-foreground" aria-hidden />
          <span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-max max-w-[16rem] -translate-x-1/2 rounded-md bg-navy-950 px-2.5 py-1.5 text-xs font-normal text-white shadow-lg group-hover:block group-focus-visible:block">{r.ket}</span></span>}
        {r.arah && <span className="block text-xs text-muted-foreground">{r.arah === "tinggi" ? "Makin tinggi makin baik" : "Makin rendah makin baik"}</span>}
      </div>
      <div className="grid gap-x-4 gap-y-2" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
        {r.nilai.map((v, i) => {
          const unggul = r.terbaik.includes(i);
          return (
            <div role="cell" key={i} className="min-w-0">
              <p className={cn("flex items-start gap-1.5 text-sm", v === null ? "text-muted-foreground" : "text-navy-900", unggul && "font-semibold")}>
                <span className="mt-0.5 md:hidden"><Huruf i={i} className="size-4 text-[9px]" /></span>
                <span className="min-w-0 break-words">{v === null ? "Tidak ada data" : formatNilai(r, v)}{r.format === "rupiah" && r.satuan && v !== null ? ` ${r.satuan}` : ""}</span>
                {unggul && <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-label={`terbaik: ${nama(i)}`} />}
              </p>
              {angka && r.batang[i] !== null && <div className="mt-1.5 h-2 overflow-hidden rounded-r-[4px] bg-muted/60"><div className="h-full rounded-r-[4px]" style={{ width: `${Math.max(2, Math.round((r.batang[i] ?? 0) * 100))}%`, background: WARNA_PRODUK[i] }} /></div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
