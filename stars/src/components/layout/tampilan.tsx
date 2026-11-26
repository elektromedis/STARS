"use client";

import { useEffect, useRef, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useBahasa } from "@/lib/bahasa";
import { KUNCI_TAMPILAN } from "@/lib/tampilan-skrip";

type Latar = 1 | 2 | 3 | 4;
/** Nomor tampilan (T1–T4) untuk tiap latar internal: latar 3 = T1, 2 = T2, 4 = T3, 1 = T4. Nilai internal tetap agar pilihan tersimpan tidak berubah. */
const NOMOR: Record<Latar, number> = { 3: 1, 2: 2, 4: 3, 1: 4 };
const URUT: Latar[] = [3, 2, 4, 1];
const berikut = (x: Latar): Latar => URUT[(URUT.indexOf(x) + 1) % URUT.length];
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

/** Tombol Tema (T1–T4) dan mode terang/gelap di header. */
export function TombolTampilan() {
  const { t } = useBahasa();
  const { gelap, latar } = useTampilan();
  const kelas = "flex h-8 min-w-8 items-center justify-center rounded-full px-1.5 text-xs font-bold text-navy-800 transition-colors hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-600";
  return (
    <div className="flex shrink-0 items-center rounded-full bg-slate-100 p-0.5" role="group" aria-label={t("Pengaturan tampilan", "Display settings")}>
      <button type="button" className={kelas} onClick={() => terapkan({ gelap, latar: berikut(latar) })}
        aria-label={t(`Latar Tema ${NOMOR[latar]}. Ganti ke Tema ${NOMOR[berikut(latar)]}`, `Background Theme ${NOMOR[latar]}. Switch to Theme ${NOMOR[berikut(latar)]}`)} title={t(`Tema ${NOMOR[latar]}`, `Theme ${NOMOR[latar]}`)}>
        T{NOMOR[latar]}
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

/** Tema 3: latar kaca biru. Tema 4: lengkung emas. Keduanya gambar buatan STARS. */
export function LatarGerbang() {
  return (
    <>
      <div className="latar-tahoe" aria-hidden><span /><span /></div>
      <div className="latar-gerbang" aria-hidden>
        <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
          <path className="gg-a" d="M-80 760C260 280 640 180 930 330S1390 650 1700 250V980H-80Z" />
          <path className="gg-b" d="M-80 900C330 500 690 410 960 520S1400 760 1700 480V980H-80Z" />
          <path className="gg-c" d="M520 980C640 650 900 520 1120 590S1490 760 1700 650V980Z" />
        </svg>
      </div>
    </>
  );
}
