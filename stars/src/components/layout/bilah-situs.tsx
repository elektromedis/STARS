"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Mail, MapPin, MessageCircle, Phone, X } from "lucide-react";
import { PilihBahasa, useBahasa } from "@/lib/bahasa";
import { useSitus } from "./use-situs";

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

/** Bagian kontak di bawah halaman (gaya RSCM): grup tautan lipat, kontak, peta, media sosial, unduh aplikasi. */
export function KontakSitus() {
  const { info } = useSitus();
  const { bhs, t } = useBahasa();
  const ada = info.telepon || info.email || info.whatsapp || info.peta || info.grup.length;
  if (!ada) return null;
  return (
    <section aria-label={t("Informasi kontak", "Contact information")} className="bg-teal-700 px-4 pb-6 pt-4 text-white md:px-6 print:hidden">
      <div className="mx-auto grid max-w-[1360px] gap-6 md:grid-cols-[1fr_1fr]">
        <div className="divide-y divide-white/25">
          {info.grup.map((g) => (
            <details key={g.judul} className="group py-3">
              <summary className="flex cursor-pointer list-none items-center gap-2 text-base font-semibold">{bhs === "en" && g.judulEn ? g.judulEn : g.judul}<ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden /></summary>
              <ul className="mt-2 grid gap-1.5 pl-1 text-sm">{g.tautan.map((x) => <li key={x.href + x.label}><Link href={x.href} className="opacity-90 hover:underline hover:opacity-100">{bhs === "en" && x.labelEn ? x.labelEn : x.label}</Link></li>)}</ul>
            </details>
          ))}
        </div>
        <div className="grid content-start gap-2 text-sm">
          <p className="text-base font-semibold">{t("Kontak", "Contact")}</p>
          {info.email && <a href={`mailto:${info.email}`} className="flex items-center gap-2 hover:underline"><Mail className="size-4" aria-hidden /> {info.email}</a>}
          {(info.telepon || info.whatsapp) && <p className="flex items-center gap-2"><Phone className="size-4" aria-hidden /> {[info.telepon && `${t("Telepon", "Phone")}: ${info.telepon}`, info.whatsapp && `0${info.whatsapp.replace(/^62/, "")} (WA)`].filter(Boolean).join(" / ")}</p>}
          <p className="flex items-start gap-2"><MapPin className="mt-0.5 size-4 shrink-0" aria-hidden /> {info.alamat}</p>
          {info.peta && <iframe src={info.peta} title={t("Peta lokasi", "Location map")} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="mt-1 h-40 w-full max-w-md rounded-lg border-0 bg-white/20" />}
          {SOSIAL.some(([k]) => info.sosial[k]) && <>
            <p className="mt-2 text-base font-semibold">{t("Terhubung dengan Kami", "Connect with Us")}</p>
            <div className="flex gap-2">{SOSIAL.filter(([k]) => info.sosial[k]).map(([k, n, d]) => (
              <a key={k} href={info.sosial[k]} target="_blank" rel="noopener noreferrer" aria-label={n} className="grid size-9 place-items-center rounded-full bg-white/15 hover:bg-white/30"><svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden><path d={d} /></svg></a>))}</div></>}
          {(info.aplikasiAndroid || info.aplikasiIos) && <>
            <p className="mt-2 text-base font-semibold">{t("Unduh Aplikasi", "Download the App")}</p>
            <div className="flex gap-2">
              {info.aplikasiAndroid && <a href={info.aplikasiAndroid} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-black px-3 py-1.5 text-xs font-semibold">Google Play</a>}
              {info.aplikasiIos && <a href={info.aplikasiIos} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-black px-3 py-1.5 text-xs font-semibold">App Store</a>}
            </div></>}
        </div>
      </div>
    </section>
  );
}

/** Tombol "Bantuan?" mengambang → WhatsApp. */
export function TombolBantuan() {
  const { info } = useSitus();
  const { t } = useBahasa();
  if (!info.whatsapp) return null;
  return (
    <a href={`https://wa.me/${info.whatsapp}?text=${encodeURIComponent(t("Halo, saya butuh bantuan terkait STARS.", "Hello, I need help with STARS."))}`} target="_blank" rel="noopener noreferrer"
      className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-3 z-40 flex items-center gap-2 print:hidden md:bottom-5 md:right-[calc(clamp(4.5rem,5.5vw,6rem)+0.5rem)]">
      <span className="rounded-full bg-teal-50 px-3 py-1.5 text-sm font-semibold text-teal-800 shadow">{info.bantuanTeks === "Bantuan?" ? t("Bantuan?", "Need help?") : info.bantuanTeks}</span>
      <span className="grid size-12 place-items-center rounded-full bg-teal-600 text-white shadow-lg"><MessageCircle className="size-6" aria-hidden /></span>
    </a>
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
