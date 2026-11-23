"use client";

import { useEffect, useRef, useState } from "react";
import type * as THREE from "three";

const AKSEN: Record<string, number> = { "1": 0x2dd4bf, "2": 0xff8a3d, "3": 0x4aa8ff, "4": 0xf4b942 };

/** 3D hanya untuk perangkat ber-mouse yang cukup kuat; selain itu tetap gambar diam. */
function layak3D() {
  const n = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
  return window.matchMedia("(pointer: fine) and (min-width: 768px)").matches
    && !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    && !n.connection?.saveData
    && (n.hardwareConcurrency ?? 2) >= 4
    && (n.deviceMemory ?? 8) >= 4;
}

function RobotDiam({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 340" className={className} role="img" aria-label="Robot ALLIES">
      <defs>
        <linearGradient id="robot-badan" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#3b4250" /><stop offset=".55" stopColor="#14171d" /><stop offset="1" stopColor="#050608" /></linearGradient>
        <radialGradient id="robot-kepala" cx=".42" cy=".78" r=".75"><stop offset="0" stopColor="#fff" /><stop offset="1" stopColor="#8d96a3" /></radialGradient>
        <radialGradient id="robot-pinggul" cx=".5" cy=".5" r=".55"><stop offset="0" stopColor="#fff" /><stop offset=".45" stopColor="var(--robot-aksen)" /><stop offset="1" stopColor="var(--robot-aksen)" stopOpacity="0" /></radialGradient>
      </defs>
      <g fill="url(#robot-badan)" stroke="#59616e" strokeWidth="1">
        <path d="M78 121c-20 3-34 22-38 46l-14 62c-2 11 14 16 19 5l31-68c6-15 18-22 25-33 3-8-11-14-23-12Z" />
        <path d="M242 121c20 3 34 22 38 46l14 62c2 11-14 16-19 5l-31-68c-6-15-18-22-25-33-3-8 11-14 23-12Z" />
        <path d="M128 268h24l-2 72h-24ZM168 268h24l2 72h-24Z" />
        <path d="M112 112c28-13 68-13 96 0 16 8 22 28 14 50l-22 62c-3 14-14 24-40 24s-37-10-40-24l-22-62c-8-22-2-42 14-50Z" />
      </g>
      <g fill="#20242c"><circle cx="31" cy="240" r="9" /><circle cx="289" cy="240" r="9" /></g>
      <ellipse cx="160" cy="258" rx="42" ry="24" fill="url(#robot-pinggul)" />
      <rect x="147" y="88" width="26" height="28" rx="7" fill="#20242c" />
      <ellipse cx="160" cy="54" rx="38" ry="50" fill="url(#robot-kepala)" />
      <path d="M124 45c1-28 17-41 36-41s35 13 36 41c-10 12-22 18-36 18s-26-6-36-18Z" fill="#050608" />
      <path d="M137 37l15 7-3 4-15-7ZM183 37l-15 7 3 4 15-7Z" fill="var(--robot-aksen)" />
    </svg>
  );
}

