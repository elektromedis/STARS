"use client";

import { useEffect } from "react";

/**
 * Ikon tab browser (favicon) beranimasi: logo STARS — cincin berputar pelan + garis EKG berjalan.
 * Chrome tidak memutar animasi SVG pada favicon, jadi bingkai digambar di <canvas> ±8×/detik
 * lalu dipasang sebagai favicon. Berhenti saat tab tidak terlihat atau "kurangi gerakan" aktif.
 */
const TEAL = "#1CC8B5", BIRU = "#2B6FCA";
const EKG: [number, number][] = [[96, 210], [152, 210], [164, 203], [176, 226], [196, 158], [218, 248], [240, 192], [256, 210], [300, 210]];

export function FaviconAnimasi() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const N = 64, k = N / 420;
    const cv = document.createElement("canvas"); cv.width = cv.height = N;
    const c = cv.getContext("2d"); if (!c) return;
    const pasang = (href: string) => {
      let ada = false;
      document.querySelectorAll<HTMLLinkElement>("link[rel='icon'], link[rel='shortcut icon']").forEach((l) => { l.href = href; l.type = "image/png"; ada = true; });
      if (!ada) { const l = document.createElement("link"); l.rel = "icon"; l.type = "image/png"; l.href = href; document.head.appendChild(l); }
    };
    const panjang = EKG.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - EKG[i][0], p[1] - EKG[i][1]), 0);
    let t = 0, id: ReturnType<typeof setInterval> | undefined;
    const gambar = () => {
      t += 1;
      c.clearRect(0, 0, N, N);
      c.save(); c.scale(k, k); c.translate(10, 0);
      // cincin berputar
      c.save(); c.translate(200, 210); c.rotate((t * 4 * Math.PI) / 180); c.translate(-200, -210);
      c.lineWidth = 30; c.lineCap = "round";
      [[TEAL, Math.PI, 1.5 * Math.PI], [BIRU, 1.5 * Math.PI, 2 * Math.PI], [TEAL, 0, 0.5 * Math.PI], [BIRU, 0.5 * Math.PI, Math.PI]].forEach(([w, a, b]) => {
        c.strokeStyle = w as string; c.beginPath(); c.arc(200, 210, 165, a as number, b as number); c.stroke();
      });
      [[200, 45, TEAL], [365, 210, BIRU], [200, 375, TEAL], [35, 210, BIRU]].forEach(([x, y, w]) => { c.fillStyle = w as string; c.beginPath(); c.arc(x as number, y as number, 30, 0, 2 * Math.PI); c.fill(); });
      c.restore();
      // monitor + EKG berjalan
      c.fillStyle = TEAL; c.beginPath(); c.roundRect(100, 155, 200, 110, 22); c.fill();
      c.lineWidth = 16; c.lineCap = "round"; c.lineJoin = "round"; c.strokeStyle = "#0B1A2E";
      c.setLineDash([panjang * 0.55, panjang]); c.lineDashOffset = -((t * 18) % (panjang * 1.55)) + panjang * 0.55;
      c.beginPath(); EKG.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke();
      c.restore();
      pasang(cv.toDataURL("image/png"));
    };
    const mulai = () => { clearInterval(id); if (document.visibilityState === "visible") id = setInterval(gambar, 125); };
    gambar(); mulai();
    document.addEventListener("visibilitychange", mulai);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", mulai); };
  }, []);
  return null;
}
