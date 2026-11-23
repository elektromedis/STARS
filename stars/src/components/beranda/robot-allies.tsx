"use client";

import { useEffect, useRef, useState } from "react";
import type * as THREE from "three";

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
        <linearGradient id="robot-badan" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#64748b" /><stop offset="1" stopColor="#111827" /></linearGradient>
        <radialGradient id="robot-kepala" cx=".35" cy=".25" r=".9"><stop offset="0" stopColor="#f8fafc" /><stop offset="1" stopColor="#64748b" /></radialGradient>
      </defs>
      <ellipse cx="160" cy="322" rx="92" ry="11" fill="#2dd4bf" opacity=".25" />
      <g fill="none" stroke="#475569" strokeWidth="25" strokeLinecap="round"><path d="M86 142 62 214" /><path d="M234 142 258 214" /><path d="M134 262v48" /><path d="M186 262v48" /></g>
      <circle cx="84" cy="136" r="21" fill="url(#robot-badan)" /><circle cx="236" cy="136" r="21" fill="url(#robot-badan)" />
      <rect x="104" y="116" width="112" height="150" rx="46" fill="url(#robot-badan)" />
      <circle cx="160" cy="176" r="10" fill="#2dd4bf" />
      <rect x="148" y="96" width="24" height="24" rx="8" fill="#334155" />
      <ellipse cx="160" cy="62" rx="48" ry="52" fill="url(#robot-kepala)" />
      <rect x="123" y="44" width="74" height="35" rx="17" fill="#0b1220" />
      <circle cx="145" cy="61" r="6" fill="#2dd4bf" /><circle cx="175" cy="61" r="6" fill="#2dd4bf" />
    </svg>
  );
}

