"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, ChevronUp, Mail, MapPin, MessageCircle, Phone, X } from "lucide-react";
import { PilihBahasa, useBahasa } from "@/lib/bahasa";
import { useSitus } from "./use-situs";
import { urlLogoRsud } from "@/lib/situs";
import { LogoIkon } from "./logo-animasi";

/** Bilah atas tipis: alamat · telepon · pilihan bahasa. */
export function BilahAtas() {
  const { info } = useSitus();
  const { t } = useBahasa();
  return (
    <div className="bg-teal-700 text-white print:hidden">
      <div className="mx-auto flex max-w-[1360px] items-center gap-3 px-4 py-1 text-xs md:px-6">
        {info.tampilBilahAtas && <span className="flex min-w-0 items-center gap-1.5 truncate"><MapPin className="size-3.5 shrink-0" aria-hidden /><span className="truncate">{info.alamat}</span></span>}
        {info.tampilBilahAtas && info.telepon && <a href={`tel:${info.telepon.replace(/[^\d+]/g, "")}`} className="hidden shrink-0 items-center gap-1 font-semibold hover:underline sm:flex"><Phone className="size-3.5" aria-hidden /> {info.telepon}</a>}
        <span className="ml-auto flex shrink-0 items-center gap-2"><span className="sr-only">{t("Bahasa", "Language")}</span><PilihBahasa /></span>
      </div>
    </div>
  );
}

const SOSIAL: [keyof NonNullable<ReturnType<typeof useSitus>["info"]["sosial"]>, string, string][] = [
  ["facebook", "Facebook", "M14 9h3V5h-3c-2.8 0-4 1.8-4 4v2H8v4h2v8h4v-8h3l1-4h-4V9.5c0-.3.2-.5.5-.5Z"],
  ["instagram", "Instagram", "M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Zm5 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm5.5-1.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z"],
  ["x", "X", "M4 4h4.5l4 5.6L17 4h3l-6.1 7.2L21 20h-4.5l-4.3-6-5 6H4l6.7-7.9Z"],
  ["youtube", "YouTube", "M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8ZM10 15V9l5.2 3Z"],
  ["tiktok", "TikTok", "M16 3c.3 2.3 1.7 3.8 4 4v3c-1.5 0-2.8-.4-4-1.2V15a6 6 0 1 1-6-6h.5v3.1A3 3 0 1 0 13 15V3Z"],
];

