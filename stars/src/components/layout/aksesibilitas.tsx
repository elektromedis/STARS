"use client";

import { useEffect, useState } from "react";
import { Accessibility, RotateCcw, X } from "lucide-react";
import { PilihBahasa, useBahasa } from "@/lib/bahasa";

type Opsi = { teks: number; baris: number; huruf: number; kontras: "" | "tinggi" | "gelap" | "terbalik" | "abu"; tautan: boolean; mudahBaca: boolean; kursor: boolean; animasi: boolean; gambar: boolean; pemandu: boolean; suara: boolean; fokus: boolean; rataKiri: boolean };
const AWAL: Opsi = { teks: 0, baris: 0, huruf: 0, kontras: "", tautan: false, mudahBaca: false, kursor: false, animasi: false, gambar: false, pemandu: false, suara: false, fokus: false, rataKiri: false };
const KUNCI = "stars-aksesibilitas";

function terapkan(o: Opsi) {
  const h = document.documentElement;
  h.style.setProperty("--a11y-teks", String(1 + o.teks * 0.15));
  h.style.setProperty("--a11y-baris", String(1.5 + o.baris * 0.35));
  h.style.setProperty("--a11y-huruf", `${o.huruf * 0.06}em`);
  const kelas: [string, boolean][] = [["a11y-teks", o.teks > 0], ["a11y-baris", o.baris > 0], ["a11y-huruf", o.huruf > 0], ["a11y-kontras-tinggi", o.kontras === "tinggi"], ["a11y-kontras-gelap", o.kontras === "gelap"], ["a11y-terbalik", o.kontras === "terbalik"], ["a11y-abu", o.kontras === "abu"],
    ["a11y-tautan", o.tautan], ["a11y-mudah-baca", o.mudahBaca], ["a11y-kursor", o.kursor], ["a11y-diam", o.animasi], ["a11y-tanpa-gambar", o.gambar], ["a11y-fokus", o.fokus], ["a11y-rata-kiri", o.rataKiri]];
  for (const [k, v] of kelas) h.classList.toggle(k, v);
}