/** Robot humanoid ALLIES buatan sendiri dari bentuk three.js; warna cahaya mengikuti tema. */
export function RobotAllies() {
  const wadah = useRef<HTMLDivElement>(null);
  const [siap, setSiap] = useState(false);

  useEffect(() => {
    const el = wadah.current;
    if (!el || !layak3D()) return;
    let batal = false;
    let bersih: (() => void) | undefined;

    Promise.all([import("three"), import("three/examples/jsm/environments/RoomEnvironment.js")]).then(([T, { RoomEnvironment }]) => {
      if (batal) return;
      let renderer: THREE.WebGLRenderer;
      try { renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" }); } catch { return; }
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
      renderer.toneMapping = T.ACESFilmicToneMapping;
      renderer.domElement.className = "absolute inset-0 size-full";
      renderer.domElement.setAttribute("aria-hidden", "true");
      el.appendChild(renderer.domElement);

      const adegan = new T.Scene();
      const pmrem = new T.PMREMGenerator(renderer);
      const ruang = new RoomEnvironment();
      const env = pmrem.fromScene(ruang, 0.03).texture;
      adegan.environment = env;
      adegan.environmentIntensity = 0.42;
      const kamera = new T.PerspectiveCamera(30, 1, 0.1, 30);
      kamera.position.set(0, 0.1, 8.1);
      const utama = new T.DirectionalLight(0xffffff, 2.2); utama.position.set(1.5, 4, 5); adegan.add(utama);
      const tepiA = new T.PointLight(0xffffff, 24); tepiA.position.set(-3, 1.2, -1.4); adegan.add(tepiA);
      const tepiB = new T.PointLight(0xffffff, 20); tepiB.position.set(3, 0.3, -1.4); adegan.add(tepiB);
      const bawah = new T.PointLight(0xffffff, 7, 3.2); bawah.position.set(0, -1.25, 0.8); adegan.add(bawah);

      const hitam = new T.MeshStandardMaterial({ color: 0x0b0d12, metalness: 0.72, roughness: 0.2 });
      const sendi = new T.MeshStandardMaterial({ color: 0x20242c, metalness: 0.85, roughness: 0.34 });
      const putih = new T.MeshStandardMaterial({ color: 0xe9edf3, metalness: 0.12, roughness: 0.12 });
      const kaca = new T.MeshStandardMaterial({ color: 0x020305, metalness: 0.9, roughness: 0.06 });
      const nyala = new T.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.1 });
      const bahan = [hitam, sendi, putih, kaca, nyala];
      const bentuk: THREE.BufferGeometry[] = [];
      const robot = new T.Group(); robot.position.y = -0.12; adegan.add(robot);
      const buat = (g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0, induk: THREE.Object3D = robot) => {
        bentuk.push(g);
        const h = new T.Mesh(g, m); h.position.set(x, y, z); induk.add(h); return h;
      };

      const profil = [[0.001, -0.82], [0.34, -0.76], [0.4, -0.42], [0.58, 0.04], [0.73, 0.42], [0.58, 0.68], [0.2, 0.82], [0.001, 0.84]].map(([x, y]) => new T.Vector2(x, y));
      buat(new T.LatheGeometry(new T.SplineCurve(profil).getPoints(44), 56), hitam).scale.z = 0.62;
      buat(new T.CylinderGeometry(0.13, 0.17, 0.32, 24), sendi, 0, 0.92, 0);
      buat(new T.SphereGeometry(0.42, 36, 22), sendi, 0, -0.9, 0).scale.set(1.03, 0.58, 0.72);
      const pinggul = buat(new T.SphereGeometry(0.24, 28, 18), nyala, 0, -1.0, 0.25); pinggul.scale.set(1, 0.46, 0.2);
      [-1, 1].forEach((s) => {
        buat(new T.SphereGeometry(0.19, 22, 16), sendi, s * 0.28, -1.13, 0);
        buat(new T.CapsuleGeometry(0.2, 0.62, 10, 22), hitam, s * 0.31, -1.68, 0);
      });

      const kepala = new T.Group(); kepala.position.y = 1.46; robot.add(kepala);
      buat(new T.SphereGeometry(1, 48, 34), putih, 0, 0, 0, kepala).scale.set(0.46, 0.62, 0.52);
      buat(new T.SphereGeometry(1, 48, 28, 0, Math.PI, 0, Math.PI * 0.56), kaca, 0, 0, 0, kepala).scale.set(0.468, 0.628, 0.528);
      const mata = [-1, 1].map((s) => {
        const m = buat(new T.CapsuleGeometry(0.026, 0.13, 6, 12), nyala, s * 0.17, 0.16, 0.468, kepala);
        m.rotation.z = s * 1.12; m.rotation.y = s * 0.34;
        return m;
      });

      const lengan = [-1, 1].map((s) => {
        const bahu = new T.Group(); bahu.position.set(s * 0.82, 0.5, 0); bahu.rotation.z = s * 0.44; robot.add(bahu);
        buat(new T.SphereGeometry(1, 30, 22), hitam, 0, -0.08, 0, bahu).scale.set(0.27, 0.36, 0.27);
        buat(new T.CapsuleGeometry(0.145, 0.5, 8, 20), hitam, 0, -0.52, 0, bahu);
        buat(new T.SphereGeometry(0.125, 20, 14), sendi, 0, -0.9, 0, bahu);
        const bawahLengan = new T.Group(); bawahLengan.position.y = -0.9; bawahLengan.rotation.z = -s * 0.1; bahu.add(bawahLengan);
        buat(new T.CapsuleGeometry(0.115, 0.46, 8, 20), hitam, 0, -0.36, 0, bawahLengan);
        buat(new T.SphereGeometry(0.075, 16, 12), sendi, 0, -0.71, 0, bawahLengan);
        buat(new T.BoxGeometry(0.25, 0.26, 0.1), sendi, 0, -0.87, 0, bawahLengan);
        [-0.09, -0.03, 0.03, 0.09].forEach((x) => buat(new T.CapsuleGeometry(0.027, 0.15, 4, 8), hitam, x, -1.1, 0, bawahLengan));
        buat(new T.CapsuleGeometry(0.03, 0.13, 4, 8), hitam, -s * 0.16, -0.91, 0.015, bawahLengan).rotation.z = -s * 0.65;
        return { bahu, bawahLengan, s };
      });

      const warnaTema = () => {
        const c = new T.Color(AKSEN[document.documentElement.dataset.latar ?? "1"] ?? AKSEN["1"]);
        nyala.color.copy(c); nyala.emissive.copy(c); tepiA.color.copy(c); bawah.color.copy(c);
        tepiB.color.copy(c).lerp(new T.Color(0xffffff), 0.45);
      };
      warnaTema();
      window.addEventListener("stars:tampilan", warnaTema);

      const ukur = () => {
        const l = el.clientWidth, t = el.clientHeight;
        if (!l || !t) return;
        renderer.setSize(l, t, false);
        kamera.aspect = l / t;
        kamera.position.z = l / t < 0.95 ? 8.1 / (l / t) * 0.95 : 8.1;
        kamera.updateProjectionMatrix();
      };
      const ro = new ResizeObserver(ukur); ro.observe(el); ukur();

      const arah = { x: 0, y: 0 }, kini = { x: 0, y: 0 };
      const gerak = (e: PointerEvent) => {
        const k = el.getBoundingClientRect();
        arah.x = Math.max(-1, Math.min(1, (e.clientX - k.left - k.width / 2) / (innerWidth / 2)));
        arah.y = Math.max(-1, Math.min(1, (e.clientY - k.top - k.height / 2) / (innerHeight / 2)));
      };
      window.addEventListener("pointermove", gerak, { passive: true });

      const slide = el.closest(".slide-hero");
      let terlihat = true, raf = 0, lalu = 0;
      const io = new IntersectionObserver(([x]) => { terlihat = x.isIntersecting; }); io.observe(el);
      const hilang = (e: Event) => { e.preventDefault(); setSiap(false); };
      renderer.domElement.addEventListener("webglcontextlost", hilang);

      const putar = (w: number) => {
        raf = requestAnimationFrame(putar);
        if (w - lalu < 33 || document.hidden || !terlihat || slide?.getAttribute("aria-hidden") === "true") return;
        lalu = w;
        const d = w / 1000;
        kini.x += (arah.x - kini.x) * 0.09;
        kini.y += (arah.y - kini.y) * 0.09;
        kepala.rotation.set(kini.y * 0.28, kini.x * 0.5, -kini.x * 0.05);
        robot.rotation.y = kini.x * 0.2;
        robot.position.y = -0.12 + Math.sin(d * 1.4) * 0.025;
        lengan.forEach(({ bahu, bawahLengan, s }) => {
          bahu.rotation.x = Math.sin(d * 1.1 + s) * 0.06 + kini.y * 0.08;
          bahu.rotation.z = s * (0.44 + Math.sin(d * 1.4) * 0.018);
          bawahLengan.rotation.x = -0.12 + Math.sin(d * 1.3 + s) * 0.05;
        });
        const kedip = Math.sin(d * 0.9) > 0.992 ? 0.15 : 1;
        mata.forEach((m) => { m.scale.x = kedip; });
        nyala.emissiveIntensity = 1.1 + Math.sin(d * 2.2) * 0.25;
        renderer.render(adegan, kamera);
      };
      renderer.render(adegan, kamera);
      setSiap(true);
      raf = requestAnimationFrame(putar);

      bersih = () => {
        cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
        window.removeEventListener("pointermove", gerak);
        window.removeEventListener("stars:tampilan", warnaTema);
        renderer.domElement.removeEventListener("webglcontextlost", hilang);
        bentuk.forEach((g) => g.dispose()); bahan.forEach((m) => m.dispose());
        env.dispose(); pmrem.dispose(); ruang.dispose();
        renderer.dispose(); renderer.domElement.remove();
      };
    }).catch(() => undefined);

    return () => { batal = true; bersih?.(); };
  }, []);

  return (
    <div ref={wadah} id="robot-allies" className="relative size-full min-h-0 overflow-hidden">
      <RobotDiam className={`absolute inset-0 m-auto h-full max-h-full w-full transition-opacity duration-500 ${siap ? "opacity-0" : "opacity-100"}`} />
    </div>
  );
}
