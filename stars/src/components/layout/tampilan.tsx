"use client";

import { useEffect, useRef, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useBahasa } from "@/lib/bahasa";
import { KUNCI_TAMPILAN } from "@/lib/tampilan-skrip";

type Latar = 1 | 2 | 3 | 4;
const berikut = (x: Latar): Latar => (x === 4 ? 1 : (x + 1) as Latar);
type Tampilan = { gelap: boolean; latar: Latar };

function baca(): Tampilan {
  const d = document.documentElement;
  return { gelap: d.classList.contains("dark"), latar: (["2", "3", "4"].includes(d.dataset.latar ?? "") ? Number(d.dataset.latar) : 1) as Latar };
}

function terapkan(t: Tampilan) {
  const d = document.documentElement;
  d.classList.toggle("dark", t.gelap);
  d.dataset.latar = String(t.latar);
  try { localStorage.setItem(KUNCI_TAMPILAN, JSON.stringify(t)); } catch { /* tetap berlaku untuk halaman ini */ }
  window.dispatchEvent(new Event("stars:tampilan"));
}

function useTampilan() {
  const [nilai, setNilai] = useState<Tampilan>({ gelap: false, latar: 1 });
  useEffect(() => {
    const f = () => setNilai(baca());
    f();
    window.addEventListener("stars:tampilan", f);
    return () => window.removeEventListener("stars:tampilan", f);
  }, []);
  return nilai;
}

/** Tombol Tema 1/2 dan mode terang/gelap di header. */
export function TombolTampilan() {
  const { t } = useBahasa();
  const { gelap, latar } = useTampilan();
  const kelas = "flex h-8 min-w-8 items-center justify-center rounded-full px-1.5 text-xs font-bold text-navy-800 transition-colors hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-600";
  return (
    <div className="flex shrink-0 items-center rounded-full bg-slate-100 p-0.5" role="group" aria-label={t("Pengaturan tampilan", "Display settings")}>
      <button type="button" className={kelas} onClick={() => terapkan({ gelap, latar: berikut(latar) })}
        aria-label={t(`Latar Tema ${latar}. Ganti ke Tema ${berikut(latar)}`, `Background Theme ${latar}. Switch to Theme ${berikut(latar)}`)} title={t(`Tema ${latar}`, `Theme ${latar}`)}>
        T{latar}
      </button>
      <button type="button" className={kelas} onClick={() => terapkan({ gelap: !gelap, latar })} aria-pressed={gelap}
        aria-label={t("Mode gelap", "Dark mode")} title={gelap ? t("Ganti ke mode terang", "Switch to light mode") : t("Ganti ke mode gelap", "Switch to dark mode")}>
        {gelap ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
      </button>
    </div>
  );
}

const WARNA = { terang: [0xf0620f, 0xb3264f], gelap: [0xffa24a, 0xb8325a] } as const;

/** Tema 2: galaksi partikel spiral, dimuat hanya saat tema ini dipilih. */
export function LatarGalaksi() {
  const { gelap, latar } = useTampilan();
  const wadah = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wadah.current;
    if (latar !== 2 || !el) return;
    let batal = false;
    let bersih: (() => void) | undefined;

    import("three").then((T) => {
      if (batal) return;
      let renderer: InstanceType<typeof T.WebGLRenderer>;
      try { renderer = new T.WebGLRenderer({ alpha: true, antialias: false, powerPreference: "low-power" }); } catch { return; }
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
      renderer.domElement.className = "size-full";
      el.appendChild(renderer.domElement);

      const adegan = new T.Scene();
      const kamera = new T.PerspectiveCamera(50, 1, 0.1, 40);
      kamera.position.set(0, 4.6, 6.4);
      kamera.lookAt(0, 0, 0);

      const hp = innerWidth < 768;
      const jumlah = hp ? 9000 : 26000, jari = 7, cabang = 2, pilin = 1.25;
      const posisi = new Float32Array(jumlah * 3), warna = new Float32Array(jumlah * 3);
      const [wDalam, wLuar] = WARNA[gelap ? "gelap" : "terang"].map((c) => new T.Color(c));
      const acak = (r: number) => Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * 0.34 * r;
      for (let i = 0; i < jumlah; i++) {
        const r = Math.pow(Math.random(), 1.35) * jari + 0.03;
        const sudut = ((i % cabang) / cabang) * Math.PI * 2 + r * pilin;
        posisi[i * 3] = Math.cos(sudut) * r + acak(r);
        posisi[i * 3 + 1] = acak(r) * 0.45;
        posisi[i * 3 + 2] = Math.sin(sudut) * r + acak(r);
        const c = wDalam.clone().lerp(wLuar, Math.min(1, r / (jari * 0.62)));
        warna.set([c.r, c.g, c.b], i * 3);
      }
      const geo = new T.BufferGeometry();
      geo.setAttribute("position", new T.BufferAttribute(posisi, 3));
      geo.setAttribute("color", new T.BufferAttribute(warna, 3));

      const kanvas = document.createElement("canvas");
      kanvas.width = kanvas.height = 32;
      const k = kanvas.getContext("2d");
      if (k) {
        const g = k.createRadialGradient(16, 16, 0, 16, 16, 16);
        g.addColorStop(0, "#fff"); g.addColorStop(0.4, "rgba(255,255,255,.75)"); g.addColorStop(1, "rgba(255,255,255,0)");
        k.fillStyle = g; k.fillRect(0, 0, 32, 32);
      }
      const tekstur = new T.CanvasTexture(kanvas);
      const bahan = new T.PointsMaterial({
        size: hp ? 0.052 : 0.04, map: tekstur, vertexColors: true, transparent: true, depthWrite: false,
        opacity: gelap ? 0.9 : 0.62, blending: gelap ? T.AdditiveBlending : T.NormalBlending,
      });
      const galaksi = new T.Points(geo, bahan);
      adegan.add(galaksi);

      const gambar = () => renderer.render(adegan, kamera);
      const ukur = () => {
        const l = el.clientWidth, t = el.clientHeight;
        if (!l || !t) return;
        renderer.setSize(l, t, false);
        kamera.aspect = l / t;
        kamera.fov = l / t < 1 ? 74 : 50;
        kamera.updateProjectionMatrix();
        gambar();
      };
      const ro = new ResizeObserver(ukur); ro.observe(el); ukur();

      const diam = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("a11y-diam");
      let raf = 0, lalu = 0;
      const putar = (w: number) => {
        raf = requestAnimationFrame(putar);
        if (w - lalu < 33 || document.hidden || diam()) return;
        lalu = w;
        galaksi.rotation.y = w * 0.000045;
        gambar();
      };
      raf = requestAnimationFrame(putar);

      bersih = () => {
        cancelAnimationFrame(raf); ro.disconnect();
        geo.dispose(); bahan.dispose(); tekstur.dispose(); renderer.dispose(); renderer.domElement.remove();
      };
    }).catch(() => undefined);

    return () => { batal = true; bersih?.(); };
  }, [gelap, latar]);

  return <div ref={wadah} id="latar-galaksi" className="latar-galaksi" aria-hidden />;
}

