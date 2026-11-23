"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Bot, LayoutDashboard, Minus, Plus } from "lucide-react";
import type * as THREE from "three";
import type { DivisiKantor } from "@/lib/allies-kantor";
import { cn, formatNumber } from "@/lib/utils";

const POSISI: [number, number][] = [[0, -1.25], [-2.75, -1.25], [2.75, -1.25], [-1.45, 1.35], [1.45, 1.35]];
const GAYA = [
  { baju: 0x2563eb, kulit: 0xc98d62, rambut: 0x1f2937, model: "paku" },
  { baju: 0xf59e0b, kulit: 0xf0c49c, rambut: 0x6b3f22, model: "panjang" },
  { baju: 0x16a34a, kulit: 0xb97a50, rambut: 0x111827, model: "topi" },
  { baju: 0x7c3aed, kulit: 0xe8b98f, rambut: 0x3f2a1d, model: "keriting" },
  { baju: 0xdb2777, kulit: 0xd8a077, rambut: 0x27272a, model: "pendek" },
] as const;

/** Dashboard alternatif: kantor 3D Karyawan AI dengan jumlah tugas nyata dari STARS. */
export function Dashboard3D({ divisi }: { divisi: DivisiKantor[] }) {
  const wadah = useRef<HTMLDivElement>(null);
  const label = useRef<(HTMLButtonElement | null)[]>([]);
  const pilihan = useRef(0);
  const zoom = useRef(1);
  const gambarUlang = useRef<() => void>(() => undefined);
  const [pilih, setPilih] = useState(0);
  const [tiga, setTiga] = useState<"muat" | "siap" | "gagal">("muat");
  const d = divisi[pilih];
  const total = divisi.filter((x) => x.id !== "umum").reduce((a, x) => a + x.total, 0);
  const pilihOrang = (i: number) => { pilihan.current = i; setPilih(i); gambarUlang.current(); };
  const ubahZoom = (n: number) => { zoom.current = Math.max(0.72, Math.min(1.25, zoom.current + n)); gambarUlang.current(); };

  useEffect(() => {
    const el = wadah.current;
    if (!el) return;
    let batal = false;
    let bersih: (() => void) | undefined;
    import("three").then((T) => {
      if (batal) return;
      let renderer: THREE.WebGLRenderer;
      try { renderer = new T.WebGLRenderer({ antialias: true, powerPreference: "low-power" }); } catch { setTiga("gagal"); return; }
      const hp = innerWidth < 768;
      renderer.setPixelRatio(Math.min(devicePixelRatio, hp ? 1.25 : 1.5));
      renderer.shadowMap.enabled = !hp;
      renderer.shadowMap.type = T.PCFSoftShadowMap;
      renderer.domElement.className = "absolute inset-0 size-full";
      renderer.domElement.setAttribute("aria-hidden", "true");
      el.prepend(renderer.domElement);

      const adegan = new T.Scene();
      adegan.background = new T.Color(0xeef2f5);
      const kamera = new T.PerspectiveCamera(38, 1, 0.1, 50);
      adegan.add(new T.HemisphereLight(0xffffff, 0xcbd5e1, 1.9));
      const matahari = new T.DirectionalLight(0xfff4df, 2.1);
      matahari.position.set(4, 8, 5); matahari.castShadow = !hp; matahari.shadow.mapSize.set(1024, 1024);
      Object.assign(matahari.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7 });
      adegan.add(matahari);

      const bahan = new Map<number, THREE.MeshStandardMaterial>();
      const warna = (c: number) => { if (!bahan.has(c)) bahan.set(c, new T.MeshStandardMaterial({ color: c, roughness: 0.62 })); return bahan.get(c)!; };
      const pasang = (g: THREE.BufferGeometry, c: number, x: number, y: number, z: number, induk: THREE.Object3D) => {
        const m = new T.Mesh(g, warna(c)); m.position.set(x, y, z); m.castShadow = !hp; m.receiveShadow = !hp; induk.add(m); return m;
      };
      const balok = (w: number, h: number, l: number, c: number, x: number, y: number, z: number, induk: THREE.Object3D = adegan) => pasang(new T.BoxGeometry(w, h, l), c, x, y, z, induk);
      const bola = (r: number, c: number, x: number, y: number, z: number, induk: THREE.Object3D) => pasang(new T.SphereGeometry(r, 24, 18), c, x, y, z, induk);

      balok(13, 0.2, 9, 0xf4f1ea, 0, -0.1, 0.4);
      for (let i = -6; i <= 6; i += 1.5) balok(0.03, 0.01, 9, 0xe4dfd5, i, 0.005, 0.4);
      balok(13, 3.8, 0.2, 0xdce8e2, 0, 1.8, -3.9);
      balok(13, 0.42, 0.24, 0xc99762, 0, 0.2, -3.78);
      balok(0.2, 3.8, 9, 0xe8eef0, -6.5, 1.8, 0.4);

      const papan = document.createElement("canvas"); papan.width = 900; papan.height = 300;
      const k = papan.getContext("2d");
      if (k) {
        k.fillStyle = "#0f172a"; k.fillRect(0, 0, 900, 300);
        const isi = divisi.filter((x) => x.id !== "umum"), maks = Math.max(1, ...isi.map((x) => x.total));
        k.font = "600 28px sans-serif"; k.fillStyle = "#e2e8f0"; k.fillText("Tugas terbuka per petugas", 34, 48);
        isi.forEach((x, i) => {
          const px = 44 + i * 212, tinggi = Math.max(8, (x.total / maks) * 142);
          k.fillStyle = "#2dd4bf"; k.fillRect(px, 240 - tinggi, 118, tinggi);
          k.fillStyle = "#fff"; k.font = "700 26px sans-serif"; k.fillText(String(x.total), px, 228 - tinggi);
          k.fillStyle = "#cbd5e1"; k.font = "20px sans-serif"; k.fillText(x.nama.split(" ").slice(-1)[0], px, 276);
        });
      }
      const teksturPapan = new T.CanvasTexture(papan); teksturPapan.colorSpace = T.SRGBColorSpace;
      const bahanPapan = new T.MeshBasicMaterial({ map: teksturPapan });
      const geoPapan = new T.PlaneGeometry(5.1, 1.7);
      const layar = new T.Mesh(geoPapan, bahanPapan); layar.position.set(0, 2.25, -3.77); adegan.add(layar);

      const tanaman = (x: number, z: number) => {
        pasang(new T.CylinderGeometry(0.17, 0.13, 0.28, 16), 0xffffff, x, 0.14, z, adegan);
        [[0, 0.5, 0, 0.23], [-0.13, 0.42, 0.05, 0.17], [0.14, 0.43, -0.03, 0.18]].forEach(([a, b, c, r]) => bola(r, 0x2f9e58, x + a, b, z + c, adegan));
      };
      tanaman(-5.8, -3.2); tanaman(5.8, -3.2); tanaman(-5.5, 3.5); tanaman(5.5, 3.5);

      const orang = POSISI.map(([x, z], i) => {
        const g = GAYA[i];
        balok(1.75, 0.09, 0.82, 0xfafafa, x, 0.72, z + 0.62);
        [[-0.78, -0.3], [0.78, -0.3], [-0.78, 0.3], [0.78, 0.3]].forEach(([a, b]) => balok(0.08, 0.68, 0.08, 0xe2e8f0, x + a, 0.34, z + 0.62 + b));
        balok(0.62, 0.035, 0.42, 0x94a3b8, x, 0.785, z + 0.72);
        balok(0.62, 0.4, 0.03, 0x475569, x, 0.98, z + 0.51).rotation.x = -0.18;
        balok(0.66, 0.1, 0.62, 0x334155, x, 0.46, z - 0.06);

        const badan = new T.Group(); badan.position.set(x, 0, z); badan.userData.i = i; adegan.add(badan);
        const dada = pasang(new T.CapsuleGeometry(0.28, 0.26, 8, 18), g.baju, 0, 0.84, 0, badan); dada.userData.i = i;
        const kepala = new T.Group(); kepala.position.y = 1.5; badan.add(kepala);
        bola(0.42, g.kulit, 0, 0, 0, kepala).userData.i = i;
        [-0.15, 0.15].forEach((a) => { bola(0.055, 0x111827, a, 0.02, 0.385, kepala); bola(0.018, 0xffffff, a + 0.018, 0.045, 0.43, kepala); });
        const rambut = bola(0.44, g.rambut, 0, 0.12, -0.05, kepala); rambut.scale.set(1, 0.82, 0.96); rambut.userData.i = i;
        if (g.model === "paku") [-0.24, -0.08, 0.08, 0.24].forEach((a) => { const c = pasang(new T.ConeGeometry(0.09, 0.28, 10), g.rambut, a, 0.5, 0, kepala); c.rotation.z = -a; });
        if (g.model === "panjang") { balok(0.18, 0.56, 0.3, g.rambut, -0.38, -0.14, -0.05, kepala); balok(0.18, 0.56, 0.3, g.rambut, 0.38, -0.14, -0.05, kepala); }
        if (g.model === "topi") { balok(0.6, 0.05, 0.42, g.baju, 0, 0.3, 0.3, kepala); }
        if (g.model === "keriting") for (let a = 0; a < 8; a++) bola(0.15, g.rambut, Math.cos(a) * 0.34, 0.27 + Math.sin(a * 2) * 0.08, Math.sin(a) * 0.28 - 0.03, kepala);
        const headset = pasang(new T.TorusGeometry(0.45, 0.025, 8, 32, Math.PI), 0x111827, 0, 0.02, 0, kepala); headset.rotation.y = 0;
        [-0.44, 0.44].forEach((a) => bola(0.09, 0x111827, a, 0, 0, kepala));
        const tangan = [-1, 1].map((s) => {
          const h = new T.Group(); h.position.set(s * 0.32, 1.02, 0.03); h.rotation.x = -1.15; badan.add(h);
          pasang(new T.CapsuleGeometry(0.075, 0.34, 6, 10), g.baju, 0, -0.22, 0, h);
          bola(0.08, g.kulit, 0, -0.46, 0, h);
          return h;
        });
        return { badan, kepala, tangan, kerja: divisi[i].total > 0 };
      });

      const klikUkur = new T.Raycaster(), titik = new T.Vector2(), arah = { x: 0, y: 0 }, kini = { x: 0, y: 0 }, v = new T.Vector3();
      const ukur = () => {
        const l = el.clientWidth, t = el.clientHeight;
        if (!l || !t) return;
        renderer.setSize(l, t, false);
        kamera.aspect = l / t;
        kamera.updateProjectionMatrix();
        gambar();
      };
      const gambar = () => {
        const dasar = kamera.aspect < 1 ? 1.42 : kamera.aspect < 1.5 ? 1.2 : 1.08;
        kamera.position.set(kini.x * 1.1, 5.5 * zoom.current * dasar, 8.2 * zoom.current * dasar);
        kamera.lookAt(0, 1.05, -0.2);
        kamera.updateMatrixWorld();
        renderer.render(adegan, kamera);
        const lebar = el.clientWidth, tinggi = el.clientHeight;
        orang.forEach((o, i) => {
          const tombol = label.current[i];
          if (!tombol) return;
          v.set(POSISI[i][0], 2.2, POSISI[i][1]).project(kamera);
          tombol.style.transform = `translate(calc(${((v.x + 1) / 2) * lebar}px - 50%), calc(${((1 - v.y) / 2) * tinggi}px - 50%))`;
        });
      };
      gambarUlang.current = gambar;
      const ro = new ResizeObserver(ukur); ro.observe(el); ukur();

      const gerak = (e: PointerEvent) => { const r = el.getBoundingClientRect(); arah.x = ((e.clientX - r.left) / r.width - 0.5) * 2; arah.y = ((e.clientY - r.top) / r.height - 0.5) * 2; };
      const klik = (e: MouseEvent) => {
        const r = renderer.domElement.getBoundingClientRect();
        titik.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        klikUkur.setFromCamera(titik, kamera);
        const kena = klikUkur.intersectObjects(orang.map((o) => o.badan), true).find((x) => x.object.userData.i != null);
        if (kena) pilihOrang(kena.object.userData.i as number);
      };
      el.addEventListener("pointermove", gerak, { passive: true });
      renderer.domElement.addEventListener("click", klik);

      const diam = () => matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("a11y-diam");
      let raf = 0, lalu = 0;
      const putar = (w: number) => {
        raf = requestAnimationFrame(putar);
        if (w - lalu < 33 || document.hidden || diam()) return;
        lalu = w;
        const s = w / 1000;
        kini.x += (arah.x - kini.x) * 0.05; kini.y += (arah.y - kini.y) * 0.05;
        orang.forEach((o, i) => {
          o.kepala.rotation.y = Math.sin(s * 0.7 + i) * 0.16 + (i === pilihan.current ? kini.x * 0.3 : 0);
          o.kepala.position.y = 1.5 + Math.sin(s * 2 + i) * 0.012;
          o.tangan.forEach((h, n) => { h.rotation.x = -1.15 + (o.kerja ? Math.sin(s * 11 + i + n * 2) * 0.09 : 0); });
        });
        gambar();
      };
      raf = requestAnimationFrame(putar);
      setTiga("siap");

      bersih = () => {
        cancelAnimationFrame(raf); ro.disconnect();
        el.removeEventListener("pointermove", gerak); renderer.domElement.removeEventListener("click", klik);
        adegan.traverse((x) => { if (x instanceof T.Mesh) x.geometry.dispose(); });
        bahan.forEach((m) => m.dispose()); bahanPapan.dispose(); teksturPapan.dispose();
        renderer.dispose(); renderer.domElement.remove(); gambarUlang.current = () => undefined;
      };
    }).catch(() => setTiga("gagal"));
    return () => { batal = true; bersih?.(); };
  }, [divisi]);

  return (
    <div id="dashboard-3d" className="grid gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 md:text-3xl">Dashboard 3D</h1>
          <p className="text-sm text-muted-foreground">{formatNumber(total)} tugas terbuka pada Karyawan AI. Pilih petugas untuk melihat rinciannya.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/" className="inline-flex h-9 items-center gap-1.5 rounded-full border bg-card px-3 text-sm font-medium"><LayoutDashboard className="size-4" aria-hidden /> Dashboard biasa</Link>
          <Link href="/allies/kantor" className="inline-flex h-9 items-center gap-1.5 rounded-full bg-teal-600 px-3 text-sm font-medium text-white hover:bg-teal-700"><Bot className="size-4" aria-hidden /> Tanya ALLIES</Link>
        </div>
      </div>

      <div className="grid gap-3 lg:block lg:relative">
        <div ref={wadah} className="relative h-[52svh] min-h-[20rem] overflow-hidden rounded-2xl border bg-slate-100 lg:h-[min(72svh,44rem)]">
          {tiga === "muat" && <p className="absolute inset-0 grid place-items-center text-sm text-slate-600">Memuat kantor 3D...</p>}
          {tiga === "gagal" && <p className="absolute inset-0 grid place-items-center px-6 text-center text-sm text-slate-600">Perangkat ini belum mendukung tampilan 3D. Data petugas tetap tersedia di bawah.</p>}
          {divisi.map((x, i) => (
            <button key={x.id} ref={(e) => { label.current[i] = e; }} type="button" onClick={() => pilihOrang(i)} aria-pressed={pilih === i}
              className={cn("absolute left-0 top-0 z-10 whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-semibold shadow-md transition-colors md:px-2.5 md:text-xs", tiga !== "siap" && "invisible", pilih === i ? "bg-sky-600 text-white" : "tetap-putih bg-white text-slate-900")}>
              {x.nama.split(" ").slice(-1)[0]} · {formatNumber(x.total)}
            </button>
          ))}
          {tiga === "siap" && (
            <div className="absolute bottom-3 right-3 z-10 grid overflow-hidden rounded-lg bg-white text-slate-800 shadow-md">
              <button type="button" onClick={() => ubahZoom(-0.1)} aria-label="Perbesar kantor" className="grid size-8 place-items-center hover:bg-slate-100"><Plus className="size-4" /></button>
              <button type="button" onClick={() => ubahZoom(0.1)} aria-label="Perkecil kantor" className="grid size-8 place-items-center border-t hover:bg-slate-100"><Minus className="size-4" /></button>
            </div>
          )}
        </div>

        <aside aria-live="polite" className="rounded-2xl border bg-card p-4 shadow-sm lg:absolute lg:left-3 lg:top-3 lg:z-20 lg:max-h-[calc(100%-1.5rem)] lg:w-80 lg:overflow-y-auto">
          <p className="text-base font-bold text-navy-900">{d.nama}</p>
          <p className="text-xs text-muted-foreground">{d.bidang}</p>
          <p className="mt-3 text-3xl font-bold tabular-nums text-navy-900">{formatNumber(d.total)}</p>
          <p className="text-xs text-muted-foreground">{d.total ? "tugas terbuka" : "tidak ada tugas terbuka"}</p>
          {d.tugas.length > 0 && (
            <ul className="mt-3 grid gap-1">
              {d.tugas.slice(0, 5).map((x) => (
                <li key={x.href + x.sub}>
                  <Link href={x.href} className="block rounded-lg px-2 py-1.5 hover:bg-muted">
                    <span className="block truncate text-sm font-medium">{x.judul}</span>
                    <span className="block truncate text-xs text-muted-foreground">{x.sub}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link href={`/allies/kantor?petugas=${d.id}`} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:underline">Buka di Kantor AI <ArrowRight className="size-4" aria-hidden /></Link>
        </aside>
      </div>
    </div>
  );
}