/** Kaki halaman gabungan (RSUD Cipayung · UHN · RSPI · Tzu Chi): logo & kontak, kolom tautan, aplikasi & peta, bahasa, sosial, visi. */
export function KontakSitus() {
  const { info } = useSitus();
  const { bhs, setBhs, t } = useBahasa();
  return (
    <section aria-label={t("Informasi kontak", "Contact information")} className="bg-teal-700 px-4 pb-6 pt-8 text-white md:px-6 print:hidden">
      <div className="mx-auto grid max-w-[1360px] gap-8 sm:grid-cols-2 lg:grid-cols-[1.2fr_repeat(var(--k),1fr)_1.1fr]" style={{ ["--k" as string]: Math.max(1, info.grup.length) }}>
        <div className="grid content-start gap-3 text-sm">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={urlLogoRsud(info)} alt="RSUD Cipayung" className="h-10 w-auto brightness-0 invert" />
            <span className="h-10 w-px bg-white/40" aria-hidden />
            <LogoIkon putih className="h-11 w-auto" />
            <span className="font-bold leading-tight">STARS<br /><span className="text-xs font-normal opacity-80">RSUD Cipayung</span></span>
          </div>
          <p className="mt-2 font-semibold">{t("Alamat", "Address")}</p>
          <p className="flex items-start gap-2 opacity-90"><MapPin className="mt-0.5 size-4 shrink-0 text-emerald-300" aria-hidden /> {info.alamat}</p>
          {(info.telepon || info.whatsapp || info.email) && <p className="mt-2 font-semibold">{t("Kontak Kami", "Contact Us")}</p>}
          {info.telepon && <a href={`tel:${info.telepon.replace(/[^\d+]/g, "")}`} className="flex items-center gap-2 opacity-90 hover:underline"><Phone className="size-4 text-emerald-300" aria-hidden /> {info.telepon}</a>}
          {info.whatsapp && <a href={`https://wa.me/${info.whatsapp}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 opacity-90 hover:underline"><MessageCircle className="size-4 text-emerald-300" aria-hidden /> 0{info.whatsapp.replace(/^62/, "")}</a>}
          {info.email && <a href={`mailto:${info.email}`} className="flex items-center gap-2 opacity-90 hover:underline"><Mail className="size-4 text-emerald-300" aria-hidden /> {info.email}</a>}
        </div>
        {info.grup.map((g) => (
          <nav key={g.judul} aria-label={bhs === "en" && g.judulEn ? g.judulEn : g.judul} className="text-sm">
            <p className="mb-3 font-semibold">{bhs === "en" && g.judulEn ? g.judulEn : g.judul}</p>
            <ul className="grid gap-2">{g.tautan.map((x) => <li key={x.href + x.label}><Link href={x.href} className="flex gap-1.5 opacity-90 hover:underline hover:opacity-100"><ChevronRight className="mt-0.5 size-3.5 shrink-0 text-emerald-300" aria-hidden />{bhs === "en" && x.labelEn ? x.labelEn : x.label}</Link></li>)}</ul>
          </nav>
        ))}
        <div className="grid content-start gap-3 text-sm">
          {(info.aplikasiAndroid || info.aplikasiIos) && <>
            <p className="font-semibold">{t("Unduh Aplikasi", "Download the App")}</p>
            <div className="flex flex-wrap gap-2">
              {info.aplikasiAndroid && <a href={info.aplikasiAndroid} target="_blank" rel="noopener noreferrer" className="rounded-full border border-white/70 px-4 py-1.5 text-xs font-semibold hover:bg-white/10">▶ Google Play</a>}
              {info.aplikasiIos && <a href={info.aplikasiIos} target="_blank" rel="noopener noreferrer" className="rounded-full border border-white/70 px-4 py-1.5 text-xs font-semibold hover:bg-white/10"> App Store</a>}
            </div></>}
          {info.peta && <iframe src={info.peta} title={t("Peta lokasi", "Location map")} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="h-40 w-full rounded-lg border-0 bg-white/20" />}
        </div>
      </div>
      <div className="mx-auto mt-8 grid max-w-[1360px] justify-items-center gap-4 border-t border-white/20 pt-6 text-sm">
        <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1"><span className="opacity-80">{t("Bantuan bahasa tersedia:", "Language assistance available:")}</span>
          {(["id", "en"] as const).map((k) => <button key={k} type="button" onClick={() => setBhs(k)} aria-pressed={bhs === k} className={`rounded px-2 py-0.5 underline-offset-2 ${bhs === k ? "bg-white font-semibold text-teal-800" : "underline hover:bg-white/10"}`}>{k === "id" ? "Bahasa Indonesia" : "English"}</button>)}</p>
        {SOSIAL.some(([k]) => info.sosial[k]) && <div className="flex gap-3">{SOSIAL.filter(([k]) => info.sosial[k]).map(([k, n, d]) => (
          <a key={k} href={info.sosial[k]} target="_blank" rel="noopener noreferrer" aria-label={n} className="grid size-10 place-items-center rounded-full border-2 border-white/80 hover:bg-white hover:text-teal-800"><svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden><path d={d} /></svg></a>))}</div>}
        {(info.visi || info.visiEn) && <p className="text-center text-lg font-bold uppercase tracking-wide text-emerald-200">{bhs === "en" && info.visiEn ? info.visiEn : info.visi}</p>}
      </div>
    </section>
  );
}

/** Etalase beranda: Akreditasi & Penghargaan, Mitra Kami (CMS). */
export function EtalaseSitus() {
  const pathname = usePathname();
  const { etalase, info } = useSitus();
  const { bhs, t } = useBahasa();
  if (pathname !== "/") return null;
  const akr = etalase.filter((x) => x.jenis === "akreditasi"), mitra = etalase.filter((x) => x.jenis === "mitra");
  const nama = (x: (typeof etalase)[number]) => (bhs === "en" && x.judulEn ? x.judulEn : x.judul);
  const bungkus = (x: (typeof etalase)[number], isi: React.ReactNode, kelas: string) =>
    x.tautan ? <a key={x.id} href={x.tautan} target={x.tautan.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className={kelas}>{isi}</a> : <div key={x.id} className={kelas}>{isi}</div>;
  return (
    <div className="print:hidden">
      {akr.length > 0 && (
        <section aria-labelledby="judul-akr" className="bg-slate-50 px-4 py-12 md:px-6">
          <h2 id="judul-akr" className="text-center text-2xl font-bold text-navy-900 md:text-4xl">{t("Akreditasi & Penghargaan", "Accreditations & Awards")}</h2>
          {info.subAkreditasi && <p className="mx-auto mt-2 max-w-2xl text-center text-muted-foreground">{info.subAkreditasi}</p>}
          <div className="mx-auto mt-8 grid max-w-[1360px] grid-cols-2 gap-4 lg:grid-cols-4">
            {akr.map((x) => bungkus(x, <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {x.gambar && <img src={`/api/situs/gambar/${x.gambar}`} alt="" loading="lazy" className="mx-auto h-24 w-auto max-w-full object-contain" />}
              <span className="mt-4 block text-center font-semibold text-navy-900">{nama(x)}</span></>,
              "rounded-xl p-5 transition hover:bg-white hover:shadow-md focus-visible:bg-white"))}
          </div>
        </section>
      )}
      {mitra.length > 0 && (
        <section aria-labelledby="judul-mitra" className="bg-white px-4 py-12 md:px-6">
          <h2 id="judul-mitra" className="text-center text-xl font-semibold text-amber-700 md:text-2xl">{t("Mitra Kami", "Our Trusted Partners")}</h2>
          {info.subMitra && <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-muted-foreground">{info.subMitra}</p>}
          <div className="mx-auto mt-8 flex max-w-[1360px] flex-wrap items-center justify-center gap-x-12 gap-y-8">
            {mitra.map((x) => bungkus(x, x.gambar
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={`/api/situs/gambar/${x.gambar}`} alt={nama(x)} loading="lazy" className="h-16 w-auto max-w-[200px] object-contain" />
              : <span className="font-semibold text-slate-600">{nama(x)}</span>, "grayscale transition hover:grayscale-0 focus-visible:grayscale-0"))}
          </div>
        </section>
      )}
    </div>
  );
}

/** Tombol "Kembali ke atas" — muncul setelah menggulir. */
export function KembaliKeAtas() {
  const { t } = useBahasa();
  const [tampil, setTampil] = useState(false);
  useEffect(() => {
    const f = () => setTampil(window.scrollY > 400);
    f(); window.addEventListener("scroll", f, { passive: true }); return () => window.removeEventListener("scroll", f);
  }, []);
  if (!tampil) return null;
  return (
    <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })}
      aria-label={t("Kembali ke atas", "Back to top")} title={t("Kembali ke atas", "Back to top")}
      className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-3 z-40 grid size-11 place-items-center rounded-full bg-emerald-600 text-white shadow-lg hover:bg-emerald-700 print:hidden md:bottom-5 md:right-5">
      <ChevronUp className="size-6" aria-hidden />
    </button>
  );
}

/** Iklan/pengumuman pop-up di beranda — sekali per sesi; Esc/klik latar/Tutup untuk menutup. */
export function PopupPengumuman() {
  const pathname = usePathname();
  const { pengumuman } = useSitus();
  const { t } = useBahasa();
  const [i, setI] = useState<number | null>(null);
  useEffect(() => {
    if (pathname !== "/" || !pengumuman.length) return;
    try { if (sessionStorage.getItem("stars-popup") === "1") return; } catch {}
    setI(0);
  }, [pathname, pengumuman]);
  useEffect(() => {
    if (i === null) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && tutup();
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  });
  function tutup() { if (i !== null && i + 1 < pengumuman.length) setI(i + 1); else { setI(null); try { sessionStorage.setItem("stars-popup", "1"); } catch {} } }
  if (i === null) return null;
  const p = pengumuman[i];
  const isi = p.gambar
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={`/api/situs/gambar/${p.gambar}`} alt={p.judul} className="max-h-[75vh] w-auto max-w-[min(90vw,26rem)] rounded-lg shadow-2xl" />
    : <div className="max-w-sm rounded-xl bg-white p-6 text-lg font-semibold text-navy-900 shadow-2xl">{p.judul}</div>;
  return (
    <div role="dialog" aria-modal="true" aria-label={p.judul} className="fixed inset-0 z-[70] grid place-items-center bg-black/55 p-4 print:hidden" onClick={tutup}>
      <div className="relative" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={tutup} autoFocus className="absolute -top-9 right-0 flex items-center gap-1.5 text-sm font-semibold text-white"><X className="size-5 rounded-full bg-white p-0.5 text-black" aria-hidden /> {t("Tutup", "Close")}</button>
        {p.tautan ? <a href={p.tautan} onClick={tutup}>{isi}</a> : isi}
      </div>
    </div>
  );
}