const kabel = (x: number) => 292 + 228 * (1 - ((x - 800) / 330) ** 2);
const GANTUNGAN = Array.from({ length: 33 }, (_, i) => 480 + i * 20);

/** Tema 3: pemandangan jembatan senja buatan STARS, dengan kabut bergerak halus. */
export function LatarGerbang() {
  return (
    <div className="latar-gerbang" aria-hidden>
      <div className="gg-matahari" />
      <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice">
        <path className="gg-bukit-jauh" d="M0 610C180 500 320 540 470 590S760 610 930 585 1240 480 1600 570V900H0Z" />
        <path className="gg-bukit" d="M0 680C170 610 300 625 420 665S640 690 760 680 1180 650 1600 690V900H0Z" />
        <g className="gg-jembatan">
          <path d="M0 596H1600" strokeWidth="12" />
          <path d="M-40 560C160 520 340 430 470 292M1130 292C1260 430 1440 520 1640 560" strokeWidth="5" />
          <path d={`M470 292${GANTUNGAN.map((x) => `L${x} ${kabel(x).toFixed(1)}`).join("")}L1130 292`} strokeWidth="5" />
          <path d={GANTUNGAN.map((x) => `M${x} ${kabel(x).toFixed(1)}V596`).join("")} strokeWidth="1.4" />
          {[470, 1130].flatMap((x) => [-15, 15].map((d) => <path key={`${x}${d}`} d={`M${x + d} 260V735`} strokeWidth="14" />))}
          {[470, 1130].flatMap((x) => [310, 390, 470, 545, 650].map((y) => <path key={`${x}-${y}`} d={`M${x - 15} ${y}H${x + 15}`} strokeWidth="9" />))}
        </g>
        <rect className="gg-air" y="700" width="1600" height="200" />
      </svg>
      <div className="gg-kabut gg-kabut-a" /><div className="gg-kabut gg-kabut-b" />
    </div>
  );
}
