"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export type BingkaiApi = { cetak: (judul: string) => void };

const KERANGKA = '<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Dokumen</title></head><body><div id="akar"></div></body></html>';
const MM = 96 / 25.4;

/**
 * Pratinjau cetak terisolasi: isi dirender (React portal) ke dalam iframe sehingga CSS @page & ukuran kertas
 * tidak bercampur dengan gaya aplikasi; tombol Cetak hanya mencetak iframe ini.
 * `zoom` = "pas" (sesuaikan lebar wadah) atau angka skala.
 */
export const BingkaiCetak = forwardRef<BingkaiApi, { gaya: string; lebarMm: number; zoom: "pas" | number; label: string; children: ReactNode }>(
  function BingkaiCetak({ gaya, lebarMm, zoom, label, children }, ref) {
    const iframe = useRef<HTMLIFrameElement>(null);
    const wadah = useRef<HTMLDivElement>(null);
    const [akar, setAkar] = useState<HTMLElement | null>(null);
    const [lebarWadah, setLebarWadah] = useState(0);

    useImperativeHandle(ref, () => ({
      cetak(judul: string) {
        const w = iframe.current?.contentWindow;
        if (!w) return;
        w.document.title = judul.replace(/[\\/:*?"<>|]+/g, "-");
        w.focus();
        w.print();
      },
    }), []);

    // iframe srcDoc bisa sudah selesai dimuat sebelum React memasang onLoad (hidrasi) → periksa keduanya
    useEffect(() => {
      const ifr = iframe.current;
      if (!ifr) return;
      const siap = () => { const el = ifr.contentDocument?.getElementById("akar"); if (el) setAkar((x) => (x === el ? x : el)); };
      siap();
      ifr.addEventListener("load", siap);
      return () => ifr.removeEventListener("load", siap);
    }, []);

    useEffect(() => {
      const el = wadah.current;
      if (!el) return;
      const ro = new ResizeObserver(([e]) => setLebarWadah(e.contentRect.width));
      ro.observe(el);
      return () => ro.disconnect();
    }, []);

    const skala = zoom === "pas" ? (lebarWadah ? Math.min(1.25, Math.max(0.3, (lebarWadah - 24) / (lebarMm * MM))) : 0.6) : zoom;

    // skala layar & tinggi iframe mengikuti isi
    useEffect(() => {
      const doc = akar?.ownerDocument;
      const ifr = iframe.current;
      if (!doc || !ifr) return;
      doc.documentElement.style.setProperty("--zoom", String(skala));
      const sesuaikan = () => { ifr.style.height = `${Math.ceil(doc.documentElement.scrollHeight) + 4}px`; };
      sesuaikan();
      const Ro = (doc.defaultView as (Window & typeof globalThis) | null)?.ResizeObserver ?? ResizeObserver;
      const ro = new Ro(sesuaikan);
      ro.observe(doc.body);
      // gambar yang selesai dimuat mengubah tinggi
      doc.addEventListener("load", sesuaikan, true);
      return () => { ro.disconnect(); doc.removeEventListener("load", sesuaikan, true); };
    }, [akar, skala]);

    return (
      <div ref={wadah} className="min-w-0 overflow-x-auto rounded-xl bg-[#525659]">
        <iframe
          ref={iframe} title={label} srcDoc={KERANGKA} className="block w-full border-0" style={{ height: 600 }}
        />
        {akar && createPortal(<><style>{gaya}</style>{children}</>, akar)}
      </div>
    );
  },
);
