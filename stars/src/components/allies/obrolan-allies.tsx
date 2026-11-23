"use client";

import Link from "next/link";
import { Fragment, useEffect, useRef, useState } from "react";
import { ArrowRight, Bot, CheckCircle2, CircleAlert, Loader2, Send, TriangleAlert, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BlokJawaban, Jawaban } from "@/lib/allies";
import { KARYAWAN, type IdKaryawan } from "@/lib/allies-karyawan";

type Pesan = { dari: "saya"; teks: string } | { dari: "allies"; jawab: Jawaban };

/** **tebal** → <strong>, tanpa HTML mentah. */
function Teks({ isi }: { isi: string }) {
  return <>{isi.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith("**") && p.endsWith("**") ? <strong key={i} className="font-semibold text-navy-900">{p.slice(2, -2)}</strong> : <Fragment key={i}>{p}</Fragment>))}</>;
}

const IKON_NADA = { bahaya: { I: CircleAlert, c: "text-red-600" }, awas: { I: TriangleAlert, c: "text-amber-600" }, baik: { I: CheckCircle2, c: "text-green-600" } } as const;

function Blok({ b }: { b: BlokJawaban }) {
  if (b.jenis === "teks") return <p className="leading-relaxed"><Teks isi={b.isi} /></p>;
  if (b.jenis === "langkah") return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-teal-800">{b.judul}</p>
      <ol className="grid gap-1">
        {b.butir.map((x, i) => <li key={i} className="flex gap-2"><span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-[11px] font-bold text-teal-800">{i + 1}</span><span>{x}</span></li>)}
      </ol>
    </div>
  );
  if (b.jenis === "tautan") return (
    <div className="flex flex-wrap gap-2">
      {b.butir.map((t) => <Link key={t.href + t.label} href={t.href} className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-white px-3 py-1 text-xs font-medium text-teal-800 hover:bg-teal-50">{t.label} <ArrowRight className="size-3" /></Link>)}
    </div>
  );
  return (
    <div>
      {b.judul && <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-teal-800">{b.judul}</p>}
      <ul className="grid gap-1.5">
        {b.butir.map((x, i) => {
          const N = x.nada ? IKON_NADA[x.nada] : null;
          const isi = (
            <span className="flex gap-2">
              {N ? <N.I className={cn("mt-0.5 size-4 shrink-0", N.c)} aria-hidden /> : <span className="mt-2 size-1.5 shrink-0 rounded-full bg-slate-400" aria-hidden />}
              <span className="min-w-0"><span className="block"><Teks isi={x.teks} /></span>{x.sub && <span className="block text-xs text-muted-foreground">{x.sub}</span>}</span>
            </span>
          );
          return <li key={i}>{x.href ? <Link href={x.href} className="block rounded-md px-1 py-0.5 hover:bg-white">{isi}</Link> : isi}</li>;
        })}
      </ul>
    </div>
  );
}

/** Panel obrolan "Tanya ALLIES": mode AI untuk pengguna login bila dikonfigurasi, selain itu mesin aturan lokal. */
export function ObrolanAllies({ pembuka, saranAwal, ai = false, aiLabel = "AI", karyawanAktif, onGanti, onSibuk, className }: { pembuka: Jawaban; saranAwal: string[]; ai?: boolean; aiLabel?: string; karyawanAktif?: IdKaryawan; onGanti?: (id: IdKaryawan) => void; onSibuk?: (sibuk: boolean) => void; className?: string }) {
  const [karyawanSendiri, setKaryawanSendiri] = useState<IdKaryawan>("umum");
  const karyawan = karyawanAktif ?? karyawanSendiri;
  const setKaryawan = (id: IdKaryawan) => { setKaryawanSendiri(id); onGanti?.(id); };
  const [pesan, setPesan] = useState<Pesan[]>([{ dari: "allies", jawab: pembuka }]);
  const [teks, setTeks] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const kotak = useRef<HTMLDivElement>(null);
  const terakhir = pesan[pesan.length - 1];
  const petugas = KARYAWAN.find((k) => k.id === karyawan) ?? KARYAWAN[0];
  const saran = ai && pesan.length === 1 ? petugas.saran : terakhir.dari === "allies" ? terakhir.jawab.saran : saranAwal;

  useEffect(() => {
    const k = kotak.current;
    if (k && pesan.length > 1) k.scrollTo({ top: k.scrollHeight, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [pesan]);

  useEffect(() => {
    const id = new URLSearchParams(location.search).get("karyawan");
    if (KARYAWAN.some((k) => k.id === id)) setKaryawan(id as IdKaryawan);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { onSibuk?.(sibuk); }, [sibuk, onSibuk]);

  async function tanya(q: string) {
    const isi = q.trim();
    if (!isi || sibuk) return;
    const riwayat = pesan.flatMap((m) => (m.dari === "saya" ? [{ peran: "user", teks: m.teks }] : m.jawab.asli ? [{ peran: "assistant", teks: m.jawab.asli }] : []));
    setPesan((p) => [...p, { dari: "saya", teks: isi }]);
    setTeks("");
    setSibuk(true);
    try {
      const r = await fetch("/api/allies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pesan: isi, riwayat, karyawan }) });
      const j = await r.json();
      setPesan((p) => [...p, { dari: "allies", jawab: r.ok ? (j as Jawaban) : { blok: [{ jenis: "teks", isi: j.error ?? "Maaf, terjadi kesalahan." }], saran: [] } }]);
    } catch {
      setPesan((p) => [...p, { dari: "allies", jawab: { blok: [{ jenis: "teks", isi: "Tidak dapat terhubung ke server STARS. Coba lagi." }], saran: [] } }]);
    } finally {
      setSibuk(false);
    }
  }

  return (
    <div className={cn("flex h-[34rem] flex-col overflow-hidden rounded-2xl border bg-gradient-to-b from-slate-50 to-white shadow-card", className)}>
      <div className="flex items-center gap-3 border-b bg-white px-4 py-3">
        <span className="relative flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-navy-700 text-white"><Bot className="size-5" aria-hidden /><span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-green-500 ring-2 ring-white" aria-hidden /></span>
        <div className="leading-tight"><p className="font-semibold text-navy-800">Tanya ALLIES</p><p className="text-xs text-muted-foreground">{ai ? `${petugas.nama} · ${aiLabel}` : "Menjawab dari data STARS terkini · mesin lokal"}</p></div>
      </div>
      {ai && (
        <div role="group" aria-label="Pilih Karyawan AI" className="flex gap-2 overflow-x-auto border-b bg-white px-3 py-2 [scrollbar-width:thin]">
          {KARYAWAN.map((k) => <button key={k.id} type="button" aria-pressed={k.id === karyawan} title={k.bidang} onClick={() => setKaryawan(k.id)} className={cn("shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium", k.id === karyawan ? "border-teal-600 bg-teal-600 text-white" : "bg-slate-50 text-navy-800 hover:border-teal-300")}>{k.nama}</button>)}
        </div>
      )}
      <div ref={kotak} className="flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite" aria-label="Percakapan dengan ALLIES">
        {pesan.map((m, i) => m.dari === "saya" ? (
          <div key={i} data-dari="saya" className="flex justify-end gap-2 animate-in fade-in slide-in-from-right-2 duration-300 motion-reduce:animate-none">
            <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-navy-800 px-3.5 py-2 text-sm text-white">{m.teks}</p>
            <UserRound className="mt-1 size-5 shrink-0 text-slate-400" aria-hidden />
          </div>
        ) : (
          <div key={i} data-dari="allies" className="flex gap-2 animate-in fade-in slide-in-from-bottom-2 duration-500 motion-reduce:animate-none">
            <Bot className="mt-1 size-5 shrink-0 text-teal-600" aria-hidden />
            <div className="grid max-w-[92%] gap-3 rounded-2xl rounded-tl-sm border bg-teal-50/60 px-3.5 py-3 text-sm text-navy-800">
              {m.jawab.oleh && <p className="text-xs font-semibold text-teal-800">{m.jawab.oleh} · jawaban AI, periksa sebelum dipakai</p>}
              {m.jawab.blok.map((b, j) => <Blok key={j} b={b} />)}
            </div>
          </div>
        ))}
        {sibuk && <p className="flex items-center gap-2 pl-7 text-xs text-muted-foreground"><Loader2 className="size-3.5 animate-spin" /> ALLIES menganalisis data…</p>}
      </div>
      {saran.length > 0 && (
        <div className="flex gap-2 overflow-x-auto border-t bg-white px-3 pt-2.5 [scrollbar-width:thin]">
          {saran.map((s) => <button key={s} type="button" onClick={() => tanya(s)} disabled={sibuk} className="shrink-0 whitespace-nowrap rounded-full border bg-slate-50 px-3 py-1 text-xs text-navy-800 hover:border-teal-300 hover:bg-teal-50 disabled:opacity-50">{s}</button>)}
        </div>
      )}
      <form onSubmit={(e) => { e.preventDefault(); tanya(teks); }} className="flex gap-2 bg-white p-3">
        <label htmlFor="tanya-allies" className="sr-only">Pertanyaan untuk ALLIES</label>
        <input id="tanya-allies" value={teks} onChange={(e) => setTeks(e.target.value)} maxLength={500} placeholder="Ketik nama/kode alat atau pertanyaan…" className="h-10 min-w-0 flex-1 rounded-full border border-input bg-slate-50 px-4 text-sm placeholder:text-muted-foreground" />
        <button type="submit" disabled={sibuk || !teks.trim()} aria-label="Kirim" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-teal-600 text-white transition-transform hover:scale-105 disabled:opacity-40 motion-reduce:transition-none"><Send className="size-4" /></button>
      </form>
    </div>
  );
}
