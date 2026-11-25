"use client";
import { useEffect } from "react";

/**
 * Favicon EMASCARE beranimasi: atom (3 orbit bergradasi, inti palang medis) dengan elektron mengorbit.
 * Digambar di <canvas> ±8×/detik (Chrome tidak memutar SVG animasi di favicon). Berhenti saat tab tersembunyi / kurangi gerakan.
 */
export function FaviconEmas() {
  useEffect(() => {
    const N = 64, cv = document.createElement("canvas"); cv.width = cv.height = N;
    const c = cv.getContext("2d"); if (!c) return;
    const pasang = (href: string) => {
      let ada = false;
      document.querySelectorAll<HTMLLinkElement>("link[rel='icon'], link[rel='shortcut icon']").forEach((l) => { l.href = href; l.type = "image/png"; ada = true; });
      if (!ada) { const l = document.createElement("link"); l.rel = "icon"; l.type = "image/png"; l.href = href; document.head.appendChild(l); }
    };
    let t = 0, id: ReturnType<typeof setInterval> | undefined;
    const gambar = () => {
      t += 1; c.clearRect(0, 0, N, N); c.save(); c.scale(N / 100, N / 100);
      const g = c.createLinearGradient(0, 0, 100, 100); g.addColorStop(0, "#22d3ee"); g.addColorStop(.5, "#3b82f6"); g.addColorStop(1, "#8b5cf6");
      [90, 30, 150].forEach((s, k) => {
        c.save(); c.translate(50, 50); c.rotate((s * Math.PI) / 180);
        c.strokeStyle = g; c.lineWidth = 6; c.beginPath(); c.ellipse(0, 0, 46, 17, 0, 0, 2 * Math.PI); c.stroke();
        const a = (t * (0.13 - k * 0.025)) + k * 2.1;
        c.fillStyle = "#2dd4bf"; c.strokeStyle = "#fff"; c.lineWidth = 2; c.beginPath(); c.arc(46 * Math.cos(a), 17 * Math.sin(a), 8, 0, 2 * Math.PI); c.fill(); c.stroke();
        c.restore();
      });
      const r = 18 + Math.sin(t / 4) * 1.2;
      const ig = c.createRadialGradient(44, 44, 2, 50, 50, r); ig.addColorStop(0, "#5eead4"); ig.addColorStop(1, "#0891b2");
      c.fillStyle = ig; c.beginPath(); c.arc(50, 50, r, 0, 2 * Math.PI); c.fill();
      c.fillStyle = "#fff"; c.fillRect(45, 38, 10, 24); c.fillRect(38, 45, 24, 10);
      c.restore(); pasang(cv.toDataURL("image/png"));
    };
    gambar();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const mulai = () => { clearInterval(id); if (document.visibilityState === "visible") id = setInterval(gambar, 125); };
    mulai(); document.addEventListener("visibilitychange", mulai);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", mulai); };
  }, []);
  return null;
}