/** Robot ALLIES buatan sendiri dari bentuk dasar three.js; kepala dan badan mengikuti kursor. */
export function RobotAllies() {
  const wadah = useRef<HTMLDivElement>(null);
  const [siap, setSiap] = useState(false);

  useEffect(() => {
    const el = wadah.current;
    if (!el || !layak3D()) return;
    let batal = false;
    let bersih: (() => void) | undefined;

    import("three").then((T) => {
      if (batal) return;
      let renderer: InstanceType<typeof T.WebGLRenderer>;
      try { renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" }); } catch { return; }
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
      renderer.domElement.className = "absolute inset-0 size-full";
      renderer.domElement.setAttribute("aria-hidden", "true");
      el.appendChild(renderer.domElement);

      const adegan = new T.Scene();
      const kamera = new T.PerspectiveCamera(32, 1, 0.1, 30);
      kamera.position.set(0, 0.15, 7.4);
      adegan.add(new T.HemisphereLight(0xdbeafe, 0x0b1220, 0.9));
      const utama = new T.DirectionalLight(0xffffff, 2.6); utama.position.set(2.5, 4, 5); adegan.add(utama);
      const tepiA = new T.PointLight(0x2dd4bf, 18); tepiA.position.set(-3, 1, -1.5); adegan.add(tepiA);
      const tepiB = new T.PointLight(0xa99bff, 16); tepiB.position.set(3, 0.5, -1.5); adegan.add(tepiB);

      const logam = new T.MeshStandardMaterial({ color: 0x334155, metalness: 0.65, roughness: 0.32 });
      const sendi = new T.MeshStandardMaterial({ color: 0x111827, metalness: 0.8, roughness: 0.3 });
      const putih = new T.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.25, roughness: 0.18 });
      const kaca = new T.MeshStandardMaterial({ color: 0x050a14, metalness: 0.5, roughness: 0.12 });
      const nyala = new T.MeshStandardMaterial({ color: 0x2dd4bf, emissive: 0x2dd4bf, emissiveIntensity: 2 });
      const bahan = [logam, sendi, putih, kaca, nyala];
      const bentuk: { dispose(): void }[] = [];
      const buat = (g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0, induk: THREE.Object3D = robot) => {
        bentuk.push(g);
        const h = new T.Mesh(g, m); h.position.set(x, y, z); induk.add(h); return h;
      };

      const robot = new T.Group(); robot.position.y = -0.1; adegan.add(robot);
      buat(new T.CapsuleGeometry(0.62, 0.62, 10, 32), logam, 0, 0.05, 0).scale.set(1, 1, 0.72);
      buat(new T.SphereGeometry(0.09, 20, 16), nyala, 0, 0.3, 0.46);
      buat(new T.CylinderGeometry(0.15, 0.19, 0.3, 20), sendi, 0, 0.98, 0);
      buat(new T.CapsuleGeometry(0.4, 0.12, 8, 24), sendi, 0, -0.82, 0).rotation.z = Math.PI / 2;

      const kepala = new T.Group(); kepala.position.y = 1.5; robot.add(kepala);
      buat(new T.SphereGeometry(0.5, 40, 32), putih, 0, 0, 0, kepala).scale.set(0.9, 1.08, 0.92);
      const visor = buat(new T.CapsuleGeometry(0.13, 0.3, 8, 24), kaca, 0, 0.04, 0.39, kepala);
      visor.rotation.z = Math.PI / 2; visor.scale.z = 0.6;
      const mata = [-0.12, 0.12].map((x) => buat(new T.SphereGeometry(0.045, 16, 12), nyala, x, 0.04, 0.47, kepala));

      const lengan = [-1, 1].map((s) => {
        const bahu = new T.Group(); bahu.position.set(s * 0.86, 0.56, 0); bahu.rotation.z = s * 0.2; robot.add(bahu);
        buat(new T.SphereGeometry(0.23, 24, 18), sendi, 0, 0, 0, bahu);
        buat(new T.CapsuleGeometry(0.14, 0.52, 8, 18), logam, 0, -0.42, 0, bahu);
        buat(new T.SphereGeometry(0.13, 18, 14), sendi, 0, -0.8, 0, bahu);
        buat(new T.CapsuleGeometry(0.115, 0.42, 8, 18), putih, 0, -1.14, 0, bahu);
        buat(new T.SphereGeometry(0.13, 18, 14), sendi, 0, -1.48, 0, bahu);
        return { bahu, s };
      });
      [-1, 1].forEach((s) => {
        buat(new T.SphereGeometry(0.2, 20, 16), sendi, s * 0.32, -1.02, 0);
        buat(new T.CapsuleGeometry(0.17, 0.42, 8, 18), logam, s * 0.32, -1.46, 0);
      });
      const alas = buat(new T.CircleGeometry(1.25, 48), new T.MeshBasicMaterial({ color: 0x2dd4bf, transparent: true, opacity: 0.12 }), 0, -1.86, 0);
      alas.rotation.x = -Math.PI / 2;

      const ukur = () => {
        const l = el.clientWidth, t = el.clientHeight;
        if (!l || !t) return;
        renderer.setSize(l, t, false);
        kamera.aspect = l / t;
        kamera.position.z = l / t < 0.9 ? 7.4 / (l / t) * 0.9 : 7.4;
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
        kepala.rotation.set(kini.y * 0.3, kini.x * 0.42, -kini.x * 0.05);
        robot.rotation.y = kini.x * 0.24;
        robot.position.y = -0.1 + Math.sin(d * 1.5) * 0.035;
        lengan.forEach(({ bahu, s }) => { bahu.rotation.x = Math.sin(d * 1.2 + s) * 0.07 + kini.y * 0.1; bahu.rotation.z = s * (0.2 + Math.sin(d * 1.5) * 0.025); });
        const kedip = Math.sin(d * 0.9) > 0.992 ? 0.12 : 1;
        mata.forEach((m) => { m.scale.y = kedip; });
        nyala.emissiveIntensity = 1.7 + Math.sin(d * 2.4) * 0.5;
        renderer.render(adegan, kamera);
      };
      renderer.render(adegan, kamera);
      setSiap(true);
      raf = requestAnimationFrame(putar);

      bersih = () => {
        cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
        window.removeEventListener("pointermove", gerak);
        renderer.domElement.removeEventListener("webglcontextlost", hilang);
        bentuk.forEach((g) => g.dispose()); bahan.forEach((m) => m.dispose()); (alas.material as THREE.Material).dispose();
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
