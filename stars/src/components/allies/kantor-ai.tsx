"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Bot, X } from "lucide-react";
import type { DivisiKantor } from "@/lib/allies-kantor";
import type { IdKaryawan } from "@/lib/allies-karyawan";
import { cn } from "@/lib/utils";

const W = 1160, H = 690, TW = 60, TH = 30, OX = 580, OY = 92;
const iso = (x: number, y: number, z = 0) => ({ x: OX + (x - y) * TW / 2, y: OY + (x + y) * TH / 2 - z });
type Ruang = { id: IdKaryawan | "rapat" | "server"; label: string; x: number; y: number; w: number; h: number; warna: string; aksen: string; pintu: [number, number] };
const RUANG: Ruang[] = [
  { id: "inventaris", label: "Inventaris", x: 0, y: 0, w: 9, h: 6, warna: "#1e3a4f", aksen: "#38bdf8", pintu: [6, 6] },
  { id: "pemeliharaan", label: "Pemeliharaan", x: 9, y: 0, w: 9, h: 6, warna: "#3b3550", aksen: "#fbbf24", pintu: [12, 6] },
  { id: "rapat", label: "Ruang Rapat", x: 0, y: 6, w: 5, h: 6, warna: "#263548", aksen: "#c084fc", pintu: [5, 9] },
  { id: "umum", label: "Pusat Koordinasi", x: 5, y: 6, w: 8, h: 6, warna: "#134e4a", aksen: "#2dd4bf", pintu: [9, 9] },
  { id: "server", label: "Ruang Data", x: 13, y: 6, w: 5, h: 6, warna: "#1f2a44", aksen: "#60a5fa", pintu: [13, 9] },
  { id: "kalibrasi", label: "Kalibrasi", x: 0, y: 12, w: 9, h: 6, warna: "#3f3338", aksen: "#fb7185", pintu: [6, 12] },
  { id: "perencanaan", label: "Perencanaan", x: 9, y: 12, w: 9, h: 6, warna: "#23412f", aksen: "#4ade80", pintu: [12, 12] },
];
const ruang = (id: string) => RUANG.find((r) => r.id === id)!;
const meja = (r: Ruang) => [[1.8, 1.8], [5.2, 1.8], [1.8, 4.1], [5.2, 4.1]].map(([a, b]) => ({ x: r.x + Math.min(a, r.w - 1.6), y: r.y + Math.min(b, r.h - 1.2) }));
type Aktor = { kunci: string; div: IdKaryawan; lead: boolean; meja: { x: number; y: number }; x: number; y: number; jalur: { x: number; y: number }[]; tunggu: number; pergi: boolean; fase: number; baju: string };

function poli(c: CanvasRenderingContext2D, t: { x: number; y: number }[], isi: string, garis?: string) {
  c.beginPath(); t.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); c.closePath(); c.fillStyle = isi; c.fill();
  if (garis) { c.strokeStyle = garis; c.lineWidth = 1; c.stroke(); }
}
function kotak(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, z0: number, z1: number, atas: string, kiri: string, kanan: string) {
  poli(c, [iso(x, y + h, z0), iso(x + w, y + h, z0), iso(x + w, y + h, z1), iso(x, y + h, z1)], kiri);
  poli(c, [iso(x + w, y, z0), iso(x + w, y + h, z0), iso(x + w, y + h, z1), iso(x + w, y, z1)], kanan);
  poli(c, [iso(x, y, z1), iso(x + w, y, z1), iso(x + w, y + h, z1), iso(x, y + h, z1)], atas);
}
function orang(c: CanvasRenderingContext2D, a: Aktor, wkt: number, pilih: boolean) {
  const p = iso(a.x, a.y), jalan = a.jalur.length > 0, bob = jalan ? Math.abs(Math.sin(wkt * 9 + a.fase)) * 3 : Math.sin(wkt * 2 + a.fase) * .7, sk = a.lead ? 1.12 : .95;
  c.save(); c.translate(p.x, p.y); c.scale(sk, sk);
  c.fillStyle = "rgba(0,0,0,.35)"; c.beginPath(); c.ellipse(0, 0, 11, 5, 0, 0, 7); c.fill();
  if (pilih) { c.strokeStyle = "#fde047"; c.lineWidth = 2; c.beginPath(); c.ellipse(0, 0, 16, 8, 0, 0, 7); c.stroke(); }
  const k = jalan ? Math.sin(wkt * 9 + a.fase) * 3 : 0;
  c.fillStyle = "#1e293b"; c.fillRect(-5 + k, -11, 4, 11); c.fillRect(1 - k, -11, 4, 11);
  c.translate(0, -bob); c.fillStyle = a.baju; c.beginPath(); c.roundRect(-7, -27, 14, 18, 5); c.fill();
  c.fillStyle = "#fff"; c.beginPath(); c.moveTo(-2, -27); c.lineTo(2, -27); c.lineTo(0, -22); c.fill();
  c.fillStyle = "#e8b48f"; c.beginPath(); c.arc(0, -34, 7, 0, 7); c.fill();
  c.fillStyle = "#2b211c"; c.beginPath(); c.arc(0, -36, 7.2, Math.PI, 0); c.fill();
  c.restore();
}

