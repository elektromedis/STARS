"use client";

import { useEffect, useState } from "react";
import { INFO_BAWAAN, type InfoSitus, type PengumumanPublik } from "@/lib/situs";

let cache: Promise<{ info: InfoSitus; pengumuman: PengumumanPublik[] }> | null = null;
/** Konten CMS situs (sekali per muat halaman). */
export function useSitus() {
  const [d, setD] = useState<{ info: InfoSitus; pengumuman: PengumumanPublik[] }>({ info: INFO_BAWAAN, pengumuman: [] });
  useEffect(() => {
    cache ??= fetch("/api/situs").then((r) => r.json()).catch(() => ({ info: INFO_BAWAAN, pengumuman: [] }));
    let hidup = true; cache.then((x) => hidup && setD(x)); return () => { hidup = false; };
  }, []);
  return d;
}
