"use client";
/**
 * Bilah "Langsung": memuat ulang data halaman (router.refresh) tiap N detik selama tab terlihat, menampilkan waktu
 * pembaruan, tombol jeda, dan notifikasi opsional (bunyi + notifikasi browser) bila ada alarm BARU.
 * Muat ulang mempertahankan tampilan lama sampai data baru tiba (tanpa kerangka kosong / lompatan tata letak).
 */
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellOff, Pause, Play, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type AlarmPemberitahuan = { id: number; teks: string };
const K_NOTIF = "stars-monitor-notif";
const baca = (k: string) => { try { return window.localStorage.getItem(k); } catch { return null; } };
const tulis = (k: string, v: string) => { try { window.localStorage.setItem(k, v); } catch { /* diblokir */ } };

function bunyi() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const c = new Ctx();
    [0, 0.35].forEach((mulai) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = "sine"; o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, c.currentTime + mulai);
      g.gain.exponentialRampToValueAtTime(0.25, c.currentTime + mulai + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + mulai + 0.25);
      o.connect(g).connect(c.destination); o.start(c.currentTime + mulai); o.stop(c.currentTime + mulai + 0.3);
    });
    setTimeout(() => c.close().catch(() => {}), 1200);
  } catch { /* audio tidak tersedia */ }
}

export function PemantauLangsung({ waktuServer, alarm, intervalDetik = 15 }: { waktuServer: string; alarm: AlarmPemberitahuan[]; intervalDetik?: number }) {
  const router = useRouter();
  const [memuat, mulai] = useTransition();
  const [jeda, setJeda] = useState(false);
  const [notif, setNotif] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);
  const dikenal = useRef<Set<number> | null>(null);

  useEffect(() => { setNotif(baca(K_NOTIF) === "1"); }, []);

  const segarkan = useCallback(() => mulai(() => router.refresh()), [router]);

  useEffect(() => {
    if (jeda) return;
    let t: ReturnType<typeof setInterval> | undefined;
    const jalan = () => { clearInterval(t); if (document.visibilityState === "visible") t = setInterval(segarkan, intervalDetik * 1000); };
    const terlihat = () => { if (document.visibilityState === "visible") segarkan(); jalan(); };
    jalan();
    document.addEventListener("visibilitychange", terlihat);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", terlihat); };
  }, [jeda, intervalDetik, segarkan]);

  // alarm baru (id belum pernah terlihat di sesi ini) → bunyi + notifikasi browser
  useEffect(() => {
    const ids = new Set(alarm.map((a) => a.id));
    if (dikenal.current == null) { dikenal.current = ids; return; }
    const baru = alarm.filter((a) => !dikenal.current!.has(a.id));
    dikenal.current = ids;
    if (!baru.length) return;
    setPesan(`${baru.length} alarm baru: ${baru.map((a) => a.teks).join("; ")}`);
    if (!notif) return;
    bunyi();
    try {
      if ("Notification" in window && Notification.permission === "granted") {
        for (const a of baru.slice(0, 3)) new Notification("STARS — alarm monitoring", { body: a.teks, tag: `stars-alarm-${a.id}` });
      }
    } catch { /* notifikasi tidak didukung */ }
  }, [alarm, notif]);

  async function aturNotif() {
    const nyala = !notif;
    if (nyala && "Notification" in window && Notification.permission === "default") {
      try { await Notification.requestPermission(); } catch { /* abaikan */ }
    }
    setNotif(nyala);
    tulis(K_NOTIF, nyala ? "1" : "0");
    if (nyala) bunyi();
  }

  const jam = new Date(waktuServer).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Jakarta" }).replace(/\./g, ":");
  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border bg-card px-3 py-2 text-sm shadow-card print:hidden">
      <span className="inline-flex items-center gap-2 font-semibold text-navy-800">
        <span className="relative flex size-2.5" aria-hidden>
          {!jeda && <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60 motion-reduce:hidden" />}
          <span className={cn("relative inline-flex size-2.5 rounded-full", jeda ? "bg-muted-foreground" : "bg-emerald-500")} />
        </span>
        {jeda ? "Dijeda" : "Langsung"}
      </span>
      <span className="text-muted-foreground" aria-live="polite">Diperbarui {jam} WIB{!jeda ? ` · tiap ${intervalDetik} detik` : ""}</span>
      <div className="ml-auto flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={segarkan} disabled={memuat} aria-label="Muat ulang sekarang"><RefreshCw className={cn(memuat && "animate-spin")} /> Muat ulang</Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setJeda((j) => !j)} aria-pressed={jeda}>{jeda ? <><Play /> Lanjutkan</> : <><Pause /> Jeda</>}</Button>
        <Button type="button" variant={notif ? "teal" : "outline"} size="sm" onClick={aturNotif} aria-pressed={notif} title="Bunyi & notifikasi browser saat ada alarm baru (selama halaman ini terbuka)">
          {notif ? <><Bell /> Notifikasi aktif</> : <><BellOff /> Notifikasi mati</>}
        </Button>
      </div>
      {pesan && (
        <p role="alert" className="w-full rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-800">
          {pesan} <button type="button" className="ml-2 underline" onClick={() => setPesan(null)}>Tutup</button>
        </p>
      )}
    </div>
  );
}
