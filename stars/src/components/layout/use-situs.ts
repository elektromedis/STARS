"use client";

import { useEffect, useState } from "react";
import { INFO_BAWAAN, type InfoSitus, type ItemSitusPublik, type PengumumanPublik } from "@/lib/situs";

type DataSitus = { info: InfoSitus; pengumuman: PengumumanPublik[]; etalase: ItemSitusPublik[] };
const KOSONG: DataSitus = { info: INFO_BAWAAN, pengumuman: [], etalase: [] };
let cache: Promise<DataSitus> | null = null;
/** Konten CMS situs (sekali per muat halaman). */
export function useSitus() {
  const [d, setD] = useState<DataSitus>(KOSONG);
  useEffect(() => {
    cache ??= fetch("/api/situs").then((r) => r.json()).then((x) => ({ ...KOSONG, ...x, info: { ...INFO_BAWAAN, ...x.info } })).catch(() => KOSONG);
    let hidup = true; cache.then((x) => hidup && setD(x)); return () => { hidup = false; };
  }, []);
  return d;
}