export function KantorAI({ divisi }: { divisi: DivisiKantor[] }) {
  const router = useRouter();
  const kanvas = useRef<HTMLCanvasElement>(null);
  const aktorRef = useRef<Aktor[]>([]);
  const [pilih, setPilih] = useState<IdKaryawan | null>(null);
  const pilihRef = useRef(pilih);
  pilihRef.current = pilih;
  const total = divisi.reduce((n, d) => n + (d.id === "umum" ? 0 : d.total), 0);
  const d = divisi.find((x) => x.id === pilih);
  const kunciData = divisi.map((x) => `${x.id}:${x.total}`).join();

  useEffect(() => {
    const q = new URLSearchParams(location.search).get("petugas");
    if (divisi.some((x) => x.id === q)) setPilih(q as IdKaryawan);
    const i = setInterval(() => router.refresh(), 60_000);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const cv = kanvas.current; if (!cv) return;
    const c = cv.getContext("2d"); if (!c) return;
    const skala = Math.min(2, window.devicePixelRatio || 1); cv.width = W * skala; cv.height = H * skala;
    const aktor: Aktor[] = divisi.flatMap((dv) => {
      const r = ruang(dv.id), n = 1 + Math.min(3, dv.total);
      return meja(r).slice(0, n).map((m, i) => ({ kunci: `${dv.id}-${i}`, div: dv.id, lead: i === 0, meja: m, x: m.x, y: m.y + .55, jalur: [], tunggu: 2 + Math.random() * 8, pergi: false, fase: Math.random() * 6, baju: i === 0 ? r.aksen : "#e2e8f0" }));
    });
    aktorRef.current = aktor; cv.dataset.aktor = String(aktor.length);
    const gerak = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0, lalu = performance.now();
    const perbarui = (dt: number) => {
      for (const a of aktor) {
        if (a.jalur.length) {
          const s = a.jalur[0], dx = s.x - a.x, dy = s.y - a.y, j = Math.hypot(dx, dy), v = 1.7 * dt;
          if (j <= v) { a.x = s.x; a.y = s.y; a.jalur.shift(); } else { a.x += dx / j * v; a.y += dy / j * v; }
          continue;
        }
        a.tunggu -= dt; if (a.tunggu > 0) continue;
        const asal = ruang(a.div), rumah = { x: a.meja.x, y: a.meja.y + .55 }, pt = (r: Ruang) => ({ x: r.pintu[0], y: r.pintu[1] });
        if (a.pergi) { const sana = RUANG.find((r) => a.x >= r.x && a.x < r.x + r.w && a.y >= r.y && a.y < r.y + r.h) ?? asal; a.jalur = [pt(sana), { x: 9, y: 9 }, pt(asal), rumah]; a.pergi = false; a.tunggu = 7 + Math.random() * 9; }
        else { const t = ruang(Math.random() < .55 ? "rapat" : "server"); a.jalur = [pt(asal), { x: 9, y: 9 }, pt(t), { x: t.x + 1 + Math.random() * (t.w - 2), y: t.y + 1 + Math.random() * (t.h - 2) }]; a.pergi = true; a.tunggu = 3 + Math.random() * 4; }
      }
    };
    const gambar = (wkt: number) => {
      c.setTransform(skala, 0, 0, skala, 0, 0); c.fillStyle = "#0b1324"; c.fillRect(0, 0, W, H);
      for (const r of RUANG) {
        poli(c, [iso(r.x, r.y), iso(r.x + r.w, r.y), iso(r.x + r.w, r.y + r.h), iso(r.x, r.y + r.h)], r.warna, "rgba(255,255,255,.14)");
        c.strokeStyle = "rgba(255,255,255,.035)"; c.beginPath();
        for (let i = 1; i < r.w; i++) { const a = iso(r.x + i, r.y), b = iso(r.x + i, r.y + r.h); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); }
        for (let i = 1; i < r.h; i++) { const a = iso(r.x, r.y + i), b = iso(r.x + r.w, r.y + i); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); }
        c.stroke();
        poli(c, [iso(r.x, r.y), iso(r.x + r.w, r.y), iso(r.x + r.w, r.y, 26), iso(r.x, r.y, 26)], r.aksen + "26", r.aksen + "88");
        poli(c, [iso(r.x, r.y), iso(r.x, r.y + r.h), iso(r.x, r.y + r.h, 26), iso(r.x, r.y, 26)], r.aksen + "1a", r.aksen + "66");
      }
      type Obj = { z: number; f: () => void };
      const obj: Obj[] = [];
      for (const r of RUANG) {
        if (r.id === "rapat") obj.push({ z: r.x + 2.5 + r.y + 3, f: () => kotak(c, r.x + 1.3, r.y + 2, 2.4, 2, 12, 17, "#64748b", "#334155", "#475569") });
        else if (r.id === "server") for (let i = 0; i < 3; i++) obj.push({ z: r.x + 1 + r.y + 1 + i, f: () => { kotak(c, r.x + .8 + i * 1.2, r.y + .7, .85, .75, 0, 58, "#334155", "#111827", "#1e293b"); for (let l = 0; l < 4; l++) { const p = iso(r.x + 1.1 + i * 1.2, r.y + 1.45, 14 + l * 11); c.fillStyle = Math.sin(wkt * 3 + i + l) > 0 ? "#34d399" : "#0ea5e9"; c.fillRect(p.x - 4, p.y, 8, 2); } } });
        else {
          const dv = divisi.find((x) => x.id === r.id)!, ada = 1 + Math.min(3, dv.total);
          meja(r).forEach((m, i) => obj.push({ z: m.x + m.y, f: () => {
            kotak(c, m.x - .75, m.y - .35, 1.5, .7, 16, 20, "#a97c50", "#6b4a2d", "#855c38");
            kotak(c, m.x - .7, m.y - .3, .12, .6, 0, 16, "#6b4a2d", "#4a3320", "#5a3d27"); kotak(c, m.x + .58, m.y - .3, .12, .6, 0, 16, "#6b4a2d", "#4a3320", "#5a3d27");
            const on = i < ada, a = iso(m.x - .4, m.y - .05, 22), b = iso(m.x + .4, m.y - .05, 22);
            poli(c, [a, b, { x: b.x, y: b.y - 17 }, { x: a.x, y: a.y - 17 }], on ? r.aksen : "#1e293b", "#0f172a");
            if (on) { c.strokeStyle = "rgba(15,23,42,.7)"; c.lineWidth = 1; c.beginPath(); for (let l = 0; l < 3; l++) { const y = a.y - 12 + l * 4 + (b.y - a.y) / 2, pj = 8 + 7 * Math.abs(Math.sin(wkt * 1.3 + l + i)); c.moveTo((a.x + b.x) / 2 - 10, y); c.lineTo((a.x + b.x) / 2 - 10 + pj, y); } c.stroke(); }
          } }));
        }
      }
      for (const a of aktor) obj.push({ z: a.x + a.y + .01, f: () => orang(c, a, wkt, a.lead && pilihRef.current === a.div) });
      obj.sort((a, b) => a.z - b.z).forEach((o) => o.f());
      c.textAlign = "center"; c.font = "600 12px system-ui, sans-serif";
      for (const r of RUANG) {
        const p = iso(r.x + r.w / 2, r.y + r.h / 2, 34), dv = divisi.find((x) => x.id === r.id), teks = dv ? `${r.label} · ${dv.total}` : r.label, l = c.measureText(teks).width + 18;
        c.fillStyle = "rgba(8,15,30,.88)"; c.beginPath(); c.roundRect(p.x - l / 2, p.y - 15, l, 21, 10); c.fill(); c.strokeStyle = r.aksen; c.stroke(); c.fillStyle = "#f8fafc"; c.fillText(teks, p.x, p.y);
      }
    };
    const putar = (n: number) => { const dt = Math.min(.05, (n - lalu) / 1000); lalu = n; perbarui(dt); gambar(n / 1000); raf = requestAnimationFrame(putar); };
    if (gerak) raf = requestAnimationFrame(putar); else gambar(0);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kunciData]);

  function klik(e: React.MouseEvent<HTMLCanvasElement>) {
    const b = e.currentTarget.getBoundingClientRect(), mx = (e.clientX - b.left) * W / b.width, my = (e.clientY - b.top) * H / b.height;
    const a = aktorRef.current.map((x) => ({ x, p: iso(x.x, x.y) })).filter((o) => Math.abs(o.p.x - mx) < 18 && my > o.p.y - 48 && my < o.p.y + 8)[0];
    if (a) { setPilih(a.x.div); return; }
    const gx = ((mx - OX) / (TW / 2) + (my - OY) / (TH / 2)) / 2, gy = ((my - OY) / (TH / 2) - (mx - OX) / (TW / 2)) / 2;
    const r = RUANG.find((x) => gx >= x.x && gx < x.x + x.w && gy >= x.y && gy < x.y + x.h);
    if (r && divisi.some((x) => x.id === r.id)) setPilih(r.id as IdKaryawan);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div><Link href="/allies" className="mb-1 inline-flex items-center gap-1 text-sm text-teal-700 hover:underline"><ArrowLeft className="size-4" /> ALLIES</Link><h1 className="text-2xl font-bold text-navy-800">Kantor AI</h1><p className="text-sm text-muted-foreground">Simulasi kerja Karyawan AI. Jumlah orang dan angka tiap ruangan mengikuti tugas nyata di STARS.</p></div>
        <p className="rounded-full bg-navy-800 px-4 py-2 text-sm font-semibold text-white">{total} tugas terbuka</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="overflow-hidden rounded-2xl border border-slate-700 bg-[#0b1324] shadow-card">
          <canvas ref={kanvas} id="kantor-ai" onClick={klik} role="img" aria-label="Simulasi kantor isometrik Karyawan AI. Daftar petugas tersedia di samping." className="block h-auto w-full cursor-pointer" style={{ aspectRatio: `${W}/${H}` }} />
        </div>
        <aside className="grid content-start gap-2" aria-label="Daftar Karyawan AI">
          {d ? (
            <div className="rounded-2xl border bg-white p-4 shadow-card">
              <div className="mb-3 flex items-start justify-between gap-2"><div><h2 className="font-semibold text-navy-800">{d.nama}</h2><p className="text-xs text-muted-foreground">{d.bidang} · {d.total} tugas</p></div><button type="button" aria-label="Tutup detail" onClick={() => setPilih(null)} className="rounded p-1 hover:bg-slate-100"><X className="size-4" /></button></div>
              {d.tugas.length ? <ul className="mb-3 max-h-72 divide-y overflow-y-auto">{d.tugas.map((x, i) => <li key={i}><Link href={x.href} className="block py-1.5 text-sm hover:text-teal-700"><span className="block font-medium">{x.judul}</span><span className="block text-xs text-muted-foreground">{x.sub}</span></Link></li>)}</ul> : <p className="mb-3 text-sm text-muted-foreground">Tidak ada tugas terbuka.</p>}
              {d.total > d.tugas.length && <p className="mb-3 text-xs text-muted-foreground">Menampilkan {d.tugas.length} dari {d.total}.</p>}
              <Link href={`/allies?karyawan=${d.id}#tanya`} className="flex items-center justify-center gap-1 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700">Tanya {d.nama} <ArrowRight className="size-4" /></Link>
            </div>
          ) : divisi.map((x) => (
            <button key={x.id} type="button" onClick={() => setPilih(x.id)} className={cn("flex items-center gap-3 rounded-xl border bg-white p-3 text-left shadow-card hover:border-teal-300")}>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-800"><Bot className="size-5" aria-hidden /></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-navy-800">{x.nama}</span><span className="block text-xs text-muted-foreground">{x.bidang}</span></span>
              <span className="text-sm font-bold tabular-nums text-navy-800">{x.total}</span>
            </button>
          ))}
        </aside>
      </div>
    </div>
  );
}
