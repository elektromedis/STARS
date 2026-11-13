"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Tebalkan bagian teks yang cocok dengan kata kunci (tanpa membedakan huruf besar/kecil). */
export function Sorot({ teks, kunci }: { teks: string; kunci: string }) {
  const k = kunci.trim();
  if (!k) return <>{teks}</>;
  const i = teks.toLowerCase().indexOf(k.toLowerCase());
  if (i < 0) return <>{teks}</>;
  return <>{teks.slice(0, i)}<mark className="rounded-sm bg-teal-100 px-0 font-semibold text-inherit">{teks.slice(i, i + k.length)}</mark>{teks.slice(i + k.length)}</>;
}

/**
 * Kolom isian dengan daftar saran (pola ARIA combobox): ketik → saran muncul, ↑/↓ memilih, Enter memakai, Esc menutup.
 * Penyaringan/pemuatan saran dilakukan pemanggil; komponen ini hanya tampilan & keyboard.
 */
export function Combobox<T>({
  value, onValueChange, saran, kunciSaran, renderSaran, onPilih, memuat = false, kosong, ikon, name, id, placeholder, required, maxLength,
  autoFocus, bukaSaatFokus = false, gelap = false, className, inputClassName, "aria-invalid": ariaInvalid, onBlur, inputMode,
}: {
  value: string; onValueChange: (v: string) => void; saran: T[]; kunciSaran: (s: T) => string | number; renderSaran: (s: T, aktif: boolean) => ReactNode;
  onPilih: (s: T) => void; memuat?: boolean; kosong?: ReactNode; ikon?: ReactNode; name?: string; id?: string; placeholder?: string; required?: boolean;
  maxLength?: number; autoFocus?: boolean; bukaSaatFokus?: boolean; gelap?: boolean; className?: string; inputClassName?: string;
  "aria-invalid"?: boolean; onBlur?: () => void; inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  const idDasar = useId();
  const idList = `${idDasar}-saran`;
  const [fokus, setFokus] = useState(false);
  const [tutup, setTutup] = useState(false);
  const [aktif, setAktif] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const adaIsi = saran.length > 0 || memuat || Boolean(kosong && value.trim().length >= 2);
  const terbuka = Boolean(fokus && !tutup && adaIsi && (bukaSaatFokus || value.trim().length > 0));

  useEffect(() => { setAktif(-1); }, [saran]);
  useEffect(() => {
    if (aktif < 0 || !listRef.current) return;
    (listRef.current.children[aktif] as HTMLElement | undefined)?.scrollIntoView({ block: "nearest" });
  }, [aktif]);

  function pilih(s: T) { onPilih(s); setTutup(true); setAktif(-1); }

  function tombol(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") { e.preventDefault(); setTutup(false); if (saran.length) setAktif((a) => (a + 1) % saran.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); if (saran.length) setAktif((a) => (a <= 0 ? saran.length - 1 : a - 1)); }
    else if (e.key === "Enter" && terbuka && aktif >= 0 && saran[aktif]) { e.preventDefault(); pilih(saran[aktif]); }
    else if (e.key === "Escape" && terbuka) { e.preventDefault(); e.stopPropagation(); setTutup(true); }
  }

  return (
    <div className={cn("relative", className)}>
      {ikon && <span className={cn("pointer-events-none absolute left-3 top-1/2 -translate-y-1/2", gelap ? "text-white/60" : "text-muted-foreground")} aria-hidden>{ikon}</span>}
      <input
        ref={inputRef} id={id} name={name} value={value} placeholder={placeholder} required={required} maxLength={maxLength} autoFocus={autoFocus}
        autoComplete="off" spellCheck={false} inputMode={inputMode}
        role="combobox" aria-expanded={terbuka} aria-controls={idList} aria-autocomplete="list" aria-invalid={ariaInvalid || undefined}
        aria-activedescendant={terbuka && aktif >= 0 ? `${idList}-${aktif}` : undefined}
        onChange={(e) => { onValueChange(e.target.value); setTutup(false); }}
        onFocus={() => { setFokus(true); setTutup(false); }}
        onBlur={() => { setFokus(false); onBlur?.(); }}
        onKeyDown={tombol}
        className={cn(
          "flex h-10 w-full rounded-md border px-3 py-2 text-sm",
          gelap ? "border-white/20 bg-white/10 text-white placeholder:text-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
            : "border-input bg-card placeholder:text-muted-foreground",
          ikon && "pl-9", value && "pr-9", ariaInvalid && "border-red-400", inputClassName,
        )}
      />
      {value && (
        <button type="button" tabIndex={-1} aria-label="Kosongkan" onMouseDown={(e) => e.preventDefault()}
          onClick={() => { onValueChange(""); setTutup(false); inputRef.current?.focus(); }}
          className={cn("absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full", gelap ? "text-white/70 hover:bg-white/10" : "text-muted-foreground hover:bg-muted")}>
          <X className="size-3.5" />
        </button>
      )}
      {terbuka && (
        <ul ref={listRef} id={idList} role="listbox"
          className="absolute inset-x-0 top-full z-40 mt-1 max-h-80 overflow-y-auto overscroll-contain rounded-lg border bg-card p-1 text-foreground shadow-xl">
          {saran.map((s, i) => (
            <li key={kunciSaran(s)} id={`${idList}-${i}`} role="option" aria-selected={i === aktif}
              onMouseDown={(e) => e.preventDefault()} onClick={() => pilih(s)} onMouseEnter={() => setAktif(i)}
              className={cn("cursor-pointer rounded-md px-2.5 py-2 text-sm", i === aktif ? "bg-teal-50" : "hover:bg-muted/60")}>
              {renderSaran(s, i === aktif)}
            </li>
          ))}
          {memuat && <li className="flex items-center gap-2 px-2.5 py-2 text-sm text-muted-foreground" aria-live="polite"><Loader2 className="size-4 animate-spin" /> Mencari…</li>}
          {!memuat && saran.length === 0 && kosong && <li className="px-2.5 py-2 text-sm text-muted-foreground">{kosong}</li>}
        </ul>
      )}
    </div>
  );
}