/** Widget aksesibilitas disabilitas (low vision, buta warna, disleksia, motorik, epilepsi/fotosensitif, tunanetra parsial). */
export function Aksesibilitas() {
  const { t } = useBahasa();
  const [buka, setBuka] = useState(false);
  const [o, setO] = useState<Opsi>(AWAL);
  const [y, setY] = useState(-100);
  useEffect(() => { try { const s = localStorage.getItem(KUNCI); if (s) setO({ ...AWAL, ...JSON.parse(s) }); } catch {} }, []);
  useEffect(() => { terapkan(o); try { localStorage.setItem(KUNCI, JSON.stringify(o)); } catch {} }, [o]);
  useEffect(() => { if (!o.pemandu) return; const m = (e: MouseEvent) => setY(e.clientY); window.addEventListener("mousemove", m); return () => window.removeEventListener("mousemove", m); }, [o.pemandu]);
  useEffect(() => {
    if (!o.suara || !("speechSynthesis" in window)) return;
    const baca = (e: MouseEvent) => {
      const el = e.target as HTMLElement; if (el.closest("[data-a11y-panel]")) return;
      const teks = (window.getSelection()?.toString() || el.innerText || el.getAttribute("aria-label") || el.getAttribute("alt") || "").trim().slice(0, 600);
      if (!teks) return; speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(teks); u.lang = document.documentElement.lang === "en" ? "en-US" : "id-ID"; speechSynthesis.speak(u);
    };
    document.addEventListener("click", baca, true); return () => { document.removeEventListener("click", baca, true); speechSynthesis.cancel(); };
  }, [o.suara]);
  useEffect(() => { const f = () => setBuka(true); window.addEventListener("stars:a11y-buka", f); return () => window.removeEventListener("stars:a11y-buka", f); }, []);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.altKey && e.key.toLowerCase() === "a") setBuka((b) => !b); if (e.key === "Escape") setBuka(false); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, []);

  const ubah = <K extends keyof Opsi>(k: K, v: Opsi[K]) => setO((x) => ({ ...x, [k]: v }));
  const Tingkat = ({ k, label }: { k: "teks" | "baris" | "huruf"; label: string }) => (
    <button type="button" onClick={() => ubah(k, (o[k] + 1) % 4)} aria-pressed={o[k] > 0} className={`a11y-ubin ${o[k] ? "aktif" : ""}`}>
      <span>{label}</span><span className="flex gap-0.5" aria-hidden>{[1, 2, 3].map((n) => <i key={n} className={`h-1 w-4 rounded ${o[k] >= n ? "bg-white" : "bg-current opacity-25"}`} />)}</span>
      <span className="sr-only">{o[k] ? `${t("tingkat", "level")} ${o[k]}` : t("mati", "off")}</span>
    </button>);
  const Saklar = ({ k, label }: { k: "tautan" | "mudahBaca" | "kursor" | "animasi" | "gambar" | "pemandu" | "suara" | "fokus" | "rataKiri"; label: string }) => (
    <button type="button" onClick={() => ubah(k, !o[k])} aria-pressed={o[k]} className={`a11y-ubin ${o[k] ? "aktif" : ""}`}>{label}</button>);
  const Kontras = ({ v, label }: { v: Opsi["kontras"]; label: string }) => (
    <button type="button" onClick={() => ubah("kontras", o.kontras === v ? "" : v)} aria-pressed={o.kontras === v} className={`a11y-ubin ${o.kontras === v ? "aktif" : ""}`}>{label}</button>);

  return (
    <>
      {o.pemandu && <div aria-hidden className="pointer-events-none fixed inset-x-0 z-[80] h-10 border-y-4 border-amber-400 bg-amber-200/20" style={{ top: y - 20 }} />}
      {buka && (
        <div data-a11y-panel role="dialog" aria-modal="false" aria-label={t("Aksesibilitas", "Accessibility")} className="a11y-panel fixed bottom-0 left-0 z-[75] flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white text-navy-900 shadow-2xl sm:bottom-4 sm:left-4 sm:w-[23rem] sm:rounded-2xl print:hidden">
          <div className="flex items-center gap-2 bg-blue-700 px-4 py-3 text-white">
            <Accessibility className="size-5" aria-hidden /><p className="flex-1 font-semibold">{t("Aksesibilitas", "Accessibility")}</p>
            <PilihBahasa />
            <button type="button" onClick={() => setBuka(false)} aria-label={t("Tutup", "Close")} className="rounded p-1 hover:bg-white/20"><X className="size-5" /></button>
          </div>
          <div className="grid gap-3 overflow-y-auto p-3 text-sm">
            <p className="text-xs font-semibold uppercase text-slate-500">{t("Teks & bacaan", "Text & reading")}</p>
            <div className="grid grid-cols-3 gap-2">
              <Tingkat k="teks" label={t("Perbesar teks", "Bigger text")} /><Tingkat k="baris" label={t("Jarak baris", "Line height")} /><Tingkat k="huruf" label={t("Jarak huruf", "Letter spacing")} />
              <Saklar k="mudahBaca" label={t("Huruf ramah disleksia", "Dyslexia-friendly")} /><Saklar k="rataKiri" label={t("Rata kiri", "Align left")} /><Saklar k="suara" label={t("Bacakan (klik teks)", "Read aloud (click)")} />
            </div>
            <p className="text-xs font-semibold uppercase text-slate-500">{t("Warna & kontras", "Colour & contrast")}</p>
            <div className="grid grid-cols-3 gap-2">
              <Kontras v="tinggi" label={t("Kontras tinggi", "High contrast")} /><Kontras v="gelap" label={t("Kontras gelap", "Dark contrast")} /><Kontras v="terbalik" label={t("Warna terbalik", "Invert colours")} />
              <Kontras v="abu" label={t("Hitam-putih", "Greyscale")} /><Saklar k="tautan" label={t("Sorot tautan", "Highlight links")} /><Saklar k="gambar" label={t("Sembunyikan gambar", "Hide images")} />
            </div>
            <p className="text-xs font-semibold uppercase text-slate-500">{t("Navigasi & gerak", "Navigation & motion")}</p>
            <div className="grid grid-cols-3 gap-2">
              <Saklar k="kursor" label={t("Kursor besar", "Big cursor")} /><Saklar k="pemandu" label={t("Pemandu baca", "Reading guide")} /><Saklar k="fokus" label={t("Sorot fokus", "Focus outline")} />
              <Saklar k="animasi" label={t("Hentikan animasi", "Stop animations")} />
            </div>
            <button type="button" onClick={() => setO(AWAL)} className="flex items-center justify-center gap-2 rounded-lg border py-2 font-medium hover:bg-slate-50"><RotateCcw className="size-4" /> {t("Atur ulang semua", "Reset all")}</button>
            <p className="text-xs text-slate-500">{t("Pintasan: Alt+A buka/tutup, Esc tutup. Pengaturan tersimpan di perangkat ini.", "Shortcut: Alt+A open/close, Esc close. Settings are saved on this device.")}</p>
          </div>
        </div>)}
    </>
  );
}
