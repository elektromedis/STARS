"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/** Gulir halus khusus beranda di perangkat mouse; layar sentuh tetap memakai gulir bawaan. */
export function GulirHalus() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce), (pointer: coarse)").matches) return;
    const lenis = new Lenis({ autoRaf: true, anchors: true, allowNestedScroll: true, lerp: 0.12 });
    return () => lenis.destroy();
  }, []);
  return null;
}
