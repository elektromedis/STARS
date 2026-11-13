"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Box, Search, X } from "lucide-react";
import { Combobox, Sorot } from "@/components/ui/combobox";
import { HURUF_PRODUK, MAKS_BANDING, WARNA_PRODUK, type SubjekRingkas } from "@/lib/hta-banding";
import { cn } from "@/lib/utils";

/** Saran produk dari /api/hta/cari (debounce 250 ms, permintaan lama dibatalkan). */
export function useCariProduk(teks: string) {
  const [hasil, setHasil] = useState<SubjekRingkas[]>([]);
  const [memuat, setMemuat] = useState(false);
  useEffect(() => {
    const q = teks.trim();
    if (q.length < 2) { setHasil([]); setMemuat(false); return; }
    const ac = new AbortController();
    setMemuat(true);
    const t = window.setTimeout(async () => {
      try {
        const r = await fetch(`/api/hta/cari?q=${encodeURIComponent(q)}`, { signal: ac.signal });
        const j = r.ok ? ((await r.json()) as { hasil: SubjekRingkas[] }) : { hasil: [] };
        setHasil(j.hasil);
      } catch { /* dibatalkan */ } finally { if (!ac.signal.aborted) setMemuat(false); }
    }, 250);
    return () => { ac.abort(); window.clearTimeout(t); };
  }, [teks]);
  return { hasil, memuat };
}

export function FotoProduk({ src, judul, className }: { src: string | null; judul: string; className?: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element -- foto dari API sendiri
    <img src={src} alt="" title={judul} className={cn("shrink-0 rounded-lg bg-white object-cover", className)} />
  ) : (
    <span className={cn("flex shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground", className)} aria-hidden><Box className="size-1/2" /></span>
  );
}

export function BarisSaranProduk({ s, kunci }: { s: SubjekRingkas; kunci: string }) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <FotoProduk src={s.fotoKecil} judul={s.judul} className="size-9" />
      <span className="min-w-0">
        <span className="block truncate font-medium"><Sorot teks={s.judul} kunci={kunci} /></span>
        <span className="block truncate text-xs text-muted-foreground"><Sorot teks={s.nama} kunci={kunci} /> · {s.kandidat ? "Kandidat (belum dimiliki RS)" : `${s.unit} unit di RS`}</span>
      </span>
    </span>
  );
}

/**
 * Kotak "bandingkan" ala versus.com: ketik → pilih produk (maks 3) → Bandingkan.
 * `gelap` untuk hero berlatar gelap.
 */
export function PilihBanding({ awal = [], gelap = false, autoFocus = false }: { awal?: SubjekRingkas[]; gelap?: boolean; autoFocus?: boolean }) {
  const router = useRouter();
  const [pilihan, setPilihan] = useState<SubjekRingkas[]>(awal);
  const [teks, setTeks] = useState("");
  const { hasil, memuat } = useCariProduk(teks);
  const saran = hasil.filter((h) => !pilihan.some((p) => p.id === h.id));
  const penuh = pilihan.length >= MAKS_BANDING;

  function buka(ids = pilihan.map((p) => p.id)) {
    if (!ids.length) return;
    router.push(`/hta/banding?${ids.map((id) => `id=${encodeURIComponent(id)}`).join("&")}`);
  }

  return (
    <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); buka(); }}>
      {pilihan.length > 0 && (
        <ul className="flex flex-wrap items-center gap-2" aria-label="Produk dipilih">
          {pilihan.map((p, i) => (
            <li key={p.id} className="contents">
              {i > 0 && <span className={cn("text-xs font-bold uppercase", gelap ? "text-white/70" : "text-muted-foreground")} aria-hidden>vs</span>}
              <span className={cn("inline-flex max-w-full items-center gap-2 rounded-full border py-1 pl-1 pr-2 text-sm", gelap ? "border-white/20 bg-white/10 text-white" : "bg-card")}>
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: WARNA_PRODUK[i] }}>{HURUF_PRODUK[i]}</span>
                <span className="truncate">{p.judul}</span>
                <button type="button" onClick={() => setPilihan((x) => x.filter((y) => y.id !== p.id))} className={cn("rounded-full p-0.5", gelap ? "hover:bg-white/20" : "hover:bg-muted")} aria-label={`Hapus ${p.judul}`}><X className="size-3.5" /></button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Combobox
          className="flex-1" value={teks} onValueChange={setTeks} saran={penuh ? [] : saran} kunciSaran={(s) => s.id} memuat={memuat && !penuh}
          renderSaran={(s) => <BarisSaranProduk s={s} kunci={teks} />}
          onPilih={(s) => { setPilihan((x) => [...x, s].slice(0, MAKS_BANDING)); setTeks(""); }}
          kosong={<span className="text-sm text-muted-foreground">Tidak ada produk cocok. Coba jenis alat, merek, atau tipe lain.</span>}
          ikon={<Search className="size-4" />} autoFocus={autoFocus} gelap={false}
          placeholder={penuh ? "Maksimal 3 produk" : pilihan.length ? "Tambah pembanding: ketik jenis, merek, atau tipe" : "Ketik di sini untuk membandingkan, mis. infusion pump"}
          inputClassName={cn("h-12 rounded-full pl-10 text-base", gelap && "border-white bg-white text-navy-900")}
        />
        <button type="submit" disabled={!pilihan.length}
          className={cn("inline-flex h-12 items-center justify-center gap-2 rounded-full px-7 text-sm font-bold shadow-lg transition disabled:cursor-not-allowed disabled:opacity-50",
            gelap ? "bg-navy-950 text-white ring-1 ring-white/30 hover:bg-black" : "bg-navy-800 text-white hover:bg-navy-700")}>
          {pilihan.length >= 2 ? "Bandingkan" : "Lihat"} <ArrowRight className="size-4" aria-hidden />
        </button>
      </div>
      <p className={cn("text-xs", gelap ? "text-white/70" : "text-muted-foreground")}>
        Pilih 2–3 produk. Produk = merek + tipe alat yang ada di Inventaris RS, atau kandidat pengadaan yang ditambahkan tim.
      </p>
    </form>
  );
}
